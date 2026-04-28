import { NextResponse } from "next/server";
import { geocodeAttractionRows } from "@/lib/attraction-geocode";
import { resolveAttractionImageUrl } from "@/lib/attraction-image";
import { getAttractionPanelItems } from "@/lib/city-attraction-preview";

type Body = { city?: string };

const yandexKeyForGeocode = (): string =>
  process.env.YANDEX_MAPS_API_KEY?.trim() ??
  process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ??
  "";

async function buildCarouselPayload(city: string) {
  const templates = getAttractionPanelItems(city);

  const googleApiKey = process.env.GOOGLE_API_KEY?.trim() ?? "";
  const googleCseId = process.env.GOOGLE_CSE_ID?.trim() ?? "";
  const googlePlacesKey =
    process.env.GOOGLE_PLACES_API_KEY?.trim() || googleApiKey;
  const hasGoogleSearch = googleApiKey.length > 0 && googleCseId.length > 0;

  const items = await Promise.all(
    templates.map(async (p) => ({
      id: p.id,
      title: p.title,
      image: hasGoogleSearch
        ? await resolveAttractionImageUrl({
            title: p.title,
            to: city,
            google: { apiKey: googleApiKey, cseId: googleCseId },
            placesApiKey: googlePlacesKey,
          })
        : p.image,
    }))
  );

  const coords = await geocodeAttractionRows(
    city,
    items.map((p) => ({ id: p.id, title: p.title })),
    yandexKeyForGeocode()
  );
  const byId = new Map(coords.map((c) => [c.id, c] as const));
  return items.map((it) => {
    const g = byId.get(it.id);
    if (g && "lat" in g && g.lat != null && g.lon != null) {
      return { ...it, lat: g.lat, lon: g.lon };
    }
    return { ...it, lat: null as null, lon: null as null };
  });
}

/**
 * Собирает список ориентиров по городу и подтягивает фото (Google CSE / Places при наличии ключей).
 * Без GOOGLE_* отдаются пресеты из `city-attraction-preview` (Unsplash) — чтобы карусель не падала на Vercel.
 */
export const POST = async (request: Request) => {
  const raw: unknown = await request.json().catch(() => ({}));
  const city =
    typeof raw === "object" && raw !== null
      ? String((raw as Body).city ?? "").trim()
      : "";
  if (!city || city.length > 200) {
    return NextResponse.json(
      { error: "Нужен непустой город" },
      { status: 400 }
    );
  }

  try {
    const withCoords = await buildCarouselPayload(city);
    return NextResponse.json({ items: withCoords });
  } catch (err) {
    console.error("city-attraction-photos", err);
    const templates = getAttractionPanelItems(city);
    const fallback = templates.map((p) => ({
      id: p.id,
      title: p.title,
      image: p.image,
      lat: null as null,
      lon: null as null,
    }));
    return NextResponse.json({ items: fallback });
  }
};
