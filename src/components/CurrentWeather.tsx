"use client";

import { CurrentWeatherData, DailyPollenData } from "@/types/weather";
import {
  formatTempNum,
  getUvLabel,
  formatTemp,
  getPollenColor,
} from "@/lib/weather-utils";
import { Droplets, Sun } from "lucide-react";

const POLLEN_EMOJI: Record<string, string> = { TREE: "🌳", GRASS: "🌿", WEED: "🌾" };

interface Props {
  data: CurrentWeatherData;
  location: string;
  unit: "F" | "C";
  pollen?: DailyPollenData | null;
  summary?: React.ReactNode;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-white font-semibold text-lg leading-none">{value}</div>
      {sub && <div className="text-white/50 text-xs">{sub}</div>}
    </div>
  );
}

export default function CurrentWeather({ data, location, unit, pollen, summary }: Props) {
  const temp = formatTempNum(data.temperature, unit);
  const feelsLike = formatTemp(data.feelsLike, unit);

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="flex items-stretch gap-4 py-4">
        {/* Left: big temp */}
        <div className="flex-1">
          <p className="text-white/70 text-sm font-medium mb-3">{location}</p>
          <div className="flex items-center gap-4">
            <span className="text-7xl leading-none" role="img" aria-label={data.condition.description}>
              {data.condition.emoji}
            </span>
            <div>
              <div className="text-7xl font-thin text-white leading-none">{temp}°</div>
              <div className="text-white/70 text-base capitalize mt-1">{data.condition.description}</div>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-3">
            Feels like {feelsLike} · {data.isDaytime ? "Day" : "Night"}
          </p>
        </div>

        {/* Right: outdoor summary */}
        {summary && (
          <div className="border-l border-white/10 pl-4 flex-1 flex flex-col justify-center">
            {summary}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Droplets className="size-3.5" />}
          label="Humidity"
          value={`${data.humidity}%`}
        />
        <StatCard
          icon={<Sun className="size-3.5" />}
          label="UV Index"
          value={`${data.uvIndex}`}
          sub={getUvLabel(data.uvIndex)}
        />
      </div>

      {/* Pollen — only shown when at least one type is Moderate (3+) */}
      {(() => {
        if (!pollen || !pollen.types.length) return null;
        const highest = pollen.types.reduce((a, b) => (b.index > a.index ? b : a));
        if (highest.index < 3) return null;
        const elevated = pollen.types.filter((t) => t.index >= 3);
        const color = getPollenColor(highest.index);
        return (
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5">
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">Pollen</span>
            <span className="text-base">{elevated.map((t) => POLLEN_EMOJI[t.code]).join(" ")}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(highest.index / 5) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-semibold" style={{ color }}>{highest.category}</span>
          </div>
        );
      })()}
    </div>
  );
}
