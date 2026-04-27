import { z } from "zod";

/** Модель часто отдаёт lat/lon строкой, рейтинг 4.7 или вне 3..5, стоимость как число. */
const toFiniteNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const wgsLat = z
  .unknown()
  .transform((v) => {
    const n = toFiniteNumber(v);
    if (n == null) return Number.NaN;
    return Math.min(90, Math.max(-90, n));
  })
  .pipe(z.number().finite());

const wgsLon = z
  .unknown()
  .transform((v) => {
    const n = toFiniteNumber(v);
    if (n == null) return Number.NaN;
    return Math.min(180, Math.max(-180, n));
  })
  .pipe(z.number().finite());

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
);

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

/** Один пункт дневного пешего маршрута (с модели). */
export const dayLeisureModelStopSchema = z.object({
  title: looseString("Место"),
  description: looseString("Описание отсутствует"),
  category: looseString("Другое"),
  timeSlot: z.preprocess(
    (v) => (v == null ? undefined : String(v).trim() || undefined),
    z.string().optional()
  ),
  lat: wgsLat,
  lon: wgsLon,
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
