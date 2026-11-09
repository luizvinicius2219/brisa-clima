'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import type { Place } from '@/lib/types';
import { PLACES } from '@/lib/weather';

export function CitySearch({ onSelect, placeholder = 'Buscar uma cidade…', autoFocus = false }: { onSelect: (p: Place) => void; placeholder?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const options = query.trim().length < 2 ? PLACES.slice(0, 5) : results;
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPending(true); setError('');
      try {
        const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResults(data.places);
      } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Busca indisponível.'); setResults([]); } }
      finally { if (!controller.signal.aborted) setPending(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const choose = (place: Place) => { onSelect(place); setOpen(false); setQuery(''); setIndex(-1); input.current?.blur(); };
  return <div ref={root} className={`city-search ${open ? 'search-open' : ''}`}>
    <Search size={17} /><input ref={input} autoFocus={autoFocus} value={query} placeholder={placeholder} aria-label={placeholder} role="combobox" aria-expanded={open} aria-controls="city-results" aria-autocomplete="list" aria-activedescendant={open && index >= 0 ? `city-option-${index}` : undefined} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setPending(e.target.value.trim().length >= 2); setResults([]); setOpen(true); setIndex(-1); }} onKeyDown={e => {
      if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, options.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && options[index >= 0 ? index : 0]) { e.preventDefault(); choose(options[index >= 0 ? index : 0]); }
    }} />{query ? <button aria-label="Limpar busca" onClick={() => { setQuery(''); setPending(false); input.current?.focus(); }}><X size={15} /></button> : <kbd>⌕</kbd>}
    {open && <div className="search-results" id="city-results" role="listbox" aria-label="Cidades"><div className="search-caption">{query.trim().length < 2 ? 'UM MUNDO PARA EXPLORAR' : pending ? 'BUSCANDO CIDADES…' : `${options.length} ${options.length === 1 ? 'LUGAR ENCONTRADO' : 'LUGARES ENCONTRADOS'}`}</div>{pending && query.trim().length >= 2 ? <div className="search-status"><LoaderCircle size={17} className="spin" /> Consultando cidades</div> : error && query.trim().length >= 2 ? <p role="alert" className="search-status">{error}</p> : !options.length ? <p className="search-status">Nenhuma cidade encontrada. Tente outro nome.</p> : options.map((p, i) => <button key={p.id} id={`city-option-${i}`} role="option" aria-selected={index === i} className={index === i ? 'selected' : ''} onClick={() => choose(p)}><MapPin size={17} /><span><strong>{p.name}</strong><small>{[p.region, p.country].filter(Boolean).join(', ')}</small></span><ArrowUpRight size={16} /></button>)}</div>}
  </div>;
}
