import { coordinates } from '@/lib/weather';
import { apiError, getWeather } from '@/lib/server';

export async function GET(request: Request) {
  let location;
  try { location = coordinates(new URL(request.url).searchParams); } catch (error) { return apiError(error, 400); }
  try { return Response.json(await getWeather(location.latitude, location.longitude), { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } }); } catch (error) { return apiError(error); }
}
