export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherCondition {
  type: string;
  description: string;
  emoji: string;
}

export interface CurrentWeatherData {
  temperature: number; // Celsius
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  uvIndex: number;
  visibility: number; // km
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGust?: number; // km/h
  pressure: number; // hPa
  isDaytime: boolean;
  condition: WeatherCondition;
  observationTime: string; // ISO
}

export interface HourlyData {
  time: string; // ISO
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationProbability: number; // 0-100
  windSpeed: number;
  uvIndex: number;
  condition: WeatherCondition;
  isDaytime: boolean;
}

export interface DailyData {
  date: string; // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  humidity: number;
  precipitationProbability: number;
  uvIndex: number;
  sunrise: string; // ISO
  sunset: string; // ISO
  condition: WeatherCondition;
  isHistory: boolean;
}

export interface PollenTypeInfo {
  code: "GRASS" | "TREE" | "WEED";
  displayName: string;
  index: number; // 0-5
  category: string;
  inSeason: boolean;
}

export interface DailyPollenData {
  date: string; // YYYY-MM-DD
  types: PollenTypeInfo[];
}

export interface WeatherApiResponse {
  current: CurrentWeatherData;
  hourly: HourlyData[];
  daily: DailyData[];
  source: "google";
  timezone: string;
}

export interface PollenApiResponse {
  daily: DailyPollenData[];
}

export interface GeocodeApiResponse {
  lat: number;
  lng: number;
  name: string;
  formattedAddress: string;
}
