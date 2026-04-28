import { NextResponse } from "next/server";
import { buildLeisureRouteStopsFromModel } from "@/lib/build-leisure-route-stops";
import {
  dayLeisurePlanFromModelSchema,
  LEISURE_CARD_TEASER_MAX,
  type DayLeisureModelStop,
} from "@/lib/day-leisure-schema";
import {
  isLeisureFoodCategory,
  orderSightsStopsByStartAndNearest,
} from "@/lib/leisure-stop-order";
import { getServerEnv } from "@/lib/server-env";
import { normalizeLeisureTitle } from "@/lib/multi-day-leisure-schema";
import {
  geocodeStartAddressFirstMatch,
  resolveStopsWithGeocodedCoords,
} from "@/lib/yandex-geocode-server";

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
    titleHint?: string;
    /** Названия с других дней — **не** дублировать. */
    lockedStopTitles?: string[];
    dayInTrip?: { current: number; total: number };
  }) ?? {};

  const to = String(parsed.to ?? "").trim();
  const startAddress = String(parsed.startAddress ?? "").trim();
  const budget = String(parsed.budget ?? "—");
  const travelers = Number(parsed.travelers ?? 1) || 1;
  const titleHint = String(parsed.titleHint ?? "").trim();
  const lockedStopTitles = Array.isArray(parsed.lockedStopTitles)
    ? parsed.lockedStopTitles.map((t) => String(t ?? "").trim()).filter(Boolean)
    : [];
  const dayIn = parsed.dayInTrip;
  const dayInTrip =
    dayIn &&
    Number.isFinite(Number(dayIn.current)) &&
    Number.isFinite(Number(dayIn.total)) &&
    Number(dayIn.current) >= 1 &&
    Number(dayIn.total) >= 1
      ? { current: Math.trunc(Number(dayIn.current)), total: Math.trunc(Number(dayIn.total)) }
      : null;

  if (!to) {
    return NextResponse.json({ error: "to required" }, { status: 400 });
  }
  if (!startAddress) {
    return NextResponse.json({ error: "startAddress required" }, { status: 400 });
  }

  const systemMultiDayBlock =
    lockedStopTitles.length > 0
      ? `
**Мультидневка (жёстко):** **НИ** **одна** \`stops[i].title\` **не** **должна** **дублировать** **уже** **занятые** **другими** **днями** **места** (см. **список** **у** **пользователя**); **запрещены** **перефразы** **того** **же** **POI** **и** **«почти** **то** **же»** **имя**.`
      : "";
  const systemDayOrdinalBlock = dayInTrip
    ? `
**Позиция** **в** **поездке:** **оформляется** **день** **${dayInTrip.current}** **из** **${dayInTrip.total}** — **один** **связный** **пеший** **карман**; **если** **другие** **дни** **уже** **заняли** **часть** **центра**, **смести** **кластер** (другой **квартал/район**), **сохраняя** **связку** **с** **стартом** **«${startAddress}»** **для** **ухода** **в** **твой** **карман**.`
    : "";

  const systemPrompt = `Ты планировщик **пешего маршрута по истории и сильным туристическим местам** (без еды) в городе назначения. Отвечай ТОЛЬКО валидным JSON (без markdown) на русском.
Схема:
{
  "dayTitle"?: string,
  "stops": [
    {
      "title": string,
      "description": string (2-3 предложения: **исторический/культурный контекст** и зачем прийти),
      "cardTeaser": string (**одна** **строка** **без** **\\n**; **не** **длиннее** **${LEISURE_CARD_TEASER_MAX}** **символов**; **сжатый** **анонс** **для** **карточки** **в** **списке** **маршрута** — **ровно** **2** **визуальные** **строки** **мелким** **шрифтом**; **смысл** **с** \`description\`/**фактов**, **но** **своими** **словами** **и** **короче**),
      "category": "Достопримечательность" | "Музей" | "Смотровая" | "Прогулка" | "Памятник" | "Собор/храм" | "Крепость/дворец" | "Сад/исторический парк" | "Мост/бастион" | "Площадь/квартал" | "Другое",
      "timeSlot"?: string (кратко: «утро», «09:00-10:00» и т.п.),
      "lat": 0,
      "lon": 0,
      "rating"?: number (3.0-5.0),
      "estimatedCost": string (**только** **цена/диапазон**: **например** \`15€\`, \`~8–20 €\`, \`Бесплатно\`; **без** **названия** **места** **до** **двоеточия** **и** **без** **скобок** **с** **пояснениями** **про** **бронь/**тип **билета**),
      "interestingFacts": [ string, string, string ] (ровно **3** **разных** **коротких** **факта**: даты, цифры, имена; **не** **дублируй** \`description\`, по 1–2 предложения)
    }
  ]
}
**Лимит:** в массиве \`stops\` **ровно 5** **достопримечательностей** **на** **день** (это **только** **пункты** **осмотра**; **адрес/точка** **старта** **${startAddress}** **в** **JSON** **не** **включается** **и** **в** **счёт** **5** **не** **идёт**).
**Цена:** \`estimatedCost\` — **строго** **либо** **число+€/₽** **(или** **диапазон** **~8–20** **€)**, **либо** **одно** **слово** \`Бесплатно\`; **запрещены** **пояснения** («входит** **в** **билет»,** **«включено** **в** **музеи»** **и** **т.п.**); **не** **пиши** **«Галерея:** **…»** **и** **не** **добавляй** **текст** **в** **скобках**; **валюта** **региона** (европейские **города** — **€**, **Россия/СНГ** — **₽**); **бесплатные** **площади/смотровые/уличные** — \`Бесплатно\`; **музеи/платные** **соборы/крепости** — **реалистичный** **билет**; **не** **подставляй** **одинаковый** \`~0\` **на** **все** **платные** **места**.

**Что включать (тематика):**
- **Только** то, что даёт **историю, архитектуру, наследие, сильные виды, знаковые** для туриста **площади/кварталы/улицы-музеи** (рынки — только как **историко-архитектурный** объект, без шоппинга как цели).
- **Музеи**, **крепости**, **соборы/храмы/базилики** (релевантны месту), **крепостные стены/ворота/башни/мосты**, **памятники и монументы**, **панорамные/исторически важные смотровые**, **исторические** сады и **ландшафтные** парки у дворцов/монастырей, **королевский/резиденция** (если есть), **UNESCO-объекты** в городе — приоритет, если применимо.

**Жёсткие запреты в \`stops\` (нельзя):**
- **Парки аттракционов, тематические/развлекательные парки, парки с каруселями/американскими горками**, **аква/водные развлечения как парк** (а не исторический купальный комплекс как памятник, если вдруг релевантен — по умолчанию **не включать**).
- **Кафе, рестораны, еда**, ТЦ как цель, **только шоппинг**, **кино/боулинг/игровые центры**, **зоопарки-развлечения** (как «день в парке с аттракционами») — **нет**; **никакой** гастротемы.
- **Общий «городской парк»** без **историко-культурной** привязки — **не** как отдельная слабая остановка, если в том же **${to}** есть **более** сильная **историческая** альтернатива **рядом** по **маршруту**.

**Координаты** в \`lat\`/\`lon\` **не** **используются** (ставь \`0\`/\`0\`); **на** **карте** **и** **для** **расстояний** **сервер** **сам** **ставит** **точки** **через** **Яндекс.Карты** **(Search/Geocoder)** **по** \`title\` **и** **городу** **${to}**.

**Порядок = одна** **логичная** **пешая** **цепочка** **дня:** выдавай \`stops\` **в** **смысловом** **порядке** (один **кластер** **без** **рваных** **переездов** **по** **смыслу**); **после** **ответа** **сервер** **ещё** **отсортирует** **точки** **по** **коротким** **переходам** **уже** **по** **реальным** **координатам** **Яндекса** **и** **старту** **«${startAddress}»** — **сразу** **заложи** **сильные** **места** **рядом** **в** **тексте**, **без** **трёх** **разных** **частей** **одного** **дня** **как** **списка**.

**Компактно:** **задумай** **соседние** **по** **смыслу** **и** **географии** **${to}** **(типично** **~0,7–1,4** **км** **между** **соседними** **в** **итоговом** **дне**); **старт** **«${startAddress}»** **учитывается** **сервером** **и** **картой** — **логично** **свяжи** **первую** **и** **следующие** **достопримечательности** **в** **одном** **кармане** **дня**.${systemMultiDayBlock}${systemDayOrdinalBlock}`;

  const lockedListBlock =
    lockedStopTitles.length > 0
      ? `

**Уже занято (другие дни) — НЕЛЬЗЯ повторять и «почти повторять» (ни дубли, ни перефраз):**
${lockedStopTitles.map((t) => `• ${t}`).join("\n")}
`
      : "";

  const userPrompt = `Собери **однодневный** **пеший** маршрут: **только** **исторические** **достопримечательности** и **интересные** **туристические** **места** (архитектура, музеи, площади, наследие). **Без** **парков** **аттракционов** и **развлечений**; **без** **еды** в **списке**.
- В \`stops\` **ровно 5** **объектов** (счёт **только** **по** **достопримечательностям**; **старт** **«${startAddress}»** **отдельно**, **в** **массив** **не** **клади**). У **каждого** **объекта** **заполни** \`cardTeaser\` **(лимит** **${LEISURE_CARD_TEASER_MAX}** **симв.)** **и** \`interestingFacts\` **тремя** **разными** **строками**.
- Город/регион: ${to}
- **Старт (текущая точка):** ${startAddress}
- Группа: ${travelers} чел., бюджет: ${budget}
${titleHint ? `- Пожелание (только **наследие/история/смотри**, не еда, не «парки с горками»): ${titleHint}\n` : ""}${lockedListBlock}`;

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
      {
        error: "DeepSeek request failed",
        ...(msg ? { detail: msg } : {}),
      },
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

  const modelPlan = dayLeisurePlanFromModelSchema.safeParse(json);
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

  const raw = modelPlan.data;
  const sightStops = raw.stops.filter((s) => !isLeisureFoodCategory(s.category));
  if (sightStops.length !== 5) {
    return NextResponse.json(
      {
        error:
          "Ожидается ровно 5 достопримечательностей в дне (после исключения гастро-точек). Пересоберите маршрут.",
      },
      { status: 502 }
    );
  }
  const titleSeen = new Set<string>();
  for (const s of sightStops) {
    const k = normalizeLeisureTitle(s.title) || s.title.trim();
    if (titleSeen.has(k)) {
      return NextResponse.json(
        { error: "Повтор названия остановки в одном дне" },
        { status: 502 }
      );
    }
    titleSeen.add(k);
  }
  if (lockedStopTitles.length > 0) {
    const lockSet = new Set(
      lockedStopTitles.map((t) => normalizeLeisureTitle(t) || t.trim())
    );
    for (const s of sightStops) {
      const k = normalizeLeisureTitle(s.title) || s.title.trim();
      if (lockSet.has(k)) {
        return NextResponse.json(
          { error: "Совпадение с остановкой из другого дня; пересоберите." },
          { status: 502 }
        );
      }
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
  const startPoint =
    (await geocodeStartAddressFirstMatch(
      [
        startAddress,
        `${startAddress}, ${toCity}`,
        `${toCity}, ${startAddress}`,
        toCity,
      ],
      yandexKey
    )) ?? null;
  const geocoded = await resolveStopsWithGeocodedCoords(
    sightStops,
    toCity,
    yandexKey
  );
  const orderedForPath = orderSightsStopsByStartAndNearest(
    geocoded,
    startPoint
  );
  const google = { apiKey: googleApiKey, cseId: googleCseId };
  const stops = await buildLeisureRouteStopsFromModel({
    ordered: orderedForPath,
    to,
    google,
    placesApiKey: googlePlacesKey,
  });

  return NextResponse.json({
    dayTitle: raw.dayTitle?.trim() || `День: ${to}`,
    stops,
    startPoint: startPoint ?? undefined,
  });
}
