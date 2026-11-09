import type { Weather } from './types';

type ForecastResponse = {
  latitude: number; longitude: number; timezone: string;
  current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number | null; wind_speed_10m: number | null; wind_direction_10m: number | null; pressure_msl: number | null; cloud_cover: number | null; weather_code: number; is_day: number };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; precipitation: (number | null)[]; wind_speed_10m: (number | null)[]; uv_index: (number | null)[]; weather_code: number[]; is_day: number[] };
  daily: { time: string[]; temperature_2m_min: number[]; temperature_2m_max: number[]; temperature_2m_mean: number[]; precipitation_probability_max: (number | null)[]; precipitation_sum: (number | null)[]; weather_code: number[]; sunrise: string[]; sunset: string[]; uv_index_max: (number | null)[] };
};

export async function upstream<T>(url: URL, revalidate = 600): Promise<T> {
  const response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(response.status === 429 ? 'A fonte de dados está ocupada. Tente novamente em instantes.' : 'A fonte meteorológica está temporariamente indisponível.');
  return response.json() as Promise<T>;
}

export async function getWeather(latitude: number, longitude: number): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: latitude.toFixed(3), longitude: longitude.toFixed(3), timezone: 'auto', forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,weather_code,is_day',
    hourly: 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,uv_index,weather_code,is_day',
    daily: 'temperature_2m_min,temperature_2m_max,temperature_2m_mean,precipitation_probability_max,precipitation_sum,weather_code,sunrise,sunset,uv_index_max'
  }).toString();
  const data = await upstream<ForecastResponse>(url, 300);
  if (!data.current || !Number.isFinite(data.current.temperature_2m) || !data.hourly?.time?.length || !data.daily?.time?.length) throw new Error('A fonte não retornou uma previsão completa para este local.');
  const c = data.current;
  return {
    latitude: data.latitude, longitude: data.longitude, timezone: data.timezone, fetchedAt: new Date().toISOString(),
    current: { time: c.time, temperature: c.temperature_2m, feelsLike: c.apparent_temperature, humidity: c.relative_humidity_2m, wind: c.wind_speed_10m, windDirection: c.wind_direction_10m, pressure: c.pressure_msl, cloud: c.cloud_cover, code: c.weather_code, isDay: c.is_day === 1 },
    hours: data.hourly.time.map((time, i) => ({ time, temperature: data.hourly.temperature_2m[i], rain: data.hourly.precipitation_probability[i], precipitation: data.hourly.precipitation[i], wind: data.hourly.wind_speed_10m[i], uv: data.hourly.uv_index[i], code: data.hourly.weather_code[i], isDay: data.hourly.is_day[i] === 1 })),
    days: data.daily.time.map((date, i) => ({ date, min: data.daily.temperature_2m_min[i], max: data.daily.temperature_2m_max[i], mean: data.daily.temperature_2m_mean[i], rain: data.daily.precipitation_probability_max[i], precipitation: data.daily.precipitation_sum[i], code: data.daily.weather_code[i], sunrise: data.daily.sunrise[i], sunset: data.daily.sunset[i], uv: data.daily.uv_index_max[i] }))
  };
}

export function apiError(error: unknown, status = 502) {
  return Response.json({ error: error instanceof Error && !/fetch failed|abort|timeout/i.test(error.message) ? error.message : 'Não foi possível consultar os dados agora. Tente novamente.' }, { status });
}
