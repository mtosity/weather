import { type NextRequest } from "next/server";
import { GeocodeApiResponse } from "@/types/weather";

// ── Nominatim (OpenStreetMap) — free, no API key ────────────────────────────

const NOMINATIM_HEADERS = {
  "User-Agent": "WeatherPollenApp/1.0",
  "Accept-Language": "en",
};

async function nominatimReverse(lat: number, lng: number): Promise<GeocodeApiResponse> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: NOMINATIM_HEADERS,
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Nominatim reverse failed");
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const addr = data.address ?? {};
  const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
  const state = addr.state ?? "";
  const name = city && state ? `${city}, ${state}` : data.display_name;

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    name,
    formattedAddress: data.display_name,
  };
}

async function nominatimSearch(query: string): Promise<GeocodeApiResponse> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: NOMINATIM_HEADERS,
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Nominatim search failed");
  const results = await res.json();
  if (!results.length) throw new Error("No results");

  const data = results[0];
  const addr = data.address ?? {};
  const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
  const state = addr.state ?? "";
  const name = city && state ? `${city}, ${state}` : data.display_name;

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    name,
    formattedAddress: data.display_name,
  };
}

// ── Google Geocoding ────────────────────────────────────────────────────────

async function googleGeocode(geocodeUrl: string): Promise<GeocodeApiResponse> {
  const res = await fetch(geocodeUrl, { next: { revalidate: 86400 } });
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`Google Geocoding: ${data.status}`);
  }

  const result = data.results[0];
  const location = result.geometry.location;

  const cityComponent = result.address_components?.find(
    (c: { types: string[] }) =>
      c.types.includes("locality") ||
      c.types.includes("sublocality") ||
      c.types.includes("postal_town")
  );
  const stateComponent = result.address_components?.find((c: { types: string[] }) =>
    c.types.includes("administrative_area_level_1")
  );

  const name = cityComponent
    ? `${cityComponent.long_name}${stateComponent ? ", " + stateComponent.short_name : ""}`
    : result.formatted_address;

  return {
    lat: location.lat,
    lng: location.lng,
    name,
    formattedAddress: result.formatted_address,
  };
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const zip = searchParams.get("zip");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  let response: GeocodeApiResponse;

  if (lat && lng) {
    // Reverse geocoding: round for cache normalization
    const rLat = parseFloat(parseFloat(lat).toFixed(2));
    const rLng = parseFloat(parseFloat(lng).toFixed(2));

    if (apiKey) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${rLat},${rLng}&key=${apiKey}`;
        response = await googleGeocode(googleUrl);
      } catch (err) {
        console.warn("Google reverse geocoding failed, trying Nominatim:", err);
        try {
          response = await nominatimReverse(rLat, rLng);
        } catch {
          return Response.json({ error: "Could not resolve location" }, { status: 502 });
        }
      }
    } else {
      try {
        response = await nominatimReverse(rLat, rLng);
      } catch {
        return Response.json({ error: "Could not resolve location" }, { status: 502 });
      }
    }
  } else if (zip) {
    if (apiKey) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`;
        response = await googleGeocode(googleUrl);
      } catch (err) {
        console.warn("Google search failed, trying Nominatim:", err);
        try {
          response = await nominatimSearch(zip);
        } catch {
          return Response.json({ error: "Location not found" }, { status: 404 });
        }
      }
    } else {
      try {
        response = await nominatimSearch(zip);
      } catch {
        return Response.json({ error: "Location not found" }, { status: 404 });
      }
    }
  } else {
    return Response.json({ error: "Provide zip or lat/lng" }, { status: 400 });
  }

  return Response.json(response, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
