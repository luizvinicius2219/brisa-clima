import type { Climate, Hour, Place, Weather } from './types.ts';

export const PLACES: Place[] = [
  { id: 'recife', name: 'Recife', region: 'Pernambuco', country: 'Brasil', latitude: -8.0543, longitude: -34.8813 },
  { id: 'sao-paulo', name: 'São Paulo', region: 'São Paulo', country: 'Brasil', latitude: -23.5505, longitude: -46.6333 },
  { id: 'rio', name: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brasil', latitude: -22.9068, longitude: -43.1729 },
  { id: 'fortaleza', name: 'Fortaleza', region: 'Ceará', country: 'Brasil', latitude: -3.7172, longitude: -38.5433 },
  { id: 'salvador', name: 'Salvador', region: 'Bahia', country: 'Brasil', latitude: -12.9714, longitude: -38.5014 },
  { id: 'natal', name: 'Natal', region: 'Rio Grande do Norte', country: 'Brasil', latitude: -5.7945, longitude: -35.211 },
  { id: 'joao-pessoa', name: 'João Pessoa', region: 'Paraíba', country: 'Brasil', latitude: -7.115, longitude: -34.8631 },
  { id: 'maceio', name: 'Maceió', region: 'Alagoas', country: 'Brasil', latitude: -9.6658, longitude: -35.7353 },
  { id: 'brasilia', name: 'Brasília', region: 'Distrito Federal', country: 'Brasil', latitude: -15.7939, longitude: -47.8828 },
  { id: 'manaus', name: 'Manaus', region: 'Amazonas', country: 'Brasil', latitude: -3.119, longitude: -60.0217 },
  { id: 'curitiba', name: 'Curitiba', region: 'Paraná', country: 'Brasil', latitude: -25.4284, longitude: -49.2733 },
  { id: 'porto-alegre', name: 'Porto Alegre', region: 'Rio Grande do Sul', country: 'Brasil', latitude: -30.0346, longitude: -51.2177 }
];

export function coordinates(params: URLSearchParams): { latitude: number; longitude: number } {
  const lat = params.get('lat');
  const lon = params.get('lon');
  if (lat === null || lon === null || !lat.trim() || !lon.trim()) throw new Error('Informe uma localização válida.');
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Coordenadas inválidas.');
  return { latitude: Number(latitude.toFixed(3)), longitude: Number(longitude.toFixed(3)) };
}

export function conditions(code: number, isDay = true): { label: string; kind: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog' | 'moon' } {
  if (code === 0) return { label: isDay ? 'Céu limpo' : 'Noite de céu limpo', kind: isDay ? 'sun' : 'moon' };
  if (code <= 2) return { label: 'Entre nuvens', kind: isDay ? 'cloud-sun' : 'moon' };
  if (code === 3) return { label: 'Céu nublado', kind: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Névoa', kind: 'fog' };
  if (code >= 95) return { label: 'Trovoadas', kind: 'storm' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Neve', kind: 'snow' };
  if (code >= 51) return { label: code < 60 ? 'Garoa' : 'Chuva', kind: 'rain' };
  return { label: 'Condição indisponível', kind: 'cloud' };
}

export const rounded = (value: number | null | undefined, suffix = '') => value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)}${suffix}`;
export const timeLabel = (time: string) => time.slice(11, 16);
export const hourLabel = (time: string) => `${time.slice(11, 13)}h`;
export const dayLabel = (date: string, index: number) => index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
export const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function upcomingHours(weather: Weather, count = 24) {
  return weather.hours.filter(h => h.time >= `${weather.current.time.slice(0, 13)}:00`).slice(0, count);
}

export function bestWindow(hours: Hour[]): { start: Hour; end: Hour; score: number; ideal: boolean } | null {
  let best: { start: Hour; end: Hour; score: number; ideal: boolean } | null = null;
  for (let i = 0; i < Math.min(hours.length - 1, 24); i++) {
    const pair = [hours[i], hours[i + 1]];
    if (pair.some(h => !h.isDay || h.rain === null || h.wind === null || h.uv === null || h.code >= 95)) continue;
    const score = pair.reduce((sum, h) => sum + (h.rain ?? 100) * 1.4 + Math.abs(h.temperature - 24) * 3 + Math.max(0, (h.wind ?? 0) - 20) * 2 + Math.max(0, (h.uv ?? 0) - 5) * 7, 0);
    const ideal = pair.every(h => (h.rain ?? 100) < 30 && (h.wind ?? 100) < 30 && (h.uv ?? 100) < 6 && h.temperature < 34 && h.temperature > 10);
    if (!best || score < best.score) best = { start: pair[0], end: pair[1], score, ideal };
  }
  return best;
}

export function summarize(weather: Weather) {
  const hours = upcomingHours(weather, 12);
  const rainy = hours.find(h => h.rain !== null && h.rain >= 50);
  const maxRain = Math.max(...hours.map(h => h.rain ?? -1));
  if (weather.current.code >= 95) return { title: 'O céu pede atenção.', text: 'Há indicação de trovoadas no modelo. Consulte os avisos oficiais da sua região antes de sair.', mood: 'storm' };
  if (rainy) return { title: 'Um guarda-chuva vai bem.', text: `A chance de chuva chega a ${Math.round(rainy.rain!)}% às ${hourLabel(rainy.time)}. Planeje os próximos passos olhando o céu.`, mood: 'rain' };
  if (weather.current.temperature >= 30) return { title: 'O calor dá o tom.', text: `Sensação de ${rounded(weather.current.feelsLike, '°')}. ${maxRain >= 0 && maxRain < 30 ? 'Baixa probabilidade de chuva nas próximas horas.' : 'Confira a previsão por hora para planejar o dia.'}`, mood: 'warm' };
  if (!weather.current.isDay) return { title: 'A noite tem seu ritmo.', text: `${conditions(weather.current.code, false).label}, ${rounded(weather.current.temperature, '°')} e vento de ${rounded(weather.current.wind, ' km/h')}. Veja o que o céu reserva para amanhã.`, mood: 'night' };
  return { title: 'Respira. Olha o céu.', text: `${conditions(weather.current.code).label} e ${rounded(weather.current.temperature, '°')} agora. ${maxRain >= 0 && maxRain < 30 ? 'O modelo aponta baixa chance de chuva nas próximas horas.' : 'Acompanhe as mudanças na previsão ao longo do dia.'}`, mood: 'mild' };
}

export function aggregateClimate(daily: { time: string[]; temperature_2m_mean: (number | null)[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] }, startYear: number, endYear: number): Climate {
  const avg = (values: (number | null)[]) => { const valid = values.filter((n): n is number => n !== null && Number.isFinite(n)); return valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)) : null; };
  const months = Array.from({ length: 12 }, (_, month) => {
    const indices = daily.time.flatMap((date, i) => Number(date.slice(5, 7)) === month + 1 ? [i] : []);
    const rainByYear = new Map<number, number[]>();
    for (const i of indices) {
      const year = Number(daily.time[i].slice(0, 4));
      const n = daily.precipitation_sum[i];
      if (n !== null && Number.isFinite(n)) rainByYear.set(year, [...(rainByYear.get(year) ?? []), n]);
    }
    const completeTotals = Array.from(rainByYear.entries()).flatMap(([year, values]) => values.length === new Date(Date.UTC(year, month + 1, 0)).getUTCDate() ? [values.reduce((a, b) => a + b, 0)] : []);
    return { month, temperature: avg(indices.map(i => daily.temperature_2m_mean[i])), max: avg(indices.map(i => daily.temperature_2m_max[i])), min: avg(indices.map(i => daily.temperature_2m_min[i])), rain: avg(completeTotals), samples: indices.filter(i => daily.temperature_2m_mean[i] !== null).length };
  });
  return { startYear, endYear, source: 'Open-Meteo · reanálise ERA5', months };
}
