import { WeatherCondition } from "@/types/weather";

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function formatTemp(celsius: number, unit: "F" | "C"): string {
  return unit === "F"
    ? `${celsiusToFahrenheit(celsius)}°F`
    : `${Math.round(celsius)}°C`;
}

export function formatTempNum(celsius: number, unit: "F" | "C"): number {
  return unit === "F" ? celsiusToFahrenheit(celsius) : Math.round(celsius);
}

export function metersPerSecToKmh(mps: number): number {
  return mps * 3.6;
}

export function getConditionEmoji(type: string, isDaytime = true): string {
  const t = type.toUpperCase();
  if (t.includes("TORNADO")) return "🌪️";
  if (t.includes("HURRICANE") || t.includes("TROPICAL_STORM")) return "🌀";
  if (t.includes("THUNDERSTORM") || t.includes("THUNDER")) return "⛈️";
  if (t.includes("BLIZZARD")) return "🌨️";
  if (t.includes("SNOW") || t.includes("SNOWY")) return "❄️";
  if (t.includes("SLEET") || t.includes("HAIL") || t.includes("FREEZING_RAIN")) return "🌨️";
  if (t.includes("HEAVY_RAIN") || (t.includes("RAIN") && !t.includes("LIGHT"))) return "🌧️";
  if (t.includes("DRIZZLE") || t.includes("LIGHT_RAIN") || t.includes("SHOWER")) return "🌦️";
  if (t.includes("FOG") || t.includes("MIST") || t.includes("HAZE") || t.includes("SMOKE")) return "🌫️";
  if (t.includes("WINDY") || t.includes("BREEZY")) return "💨";
  if (t.includes("SUNNY") || (t.includes("CLEAR") && isDaytime)) return "☀️";
  if (t.includes("CLEAR") && !isDaytime) return "🌙";
  if (t.includes("MOSTLY_SUNNY") || t.includes("MOSTLY SUNNY")) return "🌤️";
  if (t.includes("PARTLY_CLOUDY") || t.includes("PARTLY CLOUDY")) return isDaytime ? "⛅" : "🌙";
  if (t.includes("MOSTLY_CLOUDY") || t.includes("MOSTLY CLOUDY")) return "🌥️";
  if (t.includes("OVERCAST") || t.includes("CLOUDY") || t.includes("CLOUD")) return "☁️";
  // OWM icon codes (e.g. "01d", "13n")
  if (t.startsWith("01")) return isDaytime ? "☀️" : "🌙";
  if (t.startsWith("02")) return isDaytime ? "⛅" : "🌙";
  if (t.startsWith("03") || t.startsWith("04")) return "☁️";
  if (t.startsWith("09")) return "🌧️";
  if (t.startsWith("10")) return "🌦️";
  if (t.startsWith("11")) return "⛈️";
  if (t.startsWith("13")) return "❄️";
  if (t.startsWith("50")) return "🌫️";
  return isDaytime ? "🌤️" : "🌙";
}

export function buildCondition(type: string, description: string, isDaytime = true): WeatherCondition {
  return {
    type,
    description,
    emoji: getConditionEmoji(type, isDaytime),
  };
}

export function getPollenColor(index: number): string {
  switch (index) {
    case 0: return "#6b7280"; // gray
    case 1: return "#22c55e"; // green
    case 2: return "#84cc16"; // lime
    case 3: return "#eab308"; // yellow
    case 4: return "#f97316"; // orange
    case 5: return "#ef4444"; // red
    default: return "#6b7280";
  }
}

export function getPollenCategory(index: number): string {
  const cats = ["None", "Very Low", "Low", "Moderate", "High", "Very High"];
  return cats[Math.min(index, 5)] ?? "Unknown";
}

export function getUvLabel(uvi: number): string {
  if (uvi < 3) return "Low";
  if (uvi < 6) return "Moderate";
  if (uvi < 8) return "High";
  if (uvi < 11) return "Very High";
  return "Extreme";
}

export function getWindDirection(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(degrees / 45) % 8];
}

export function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

export function dateToYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}
