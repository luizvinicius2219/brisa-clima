import { aggregateClimate, coordinates } from '@/lib/weather';
import { apiError, upstream } from '@/lib/server';

export async function GET(request: Request) {
  let location;
  try { location = coordinates(new URL(request.url).searchParams); } catch (error) { return apiError(error, 400); }
  try {
    const endYear = new Date().getUTCFullYear() - 1, startYear = endYear - 9;
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.search = new URLSearchParams({ latitude: location.latitude.toFixed(3), longitude: location.longitude.toFixed(3), start_date: `${startYear}-01-01`, end_date: `${endYear}-12-31`, timezone: 'auto', models: 'era5', daily: 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum' }).toString();
    const data = await upstream<{ daily: Parameters<typeof aggregateClimate>[0] }>(url, 604_800);
    if (!data.daily?.time?.length) throw new Error('Não há histórico disponível para este local.');
    return Response.json(aggregateClimate(data.daily, startYear, endYear), { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch (error) { return apiError(error); }
}
