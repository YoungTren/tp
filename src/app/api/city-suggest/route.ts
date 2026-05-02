import { NextResponse } from "next/server";
import { normalizeCityInput } from "@/lib/city-input-validation";

const NOMINATIM_UA = "TravelPlanner/1.0 (city-suggest; contact: dev)";

type Addr = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
};

type NominatimHit = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Addr;
  type?: string;
  class?: string;
};

const isCityLike = (h: NominatimHit): boolean => {
  const a = h.address;
  if (a?.city || a?.town || a?.village || a?.municipality) return true;
  if (h.class === "place") {
    const t = h.type ?? "";
    return ["city", "town", "village", "hamlet", "municipality"].includes(t);
  }
  return false;
};

const labelFromHit = (h: NominatimHit): string | null => {
  const a = h.address;
  if (a) {
    const loc =
      a.city || a.town || a.village || a.municipality;
    if (loc) {
      const tail = a.country ?? a.state ?? "";
      return tail ? `${loc}, ${tail}` : loc;
    }
  }
  const d = h.display_name?.trim();
  if (!d) return null;
  const parts = d.split(",").map((s) => s.trim());
  return parts.slice(0, 3).join(", ") || null;
};

/**
 * Подсказки городов через Nominatim (серверный запрос, без CORS в браузере).
 */
export async function GET(request: Request) {
  const q = normalizeCityInput(new URL(request.url).searchParams.get("q") ?? "");
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ suggestions: [] as { label: string }[] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
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
    if (!isCityLike(row)) continue;
    const label = labelFromHit(row);
    if (!label) continue;
    const key = label.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label });
    if (suggestions.length >= 8) break;
  }

  return NextResponse.json({ suggestions });
}
