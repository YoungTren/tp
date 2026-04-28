import { NextResponse } from "next/server";
import { buildLeisureRouteStopsFromModel } from "@/lib/build-leisure-route-stops";
import {
  isLeisureFoodCategory,
  orderSightsStopsByStartAndNearest,
} from "@/lib/leisure-stop-order";
import {
  multiDayLeisureFromModelSchema,
  normalizeLeisureTitle,
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
  }) ?? {};

  const to = String(parsed.to ?? "").trim();
  const startAddress = String(parsed.startAddress ?? "").trim();
  const budget = String(parsed.budget ?? "—");
  const travelers = Number(parsed.travelers ?? 1) || 1;
  const titleHint = String(parsed.titleHint ?? "").trim();
  const durationDays = normalizeDurationDays(Number(parsed.durationDays ?? 0));

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

  const systemPrompt = `Ты планировщик **поездки на несколько дней** в **одном** городе: только **достопримечательности** (без еды, без ПАРКОВ-аттракционов, без ТЦ-шоппинга).
Отвечай **только** валидным JSON (без markdown) на русском.

**Схема:**
{
  "days": [
    { "day": 1, "dayTitle"?: string, "stops": [ { "title", "description", "cardTeaser" (≤${LEISURE_CARD_TEASER_MAX} symb, 2 lines UI), "category", "lat": 0, "lon": 0, "rating"?, "estimatedCost", "interestingFacts": [3 strings] } ] },
    { "day": 2, ... },
    ...
  ]
}

**ЖЁСТКИЕ ПРАВИЛА:**
1) В массиве \`days\` **ровно ${durationDays}** элементов, поля \`day\` = 1,2,…,${durationDays} — по **одному** в каждом.
2) **НИ ОДНА** \`stops[i].title\` **не повторяется** между **разными** днями. Даже похожие места: **другой** смысл в названии (корпус, запад/востор., другой музей) — **уникальные** строки \`title\`.
3) **Всё** интересное по наследию/архитектуре, что реально **осмотреть** за \`${durationDays}\` **полных** дневных выходов в **${to}** — **раскидано** по **всем** дням: не сваливай 80% в первый день, не оставляй пустоту в конце. Равномерно по **числу** и **интересу** (сильные — не одним в первом днём, если в городе больше “магнитов”).
4) **Один** день = **один** **компактный** **пешеходный** **карман/цепочка**; \`lat\`/\`lon\` **ставь** **0/0** — **на** **карте** **и** **по** **расстояниям** **используется** **только** **Яндекс** **по** \`title\` **+** \`${to}\` **(после** **ответа** **сервер** **сортирует** **цепочку** **уже** **по** **реальным** **координатам**). **Соседние** **по** **смыслу** **~0,7–2** **км** **кластером** **(без** **прыжков** **4+** **км** **логикой** **текста**). 
5) **Каждый** **день** **последовательность** \`stops\` **логична** **как** **пешеходная** **цепочка** **от** **той** **же** **стартовой** **зоны**, что «${startAddress}» (каждое **утро** **выходим** **снова** **отсюда**; первая остановка **дня** **ближайшая/логичная** **к** **этой** **точке**).
6) \`day\` 2..${durationDays} — **другие** **районы/кластеры** **${to}** (север/юг и т.д.), **без** **повторов** **\`title\`** с **предыдущими** **днями** (п.2).
7) Категории: как в однодневной схеме (достопримечательности, музеи, площади, соборы, и т.д.), **без** гастротемы. **Позиции** **на** **карте** — **только** **сервер+Яндекс**, **не** **подбирай** **WGS** **в** **модели**.
8) **Каждый** **день:** в \`stops\` **ровно 5** **достопримечательностей** (только **пункты** **осмотра**; **старт/отель** **«${startAddress}»** **в** **JSON** **не** **включай** **и** **в** **эти** **5** **не** **считай**). **Короткие** **описания**, **если** **нужно** **уплотнить** **текст**.
9) В **каждом** \`stops\` **обязателен** \`estimatedCost\` — **строго** **число+€/₽** **(или** **диапазон)** **либо** \`Бесплатно\`; **без** **пояснений** (**«входит** **в** **билет»**,** **«включено** **в** **…»**); **без** **«место:** **…»** **и** **скобок**; **валюта** (Европа — **€**, **РФ/СНГ** — **₽**); **бесплатные** **улицы/площади** — \`Бесплатно\`; **платные** **музеи/храмы** — **реалистичный** **билет**; **не** **один** **и** **тот** **же** \`~0\` **для** **всех** **платных** **мест**.
10) В **каждой** **остановке** **обязательны** \`cardTeaser\` (**сжатый** **текст** **для** **карточки** **списка**, **≤**${LEISURE_CARD_TEASER_MAX} **симв.**, **2** **строки** **в** **UI**) **и** \`interestingFacts\` (**3** **строки**): **как** **в** **однодневной** **схеме**, **без** **копирования** \`description\` **дословно** **в** \`cardTeaser\`.`;

  const userPrompt = `Собери **${durationDays}** **раздельных** **днёв** в **${to}**; **как** **ожидается** **тур** **на** **все** **дни** **пребывания** — **никакого** **дубля** **достопримечательностей** **между** **днями**. **В** **каждом** **дне** **в** \`stops\` **ровно 5** **мест** (**старт** **отдельно**, **не** **в** **массиве**).

- **Первый** **день** (day 1): **старт/отель/точка** **около** «${startAddress}»;
- **Гостей:** ${travelers} чел., **бюджет:** ${budget}
${titleHint ? `- **Пожелания** (только **наследие**, **не** еда): ${titleHint}\n` : ""}
`;

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

  const modelPlan = multiDayLeisureFromModelSchema.safeParse(json);
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
  if (rawDays.length !== durationDays) {
    return NextResponse.json(
      {
        error: `Model returned ${rawDays.length} day(s), expected ${durationDays}`,
      },
      { status: 502 }
    );
  }

  const sorted = [...rawDays].sort((a, b) => a.day - b.day);
  for (let k = 0; k < sorted.length; k += 1) {
    if (sorted[k]!.day !== k + 1) {
      return NextResponse.json(
        { error: `day numbers must be 1…${durationDays} without gaps` },
        { status: 502 }
      );
    }
  }

  const seen = new Set<string>();
  for (const d of sorted) {
    for (const s of d.stops) {
      const key = normalizeLeisureTitle(s.title) || s.title.trim();
      if (seen.has(key)) {
        return NextResponse.json(
          { error: "Duplicate place title between days" },
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
          "Не удалось определить точку старта. Укажите улицу и дом, проверьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY (пакеты Search и HTTP Geocoder). Координаты — WGS84 для Яндекс.Карт.",
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
      dayTitle:
        dayRow.dayTitle?.trim() || `День ${dayRow.day}: ${to}`,
      stops: materialized,
      startPoint: firstDayStart,
    });
  }

  return NextResponse.json({ days: out, durationDays });
}
