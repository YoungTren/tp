import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { resolveAttractionImageUrl } from "@/lib/attraction-image";
import { getServerEnv } from "@/lib/server-env";
import {
  geocodeOneStopForRouteMap,
  refPointNearCity,
} from "@/lib/yandex-geocode-server";
import { normalizeDurationDays } from "@/lib/trip-dates";
import { rawTripPlanFromModelSchema } from "@/lib/trip-plan-schema";
import type { GeneratedTripPlan, TripRecommendation } from "@/types/trip";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export async function POST(request: Request) {
  const { deepseekApiKey, googleApiKey, googleCseId, googlePlacesKey } = getServerEnv();
  const body: unknown = await request.json();
  const parsed =
    (body as {
      from?: string;
      to?: string;
      durationDays?: number;
      budget?: string;
      travelers?: number;
    }) ?? {};

  const from = String(parsed.from ?? "");
  const to = String(parsed.to ?? "");
  const budget = String(parsed.budget ?? "");
  const travelers = Number(parsed.travelers ?? 1) || 1;
  const days = normalizeDurationDays(Number(parsed.durationDays ?? 0));

  const systemPrompt = `Ты планировщик путешествий. Отвечай ТОЛЬКО валидным JSON без markdown и пояснений. Язык текстов: русский.
JSON-схема:
{
  "dayPlans": [ { "day": number, "title": string, "items": string[] } ],
  "recommendations": [
    {
      "title": string,
      "category": "Достопримечательность" | "Ресторан" | "Музей" | "Парк" | "Другое",
      "description": string (2–3 предложения),
      "highlights": string[] (3–5 кратких пункта),
      "lat": number,
      "lon": number,
      "rating": number (4.0–5.0)
    }
  ],
  "mapCenter": { "lat": number, "lon": number, "zoom": number (10–15) }
}
Правила:
- dayPlans: ровно ${days} дн(е)й, day от 1 до ${days}, items — конкретные шаги дня; **не** **повторяй** **одинаковые** **достопримечательности/места** **между** **разными** **днями** (в сумме — разнообразный план на всё пребывание).
- recommendations: 4–8 **разных** реальных мест в «${to}»; **все** **title** **уникальны**; **координаты** **в** **JSON** **—** **заглушки** **(сервер** **подставит** **Яндекс.Карты** **по** **названиям**).
- mapCenter: **примерный** **zoom** (10–15); **lat/lon** **в** **ответе** **не** **важны** **—** **центр** **карты** **ставит** **сервер** **по** **${to}** **через** **Яндекс**.`;

  const userPrompt = `Составь маршрут:
- Откуда: ${from}
- Куда: ${to}
- Длительность: ${days} дн.
- Бюджет: ${budget}
- Путешественников: ${travelers}`;

  const deepseekRes = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const deepseekData: unknown = await deepseekRes.json();
  if (!deepseekRes.ok) {
    return NextResponse.json(
      { error: "DeepSeek request failed" },
      { status: 502 }
    );
  }

  const content = (deepseekData as { choices?: { message?: { content?: string } }[] })
    .choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { error: "Empty DeepSeek response" },
      { status: 502 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON from model" },
      { status: 502 }
    );
  }

  const modelPlan = rawTripPlanFromModelSchema.safeParse(json);
  if (!modelPlan.success) {
    return NextResponse.json(
      { error: "Plan validation failed" },
      { status: 502 }
    );
  }

  const raw = modelPlan.data;
  const yandexKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "";
  const city = to.trim();
  let centerP = await refPointNearCity(city, yandexKey);
  if (!centerP) {
    centerP = { lat: 0, lon: 0 };
  }
  const zoom = Math.min(15, Math.max(10, raw.mapCenter.zoom ?? 12));
  const mapCenter = { lat: centerP.lat, lon: centerP.lon, zoom };

  const withImages: TripRecommendation[] = await Promise.all(
    raw.recommendations.map(async (r, idx) => {
      let g = await geocodeOneStopForRouteMap(r.title, city, yandexKey);
      if (!g) {
        const a = 0.012;
        g = {
          lat: centerP.lat + Math.sin((idx + 1) * 1.2) * a,
          lon: centerP.lon + Math.cos((idx + 1) * 1.2) * a,
        };
      }
      const id = randomUUID();
      const image = await resolveAttractionImageUrl({
        title: r.title,
        to,
        google: { apiKey: googleApiKey, cseId: googleCseId },
        placesApiKey: googlePlacesKey,
      });
      return {
        id,
        title: r.title,
        category: r.category,
        description: r.description,
        highlights: r.highlights,
        lat: g.lat,
        lon: g.lon,
        rating: r.rating ?? 4.5,
        image,
      };
    })
  );

  const plan: GeneratedTripPlan = {
    dayPlans: raw.dayPlans,
    recommendations: withImages,
    mapCenter,
  };

  return NextResponse.json({ plan });
}
