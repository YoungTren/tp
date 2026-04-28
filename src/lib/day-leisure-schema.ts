import { z } from "zod";
import { formatEstimatedCostSumOrFree } from "@/lib/place-price-hint";

/** Лимит текста `cardTeaser` под 2 строки (text-xs) в карточке маршрута. */
export const LEISURE_CARD_TEASER_MAX = 100;

/** Модель часто отдаёт lat/lon строкой, рейтинг 4.7 или вне 3..5, стоимость как число. */
const toFiniteNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Координаты из JSON модели не используются — на карту ставит Яндекс (Search/Geocoder). */
const ignoredWgsFromModel = z.unknown().transform(() => 0);

const looseString = (fallback = "") =>
  z.preprocess(
    (v) => (v == null || v === undefined ? fallback : String(v).trim() || fallback),
    z.string()
  );

const looseRating = z.preprocess(
  (v) => {
    if (v == null || v === "" || v === undefined) return undefined;
    const n = toFiniteNumber(v);
    return n == null ? 4.2 : Math.min(5, Math.max(1, n));
  },
  z.number().min(1).max(5).optional()
);

const estimatedCost = z.preprocess(
  (v) => {
    if (v == null || v === undefined) return "~— ₽";
    if (typeof v === "number" && Number.isFinite(v)) return `~${Math.round(v)} ₽`;
    const s = String(v).trim();
    return s.length > 0 ? s : "~— ₽";
  },
  z.string()
).transform((s) => formatEstimatedCostSumOrFree(s));

const factLine = (s: string, i: number) => {
  const t = s.trim();
  if (t.length > 0) return t;
  return `Короткий факт ${i + 1} о месте.`;
};

/** Ровно 3 факта; недостающие подпираем, лишние обрезаем. */
const interestingFactsThree = z.preprocess(
  (v) => {
    if (!Array.isArray(v)) {
      return [factLine("", 0), factLine("", 1), factLine("", 2)];
    }
    const lines = v.map((x) => String(x ?? "").trim());
    return [0, 1, 2].map((i) => factLine(lines[i] ?? "", i));
  },
  z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)])
);

const cardTeaser = z.unknown().optional().transform((v) => {
  if (v == null) return "";
  const t0 = String(v)
    .trim()
    .replace(/\s+/g, " ");
  if (t0.length > LEISURE_CARD_TEASER_MAX) {
    return t0.slice(0, LEISURE_CARD_TEASER_MAX);
  }
  return t0;
});

/** Один пункт дневного пешего маршрута (с модели). */
export const dayLeisureModelStopSchema = z.object({
  title: looseString("Место"),
  description: looseString("Описание отсутствует"),
  /** Короткий текст для карточки в списке (2 строки в UI); пусто — клиент даст фоллбек. */
  cardTeaser,
  category: looseString("Другое"),
  timeSlot: z.preprocess(
    (v) => (v == null ? undefined : String(v).trim() || undefined),
    z.string().optional()
  ),
  lat: ignoredWgsFromModel,
  lon: ignoredWgsFromModel,
  rating: looseRating,
  estimatedCost,
  interestingFacts: interestingFactsThree,
});

export type DayLeisureModelStop = z.infer<typeof dayLeisureModelStopSchema>;

/** Ответ DeepSeek: один день, последовательные остановки с координатами в месте назначения. */
export const dayLeisurePlanFromModelSchema = z.object({
  dayTitle: z.preprocess(
    (v) => (v == null ? undefined : String(v).trim() || undefined),
    z.string().optional()
  ),
  stops: z.preprocess(
    (v) => (Array.isArray(v) ? v.slice(0, 5) : v),
    z.array(dayLeisureModelStopSchema).length(5)
  ),
});
