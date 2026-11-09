export type Place = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type Hour = {
  time: string;
  temperature: number;
  rain: number | null;
  precipitation: number | null;
  wind: number | null;
  uv: number | null;
  code: number;
  isDay: boolean;
};

export type Day = {
  date: string;
  min: number;
  max: number;
  mean: number;
  rain: number | null;
  precipitation: number | null;
  code: number;
  sunrise: string;
  sunset: string;
  uv: number | null;
};

export type Weather = {
  latitude: number;
  longitude: number;
  timezone: string;
  fetchedAt: string;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number | null;
    wind: number | null;
    windDirection: number | null;
    pressure: number | null;
    cloud: number | null;
    code: number;
    isDay: boolean;
  };
  hours: Hour[];
  days: Day[];
};

export type Climate = {
  startYear: number;
  endYear: number;
  source: string;
  months: { month: number; temperature: number | null; max: number | null; min: number | null; rain: number | null; samples: number }[];
};

export type MapPoint = Place & { temperature: number; rain: number | null; wind: number | null; code: number };
export type MapLayer = 'temperature' | 'rain' | 'wind';
