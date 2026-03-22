"use client";

import { DailyData, DailyPollenData } from "@/types/weather";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { formatTempNum } from "@/lib/weather-utils";

type Unit = "F" | "C";

// Thresholds (Celsius for comparison)
const RAIN_PCT   = 60;
const HUMID_PCT  = 90;
const HOT_C      = 35;    // 95°F
const COLD_C     = 4.44;  // 40°F
const POLLEN_IDX = 3;

const POLLEN_EMOJI: Record<string, string> = { TREE: "🌳", GRASS: "🌿", WEED: "🌾" };

interface Item {
  icon: string;
  text: string;
  level: "ok" | "warn" | "alert";
}

const levelColor: Record<Item["level"], string> = {
  ok:    "text-green-300",
  warn:  "text-yellow-300",
  alert: "text-orange-300",
};

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  return format(d, "EEE");
}

function dayRange(labels: string[]): string {
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels[0]}–${labels[labels.length - 1]}`;
}

// ── Today section ──────────────────────────────────────────────────────────

function buildTodayItems(
  day: DailyData | undefined,
  pollenDay: DailyPollenData | undefined,
  unit: Unit
): Item[] {
  if (!day) return [];
  const items: Item[] = [];

  if (day.precipitationProbability >= RAIN_PCT) {
    items.push({
      icon: day.precipitationProbability >= 80 ? "🌧️" : "🌦️",
      text: `Rain ${day.precipitationProbability}%`,
      level: day.precipitationProbability >= 80 ? "alert" : "warn",
    });
  }
  if (day.humidity >= HUMID_PCT) {
    items.push({ icon: "💧", text: `Humid ${day.humidity}%`, level: "warn" });
  }
  if (day.tempMax > HOT_C) {
    items.push({ icon: "🥵", text: `High ${formatTempNum(day.tempMax, unit)}°${unit}`, level: "alert" });
  }
  if (day.tempMin < COLD_C) {
    items.push({ icon: "🥶", text: `Low ${formatTempNum(day.tempMin, unit)}°${unit}`, level: "warn" });
  }
  if (pollenDay) {
    const highest = pollenDay.types.reduce(
      (a, b) => (b.index > a.index ? b : a),
      { index: 0 } as { index: number; code?: string; category?: string }
    );
    if (highest.index >= POLLEN_IDX) {
      const elevated = pollenDay.types.filter((t) => t.index >= POLLEN_IDX);
      items.push({
        icon: elevated.map((t) => POLLEN_EMOJI[t.code]).join(" ") || "🌿",
        text: `${highest.category ?? "Moderate"} pollen`,
        level: highest.index >= 4 ? "alert" : "warn",
      });
    }
  }
  return items;
}

// ── 10-day section ─────────────────────────────────────────────────────────

function build10DayItems(
  daily: DailyData[],
  pollen: DailyPollenData[],
  unit: Unit
): Item[] {
  const future = daily.filter((d) => !isPast(parseISO(d.date)) || isToday(parseISO(d.date)));
  const items: Item[] = [];

  // Rain
  const rainyDays = future.filter((d) => d.precipitationProbability >= RAIN_PCT);
  if (rainyDays.length) {
    const max = Math.max(...rainyDays.map((d) => d.precipitationProbability));
    items.push({
      icon: max >= 80 ? "🌧️" : "🌦️",
      text: `Rain ${dayRange(rainyDays.map((d) => dayLabel(d.date)))} (up to ${max}%)`,
      level: max >= 80 ? "alert" : "warn",
    });
  }

  // Humidity
  const humidDays = future.filter((d) => d.humidity >= HUMID_PCT);
  if (humidDays.length) {
    const max = Math.max(...humidDays.map((d) => d.humidity));
    items.push({
      icon: "💧",
      text: `Humid ${dayRange(humidDays.map((d) => dayLabel(d.date)))} (${max}%)`,
      level: "warn",
    });
  }

  // Heat
  const hotDays = future.filter((d) => d.tempMax > HOT_C);
  if (hotDays.length) {
    const max = Math.max(...hotDays.map((d) => d.tempMax));
    items.push({
      icon: "🥵",
      text: `Hot ${dayRange(hotDays.map((d) => dayLabel(d.date)))} (${formatTempNum(max, unit)}°${unit})`,
      level: "alert",
    });
  }

  // Cold
  const coldDays = future.filter((d) => d.tempMin < COLD_C);
  if (coldDays.length) {
    const min = Math.min(...coldDays.map((d) => d.tempMin));
    items.push({
      icon: "🥶",
      text: `Cold ${dayRange(coldDays.map((d) => dayLabel(d.date)))} (${formatTempNum(min, unit)}°${unit})`,
      level: "warn",
    });
  }

  // Pollen
  const today = new Date().toISOString().split("T")[0];
  const elevated: Record<string, number> = {};
  const pollenDates: string[] = [];
  for (const day of pollen.filter((d) => d.date >= today)) {
    let dayElevated = false;
    for (const t of day.types) {
      if (t.index >= POLLEN_IDX) {
        elevated[t.code] = Math.max(elevated[t.code] ?? 0, t.index);
        dayElevated = true;
      }
    }
    if (dayElevated) pollenDates.push(day.date);
  }
  if (Object.keys(elevated).length) {
    const maxIdx = Math.max(...Object.values(elevated));
    const category = maxIdx >= 5 ? "Very high" : maxIdx >= 4 ? "High" : "Moderate";
    const icons = Object.keys(elevated).map((k) => POLLEN_EMOJI[k]).join(" ");
    items.push({
      icon: icons,
      text: `${category} pollen ${dayRange(pollenDates.map(dayLabel))}`,
      level: maxIdx >= 4 ? "alert" : "warn",
    });
  }

  return items;
}

// ── Section component ──────────────────────────────────────────────────────

function Section({ label, items }: { label: string; items: Item[] }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-2">{label}</p>
      {items.length === 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm">✅</span>
          <span className="text-green-300 text-sm">All clear</span>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-sm leading-none">{item.icon}</span>
              <span className={`text-sm leading-snug ${levelColor[item.level]}`}>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  daily: DailyData[];
  pollen: DailyPollenData[];
  unit: Unit;
}

export default function OutdoorSummary({ daily, pollen, unit }: Props) {
  const todayData   = daily.find((d) => isToday(parseISO(d.date)));
  const todayPollen = pollen.find((d) => isToday(parseISO(d.date)));

  const todayItems   = buildTodayItems(todayData, todayPollen, unit);
  const outlookItems = build10DayItems(daily, pollen, unit);

  return (
    <div className="flex gap-4 h-full">
      <Section label="Today"       items={todayItems} />
      <div className="w-px bg-white/10 self-stretch" />
      <Section label="10-Day"      items={outlookItems} />
    </div>
  );
}
