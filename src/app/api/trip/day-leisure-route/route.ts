import { NextResponse } from "next/server";
import { buildLeisureRouteStopsFromModel } from "@/lib/build-leisure-route-stops";
import { dayLeisurePlanFromModelSchema } from "@/lib/day-leisure-schema";
import {
  isLeisureFoodCategory,
  orderSightsStopsByStartAndNearest,
} from "@/lib/leisure-stop-order";
import { getServerEnv } from "@/lib/server-env";
import {
  resolveStopsWithGeocodedCoords,
  yandexGeocodeFirstMatch,
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
  }) ?? {};

  const to = String(parsed.to ?? "").trim();
  const startAddress = String(parsed.startAddress ?? "").trim();
  const budget = String(parsed.budget ?? "—");
  const travelers = Number(parsed.travelers ?? 1) || 1;
  const titleHint = String(parsed.titleHint ?? "").trim();

  if (!to) {
    return NextResponse.json({ error: "to required" }, { status: 400 });
  }
  if (!startAddress) {
    return NextResponse.json({ error: "startAddress required" }, { status: 400 });
  }

  const systemPrompt = `Ты планировщик **пешего маршрута по истории и сильным туристическим местам** (без еды) в городе назначения. Отвечай ТОЛЬКО валидным JSON (без markdown) на русском.
Схема:
{
  "dayTitle"?: string,
  "stops": [
    {
      "title": string,
      "description": string (2-3 предложения: **исторический/культурный контекст** и зачем прийти),
      "category": "Достопримечательность" | "Музей" | "Смотровая" | "Прогулка" | "Памятник" | "Собор/храм" | "Крепость/дворец" | "Сад/исторический парк" | "Мост/бастион" | "Площадь/квартал" | "Другое",
      "timeSlot"?: string (кратко: «утро», «09:00-10:00» и т.п.),
      "lat": number,
      "lon": number,
      "rating"?: number (3.0-5.0),
      "estimatedCost": string (например ~вход, музейный билет, или ~0 при свободном дне),
      "interestingFacts": [ string, string, string ] (ровно **3** **разных** **коротких** **факта**: даты, цифры, имена; **не** **дублируй** \`description\`, по 1–2 предложения)
    }
  ]
}
**Лимит:** в массиве \`stops\` **ровно 5** **достопримечательностей** **на** **день** (это **только** **пункты** **осмотра**; **адрес/точка** **старта** **${startAddress}** **в** **JSON** **не** **включается** **и** **в** **счёт** **5** **не** **идёт**).
**Цена:** \`estimatedCost\` — **приблизительный** **вход/визит** **в** **валюте** **региона** (европейские **города** — **€**, **Россия/СНГ** — **₽**); **бесплатные** **площади/смотровые/уличные** **объекты** — \`Бесплатно\`; **музеи/платные** **соборы/крепости** — **реалистичный** **типичный** **билет**; **не** **подставляй** **одинаковый** \`~0\` **на** **все** **платные** **места**.

**Что включать (тематика):**
- **Только** то, что даёт **историю, архитектуру, наследие, сильные виды, знаковые** для туриста **площади/кварталы/улицы-музеи** (рынки — только как **историко-архитектурный** объект, без шоппинга как цели).
- **Музеи**, **крепости**, **соборы/храмы/базилики** (релевантны месту), **крепостные стены/ворота/башни/мосты**, **памятники и монументы**, **панорамные/исторически важные смотровые**, **исторические** сады и **ландшафтные** парки у дворцов/монастырей, **королевский/резиденция** (если есть), **UNESCO-объекты** в городе — приоритет, если применимо.

**Жёсткие запреты в \`stops\` (нельзя):**
- **Парки аттракционов, тематические/развлекательные парки, парки с каруселями/американскими горками**, **аква/водные развлечения как парк** (а не исторический купальный комплекс как памятник, если вдруг релевантен — по умолчанию **не включать**).
- **Кафе, рестораны, еда**, ТЦ как цель, **только шоппинг**, **кино/боулинг/игровые центры**, **зоопарки-развлечения** (как «день в парке с аттракционами») — **нет**; **никакой** гастротемы.
- **Общий «городской парк»** без **историко-культурной** привязки — **не** как отдельная слабая остановка, если в том же **${to}** есть **более** сильная **историческая** альтернатива **рядом** по **маршруту**.

**Координаты** WGS84, объекты — **реальные** в **${to}**.

**Порядок = одна **последовательная** **прогулка:** выдавай \`stops\` **в смысловом** порядке **одного** **непрерывного** дня: **от** старта/утра **к** следующей точке **так**, будто пишешь **нумерованный** **пеший** **маршрут** (без «там и сюда» **через** полгорода, без **луча** **звёздой** от одной площади: **только** **короткие** **переходы** **между** **соседними** **в** **списке**). **После** ответа **сервер** ещё **сортирует** **точки** по **коротким** **пешим** **переходам**, поэтому **сильно** **нелогичные** **кучи** **в** **разных** **частях** **города** **в** **координатах** **всё** **равно** **испортят** **день** — **сразу** **заложи** **один** **уплотнённый** **карман** **и** **цепочку** **1→2→3→…**.

**Компактно:** **между** **соседними** **остановками** **в** **твоём** \`stops\` **~0,7–1,4** км **по** **прямой** (или 8–16 мин **пешком**); **между** \`(lat,lon)\` **соседних** **в** \`stops\` **не** **должно** **быть** **разрывов** **3+** км, **если** **это** **не** **краткий** **трансфер** **и** **нет** **уже** **альтернативы** **в** **кластере**; **точка** **старта** "${startAddress}": **с** **логикой** **к** **самой** **ближайшей** **к** **ней** **первой** **посещаемой** **достопримечательностью** (3–12 мин); весь **день** в **одном** **историко-туристическом** **кластере** **без** **скачков** **через** **весь** **${to}**.`;

  const userPrompt = `Собери **однодневный** **пеший** маршрут: **только** **исторические** **достопримечательности** и **интересные** **туристические** **места** (архитектура, музеи, площади, наследие). **Без** **парков** **аттракционов** и **развлечений**; **без** **еды** в **списке**.
- В \`stops\` **ровно 5** **объектов** (счёт **только** **по** **достопримечательностям**; **старт** **«${startAddress}»** **отдельно**, **в** **массив** **не** **клади**). У **каждого** **объекта** **заполни** \`interestingFacts\` **тремя** **разными** **строками**.
- Город/регион: ${to}
- **Старт (текущая точка):** ${startAddress}
- Группа: ${travelers} чел., бюджет: ${budget}
${titleHint ? `- Пожелание (только **наследие/история/смотри**, не еда, не «парки с горками»): ${titleHint}\n` : ""}`;

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
  const yandexKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
  const toCity = to.trim();
  const startPoint =
    (await yandexGeocodeFirstMatch(
      [
        startAddress,
        `${startAddress}, ${toCity}`,
        `${toCity}, ${startAddress}`,
        toCity,
      ],
      yandexKey
    )) ?? null;
  const ordered = orderSightsStopsByStartAndNearest(sightStops, startPoint);
  const geocoded = await resolveStopsWithGeocodedCoords(ordered, toCity, yandexKey);
  const orderedForPath = orderSightsStopsByStartAndNearest(geocoded, startPoint);
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
