import { NextResponse } from "next/server";
import { classifyCityLikeIntent } from "@/lib/ai-city-intent";
import { normalizeCityInput } from "@/lib/city-input-validation";
import { nominatimResolveCity } from "@/lib/yandex-geocode-server";

/**
 * Центр карты + каноническое имя города (поле «Куда»).
 * 1) (Опционально) если задан OPENAI_API_KEY — отсекаем явный не-город.
 * 2) Только Nominatim с типами населённого пункта (без Яндекс/Google fallback —
 *    иначе подтягиваются улицы/организации и ложные совпадения).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = normalizeCityInput(searchParams.get("city") ?? "");
  if (!city || city.length > 200) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }

  const aiGate = await classifyCityLikeIntent(city);
  if (aiGate === false) {
    return NextResponse.json({ error: "not a city" }, { status: 404 });
  }

  const variants = uniqueCityVariants(city);
  for (const variant of variants) {
    const hit = await nominatimResolveCity(variant);
    if (hit) {
      return NextResponse.json({
        lat: hit.lat,
        lon: hit.lon,
        zoom: 12 as const,
        name: hit.canonical,
      });
    }
  }

  return NextResponse.json({ error: "geocode not found" }, { status: 404 });
}

const uniqueCityVariants = (city: string): string[] => {
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
