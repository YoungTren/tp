import { NextResponse } from "next/server";
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
  return NextResponse.json({ items });
};
