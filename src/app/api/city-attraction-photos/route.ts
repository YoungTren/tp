import { NextResponse } from "next/server";
import { geocodeAttractionRows } from "@/lib/attraction-geocode";
import { resolveAttractionImageUrl } from "@/lib/attraction-image";
import { getAttractionPanelItems } from "@/lib/city-attraction-preview";
import { getServerEnv } from "@/lib/server-env";

type Body = { city?: string };

/**
 * Собирает список названий ориентиров по городу (как в панели превью) и
 * для каждого тянет реальное фото через Google CSE / Places (тот же пайплайн, что в маршрутах).
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

  const { googleApiKey, googleCseId, googlePlacesKey } = getServerEnv();
  const google = { apiKey: googleApiKey, cseId: googleCseId };
  const templates = getAttractionPanelItems(city);
  const yandexKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "";
  const items = await Promise.all(
    templates.map(async (p) => ({
      id: p.id,
      title: p.title,
      image: await resolveAttractionImageUrl({
        title: p.title,
        to: city,
        google,
        placesApiKey: googlePlacesKey,
      }),
    }))
  );
  const coords = await geocodeAttractionRows(
    city,
    items.map((p) => ({ id: p.id, title: p.title })),
    yandexKey
  );
  const byId = new Map(coords.map((c) => [c.id, c] as const));
  const withCoords = items.map((it) => {
    const g = byId.get(it.id);
    if (g && "lat" in g && g.lat != null && g.lon != null) {
      return { ...it, lat: g.lat, lon: g.lon };
    }
    return { ...it, lat: null as null, lon: null as null };
  });
  return NextResponse.json({ items: withCoords });
};
