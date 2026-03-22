import { type NextRequest } from "next/server";
import {
  WeatherApiResponse,
  CurrentWeatherData,
  HourlyData,
  DailyData,
} from "@/types/weather";
import {
  buildCondition,
  dateToYMD,
} from "@/lib/weather-utils";
// ── Google Weather API ──────────────────────────────────────────────────────

const GOOGLE_WEATHER_BASE = "https://weather.googleapis.com/v1";

function googleConditionToEmoji(type: string, isDaytime: boolean) {
  return buildCondition(type, type.replace(/_/g, " ").toLowerCase(), isDaytime);
}

async function fetchGoogleWeather(
  lat: string,
  lng: string,
  apiKey: string
): Promise<WeatherApiResponse> {
  const baseParams = `location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`;

  const [currentRes, hourlyRes, dailyRes, historyRes] = await Promise.all([
    fetch(`${GOOGLE_WEATHER_BASE}/currentConditions:lookup?${baseParams}&languageCode=en`, { next: { revalidate: 600 } }),
    fetch(`${GOOGLE_WEATHER_BASE}/forecast/hours:lookup?${baseParams}&pageSize=48`, { next: { revalidate: 1800 } }),
    fetch(`${GOOGLE_WEATHER_BASE}/forecast/days:lookup?${baseParams}&pageSize=11`, { next: { revalidate: 3600 } }),
    fetch(`${GOOGLE_WEATHER_BASE}/history/hours:lookup?${baseParams}&pageSize=120`, { next: { revalidate: 86400 } }),
  ]);

  if (!currentRes.ok) {
    throw new Error(`Google Weather current conditions error: ${currentRes.status}`);
  }

  const [currentData, hourlyData, dailyData, historyData] = await Promise.all([
    currentRes.json(),
    hourlyRes.ok ? hourlyRes.json() : null,
    dailyRes.ok ? dailyRes.json() : null,
    historyRes.ok ? historyRes.json() : null,
  ]);

  // Log daily response keys to diagnose field name issues
  if (dailyData) {
    console.log("[Google] daily response keys:", Object.keys(dailyData));
  } else {
    console.warn("[Google] daily response failed:", dailyRes.status);
  }

  // ── Current ──
  const cc = currentData;
  const current: CurrentWeatherData = {
    temperature: cc.temperature?.degrees ?? 0,
    feelsLike: cc.feelsLikeTemperature?.degrees ?? cc.temperature?.degrees ?? 0,
    humidity: cc.relativeHumidity ?? 0,
    dewPoint: cc.dewPoint?.degrees ?? 0,
    uvIndex: cc.uvIndex ?? 0,
    visibility: cc.visibility?.distance ?? 10,
    windSpeed: cc.wind?.speed?.value ?? 0,
    windDirection: cc.wind?.direction?.degrees ?? 0,
    windGust: cc.wind?.gust?.value,
    pressure: cc.airPressure?.meanSeaLevelMillibars ?? 1013,
    isDaytime: cc.isDaytime ?? true,
    condition: googleConditionToEmoji(
      cc.weatherCondition?.type ?? "PARTLY_CLOUDY",
      cc.isDaytime ?? true
    ),
    observationTime: cc.currentTime ?? new Date().toISOString(),
  };

  // ── Hourly ──
  const hourly: HourlyData[] = (hourlyData?.forecastHours ?? [])
    .slice(0, 48)
    .map((h: Record<string, unknown>) => ({
      time: (h.interval as Record<string, string>)?.startTime ?? "",
      temperature: (h.temperature as Record<string, number>)?.degrees ?? 0,
      feelsLike: (h.feelsLikeTemperature as Record<string, number>)?.degrees ?? 0,
      humidity: (h.relativeHumidity as number) ?? 0,
      precipitationProbability: (h.precipitation as Record<string, Record<string, number>>)?.probability?.percent ?? 0,
      windSpeed: ((h.wind as Record<string, Record<string, number>>)?.speed?.value ?? 0),
      uvIndex: (h.uvIndex as number) ?? 0,
      condition: googleConditionToEmoji(
        ((h.weatherCondition as Record<string, string>)?.type ?? "PARTLY_CLOUDY"),
        (h.isDaytime as boolean) ?? true
      ),
      isDaytime: (h.isDaytime as boolean) ?? true,
    }));

  // ── Daily forecast — try multiple possible field names ──
  const rawForecastDays: Record<string, unknown>[] =
    dailyData?.forecastDays ??
    dailyData?.days ??
    dailyData?.dailyForecasts ??
    [];

  const forecastDays: DailyData[] = rawForecastDays.map((d) => {
    const daytime = d.daytimeForecast as Record<string, unknown> | undefined;
    const wc = (daytime?.weatherCondition ?? d.weatherCondition) as Record<string, unknown> | undefined;

    // Try multiple date sources
    const startTime = (d.interval as Record<string, string>)?.startTime ?? (d.startTime as string);
    const date = startTime
      ? dateToYMD(new Date(startTime))
      : (d.date as string) ?? "";

    return {
      date,
      tempMin: (d.minTemperature as Record<string, number>)?.degrees ?? 0,
      tempMax: (d.maxTemperature as Record<string, number>)?.degrees ?? 0,
      humidity: (daytime?.relativeHumidity as number) ?? 0,
      precipitationProbability: ((daytime?.precipitation as Record<string, Record<string, number>>)?.probability?.percent) ?? 0,
      uvIndex: (daytime?.uvIndex as number) ?? 0,
      sunrise: (d.sunEvents as Record<string, string>)?.sunriseTime ?? "",
      sunset: (d.sunEvents as Record<string, string>)?.sunsetTime ?? "",
      condition: googleConditionToEmoji(
        (wc?.type as string) ?? "PARTLY_CLOUDY",
        true
      ),
      isHistory: false,
    };
  });

  // ── Historical: aggregate hourly → daily ──
  const historyDays: DailyData[] = [];
  if (historyData?.historyHours?.length) {
    const byDay: Record<string, typeof historyData.historyHours> = {};
    for (const h of historyData.historyHours) {
      const day = dateToYMD(new Date(h.interval?.startTime ?? ""));
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(h);
    }
    for (const [day, hours] of Object.entries(byDay)) {
      const temps = hours.map((h: Record<string, Record<string, number>>) => h.temperature?.degrees ?? 0);
      const humidities = hours.map((h: Record<string, number>) => h.relativeHumidity ?? 0);
      const midHour = hours[Math.floor(hours.length / 2)];
      historyDays.push({
        date: day,
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        humidity: Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length),
        precipitationProbability: 0,
        uvIndex: 0,
        sunrise: "",
        sunset: "",
        condition: googleConditionToEmoji(
          midHour?.weatherCondition?.type ?? "PARTLY_CLOUDY",
          true
        ),
        isHistory: true,
      });
    }
  }

  const today = dateToYMD(new Date());
  const allDays = [...historyDays, ...forecastDays]
    .filter((d) => d.date && d.date !== "NaN-NaN-NaN")
    .filter((d, i, arr) => arr.findIndex((x) => x.date === d.date) === i)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((d) => {
      const diff = (new Date(d.date).getTime() - new Date(today).getTime()) / 86400000;
      return diff >= -5 && diff <= 10;
    });

  console.log(`[Google] parsed ${forecastDays.length} forecast days, ${historyDays.length} history days, ${allDays.filter(d => d.date >= today).length} future days`);

  if (allDays.filter((d) => d.date >= today).length < 3) {
    throw new Error("Google Weather API returned insufficient daily forecast data");
  }

  return {
    current,
    hourly,
    daily: allDays,
    source: "google",
    timezone: "UTC",
  };
}

// ── Route Handler ───────────────────────────────────────────────────────────

const WEATHER_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const rLat = parseFloat(parseFloat(lat).toFixed(2)).toString();
  const rLng = parseFloat(parseFloat(lng).toFixed(2)).toString();

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) {
    return Response.json({ error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const data = await fetchGoogleWeather(rLat, rLng, googleKey);
    return Response.json(data, { headers: WEATHER_CACHE_HEADERS });
  } catch (err) {
    console.error("Google Weather failed:", err);
    return Response.json({ error: "Could not load weather data" }, { status: 502 });
  }
}
