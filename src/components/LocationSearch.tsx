"use client";

import { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { GeocodeApiResponse } from "@/types/weather";

interface Props {
  onLocation: (loc: GeocodeApiResponse) => void;
}

export default function LocationSearch({ onLocation }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  async function geocode(params: string) {
    const res = await fetch(`/api/geocode?${params}`);
    if (!res.ok) throw new Error("Location not found");
    return res.json() as Promise<GeocodeApiResponse>;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const loc = await geocode(`zip=${encodeURIComponent(query.trim())}`);
      onLocation(loc);
      setQuery("");
    } catch {
      setError("Location not found. Try a zip code or city name.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoDetect() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }
    setDetecting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const loc = await geocode(`lat=${coords.latitude}&lng=${coords.longitude}`);
          onLocation(loc);
        } catch {
          setError("Could not resolve your location.");
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setError("Location access denied.");
        setDetecting(false);
      }
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 size-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter zip code or city…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-white/20 border border-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </button>
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={detecting}
          title="Use my location"
          className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {detecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-300 text-center">{error}</p>
      )}
    </div>
  );
}
