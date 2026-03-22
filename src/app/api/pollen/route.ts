import { type NextRequest } from "next/server";
import { PollenApiResponse, PollenTypeInfo, DailyPollenData } from "@/types/weather";
import { getPollenCategory } from "@/lib/weather-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: "Google Maps API key not configured" }, { status: 500 });
  }

  // Round to 2 decimal places (~1 km) to normalize cache keys
  const rLat = parseFloat(parseFloat(lat).toFixed(2));
  const rLng = parseFloat(parseFloat(lng).toFixed(2));

  const url = `https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=${rLat}&location.longitude=${rLng}&days=5&key=${apiKey}`;

  // Cache pollen data for 1 hour
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text();
    console.error("Pollen API error:", res.status, text);
    return Response.json({ error: "Pollen data unavailable", status: res.status }, { status: 502 });
  }

  const data = await res.json();

  const daily: DailyPollenData[] = (data.dailyInfo ?? []).map(
    (day: Record<string, unknown>) => {
      const d = day.date as { year: number; month: number; day: number };
      const dateStr = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

      const types: PollenTypeInfo[] = (
        day.pollenTypeInfo as Array<Record<string, unknown>>
      )
        ?.filter((pt) => {
          const code = pt.code as string;
          return ["GRASS", "TREE", "WEED"].includes(code);
        })
        .map((pt) => {
          const indexInfo = pt.indexInfo as Record<string, unknown> | undefined;
          const index = (indexInfo?.value as number) ?? 0;
          return {
            code: pt.code as "GRASS" | "TREE" | "WEED",
            displayName: pt.displayName as string,
            index,
            category: (indexInfo?.category as string) ?? getPollenCategory(index),
            inSeason: (pt.inSeason as boolean) ?? false,
          };
        }) ?? [];

      return { date: dateStr, types };
    }
  );

  const response: PollenApiResponse = { daily };
  return Response.json(response, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
