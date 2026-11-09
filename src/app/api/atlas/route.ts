import { PLACES } from '@/lib/weather';
import { apiError, upstream } from '@/lib/server';

type AtlasSnapshot = {
  current?: { temperature_2m?: number; wind_speed_10m?: number | null; weather_code?: number };
  hourly?: { precipitation_probability?: (number | null)[] };
};

async function fetchSnapshots(places: typeof PLACES): Promise<(AtlasSnapshot | null)[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: places.map(p => p.latitude.toFixed(3)).join(','),
    longitude: places.map(p => p.longitude.toFixed(3)).join(','),
    current: 'temperature_2m,wind_speed_10m,weather_code',
    hourly: 'precipitation_probability',
    forecast_hours: '1',
    timezone: 'auto'
  }).toString();

  const response = await upstream<AtlasSnapshot | AtlasSnapshot[]>(url, 900);
  const snapshots = Array.isArray(response) ? response : [response];
  return places.map((_, index) => {
    const snapshot = snapshots[index];
    return Number.isFinite(snapshot?.current?.temperature_2m) && Number.isFinite(snapshot?.current?.weather_code)
      ? snapshot
      : null;
  });
}

export async function GET() {
  try {
    let snapshots: (AtlasSnapshot | null)[];
    try {
      snapshots = await fetchSnapshots(PLACES);
    } catch {
      snapshots = PLACES.map(() => null);
    }

    // Open-Meteo normally returns one batch. If that request is unavailable or
    // incomplete, retry only the missing cities in small batches so one failure
    // does not remove the entire map layer.
    const missing = PLACES.flatMap((place, index) => snapshots[index] ? [] : [{ place, index }]);
    for (let start = 0; start < missing.length; start += 4) {
      const batch = missing.slice(start, start + 4);
      try {
        const recovered = await fetchSnapshots(batch.map(item => item.place));
        batch.forEach((item, index) => { snapshots[item.index] = recovered[index]; });
      } catch {
        // Keep successful city data even if another fallback batch fails.
      }
    }

    const points = PLACES.flatMap((place, index) => {
      const snapshot = snapshots[index];
      if (!snapshot?.current || !Number.isFinite(snapshot.current.temperature_2m) || !Number.isFinite(snapshot.current.weather_code)) return [];
      return [{
        ...place,
        temperature: snapshot.current.temperature_2m!,
        wind: snapshot.current.wind_speed_10m ?? null,
        code: snapshot.current.weather_code!,
        rain: snapshot.hourly?.precipitation_probability?.[0] ?? null
      }];
    });

    if (!points.length) throw new Error('Não foi possível obter os dados dos pontos do mapa.');
    return Response.json({ points }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900' } });
  } catch (error) { return apiError(error); }
}
