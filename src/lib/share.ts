import type { Place, Weather } from './types';
import { conditions, rounded, summarize } from './weather';

export function placeUrl(place: Place) {
  const url = new URL(window.location.origin);
  url.search = new URLSearchParams({ cidade: place.name, regiao: place.region, pais: place.country, lat: place.latitude.toFixed(2), lon: place.longitude.toFixed(2) }).toString();
  return url.toString();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 5) {
  const words = text.split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`).width > width && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word; lines++;
      if (lines >= maxLines) return;
    } else line += `${line ? ' ' : ''}${word}`;
  }
  ctx.fillText(line, x, y + lines * lineHeight);
}

export async function renderCard(place: Place, weather: Weather, format: 'square' | 'story'): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = format === 'story' ? 1920 : 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu criar a imagem.');
  const h = canvas.height, story = format === 'story';
  const bg = ctx.createLinearGradient(0, 0, 1080, h);
  bg.addColorStop(0, '#102d32'); bg.addColorStop(.55, '#0b181e'); bg.addColorStop(1, '#070d13');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, h);
  const glow = ctx.createRadialGradient(900, story ? 610 : 410, 0, 900, story ? 610 : 410, 640);
  glow.addColorStop(0, '#a8edc526'); glow.addColorStop(.6, '#5bc5c509'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, h);
  for (let i = 0; i < 12; i++) {
    ctx.beginPath(); ctx.strokeStyle = `rgba(170,222,208,${.045 + i * .003})`; ctx.lineWidth = 1.5;
    ctx.moveTo(-100, h * .6 + i * 34); ctx.bezierCurveTo(300, h * .15 + i * 50, 600, h * 1.1 + i * 12, 1200, h * .45 + i * 30); ctx.stroke();
  }
  ctx.fillStyle = '#d5f59c'; ctx.font = '800 68px "Manrope Variable", sans-serif'; ctx.fillText('✳ brisa', 80, 125);
  ctx.fillStyle = '#8eaaa6'; ctx.font = '500 22px "Manrope Variable", sans-serif'; ctx.fillText('O CLIMA, EM OUTRA PERSPECTIVA.', 80, 173);
  const top = story ? 440 : 270;
  ctx.fillStyle = '#e6ece9'; ctx.font = '600 53px "Manrope Variable", sans-serif'; wrap(ctx, place.name, 80, top, 900, 62, 2);
  ctx.fillStyle = '#92a6aa'; ctx.font = '400 23px "Manrope Variable", sans-serif';
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: weather.timezone }).format(new Date(weather.fetchedAt));
  ctx.fillText(`${date} · ${weather.current.time.slice(11, 16)}`, 80, top + 58);
  ctx.fillStyle = '#f0f4ed'; ctx.font = '500 238px "Manrope Variable", sans-serif'; ctx.fillText(`${Math.round(weather.current.temperature)}°`, 64, top + 325);
  ctx.font = '500 32px "Manrope Variable", sans-serif'; ctx.fillText(conditions(weather.current.code, weather.current.isDay).label, 85, top + 389);
  ctx.fillStyle = '#90a8ac'; ctx.font = '400 25px "Manrope Variable", sans-serif'; ctx.fillText(`Sensação ${rounded(weather.current.feelsLike, '°')}   ·   ${rounded(weather.days[0].min, '°')} — ${rounded(weather.days[0].max, '°')}`, 85, top + 436);
  const cardY = story ? 1100 : 810;
  ctx.fillStyle = '#ffffff08'; ctx.beginPath(); ctx.roundRect(75, cardY, 930, 130, 24); ctx.fill();
  [['CHUVA HOJE', rounded(weather.days[0].rain, '%')], ['VENTO', rounded(weather.current.wind, ' km/h')], ['UMIDADE', rounded(weather.current.humidity, '%')]].forEach(([label, value], i) => {
    const x = 105 + i * 305;
    ctx.fillStyle = '#8ea7a9'; ctx.font = '500 16px "Manrope Variable", sans-serif'; ctx.fillText(label, x, cardY + 39);
    ctx.fillStyle = '#eaf2ed'; ctx.font = '500 35px "Manrope Variable", sans-serif'; ctx.fillText(value, x, cardY + 89);
  });
  if (story) {
    const summary = summarize(weather);
    ctx.fillStyle = '#d5f59c'; ctx.font = '600 35px "Manrope Variable", sans-serif'; ctx.fillText(summary.title, 85, 1380);
    ctx.fillStyle = '#a3b3b5'; ctx.font = '400 28px "Manrope Variable", sans-serif'; wrap(ctx, summary.text, 85, 1440, 880, 44, 5);
  }
  ctx.fillStyle = '#7d969a'; ctx.font = '400 17px "Manrope Variable", sans-serif';
  ctx.fillText('Fonte: Open-Meteo · Previsão de modelos · Chuva em probabilidade', 80, h - 70);
  ctx.fillStyle = '#bfdc9b'; ctx.font = '600 21px "Manrope Variable", sans-serif'; ctx.fillText(window.location.host, 80, h - 33);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao exportar a imagem.')), 'image/png'));
}
