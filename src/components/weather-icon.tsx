import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from 'lucide-react';
import { conditions } from '@/lib/weather';

export function WeatherIcon({ code, isDay = true, size = 26, className = '' }: { code: number; isDay?: boolean; size?: number; className?: string }) {
  const kind = conditions(code, isDay).kind;
  const Icon = { sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, rain: CloudRain, storm: CloudLightning, snow: CloudSnow, fog: CloudFog, moon: Moon }[kind];
  return <Icon size={size} strokeWidth={1.5} className={`weather-icon weather-${kind} ${className}`} aria-label={conditions(code, isDay).label} role="img" />;
}
