'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Droplets, Info, LoaderCircle, Thermometer } from 'lucide-react';
import type { Climate, Place, Weather } from '@/lib/types';
import { monthLabels, rounded } from '@/lib/weather';

export function History({ place, weather }: { place: Place; weather: Weather }) {
  const [result, setResult] = useState<{ key: string; data: Climate } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [metric, setMetric] = useState<'temperature' | 'rain'>('temperature');
  const [selected, setSelected] = useState(Number(weather.current.time.slice(5, 7)) - 1);
  const key = `${place.latitude},${place.longitude}`;
  const data = result?.key === key ? result.data : null;
  useEffect(() => {
    const controller = new AbortController(); setError('');
    fetch(`/api/history?lat=${place.latitude}&lon=${place.longitude}`, { signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }).then(data => setResult({ key, data })).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [key, place.latitude, place.longitude, retry]);
  const month = Number(weather.current.time.slice(5, 7)) - 1;
  const baseline = data?.months[month].temperature;
  const delta = baseline == null ? null : weather.days[0].mean - baseline;
  const max = data ? Math.max(...data.months.map(m => m[metric] ?? 0), 1) * 1.15 : 1;
  return <section className="history-section" id="historico"><div className="section-heading"><div><span className="eyebrow">O CÉU TAMBÉM TEM MEMÓRIA</span><h2>O clima de {place.name}, em perspectiva.</h2></div><span className="history-period">{data ? `${data.startYear} — ${data.endYear}` : '10 anos completos'}</span></div>
    {!data ? <div className="panel history-loading">{error ? <><ChartNoAxesCombined size={32} /><p role="alert">{error}</p><button className="button-secondary" onClick={() => setRetry(r => r + 1)}>Tentar novamente</button></> : <><LoaderCircle className="spin" size={30} /><h3>Consultando dez anos de história…</h3><p>A reanálise pode levar alguns segundos. Nenhum valor é preenchido artificialmente.</p></>}</div> : <><div className="history-summary-grid"><article className="panel history-stat"><Thermometer size={20} /><span>Média histórica de {monthLabels[month].toLowerCase()}</span><strong>{rounded(baseline, '°')}<small>C</small></strong><p>Média diária no mesmo mês, de {data.startYear} a {data.endYear}.</p></article><article className="panel history-stat"><ArrowUpRight size={20} /><span>Média prevista para hoje</span><strong>{rounded(weather.days[0].mean, '°')}<small>C</small></strong><p>{delta === null ? 'Referência histórica não disponível.' : `${Math.abs(delta).toFixed(1).replace('.', ',')}° ${delta >= 0 ? 'acima' : 'abaixo'} da média histórica do mês.`}</p></article><article className="panel history-stat"><Droplets size={20} /><span>Chuva média em {monthLabels[month].toLowerCase()}</span><strong>{rounded(data.months[month].rain)}<small>mm / mês</small></strong><p>Total mensal médio dos anos completos disponíveis.</p></article></div><div className="panel history-chart-panel"><div className="section-heading"><div><h3>Um ano em doze olhares</h3><p className="muted">{metric === 'temperature' ? 'Temperatura média mensal' : 'Precipitação mensal média'} · {data.startYear}–{data.endYear}</p></div><div className="segmented"><button className={metric === 'temperature' ? 'active' : ''} onClick={() => setMetric('temperature')} aria-pressed={metric === 'temperature'}><Thermometer size={14} /> °C</button><button className={metric === 'rain' ? 'active' : ''} onClick={() => setMetric('rain')} aria-pressed={metric === 'rain'}><Droplets size={14} /> mm</button></div></div><div className="history-chart" aria-label={metric === 'temperature' ? 'Gráfico da temperatura histórica mensal' : 'Gráfico da chuva histórica mensal'}>{data.months.map((m, i) => <button key={m.month} className={`${i === selected ? 'selected' : ''} ${i === month ? 'current-month' : ''}`} onClick={() => setSelected(i)} aria-label={`${monthLabels[i]}, ${m[metric] == null ? 'sem dados' : `${m[metric]} ${metric === 'temperature' ? 'graus Celsius' : 'milímetros'}`}`} aria-pressed={i === selected}><strong>{m[metric] == null ? '—' : m[metric]!.toFixed(1).replace('.', ',')}{metric === 'temperature' && m[metric] !== null ? '°' : ''}</strong><span className={`history-bar history-bar-${metric}`} style={{ height: `${(m[metric] ?? 0) / max * 180 + 4}px` }} /><small>{monthLabels[i]}</small></button>)}</div><div className="history-chart-detail"><span>{monthLabels[selected]} · {data.months[selected].samples} dias com temperatura disponível</span><span>Mín. média {rounded(data.months[selected].min, '°')} <i /> Máx. média {rounded(data.months[selected].max, '°')}</span></div></div><div className="methodology"><Info size={18} /><p><strong>Histórico com contexto.</strong> Usamos a reanálise ERA5 via Open-Meteo: uma estimativa do passado que combina modelos e observações. Esta referência de dez anos não é uma normal climatológica de 30 anos. Comparar a média prevista de um dia à média de um mês é contextual; não indica recorde nem tendência de aquecimento.</p></div></>}
  </section>;
}
