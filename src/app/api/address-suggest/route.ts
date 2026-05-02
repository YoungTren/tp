import { NextResponse } from "next/server";

const NOMINATIM_UA = "TravelPlanner/1.0 (address-suggest; contact: dev)";

const MIN_Q = 2;
const MAX_Q = 140;

type NominatimHit = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

/**
 * Подсказки адресов через Nominatim (сервер; контекст города в запросе).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";

  if (raw.length < MIN_Q || raw.length > MAX_Q) {
    return NextResponse.json({ suggestions: [] as { label: string }[] });
  }

  const q = city ? `${raw}, ${city}` : raw;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "12");
  url.searchParams.set("addressdetails", "1");

  let data: unknown;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
        "Accept-Language": "ru,en;q=0.9",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }
    data = await res.json();
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  if (!Array.isArray(data)) {
    return NextResponse.json({ suggestions: [] });
  }

  const seen = new Set<string>();
  const suggestions: { label: string }[] = [];

  for (const row of data as NominatimHit[]) {
    const lat = Number.parseFloat(row.lat ?? "");
    const lon = Number.parseFloat(row.lon ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const full = row.display_name?.trim();
    if (!full) continue;

    const parts = full.split(",").map((s) => s.trim());
    const label = parts.slice(0, Math.min(parts.length, 5)).join(", ");

    const key = label.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label });
    if (suggestions.length >= 8) break;
  }

  return NextResponse.json({ suggestions });
}
