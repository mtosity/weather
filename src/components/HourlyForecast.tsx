"use client";

import { HourlyData } from "@/types/weather";
import { formatTempNum } from "@/lib/weather-utils";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Props {
  data: HourlyData[];
  unit: "F" | "C";
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit: "F" | "C";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/90 border border-white/20 rounded-xl p-3 text-white text-sm backdrop-blur-sm">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.value}°{unit}
        </p>
      ))}
    </div>
  );
}

export default function HourlyForecast({ data, unit }: Props) {
  const next24 = data.slice(0, 24);

  const chartData = next24.map((h) => ({
    time: format(new Date(h.time), "ha"),
    temp: formatTempNum(h.temperature, unit),
    feels: formatTempNum(h.feelsLike, unit),
  }));

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-5">
      <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
        Hourly Forecast
      </h2>

      {/* Scrollable hourly cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {next24.map((h) => (
          <div
            key={h.time}
            className="flex-none flex flex-col items-center gap-1.5 bg-white/10 rounded-xl px-3 py-3 min-w-[60px]"
          >
            <span className="text-white/60 text-xs font-medium">
              {format(new Date(h.time), "ha")}
            </span>
            <span className="text-xl" role="img">{h.condition.emoji}</span>
            <span className="text-white font-semibold text-sm">
              {formatTempNum(h.temperature, unit)}°
            </span>
            {h.precipitationProbability > 10 && (
              <span className="text-blue-300 text-xs">
                {h.precipitationProbability}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Temperature chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis
              width={32}
              tickFormatter={(v) => Math.round(v).toString()}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="temp"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Temperature"
            />
            <Line
              type="monotone"
              dataKey="feels"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="Feels like"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-blue-400 inline-block rounded" />
          Temperature
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-violet-400 inline-block rounded border-dashed" style={{borderTop: '1px dashed #a78bfa', background: 'none'}} />
          Feels like
        </span>
      </div>
    </div>
  );
}
