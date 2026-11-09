import { PLACES } from '@/lib/weather';
import { apiError, upstream } from '@/lib/server';

export async function GET() {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: PLACES.map(p => p.latitude.toFixed(3)).join(','), longitude: PLACES.map(p => p.longitude.toFixed(3)).join(','), current: 'temperature_2m,wind_speed_10m,weather_code', hourly: 'precipitation_probability', forecast_hours: '1', timezone: 'auto' }).toString();
    const data = await upstream<{ current: { temperature_2m: number; wind_speed_10m: number | null; weather_code: number }; hourly: { precipitation_probability: (number | null)[] } }[]>(url, 900);
    if (!Array.isArray(data) || data.length !== PLACES.length) throw new Error('Mapa meteorológico indisponível.');
    return Response.json({ points: PLACES.flatMap((p, i) => Number.isFinite(data[i]?.current?.temperature_2m) ? [{ ...p, temperature: data[i].current.temperature_2m, wind: data[i].current.wind_speed_10m, code: data[i].current.weather_code, rain: data[i].hourly?.precipitation_probability?.[0] ?? null }] : []) }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900' } });
  } catch (error) { return apiError(error); }
}
