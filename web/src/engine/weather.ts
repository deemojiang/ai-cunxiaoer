import { api, type WeatherResponse } from '../api/client';

export const DEFAULT_LOCATION = {
  name: '长兴',
  lat: 31.026,
  lon: 119.91,
};

export type WeatherView = {
  name: string;
  temp: number;
  condition: string;
  emoji: string;
  humidity: number;
  windLabel: string;
  high: number | null;
  low: number | null;
  tip: string;
};

const WMO: Record<number, { condition: string; emoji: string }> = {
  0: { condition: '晴', emoji: '☀️' },
  1: { condition: '大部晴朗', emoji: '🌤️' },
  2: { condition: '多云', emoji: '⛅' },
  3: { condition: '阴', emoji: '☁️' },
  45: { condition: '有雾', emoji: '🌫️' },
  48: { condition: '雾凇', emoji: '🌫️' },
  51: { condition: '小毛毛雨', emoji: '🌦️' },
  53: { condition: '毛毛雨', emoji: '🌦️' },
  55: { condition: '大毛毛雨', emoji: '🌧️' },
  56: { condition: '冻毛毛雨', emoji: '🌧️' },
  57: { condition: '冻毛毛雨', emoji: '🌧️' },
  61: { condition: '小雨', emoji: '🌧️' },
  63: { condition: '中雨', emoji: '🌧️' },
  65: { condition: '大雨', emoji: '🌧️' },
  66: { condition: '冻雨', emoji: '🌧️' },
  67: { condition: '冻雨', emoji: '🌧️' },
  71: { condition: '小雪', emoji: '🌨️' },
  73: { condition: '中雪', emoji: '🌨️' },
  75: { condition: '大雪', emoji: '❄️' },
  77: { condition: '雪粒', emoji: '🌨️' },
  80: { condition: '阵雨', emoji: '🌦️' },
  81: { condition: '强阵雨', emoji: '🌧️' },
  82: { condition: '暴雨', emoji: '⛈️' },
  85: { condition: '阵雪', emoji: '🌨️' },
  86: { condition: '强阵雪', emoji: '❄️' },
  95: { condition: '雷阵雨', emoji: '⛈️' },
  96: { condition: '雷阵雨伴冰雹', emoji: '⛈️' },
  99: { condition: '强雷暴冰雹', emoji: '⛈️' },
};

export function mapWeatherCode(code: number): { condition: string; emoji: string } {
  return WMO[code] || { condition: '未知', emoji: '🌡️' };
}

function windDirLabel(deg: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return `${dirs[Math.round(deg / 45) % 8]}风`;
}

/** Open-Meteo wind_speed_10m 默认单位 km/h → 风力等级 */
function windLevel(kmh: number): number {
  if (kmh < 1) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  if (kmh < 62) return 7;
  return 8;
}

function buildTip(code: number, temp: number): string {
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
    return '☔ 有雨，出门记得带伞；暂缓晾晒与田间作业。';
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return '❄️ 有雪或道路湿滑，注意保暖与出行安全。';
  }
  if (temp >= 33) return '🥵 天气较热，注意防暑补水，午间少做户外重活。';
  if (temp <= 5) return '🧥 天气较冷，注意添衣保暖，保护作物与禽畜。';
  if ([0, 1, 2].includes(code)) return '👕 天气不错，适合晾晒农作物和户外农事。';
  return '🌤️ 注意关注天气变化，合理安排农事与出行。';
}

export function toWeatherView(res: WeatherResponse): WeatherView {
  const { condition, emoji } = mapWeatherCode(res.current.weather_code);
  const level = windLevel(res.current.wind_speed_10m);
  const dir = windDirLabel(res.current.wind_direction_10m);
  return {
    name: res.name,
    temp: Math.round(res.current.temperature_2m),
    condition,
    emoji,
    humidity: Math.round(res.current.relative_humidity_2m),
    windLabel: `${dir} ${level}级`,
    high: res.daily.temperature_2m_max != null ? Math.round(res.daily.temperature_2m_max) : null,
    low: res.daily.temperature_2m_min != null ? Math.round(res.daily.temperature_2m_min) : null,
    tip: buildTip(res.current.weather_code, res.current.temperature_2m),
  };
}

/** 浏览器定位；失败/超时则回落长兴 */
export function resolveLocation(timeoutMs = 4000): Promise<{ name: string; lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ...DEFAULT_LOCATION });
      return;
    }
    let settled = false;
    const done = (loc: { name: string; lat: number; lon: number }) => {
      if (settled) return;
      settled = true;
      resolve(loc);
    };
    const timer = setTimeout(() => done({ ...DEFAULT_LOCATION }), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        done({
          name: '当前位置',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        clearTimeout(timer);
        done({ ...DEFAULT_LOCATION });
      },
      { enableHighAccuracy: false, timeout: timeoutMs - 200, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export async function fetchLiveWeather(): Promise<WeatherView> {
  const loc = await resolveLocation();
  const res = await api.weather(loc.lat, loc.lon, loc.name);
  return toWeatherView(res);
}
