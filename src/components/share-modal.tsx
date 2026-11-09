'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, LoaderCircle, Send, Share2, Smartphone } from 'lucide-react';
import type { Place, Weather } from '@/lib/types';
import { placeUrl, renderCard } from '@/lib/share';
import { conditions, rounded } from '@/lib/weather';
import { Modal } from './modal';

export function ShareModal({ place, weather, onClose }: { place: Place; weather: Weather; onClose: () => void }) {
  const [format, setFormat] = useState<'square' | 'story'>('square');
  const [card, setCard] = useState<{ blob: Blob; url: string; format: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const activeCard = card?.format === format ? card : null;
  useEffect(() => {
    let cancelled = false, objectUrl = '';
    renderCard(place, weather, format).then(blob => { if (cancelled) return; objectUrl = URL.createObjectURL(blob); setCard({ blob, url: objectUrl, format }); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [place, weather, format]);
  const fileName = `brisa-${place.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${weather.current.time.slice(0, 10)}.png`;
  const text = `${place.name} no Brisa: ${rounded(weather.current.temperature, '°C')}, ${conditions(weather.current.code, weather.current.isDay).label.toLowerCase()}. Chance de chuva hoje: ${rounded(weather.days[0].rain, '%')}.`;
  const download = () => {
    if (!activeCard) return;
    const a = document.createElement('a'); a.href = activeCard.url; a.download = fileName; a.click(); setMessage('Imagem salva. Ela está pronta para postar.');
  };
  const share = async () => {
    if (!activeCard) return;
    const file = new File([activeCard.blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      setSharing(true);
      try { await navigator.share({ files: [file], title: `O clima em ${place.name} · Brisa`, text: `${text}\n${placeUrl(place)}` }); setMessage('Cartão compartilhado.'); }
      catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError('O compartilhamento não abriu. Você pode baixar a imagem.'); }
      finally { setSharing(false); }
    } else { download(); setMessage('Imagem baixada. No celular, o menu permite enviá-la direto para seus apps.'); }
  };
  return <Modal title="Um céu bonito merece ser compartilhado." onClose={onClose} wide><p className="modal-intro">Seu resumo do tempo, pronto para ganhar o mundo.</p><div className="share-layout"><div className={`share-preview share-preview-${format}`}>{activeCard ? <img src={activeCard.url} alt={`Cartão de clima de ${place.name}, ${rounded(weather.current.temperature, 'graus')}`} /> : <LoaderCircle className="spin" size={28} />}</div><div className="share-options"><span className="eyebrow">ESCOLHA SEU FORMATO</span><div className="share-formats"><button className={format === 'square' ? 'active' : ''} onClick={() => { setFormat('square'); setError(''); }} aria-pressed={format === 'square'}><ImageIcon size={23} /><strong>Feed</strong><small>1080 × 1080</small></button><button className={format === 'story' ? 'active' : ''} onClick={() => { setFormat('story'); setError(''); }} aria-pressed={format === 'story'}><Smartphone size={23} /><strong>Story</strong><small>1080 × 1920</small></button></div><button className="button-primary" onClick={share} disabled={!activeCard || sharing}><Share2 size={17} />{sharing ? 'Compartilhando…' : 'Compartilhar imagem'}</button><button className="button-secondary" onClick={download} disabled={!activeCard}><Download size={17} /> Baixar PNG</button><a className="button-secondary whatsapp-button" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${placeUrl(place)}`)}`} target="_blank" rel="noopener noreferrer"><Send size={17} />Enviar link no WhatsApp</a><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(placeUrl(place)); setMessage('Link copiado.'); } catch { setError('Não foi possível copiar. Use a opção de WhatsApp.'); } }}><Copy size={14} />Copiar link da cidade</button><p className="share-help">No celular, “Compartilhar imagem” abre os aplicativos compatíveis. No computador, a imagem pode ser baixada para anexar.</p><p className="share-help">O link usa coordenadas arredondadas, sem sua posição exata.</p>{message && <p className="success-message" role="status"><Check size={15} />{message}</p>}{error && <p className="inline-error" role="alert">{error}</p>}</div></div></Modal>;
}
