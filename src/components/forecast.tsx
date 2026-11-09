'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Droplets } from 'lucide-react';
import type { Weather } from '@/lib/types';
import { dayLabel, hourLabel, rounded, upcomingHours } from '@/lib/weather';
import { WeatherIcon } from './weather-icon';

export function Forecast({ weather }: { weather: Weather }) {
  const [mode, setMode] = useState<'hours' | 'days'>('hours');
  const [selected, setSelected] = useState(0);
  const hours = upcomingHours(weather, 24);
  const shown = hours.filter((_, i) => i % 3 === 0).slice(0, 8);
  const temperatures = shown.map(h => h.temperature);
  const min = Math.min(...temperatures) - 2, max = Math.max(...temperatures) + 2;
  const points = shown.map((h, i) => ({ x: 35 + i / Math.max(shown.length - 1, 1) * 630, y: 100 - (h.temperature - min) / (max - min || 1) * 66 }));
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const chosen = shown[Math.min(selected, Math.max(0, shown.length - 1))];
  return <section className="panel forecast-panel" id="previsao" aria-label="Previsão do tempo">
    <div className="section-heading"><div><span className="eyebrow">UM PASSO À FRENTE</span><h2>O que vem por aí</h2></div><div className="segmented"><button onClick={() => setMode('hours')} className={mode === 'hours' ? 'active' : ''} aria-pressed={mode === 'hours'}>24 horas</button><button onClick={() => setMode('days')} className={mode === 'days' ? 'active' : ''} aria-pressed={mode === 'days'}>7 dias</button></div></div>
    {mode === 'hours' ? <><div className="forecast-readout"><span>{chosen ? hourLabel(chosen.time) : '—'} <strong>{chosen ? rounded(chosen.temperature, '°') : '—'}</strong></span><span><Droplets size={13} /> {chosen ? rounded(chosen.rain, '%') : '—'} de chance de chuva</span></div><div className="hour-chart"><svg viewBox="0 0 700 125" preserveAspectRatio="none" role="img" aria-label="Curva da temperatura nas próximas 24 horas"><defs><linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d2ee9b" stopOpacity=".17" /><stop offset="100%" stopColor="#d2ee9b" stopOpacity="0" /></linearGradient></defs>{[35, 75, 115].map(y => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#ffffff08" strokeDasharray="3 7" />)}{points.length > 0 && <><path d={`${line} L ${points.at(-1)!.x} 125 L 35 125 Z`} fill="url(#temp-fill)" /><path d={line} fill="none" stroke="#d2ee9b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />{points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === selected ? 5 : 3} fill={i === selected ? '#e8fac5' : '#141e24'} stroke="#d2ee9b" strokeWidth="2" /><text x={p.x} y={p.y - 16} textAnchor="middle" fill="#bfcaca" fontSize="13">{rounded(shown[i].temperature, '°')}</text></g>)}</>}</svg></div><div className="hour-items">{shown.map((h, i) => <button key={h.time} className={i === selected ? 'selected' : ''} onClick={() => setSelected(i)} aria-label={`${hourLabel(h.time)}, ${rounded(h.temperature, 'graus')}, chance de chuva ${rounded(h.rain, '%')}`} aria-pressed={i === selected}><span>{i === 0 ? 'Agora' : hourLabel(h.time)}</span><WeatherIcon code={h.code} isDay={h.isDay} size={23} /><small><Droplets size={11} />{rounded(h.rain, '%')}</small></button>)}</div><p className="panel-note">Horários de {weather.timezone.replaceAll('_', ' ')} · Toque em um horário para explorar</p></> : <div className="day-forecast">{weather.days.map((d, i) => {
      const allMin = Math.min(...weather.days.map(day => day.min)) - 1, allMax = Math.max(...weather.days.map(day => day.max)) + 1;
      return <div key={d.date} className="day-row"><span className="day-name">{dayLabel(d.date, i)}</span><WeatherIcon code={d.code} size={22} /><span className="day-rain"><Droplets size={12} />{rounded(d.rain, '%')}</span><span className="day-low">{rounded(d.min, '°')}</span><div className="day-range"><i style={{ left: `${(d.min - allMin) / (allMax - allMin) * 100}%`, width: `${(d.max - d.min) / (allMax - allMin) * 100}%` }} /></div><strong>{rounded(d.max, '°')}</strong></div>;
    })}<p className="panel-note"><ArrowDown size={11} /> Mínima <ArrowUp size={11} /> Máxima · A incerteza aumenta nos dias mais distantes.</p></div>}
  </section>;
}
