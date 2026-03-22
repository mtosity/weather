"use client";

import { DailyPollenData, PollenTypeInfo } from "@/types/weather";
import { getPollenColor } from "@/lib/weather-utils";
import { format, parseISO, isToday } from "date-fns";

interface Props {
  data: DailyPollenData[];
}

const POLLEN_EMOJI: Record<string, string> = {
  TREE: "🌳",
  GRASS: "🌿",
  WEED: "🌾",
};

function PollenBar({ index, category }: { index: number; category: string }) {
  const color = getPollenColor(index);
  const pct = (index / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{category}</span>
        <span className="text-white/40">{index}/5</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function TypeCard({ type }: { type: PollenTypeInfo }) {
  const color = getPollenColor(type.index);
  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-3 flex-1 min-w-[140px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{POLLEN_EMOJI[type.code]}</span>
          <div>
            <p className="text-white text-sm font-medium">{type.displayName}</p>
            {type.inSeason && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300">
                In season
              </span>
            )}
          </div>
        </div>
        <span
          className="text-2xl font-bold"
          style={{ color }}
        >
          {type.index}
        </span>
      </div>
      <PollenBar index={type.index} category={type.category} />
    </div>
  );
}

export default function PollenTracker({ data }: Props) {
  if (!data.length) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide mb-3">
          Pollen Tracker
        </h2>
        <p className="text-white/50 text-sm">Pollen data not available for this location.</p>
      </div>
    );
  }

  const today = data.find((d) => isToday(parseISO(d.date))) ?? data[0];

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-5">
      <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
        Pollen Tracker
      </h2>

      {/* Today's pollen cards */}
      <div className="flex gap-3 flex-wrap">
        {today.types.length > 0 ? (
          today.types.map((type) => <TypeCard key={type.code} type={type} />)
        ) : (
          <p className="text-white/50 text-sm">No pollen data for today.</p>
        )}
      </div>

      {/* 5-day pollen trend */}
      {data.length > 1 && (
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-wide font-medium mb-3">
            5-Day Trend
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-white/40 text-xs pb-2 font-normal w-16">Day</th>
                  {["TREE", "GRASS", "WEED"].map((code) => (
                    <th key={code} className="text-center text-white/40 text-xs pb-2 font-normal">
                      {POLLEN_EMOJI[code]} {code.charAt(0) + code.slice(1).toLowerCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((day) => {
                  const date = parseISO(day.date);
                  const todayRow = isToday(date);
                  return (
                    <tr key={day.date} className={todayRow ? "font-medium" : ""}>
                      <td className={`py-1.5 text-xs ${todayRow ? "text-blue-300" : "text-white/60"}`}>
                        {todayRow ? "Today" : format(date, "EEE")}
                      </td>
                      {["TREE", "GRASS", "WEED"].map((code) => {
                        const t = day.types.find((x) => x.code === code);
                        const idx = t?.index ?? 0;
                        return (
                          <td key={code} className="text-center py-1.5">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: getPollenColor(idx) }}
                            >
                              {idx}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/10">
            {[
              { label: "None", i: 0 },
              { label: "Very Low", i: 1 },
              { label: "Low", i: 2 },
              { label: "Moderate", i: 3 },
              { label: "High", i: 4 },
              { label: "Very High", i: 5 },
            ].map(({ label, i }) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: getPollenColor(i) }}
                />
                <span className="text-white/50 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
