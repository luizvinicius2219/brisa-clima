'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, Droplets, LoaderCircle, MapPin, Thermometer, Wind } from 'lucide-react';
import type { Place, Weather } from '@/lib/types';
import { conditions, dayLabel, PLACES, rounded } from '@/lib/weather';
import { CitySearch } from './search';
import { WeatherIcon } from './weather-icon';

export function Compare({ place, weather, onComparison }: { place: Place; weather: Weather; onComparison: (p: Place) => void }) {
  const [other, setOther] = useState<Place>(PLACES[place.id === 'sao-paulo' ? 0 : 1]);
  const [result, setResult] = useState<{ key: string; data: Weather } | null>(null);
  const [error, setError] = useState('');
  const key = `${other.latitude},${other.longitude}`;
  const data = result?.key === key ? result.data : null;
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/weather?lat=${other.latitude}&lon=${other.longitude}`, { signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }).then(data => { setResult({ key, data }); onComparison(other); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [key, other, onComparison]);
  const delta = data ? weather.current.temperature - data.current.temperature : null;
  return <section className="comparison-section" id="comparar">
    <div className="section-heading"><div><span className="eyebrow">DOIS LUGARES, NOVAS PERSPECTIVAS</span><h2>E se você estivesse em…</h2></div><ArrowLeftRight size={24} className="muted" /></div>
    <div className="compare-search-row"><CitySearch placeholder="Comparar com outra cidade…" onSelect={setOther} /><div className="compare-suggestions">{PLACES.slice(1, 5).map(p => <button key={p.id} onClick={() => setOther(p)} className={p.id === other.id ? 'selected' : ''}>{p.name}</button>)}</div></div>
    <div className="compare-grid">{[{ place, data: weather, own: true }, { place: other, data, own: false }].map(({ place: p, data: w, own }) => <article key={own ? 'own' : 'other'} className={`panel compare-card ${own ? 'compare-card-own' : ''}`}><div className="compare-card-top"><span><MapPin size={14} />{own ? 'SEU LUGAR' : 'OUTRO CÉU'}</span><span>{p.country}</span></div><h3>{p.name}</h3><p>{p.region}</p>{w ? <><div className="compare-temp"><strong>{rounded(w.current.temperature, '°')}</strong><WeatherIcon code={w.current.code} isDay={w.current.isDay} size={58} /></div><p>{conditions(w.current.code, w.current.isDay).label} · {w.current.time.slice(11, 16)} no local</p><div className="compare-metrics"><span><Droplets size={15} />{rounded(w.days[0].rain, '%')}<small>chuva hoje</small></span><span><Wind size={15} />{rounded(w.current.wind)}<small>km/h</small></span><span><Thermometer size={15} />{rounded(w.current.feelsLike, '°')}<small>sensação</small></span></div></> : error ? <p className="inline-error" role="alert">{error}</p> : <div className="compare-loading"><LoaderCircle className="spin" /> Consultando este céu…</div>}</article>)}</div>
    {data && delta !== null && <div className="comparison-insight"><ArrowUpRight size={22} /><p><strong>{Math.abs(delta) < .5 ? 'Temperaturas parecidas, histórias diferentes.' : `${place.name} está ${Math.abs(delta).toFixed(1).replace('.', ',')}° ${delta > 0 ? 'mais quente' : 'mais fria'} que ${other.name}.`}</strong><span>Estimativas atuais dos modelos em cada local. Os fusos e horários de atualização podem ser diferentes.</span></p></div>}
    {data && <div className="panel compare-week"><div className="section-heading"><h3>Os próximos dias, lado a lado</h3><span className="muted">Temperatura máxima</span></div><div className="compare-week-grid">{weather.days.map((d, i) => {
      const otherDay = data.days.find(day => day.date === d.date);
      return <div key={d.date}><span>{dayLabel(d.date, i)}</span><strong>{rounded(d.max, '°')}</strong><small>{otherDay ? rounded(otherDay.max, '°') : '—'}</small></div>;
    })}</div><div className="compare-legend"><span><i />{place.name}</span><span><i />{other.name}</span></div></div>}
  </section>;
}
