import { NextResponse } from "next/server";
import { geocodeAttractionRows } from "@/lib/attraction-geocode";

type Body = { city?: string; items?: { id: string; title: string }[] };

/**
 * Только координаты для тех же ориентиров, что в карусели (если фото не загрузились).
 */
export async function POST(request: Request) {
  const raw: unknown = await request.json().catch(() => ({}));
  const o = raw as Body;
  const city = typeof o.city === "string" ? o.city.trim() : "";
  const items = Array.isArray(o.items) ? o.items : [];
  if (!city || city.length > 200) {
    return NextResponse.json(
      { error: "Нужен непустой город" },
      { status: 400 }
    );
  }
  const cleaned = items
    .filter(
      (x): x is { id: string; title: string } =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as { id?: string }).id === "string" &&
        typeof (x as { title?: string }).title === "string"
    )
    .map((x) => ({ id: x.id, title: x.title.trim() }))
    .filter((x) => x.title.length > 0);
  if (!cleaned.length) {
    return NextResponse.json({ items: [] as { id: string; lat: number | null; lon: number | null }[] });
  }
  const yandexKey =
    process.env.YANDEX_MAPS_API_KEY?.trim() ??
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ??
    "";
  const coords = await geocodeAttractionRows(city, cleaned, yandexKey);
  return NextResponse.json({
    items: coords.map((c) =>
      "lat" in c && c.lat != null && c.lon != null
        ? { id: c.id, lat: c.lat, lon: c.lon }
        : { id: c.id, lat: null, lon: null }
    ),
  });
}
