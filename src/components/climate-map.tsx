'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, Crosshair, Droplets, LoaderCircle, Minus, Plus, Thermometer, Wind } from 'lucide-react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { MapLayer, MapPoint, Place, Weather } from '@/lib/types';
import { rounded } from '@/lib/weather';

export default function ClimateMap({ place, weather, onSelect, large = false }: { place: Place; weather: Weather | null; onSelect: (place: Place) => void; large?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [layer, setLayer] = useState<MapLayer>('temperature');
  const [error, setError] = useState('');
  const [atlasError, setAtlasError] = useState(false);
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/atlas', { signal: abort.signal }).then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => setPoints(data.points)).catch(e => { if (e.name !== 'AbortError') setAtlasError(true); });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then(({ Map }) => {
      if (cancelled || !container.current) return;
      try {
        const instance = new Map({ container: container.current, center: [place.longitude - 1.3, place.latitude], zoom: large ? 5 : 5.3, minZoom: 2, maxZoom: 13, attributionControl: { compact: true }, style: {
          version: 8,
          sources: { carto: { type: 'raster', tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>' } },
          layers: [{ id: 'carto', type: 'raster', source: 'carto', paint: { 'raster-opacity': .93, 'raster-saturation': -.35, 'raster-brightness-min': .03 } }]
        } });
        map.current = instance;
        instance.on('load', () => { if (!cancelled) setReady(true); });
        instance.on('error', () => { if (!cancelled) setError('Não foi possível carregar parte do mapa. As previsões continuam disponíveis.'); });
      } catch { setError('O mapa precisa de aceleração gráfica. Use a busca para consultar qualquer cidade.'); }
    }).catch(() => { if (!cancelled) setError('Não foi possível abrir o mapa. Recarregue a página para tentar novamente.'); });
    return () => { cancelled = true; markers.current.forEach(m => m.remove()); map.current?.remove(); map.current = null; };
    // The existing map moves to the selected place; it is created only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) map.current?.flyTo({ center: [place.longitude - (large ? 0 : .8), place.latitude], zoom: large ? 5 : 5.3, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200 });
  }, [place.latitude, place.longitude, ready, large]);

  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    import('maplibre-gl').then(({ Marker }) => {
      if (cancelled || !map.current) return;
      markers.current.forEach(m => m.remove());
      const current: MapPoint[] = weather ? [{ ...place, temperature: weather.current.temperature, wind: weather.current.wind, rain: weather.hours.find(h => h.time >= `${weather.current.time.slice(0, 13)}:00`)?.rain ?? null, code: weather.current.code }] : [];
      const all = [...points.filter(p => Math.abs(p.latitude - place.latitude) + Math.abs(p.longitude - place.longitude) > .15), ...current];
      markers.current = all.map(p => {
        const active = p.id === place.id;
        const button = document.createElement('button');
        button.className = `map-point ${active ? 'map-point-active' : ''} map-point-${layer}`;
        const label = document.createElement('span'); label.textContent = p.name;
        const value = document.createElement('strong');
        value.textContent = layer === 'temperature' ? rounded(p.temperature, '°') : layer === 'rain' ? rounded(p.rain, '%') : rounded(p.wind, ' km/h');
        button.append(label, value);
        button.setAttribute('aria-label', `Ver clima de ${p.name}: ${value.textContent}`);
        button.addEventListener('click', () => select.current(p));
        return new Marker({ element: button, anchor: 'bottom' }).setLngLat([p.longitude, p.latitude]).addTo(map.current!);
      });
    });
    return () => { cancelled = true; };
  }, [ready, points, place, weather, layer]);

  return <div className={`climate-map ${large ? 'climate-map-large' : ''}`}>
    <div ref={container} className="map-canvas" aria-label={`Mapa interativo da região de ${place.name}`} />
    <div className="map-shade" />
    <div className="map-heading"><span className="eyebrow"><span className="status-dot" /> EXPLORE O MAPA</span><span className="map-heading-sub">Um novo olhar para o tempo.</span></div>
    <div className="map-layers" role="group" aria-label="Dados no mapa">{([{ id: 'temperature', icon: Thermometer, label: 'Temperatura' }, { id: 'rain', icon: Droplets, label: 'Chuva' }, { id: 'wind', icon: Wind, label: 'Vento' }] as const).map(({ id, icon: Icon, label }) => <button key={id} className={layer === id ? 'active' : ''} onClick={() => setLayer(id)} aria-pressed={layer === id}><Icon size={14} /><span>{label}</span></button>)}</div>
    <div className="map-controls"><button aria-label="Aproximar mapa" onClick={() => map.current?.zoomIn()}><Plus size={18} /></button><button aria-label="Afastar mapa" onClick={() => map.current?.zoomOut()}><Minus size={18} /></button><button aria-label="Centralizar na cidade" onClick={() => map.current?.flyTo({ center: [place.longitude, place.latitude], zoom: 7 })}><Crosshair size={17} /></button></div>
    {!ready && !error && <span className="map-loading"><LoaderCircle className="spin" size={18} /> Abrindo o mundo…</span>}
    {(error || atlasError) && <span className="map-error" role="status">{error || 'Pontos regionais indisponíveis agora.'}</span>}
    <div className="map-bottom"><Compass size={17} /><span>{layer === 'temperature' ? 'Temperatura atual estimada' : layer === 'rain' ? 'Chance de chuva na hora atual' : 'Vento atual estimado'}<small>Modelos nos pontos · Open-Meteo</small></span><span className={`map-legend map-legend-${layer}`} /></div>
  </div>;
}
