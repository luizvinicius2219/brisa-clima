import { apiError, upstream } from '@/lib/server';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < 2) return Response.json({ places: [] });
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: q, count: '7', language: 'pt', format: 'json' }).toString();
    const data = await upstream<{ results?: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] }>(url, 86_400);
    return Response.json({ places: (data.results ?? []).map(p => ({ id: String(p.id), name: p.name, region: p.admin1 ?? '', country: p.country ?? '', latitude: p.latitude, longitude: p.longitude })) });
  } catch (error) { return apiError(error); }
}
