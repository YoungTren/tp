import { NextResponse } from "next/server";
import { normalizeCityInput } from "@/lib/city-input-validation";
import { validateCityWithDeepSeek } from "@/lib/deepseek-city-validate";
import { nominatimResolveCity } from "@/lib/yandex-geocode-server";
import type { MapCenter } from "@/types/trip";

type ValidateBody = { city?: string };

const variants = (city: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  push(city);
  push(`${city}, Россия`);
  push(`${city}, Russia`);
  push(`${city}, Europe`);
  return out;
};

const CITY_MAP_ZOOM = 12 as const;

const resolveCityMapCenter = async (
  label: string
): Promise<MapCenter | null> => {
  const base = normalizeCityInput(label);
  if (!base) return null;
  for (const v of variants(base)) {
    const hit = await nominatimResolveCity(v);
    if (hit) {
      return { lat: hit.lat, lon: hit.lon, zoom: CITY_MAP_ZOOM };
    }
  }
  return null;
};

/**
 * Проверка «это город»: DeepSeek при наличии DEEPSEEK_API_KEY, иначе fallback через Nominatim.
 */
export async function POST(request: Request) {
  let body: ValidateBody;
  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const city = normalizeCityInput(body.city ?? "");
  if (!city || city.length > 200) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }

  const ai = await validateCityWithDeepSeek(city).catch(() => null);
  if (ai) {
    const payload = {
      is_city: ai.is_city,
      corrected_name: ai.is_city ? ai.corrected_name : null,
      source: "ai" as const,
    };
    let map: MapCenter | null = null;
    if (ai.is_city) {
      const geoLabel =
        typeof ai.corrected_name === "string" && ai.corrected_name.trim()
          ? normalizeCityInput(ai.corrected_name)
          : city;
      map = await resolveCityMapCenter(geoLabel);
    }
    console.info("[validate-city] ai", { city, ...payload, map });
    return NextResponse.json({ ...payload, map });
  }

  for (const v of variants(city)) {
    const hit = await nominatimResolveCity(v);
    if (hit) {
      const canonical = hit.canonical.trim();
      const corrected =
        canonical.length > 0 &&
        normalizeCityInput(canonical) !== normalizeCityInput(city)
          ? canonical
          : null;
      const map: MapCenter = {
        lat: hit.lat,
        lon: hit.lon,
        zoom: CITY_MAP_ZOOM,
      };
      const payload = {
        is_city: true as const,
        corrected_name: corrected,
        source: "fallback" as const,
        map,
      };
      console.info("[validate-city] fallback nominatim hit", {
        city,
        canonical: hit.canonical,
      });
      return NextResponse.json(payload);
    }
  }

  const payload = {
    is_city: false as const,
    corrected_name: null as null,
    source: "fallback" as const,
    map: null as null,
  };
  console.info("[validate-city] fallback miss", { city });
  return NextResponse.json(payload);
}
