"use client";

import { DailyData, DailyPollenData } from "@/types/weather";
import { formatTempNum, getPollenColor } from "@/lib/weather-utils";
import { format, isToday, isPast, parseISO } from "date-fns";

const POLLEN_EMOJI: Record<string, string> = { TREE: "🌳", GRASS: "🌿", WEED: "🌾" };

interface Props {
  data: DailyData[];
  pollen: DailyPollenData[];
  unit: "F" | "C";
}

export default function WeeklyForecast({ data, pollen, unit }: Props) {
  // Determine overall temp range for bar scaling
  const allTemps = data.flatMap((d) => [d.tempMin, d.tempMax]);
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const range = globalMax - globalMin || 1;

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-1">
      <h2 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
        10-Day Forecast
      </h2>
      {data.map((day) => {
        const date = parseISO(day.date);
        const past = isPast(date) && !isToday(date);
        const today = isToday(date);

        const minPct = ((day.tempMin - globalMin) / range) * 100;
        const maxPct = ((day.tempMax - globalMin) / range) * 100;

        const pollenDay = pollen.find((p) => p.date === day.date);
        const highestPollen = pollenDay?.types.reduce(
          (a, b) => (b.index > a.index ? b : a),
          { index: 0 } as { index: number; code?: string; category?: string }
        );
        const showPollen = highestPollen && highestPollen.index >= 3;

        return (
          <div
            key={day.date}
            className={`flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 ${past ? "opacity-50" : ""}`}
          >
            {/* Day label */}
            <div className="w-16 flex-none">
              <span className={`text-sm font-medium ${today ? "text-blue-300" : "text-white"}`}>
                {today ? "Today" : format(date, "EEE")}
              </span>
              {past && (
                <span className="block text-xs text-white/40">Past</span>
              )}
            </div>

            {/* Condition */}
            <span className="text-xl w-8 text-center flex-none" role="img">
              {day.condition.emoji}
            </span>

            {/* Precip */}
            <div className="w-10 flex-none text-right">
              {day.precipitationProbability > 5 ? (
                <span className="text-blue-300 text-xs">
                  {day.precipitationProbability}%
                </span>
              ) : (
                <span className="text-white/0 text-xs">0%</span>
              )}
            </div>

            {/* Pollen */}
            <div className="w-14 flex-none flex items-center gap-1">
              {showPollen && (
                <>
                  <span className="text-xs">{POLLEN_EMOJI[(highestPollen as { code?: string }).code ?? ""] ?? "🌿"}</span>
                  <span className="text-xs font-medium" style={{ color: getPollenColor(highestPollen.index) }}>
                    {highestPollen.category ?? "Mod"}
                  </span>
                </>
              )}
            </div>

            {/* Temp bar */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-white/60 text-sm w-8 text-right">
                {formatTempNum(day.tempMin, unit)}°
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 relative">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                  style={{
                    left: `${Math.max(0, minPct)}%`,
                    width: `${Math.max(4, maxPct - minPct)}%`,
                  }}
                />
              </div>
              <span className="text-white text-sm w-8">
                {formatTempNum(day.tempMax, unit)}°
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
