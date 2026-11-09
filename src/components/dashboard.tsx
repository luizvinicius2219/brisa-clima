'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronRight, CloudSun, Compass, Crosshair, Droplets, ExternalLink, Heart, History as HistoryIcon, Info, Layers3, LoaderCircle, LocateFixed, Map, MapPin, RefreshCw, Settings2, Share2, ShieldCheck, Sparkles, Star, Sun, Sunrise, Sunset, Thermometer, TrendingUp, Umbrella, Waves, Wind, X } from 'lucide-react';
import type { Place, Weather } from '@/lib/types';
import { bestWindow, conditions, coordinates, hourLabel, PLACES, rounded, summarize, timeLabel, upcomingHours } from '@/lib/weather';
import { Brand } from './brand';
import { CitySearch } from './search';
import { Forecast } from './forecast';
import { WeatherIcon } from './weather-icon';
import { Modal } from './modal';
import { ShareModal } from './share-modal';

const ClimateMap = dynamic(() => import('./climate-map'), { ssr: false, loading: () => <div className="climate-map map-placeholder"><LoaderCircle className="spin" size={24} /><span>Abrindo o mundo…</span></div> });
const Compare = dynamic(() => import('./compare').then(m => m.Compare), { loading: () => <div className="panel tab-loading"><LoaderCircle className="spin" /> Abrindo comparação…</div> });
const History = dynamic(() => import('./history').then(m => m.History), { loading: () => <div className="panel tab-loading"><LoaderCircle className="spin" /> Abrindo histórico…</div> });
type View = 'overview' | 'map' | 'compare' | 'history';
type AiMode = 'day' | 'rain' | 'compare';
const tabs = [{ id: 'overview', label: 'Visão geral', icon: CloudSun }, { id: 'map', label: 'Mapa do clima', icon: Map }, { id: 'compare', label: 'Comparar cidades', icon: Layers3 }, { id: 'history', label: 'Histórico', icon: HistoryIcon }] as const;

function KeyModal({ currentKey, onSave, onClose }: { currentKey: string; onSave: (key: string) => void; onClose: () => void }) {
  const [key, setKey] = useState(currentKey);
  const [error, setError] = useState('');
  return <Modal title="Um olhar a mais, com Gemini." onClose={onClose}><div className="gemini-symbol"><Sparkles size={31} /></div><p className="modal-intro">Conecte sua chave do Google AI Studio para transformar a previsão em uma análise do seu dia.</p><form onSubmit={e => { e.preventDefault(); if (!/^(?:AIza[\w-]{25,}|AQ\.[\w-]{20,})$/.test(key.trim())) { setError('Confira a chave completa do Google AI Studio.'); return; } onSave(key.trim()); }}><label className="field-label" htmlFor="gemini-key">Sua chave de API</label><input id="gemini-key" className="text-input" type="password" autoComplete="off" value={key} onChange={e => { setKey(e.target.value); setError(''); }} placeholder="Chave do Google AI Studio" autoFocus /><p className="key-privacy"><ShieldCheck size={17} />A chave fica na memória desta aba e é enviada por HTTPS ao servidor do Brisa para consultar o Google. Ela não é salva no navegador nem nos logs do app.</p>{error && <p className="inline-error" role="alert">{error}</p>}<button type="submit" className="button-primary"><Sparkles size={17} />Usar Gemini nesta sessão</button></form>{currentKey && <button className="text-button" onClick={() => onSave('')}>Desconectar minha chave</button>}<a className="external-link" href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">Obter uma chave no Google AI Studio <ExternalLink size={13} /></a><p className="share-help">O uso segue a cota e a cobrança da sua conta Google. O Brisa envia os dados meteorológicos do local selecionado; o Gemini interpreta esses dados.</p></Modal>;
}

function SkyScene({ code, isDay }: { code: number; isDay: boolean }) {
  const kind = conditions(code, isDay).kind;
  return <div className={`sky-scene sky-${kind}`} aria-hidden="true"><div className="sky-halo" /><div className="sky-orbit sky-orbit-one" /><div className="sky-orbit sky-orbit-two" /><div className="sky-orb" />{kind !== 'sun' && kind !== 'moon' && <><div className="sky-cloud sky-cloud-back" /><div className="sky-cloud" /></>}{['rain', 'storm'].includes(kind) && <div className="sky-rain">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ left: `${i * 14}%`, animationDelay: `${i * .19}s` }} />)}</div>}<span className="sky-star sky-star-one">✦</span><span className="sky-star sky-star-two">+</span></div>;
}

