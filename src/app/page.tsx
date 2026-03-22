"use client";

import { useState, useEffect } from "react";
import LocationSearch from "@/components/LocationSearch";
import CurrentWeather from "@/components/CurrentWeather";
import HourlyForecast from "@/components/HourlyForecast";
import WeeklyForecast from "@/components/WeeklyForecast";
import OutdoorSummary from "@/components/OutdoorSummary";
import { isToday, parseISO } from "date-fns";
import {
  GeocodeApiResponse,
  WeatherApiResponse,
  PollenApiResponse,
} from "@/types/weather";
import { Thermometer } from "lucide-react";

type Unit = "F" | "C";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white/10 ${className ?? ""}`} />
  );
}

export default function Home() {
  const [location, setLocation] = useState<GeocodeApiResponse | null>(null);
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [pollen, setPollen] = useState<PollenApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnitState] = useState<Unit>("F");

  useEffect(() => {
    const stored = localStorage.getItem("unit");
    if (stored === "C" || stored === "F") setUnitState(stored);
  }, []);

  async function loadData(loc: GeocodeApiResponse) {
    setLocation(loc);
    setLoading(true);
    setError("");
    setWeather(null);
    setPollen(null);

    const [weatherRes, pollenRes] = await Promise.allSettled([
      fetch(`/api/weather?lat=${loc.lat}&lng=${loc.lng}`),
      fetch(`/api/pollen?lat=${loc.lat}&lng=${loc.lng}`),
    ]);

    setLoading(false);

    if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
      setWeather(await weatherRes.value.json());
    } else {
      setError("Could not load weather data. Check your API keys.");
    }

    if (pollenRes.status === "fulfilled" && pollenRes.value.ok) {
      setPollen(await pollenRes.value.json());
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `/api/geocode?lat=${coords.latitude}&lng=${coords.longitude}`
        );
        if (!res.ok) return;
        const loc: GeocodeApiResponse = await res.json();
        loadData(loc);
      } catch {
        // Silent fail — user can search manually
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-900/60 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <LocationSearch onLocation={loadData} />
          </div>
          <button
            onClick={() => {
              const next = unit === "F" ? "C" : "F";
              localStorage.setItem("unit", next);
              setUnitState(next);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors flex-none"
            title="Toggle temperature unit"
          >
            <Thermometer className="size-3.5" />
            °{unit}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {!loading && !weather && !error && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <span className="text-7xl">🌤️</span>
            <h1 className="text-2xl font-semibold text-white">Weather + Pollen</h1>
            <p className="text-white/50 max-w-xs">
              Search for a city or zip code, or allow location access to get started.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-52" />
            <Skeleton className="h-72" />
            <Skeleton className="h-48" />
          </div>
        )}

        {!loading && weather && location && (
          <>
            <CurrentWeather
              data={weather.current}
              location={location.name}
              unit={unit}
              pollen={pollen?.daily.find((d) => isToday(parseISO(d.date))) ?? pollen?.daily[0]}
              summary={
                <OutdoorSummary
                  daily={weather.daily}
                  pollen={pollen?.daily ?? []}
                  unit={unit}
                />
              }
            />
            <p className="text-right text-white/25 text-xs -mt-2">
              weather via Google Weather
              {" · "}pollen via Google
            </p>
            <HourlyForecast data={weather.hourly} unit={unit} />
            <WeeklyForecast data={weather.daily} pollen={pollen?.daily ?? []} unit={unit} />
          </>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-white/20 text-xs">
        Weather · Pollen via Google Weather API
      </footer>
    </div>
  );
}
