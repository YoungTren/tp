import { NextResponse } from "next/server";
import { buildLeisureRouteStopsFromModel } from "@/lib/build-leisure-route-stops";
import {
  isLeisureFoodCategory,
  orderSightsStopsByStartAndNearest,
} from "@/lib/leisure-stop-order";
import {
  normalizeLeisureTitle,
  remainingDaysLeisureFromModelSchema,
} from "@/lib/multi-day-leisure-schema";
import { getServerEnv } from "@/lib/server-env";
import {
  geocodeStartAddressFirstMatch,
  refPointNearCity,
  resolveStopsWithGeocodedCoords,
} from "@/lib/yandex-geocode-server";
import { LEISURE_CARD_TEASER_MAX } from "@/lib/day-leisure-schema";
import { normalizeDurationDays } from "@/lib/trip-dates";
import type { LeisureRouteStop } from "@/types/trip";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

const stripMarkdownJsonFence = (raw: string): string => {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\r?\n?/i, "");
    t = t.replace(/\r?\n?```\s*$/i, "");
  }
  return t.trim();
};

export async function POST(request: Request) {
  const { deepseekApiKey, googleApiKey, googleCseId, googlePlacesKey } = getServerEnv();
  const body: unknown = await request.json();
  const parsed = (body as {
    to?: string;
    startAddress?: string;
    budget?: string;
    travelers?: number;
    durationDays?: number;
    titleHint?: string;
    lockedDay1Titles?: string[];
  }) ?? {};

  const to = String(parsed.to ?? "").trim();
  const startAddress = String(parsed.startAddress ?? "").trim();
  const budget = String(parsed.budget ?? "—");
  const travelers = Number(parsed.travelers ?? 1) || 1;
  const titleHint = String(parsed.titleHint ?? "").trim();
  const durationDays = normalizeDurationDays(Number(parsed.durationDays ?? 0));
  const lockedDay1Titles = Array.isArray(parsed.lockedDay1Titles)
    ? parsed.lockedDay1Titles.map((t) => String(t ?? "").trim()).filter(Boolean)
    : [];

  if (!to) {
    return NextResponse.json({ error: "to required" }, { status: 400 });
  }
  if (!startAddress) {
    return NextResponse.json({ error: "startAddress required" }, { status: 400 });
  }
  if (durationDays < 2) {
    return NextResponse.json(
      { error: "durationDays must be >= 2" },
      { status: 400 }
    );
  }
  if (lockedDay1Titles.length < 1) {
    return NextResponse.json(
      { error: "lockedDay1Titles required" },
      { status: 400 }
    );
  }

  const expectedRemaining = durationDays - 1;
  const lockedList = lockedDay1Titles.map((t) => `• ${t}`).join("\n");

  const systemPrompt = `Ты планировщик **поездки** в **одном** городе: только **достопримечательности** (без еды, без ПАРКОВ-аттракционов, без ТЦ-шоппинга).
**День 1 уже полностью спланирован на клиенте** — эти места **категорически нельзя** дублировать даже с перефразом.
Отвечай **только** валидным JSON (без markdown) на русском.

**Схема (только дни 2…${durationDays}):**
{
  "days": [
    { "day": 2, "dayTitle"?: string, "stops": [ { "title", "description", "cardTeaser" (≤${LEISURE_CARD_TEASER_MAX} symb, 2 lines UI), "category", "lat": 0, "lon": 0, "rating"?, "estimatedCost", "interestingFacts": [3 strings] } ] },
    { "day": 3, ... }
  ]
}

**ЖЁСТКИЕ ПРАВИЛА:**
1) В массиве \`days\` **ровно ${expectedRemaining}** элементов, поля \`day\` = 2,3,…,${durationDays} — **по одному** на каждый номер, **без** **дня 1** и **без** **пропусков**.
2) **НИ ОДНА** \`stops[i].title\` **не совпадает** с **уже** **занятыми** **дня 1** (см. список в запросе пользователя) и **не** **повторяется** **между** **днями** 2…${durationDays}. Уникальные строки \`title\`.
3) **Раскидка** **интереса** **по** **дням** 2…${durationDays}: **не** **сваливай** **всё** **во** **2-й** **день**, **последний** **день** **не** **пустой** **по** **смыслу** (сильные места — **не** **только** **в** **одном** **дне**).
4) **Каждый** **день** = **один** **пешеходный** **карман**; \`lat\`/\`lon\` = **0/0** (на **карту** **ставит** **сервер** **через** **Яндекс** **по** \`title\`); **соседние** **по** **смыслу** **~0,7–2** **км** **кластером**; **каждое** **утро** **старт** **с** **«${startAddress}»** (сервер **сортирует** **цепочки** **по** **координатам** **Яндекса**). 
5) **Дни** 2+ — **другие** **районы/кластеры**, **чем** **день 1** **по** **смыслу**, **без** **копий** **имён** **с** **дня 1**. **WGS** **в** **JSON** **не** **подбирай**.
6) **Каждый** **день:** \`stops\` **ровно 5** (только **осмотр**; **старт** **не** **в** **массиве**).
7) \`cardTeaser\` (**карточка** **списка**, **≤**${LEISURE_CARD_TEASER_MAX} **симв.,** **2** **строки** **в** **UI**), \`estimatedCost\` (**только** **цена/диапазон**, **без** **названия** **и** **скобок** **с** **пояснениями**) **и** \`interestingFacts\` — как в мультидневной **полной** **схеме** (валюта региона, 3 факта).`;

  const userPrompt = `**Уже занято (день 1) — НЕ повторять, НИКАКИХ дублей и «похожих» названий на эти объекты:**
${lockedList}

Собери **только** **дни 2…${durationDays}** в **${to}**; **в** **сумме** **${expectedRemaining}** **дневных** **маршрутов**, **в** **каждом** **ровно 5** **достопримечательностей** в \`stops\`.

- **Старт каждого дня:** «${startAddress}»;
- **Гостей:** ${travelers} чел., **бюджет:** ${budget}
${titleHint ? `- **Пожелания** (только **наследие**): ${titleHint}\n` : ""}`;

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

  let deepseekData: unknown;
  try {
    deepseekData = await deepseekRes.json();
  } catch {
    return NextResponse.json(
      { error: "DeepSeek response not JSON" },
      { status: 502 }
    );
  }

  if (!deepseekRes.ok) {
    const msg = (deepseekData as { error?: { message?: string } })?.error?.message;
    return NextResponse.json(
      { error: "DeepSeek request failed", ...(msg ? { detail: msg } : {}) },
      { status: 502 }
    );
  }

  const content = (deepseekData as { choices?: { message?: { content?: string } }[] })
    .choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    return NextResponse.json(
      { error: "Empty DeepSeek response" },
      { status: 502 }
    );
  }

  const normalized = stripMarkdownJsonFence(String(content));
  let json: unknown;
  try {
    json = JSON.parse(normalized) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON from model" },
      { status: 502 }
    );
  }

  const modelPlan = remainingDaysLeisureFromModelSchema.safeParse(json);
  if (!modelPlan.success) {
    const iss = modelPlan.error.issues.slice(0, 8);
    return NextResponse.json(
      {
        error: "Plan validation failed",
        issues: iss.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 502 }
    );
  }

  const { days: rawDays } = modelPlan.data;
  if (rawDays.length !== expectedRemaining) {
    return NextResponse.json(
      {
        error: `Model returned ${rawDays.length} day(s), expected ${expectedRemaining} (days 2…${durationDays})`,
      },
      { status: 502 }
    );
  }

  const sorted = [...rawDays].sort((a, b) => a.day - b.day);
  for (let k = 0; k < sorted.length; k += 1) {
    if (sorted[k]!.day !== k + 2) {
      return NextResponse.json(
        { error: `day numbers must be 2…${durationDays} without gaps` },
        { status: 502 }
      );
    }
  }

  const seen = new Set<string>();
  for (const t of lockedDay1Titles) {
    seen.add(normalizeLeisureTitle(t) || t);
  }
  for (const d of sorted) {
    for (const s of d.stops) {
      const key = normalizeLeisureTitle(s.title) || s.title.trim();
      if (seen.has(key)) {
        return NextResponse.json(
          { error: "Duplicate or forbidden place title (collides with day 1 or within plan)" },
          { status: 502 }
        );
      }
      seen.add(key);
    }
  }

  const yandexKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "";
  if (!yandexKey) {
    return NextResponse.json(
      { error: "Не задан YANDEX_MAPS API key для геокодера" },
      { status: 500 }
    );
  }
  const toCity = to.trim();
  const startQueries = [
    startAddress,
    `${startAddress}, ${toCity}`,
    `${toCity}, ${startAddress}`,
    toCity,
  ] as const;
  let firstDayStart = await geocodeStartAddressFirstMatch(
    startQueries,
    yandexKey
  );
  if (!firstDayStart) {
    firstDayStart = await refPointNearCity(toCity, yandexKey);
  }
  if (!firstDayStart) {
    return NextResponse.json(
      {
        error:
          "Не удалось определить точку старта. Укажите улицу и дом, проверьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY (Search и HTTP Geocoder). Координаты — WGS84 для Яндекс.Карт.",
      },
      { status: 400 }
    );
  }
  const google = { apiKey: googleApiKey, cseId: googleCseId };

  type OutDay = {
    day: number;
    dayTitle: string;
    stops: LeisureRouteStop[];
    startPoint?: { lat: number; lon: number };
  };
  const out: OutDay[] = [];

  for (const dayRow of sorted) {
    const sightStops = dayRow.stops.filter(
      (s) => !isLeisureFoodCategory(s.category)
    );
    if (sightStops.length !== 5) {
      return NextResponse.json(
        {
          error: `В дне ${dayRow.day} ожидается ровно 5 достопримечательностей (после исключения гастро-точек).`,
        },
        { status: 502 }
      );
    }
    const geocoded = await resolveStopsWithGeocodedCoords(
      sightStops,
      to,
      yandexKey
    );
    const orderedOnMap = orderSightsStopsByStartAndNearest(
      geocoded,
      firstDayStart
    );
    const materialized = await buildLeisureRouteStopsFromModel({
      ordered: orderedOnMap,
      to,
      google,
      placesApiKey: googlePlacesKey,
    });
    out.push({
      day: dayRow.day,
      dayTitle: dayRow.dayTitle?.trim() || `День ${dayRow.day}: ${to}`,
      stops: materialized,
      startPoint: firstDayStart,
    });
  }

  return NextResponse.json({ days: out, durationDays });
}