export default function Dashboard() {
  const [place, setPlace] = useState<Place>(PLACES[0]);
  const [view, setView] = useState<View>('overview');
  const [result, setResult] = useState<{ key: string; weather: Weather } | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('day');
  const [insight, setInsight] = useState<{ key: string; text: string; model: string } | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState('');
  const [comparison, setComparison] = useState<Place>(PLACES[1]);
  const [locationState, setLocationState] = useState<'idle' | 'pending' | 'active'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [locationBanner, setLocationBanner] = useState(true);
  const watch = useRef<number | null>(null);
  const aiAbort = useRef<AbortController | null>(null);
  const key = `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`;
  const weather = result?.key === key ? result.weather : null;
  const favorite = favorites.some(p => p.latitude.toFixed(3) === place.latitude.toFixed(3) && p.longitude.toFixed(3) === place.longitude.toFixed(3));
  const validInsight = insight?.key === `${key}:${aiMode}` ? insight : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('lat')) {
      try { const c = coordinates(params); setPlace({ id: 'shared', name: (params.get('cidade') || 'Local compartilhado').slice(0, 80), region: (params.get('regiao') || '').slice(0, 80), country: (params.get('pais') || '').slice(0, 80), ...c }); } catch { setLocationMessage('Este link não contém uma localização válida. Você pode buscar uma cidade.'); }
    }
    try {
      const stored = JSON.parse(localStorage.getItem('brisa-favorites') || '[]');
      if (Array.isArray(stored)) setFavorites(stored.filter(p => typeof p?.name === 'string' && typeof p?.id === 'string' && typeof p?.region === 'string' && typeof p?.country === 'string' && Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180).slice(0, 6));
    } catch { /* Favorites are optional when storage is unavailable. */ }
    fetch('/api/insights').then(r => r.json()).then(data => setAiConfigured(data.configured === true)).catch(() => {});
    const interval = setInterval(() => setRefresh(n => n + 1), 600_000);
    return () => { clearInterval(interval); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); aiAbort.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/weather?lat=${place.latitude.toFixed(3)}&lon=${place.longitude.toFixed(3)}`, { signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body as Weather; }).then(weather => setResult({ key, weather })).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Não foi possível atualizar a previsão.'); });
    return () => controller.abort();
  }, [key, place.latitude, place.longitude, refresh]);

  useEffect(() => { aiAbort.current?.abort(); setAiPending(false); setAiError(''); }, [key, aiMode]);

  const selectPlace = useCallback((next: Place) => {
    if (watch.current !== null) { navigator.geolocation.clearWatch(watch.current); watch.current = null; }
    setLocationState('idle'); setPlace(next); setLocationMessage('');
  }, []);

  function locate() {
    if (locationState === 'active') {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null; setLocationState('idle'); setLocationMessage('Acompanhamento pausado. Você pode continuar explorando cidades.'); return;
    }
    if (!navigator.geolocation) { setLocationMessage('Seu navegador não oferece localização. Use a busca de cidades.'); return; }
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    setLocationState('pending'); setLocationMessage('');
    let previous = '', lastUpdate = 0;
    watch.current = navigator.geolocation.watchPosition(position => {
      const latitude = Number(position.coords.latitude.toFixed(3)), longitude = Number(position.coords.longitude.toFixed(3));
      const next = `${latitude},${longitude}`;
      if (next !== previous && (!lastUpdate || Date.now() - lastUpdate > 300_000)) {
        const closest = PLACES.map(p => ({ p, d: Math.hypot(p.latitude - latitude, (p.longitude - longitude) * Math.cos(latitude * Math.PI / 180)) })).sort((a, b) => a.d - b.d)[0];
        setPlace({ id: 'my-location', name: closest.d < .35 ? `${closest.p.name} · perto de você` : 'Seu lugar no mundo', region: closest.d < .35 ? closest.p.region : `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? 'S' : 'N'} · ${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? 'O' : 'L'}`, country: closest.d < .35 ? closest.p.country : '', latitude, longitude });
        previous = next; lastUpdate = Date.now();
      }
      setLocationState('active'); setLocationBanner(false);
    }, err => {
      setLocationState('idle');
      setLocationMessage(err.code === 1 ? 'Localização não autorizada. Você pode escolher qualquer cidade pela busca.' : 'Não foi possível localizar você agora. Tente novamente ou busque uma cidade.');
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 });
  }

  function toggleFavorite() {
    const updated = favorite ? favorites.filter(p => !(p.latitude.toFixed(3) === place.latitude.toFixed(3) && p.longitude.toFixed(3) === place.longitude.toFixed(3))) : [...favorites.slice(-5), place];
    setFavorites(updated);
    try { localStorage.setItem('brisa-favorites', JSON.stringify(updated)); } catch { setLocationMessage('Favoritos disponíveis nesta aba. Seu navegador não permitiu salvá-los.'); }
  }

  async function generateInsight() {
    if (!apiKey && !aiConfigured) { setShowKey(true); return; }
    aiAbort.current?.abort(); const controller = new AbortController(); aiAbort.current = controller;
    setAiPending(true); setAiError('');
    try {
      const response = await fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: place.latitude, lon: place.longitude, mode: aiMode, apiKey: apiKey || undefined, comparison: aiMode === 'compare' ? { lat: comparison.latitude, lon: comparison.longitude } : undefined }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) { if (data.needsKey) setShowKey(true); throw new Error(data.error); }
      setInsight({ key: `${key}:${aiMode}`, text: data.text, model: data.model });
    } catch (e) { if (!controller.signal.aborted) setAiError(e instanceof Error ? e.message : 'Não foi possível gerar a análise.'); }
    finally { if (!controller.signal.aborted) setAiPending(false); }
  }

  const hours = weather ? upcomingHours(weather, 24) : [];
  const outdoorWindow = bestWindow(hours);
  const summary = weather ? summarize(weather) : null;
  const day = weather?.days[0];
  const currentUv = hours[0]?.uv;
  const uvLabel = currentUv == null ? 'Sem dados no momento' : currentUv < 3 ? 'Baixo neste horário' : currentUv < 6 ? 'Moderado neste horário' : currentUv < 8 ? 'Alto · use proteção' : currentUv < 11 ? 'Muito alto · use proteção' : 'Extremo · evite exposição';
  const windDirection = weather?.current.windDirection == null ? 'Direção indisponível' : ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'][Math.round(weather.current.windDirection / 45) % 8];
  const dateLabel = weather ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' }).format(new Date(`${weather.current.time.slice(0, 10)}T12:00:00Z`)) : 'Seu observatório pessoal';

  return <div className="app-shell"><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><header className="topbar"><a href="/" className="brand-link" aria-label="Brisa, início"><Brand /></a><span className="brand-tagline">O clima, em outra perspectiva.</span><div className="topbar-actions"><CitySearch onSelect={selectPlace} /><button className="button-primary topbar-share-button" onClick={() => setShowShare(true)} disabled={!weather} aria-label={`Compartilhar previsão de ${place.name}`}><Share2 size={16} /><span>Compartilhar</span></button><button className={`location-button ${locationState === 'active' ? 'location-active' : ''}`} onClick={locate} disabled={locationState === 'pending'} title={locationState === 'active' ? 'Pausar acompanhamento da localização' : 'Permitir localização aproximada'}>{locationState === 'pending' ? <LoaderCircle size={16} className="spin" /> : <LocateFixed size={16} />}<span>{locationState === 'active' ? 'Localização ativa' : locationState === 'pending' ? 'Localizando…' : 'Minha localização'}</span></button><button className={`icon-button settings-button ${apiKey || aiConfigured ? 'gemini-connected' : ''}`} onClick={() => setShowKey(true)} aria-label="Configurar Gemini"><Settings2 size={19} /></button></div></header>
    <main id="conteudo"><div className="welcome-row"><div><span className="eyebrow">UM RESPIRO NA ROTINA</span><h1>O mundo lá fora.<span> Mais perto de você.</span></h1></div><div className="today-label"><span className="status-dot" />{dateLabel}<small>Previsões que acompanham seu dia</small></div></div>
      <nav className="main-tabs" aria-label="Explorar o Brisa">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}><Icon size={16} />{label}{view === id && <span className="tab-dot" />}</button>)}<button className="data-info" onClick={() => setShowAbout(true)}><Info size={14} /><span>Sobre os dados</span></button></nav>
      {locationMessage && <div className="notice" role="status"><MapPin size={17} /><span>{locationMessage}</span><button className="icon-button" onClick={() => setLocationMessage('')} aria-label="Dispensar aviso"><X size={16} /></button></div>}
      {!!favorites.length && <div className="favorites-row"><Star size={13} /><span>SEUS LUGARES</span>{favorites.map(p => <button key={`${p.latitude},${p.longitude}`} className={p.latitude.toFixed(3) === place.latitude.toFixed(3) && p.longitude.toFixed(3) === place.longitude.toFixed(3) ? 'active' : ''} onClick={() => selectPlace(p)}>{p.name}<ChevronRight size={11} /></button>)}</div>}
      {error && <div className="notice notice-error" role="alert"><Umbrella size={20} /><div><strong>A previsão está dando uma pausa.</strong><span>{error}{weather ? ' Os dados anteriores seguem na tela.' : ''}</span></div><button className="button-secondary" onClick={() => setRefresh(r => r + 1)}><RefreshCw size={14} />Tentar de novo</button></div>}
      {(view === 'overview' || view === 'map') && <><div className={`hero-grid ${view === 'map' ? 'hero-grid-map' : ''}`}>
        {view === 'overview' && <section className="current-card" aria-label={`Clima atual em ${place.name}`}><svg className="contour-lines" viewBox="0 0 640 440" fill="none" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-250 + i * 14} 440 C${90 + i * 18} ${-90 + i * 21}, ${170 + i * 45} ${710 - i * 22}, ${780 + i * 13} ${-20 + i * 29}`} stroke="currentColor" strokeOpacity={.025 + i * .005} />)}</svg><div className="current-card-top"><span className="eyebrow"><span className="status-dot" /> AGORA, NO SEU MUNDO</span><div><button className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={toggleFavorite} aria-label={favorite ? 'Remover cidade dos favoritos' : 'Salvar cidade nos favoritos'} aria-pressed={favorite}><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button><button className="icon-button" disabled={!weather} onClick={() => setShowShare(true)} aria-label="Compartilhar clima"><Share2 size={18} /></button></div></div><div className="current-place"><h2>{place.name}</h2><p><MapPin size={13} />{[place.region, place.country].filter(Boolean).join(', ') || 'Seu lugar no mundo'}</p></div>
          {weather ? <><SkyScene code={weather.current.code} isDay={weather.current.isDay} /><div className="current-temperature">{rounded(weather.current.temperature)}<span>°</span><small>C</small></div><div className="current-condition"><WeatherIcon code={weather.current.code} isDay={weather.current.isDay} size={20} /><span>{conditions(weather.current.code, weather.current.isDay).label}</span><span className="feels-like">Sensação de {rounded(weather.current.feelsLike, '°')}</span></div><div className="current-bottom"><span><ArrowDown size={14} />{rounded(day?.min, '°')}<ArrowUp size={14} />{rounded(day?.max, '°')}<i />{timeLabel(weather.current.time)} no local</span><button onClick={() => setShowShare(true)}>Compartilhar meu céu <ArrowUpRight size={16} /></button></div></> : <div className="weather-loading"><LoaderCircle size={30} className="spin" /><span>{error ? 'Escolha outra cidade ou tente novamente.' : 'Sentindo os ares por aqui…'}</span></div>}
        </section>}
        <section className="map-card" aria-label="Mapa do clima"><ClimateMap place={place} weather={weather} onSelect={selectPlace} large={view === 'map'} />{view === 'overview' && <button className="map-expand" onClick={() => setView('map')} aria-label="Ampliar mapa"><ArrowUpRight size={18} /></button>}</section>
      </div>{view === 'map' && <div className="map-explanation"><Compass size={18} /><p>Explore o mundo, aproxime o mapa e selecione um dos pontos para ver a previsão. As camadas exibem <strong>dados nos pontos das cidades</strong>. Use a busca para encontrar outros lugares.</p><button className="button-secondary" onClick={() => setView('overview')}>Ver previsão de {place.name}<ArrowRight size={15} /></button></div>}</>}
      {view === 'overview' && <>
        <div className="metrics-grid">{[{ label: 'Chance de chuva', icon: Droplets, value: rounded(day?.rain), unit: '%', note: day?.precipitation == null ? 'Probabilidade máxima hoje' : `${day.precipitation.toFixed(1).replace('.', ',')} mm previstos hoje`, color: 'blue', visual: 'rain' }, { label: 'Vento', icon: Wind, value: rounded(weather?.current.wind), unit: 'km/h', note: windDirection, color: 'mint', visual: 'wind' }, { label: 'Umidade', icon: Waves, value: rounded(weather?.current.humidity), unit: '%', note: 'Umidade relativa do ar', color: 'blue', visual: 'humidity' }, { label: 'Índice UV', icon: Sun, value: rounded(currentUv), unit: '', note: uvLabel, color: 'gold', visual: 'uv' }].map(({ label, icon: Icon, value, unit, note, color, visual }) => <article className={`panel metric-card metric-${color}`} key={label}><div className="metric-label"><Icon size={16} /><span>{label}</span><ArrowUpRight size={13} /></div><div className="metric-value">{value}<small>{value === '—' ? '' : unit}</small><div className={`metric-art metric-art-${visual}`} aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: `${10 + ((i * 17 + 11) % 40)}px` }} />)}</div></div><p>{weather ? note : 'Consultando o céu…'}</p></article>)}</div>
        <div className="forecast-grid">{weather ? <Forecast key={key} weather={weather} /> : <section className="panel forecast-panel skeleton-panel"><div className="skeleton" /><div className="skeleton" /><p>Preparando as próximas horas…</p></section>}<section className="insight-panel"><div className="insight-top"><span className="insight-badge"><Sparkles size={13} /> UM OLHAR A MAIS</span><span className="insight-tiny">{validInsight ? 'GEMINI' : 'BRISA INSIGHTS'}</span></div><div className="insight-content"><div className="insight-spark"><Sparkles size={23} /></div><h2>{validInsight ? 'O céu, traduzido.' : summary?.title ?? 'Cada céu conta uma história.'}</h2>{aiPending ? <div className="ai-loading" role="status"><LoaderCircle className="spin" size={17} /> Cruzando os dados com Gemini…</div> : <p className="insight-text">{validInsight?.text || summary?.text || 'Estamos consultando os modelos para trazer uma leitura do seu dia.'}</p>}{aiError && <p className="inline-error" role="alert">{aiError}</p>}</div><div className="insight-bottom"><select aria-label="Tema da análise Gemini" value={aiMode} onChange={e => setAiMode(e.target.value as AiMode)}><option value="day">Meu dia lá fora</option><option value="rain">Vai chover?</option><option value="compare">Comparar com {comparison.name}</option></select><button onClick={generateInsight} disabled={!weather || aiPending} aria-label="Gerar análise com Gemini"><Sparkles size={15} />{apiKey || aiConfigured ? 'Analisar' : 'Conectar Gemini'}<ArrowUpRight size={15} /></button></div><span className="insight-source">{validInsight ? `Análise por ${validInsight.model} · baseada no Open-Meteo` : 'Leitura dos dados · Gemini opcional para aprofundar'}</span></section></div>
        <div className="discovery-grid"><article className="panel outdoor-card"><div className="outdoor-icon"><Compass size={23} /></div><div><span className="eyebrow">ENCONTRE SEU MOMENTO</span><h3>{outdoorWindow ? outdoorWindow.ideal ? 'Uma boa hora para lá fora.' : 'A melhor janela disponível.' : 'O próximo respiro.'}</h3><p>{outdoorWindow ? `${hourLabel(outdoorWindow.start.time)}–${hourLabel(outdoorWindow.end.time)}${outdoorWindow.start.time.slice(0, 10) !== weather?.current.time.slice(0, 10) ? ' amanhã' : ' hoje'} · ${rounded(outdoorWindow.start.temperature, '°')} · ${rounded(Math.max(outdoorWindow.start.rain!, outdoorWindow.end.rain!), '%')} de chance de chuva${outdoorWindow.ideal ? '' : ' · Condições exigem atenção'}` : weather ? 'Sem uma janela diurna calculável nas próximas horas.' : 'Consultando horários favoráveis para sair.'}</p><small>Combinação de chuva, temperatura, vento, UV e luz do dia. É uma sugestão, não uma garantia.</small></div><ArrowUpRight size={20} className="muted" /></article><article className="panel sunlight-card"><div className="sunlight-title"><Sun size={17} /><span>O ritmo do sol</span></div><div className="sun-arc" aria-hidden="true"><span /><i /></div><div className="sun-times"><span><Sunrise size={18} /><small>Nascer do sol</small><strong>{day ? timeLabel(day.sunrise) : '—'}</strong></span><span><Sunset size={18} /><small>Pôr do sol</small><strong>{day ? timeLabel(day.sunset) : '—'}</strong></span></div></article></div>
        {locationBanner && locationState !== 'active' && <div className="location-banner"><div className="location-banner-icon"><Crosshair size={22} /></div><div><strong>O seu céu está a um toque.</strong><p>Permita a localização para acompanhar o tempo de onde você estiver.</p><small>A localização aproximada é enviada ao Open-Meteo. Você pode pausar quando quiser.</small></div><button className="button-primary" onClick={locate} disabled={locationState === 'pending'}>{locationState === 'pending' ? <LoaderCircle className="spin" size={15} /> : <LocateFixed size={15} />}Usar minha localização</button><button className="icon-button" aria-label="Dispensar sugestão de localização" onClick={() => setLocationBanner(false)}><X size={16} /></button></div>}
        <div className="explore-bottom"><button onClick={() => setView('compare')}><Layers3 size={18} /><span>Outros ares, outras cidades.<small>Compare o clima em dois lugares.</small></span><ArrowUpRight size={18} /></button><button onClick={() => setView('history')}><TrendingUp size={18} /><span>O passado conta uma história.<small>Explore dez anos de clima.</small></span><ArrowUpRight size={18} /></button></div>
      </>}
      {view === 'compare' && (weather ? <Compare place={place} weather={weather} onComparison={setComparison} /> : <div className="panel tab-loading"><LoaderCircle className="spin" />{error || 'Consultando sua cidade…'}</div>)}
      {view === 'history' && (weather ? <History key={key} place={place} weather={weather} /> : <div className="panel tab-loading"><LoaderCircle className="spin" />{error || 'Consultando sua cidade…'}</div>)}
      <footer className="footer"><div><Brand compact /><span>Um novo jeito de sentir o tempo.</span></div><p>Modelos: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a><span>·</span>Mapas: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> / <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a></p><button onClick={() => setShowAbout(true)}>Feito para olhar além <ArrowUpRight size={12} /></button></footer>
    </main>
    {showShare && weather && <ShareModal place={place} weather={weather} onClose={() => setShowShare(false)} />}
    {showKey && <KeyModal currentKey={apiKey} onClose={() => setShowKey(false)} onSave={key => { setApiKey(key); setShowKey(false); setAiError(''); setInsight(null); }} />}
    {showAbout && <Modal title="Bonito por fora. Transparente por dentro." onClose={() => setShowAbout(false)}><p className="modal-intro">O Brisa reúne dados meteorológicos e os transforma em uma experiência mais clara e visual.</p><div className="about-list"><article><Thermometer size={20} /><div><h3>Previsão baseada em modelos</h3><p>Condições atuais e previsão via <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">Open-Meteo</a>. São estimativas de modelos numéricos, com atualização do app a cada dez minutos e cache de cinco minutos. A hora exibida segue o fuso do local.</p></div></article><article><HistoryIcon size={20} /><div><h3>Dez anos, com método</h3><p>A aba Histórico calcula médias mensais da <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener noreferrer">reanálise ERA5</a> para os dez últimos anos completos. Uma referência de dez anos não substitui uma normal climatológica de 30 anos.</p></div></article><article><Sparkles size={20} /><div><h3>Gemini como intérprete</h3><p>A análise básica é calculada com as variáveis da previsão. Ao conectar o Gemini, o modelo recebe esses dados para explicar cenários e incertezas. A IA não é a fonte da previsão e não substitui avisos oficiais.</p></div></article><article><ShieldCheck size={20} /><div><h3>Sua localização, sua escolha</h3><p>A localização só é acessada após sua autorização. Arredondamos as coordenadas para três casas antes da consulta e acompanhamos mudanças com intervalo mínimo de cinco minutos. Clique em “Localização ativa” para pausar. Favoritos ficam neste navegador; a chave pessoal do Gemini fica só na memória da aba.</p></div></article></div><p className="about-official">Para avisos oficiais no Brasil, consulte o <a href="https://alertas2.inmet.gov.br/" target="_blank" rel="noopener noreferrer">INMET <ExternalLink size={12} /></a> e a Defesa Civil da sua região.</p><button className="button-primary" onClick={() => setShowAbout(false)}><Check size={16} />Certo, vamos olhar o céu</button></Modal>}
  </div>;
}
