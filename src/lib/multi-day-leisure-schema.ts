import { z } from "zod";
import { dayLeisureModelStopSchema } from "./day-leisure-schema";

/**
 * Сразу N дней: в каждом `stops` — только этот день, без дубликатов названий с другими днями
 * (сервер дополнительно валидирует уникальность по `normalizeLeisureTitle`).
 */
export const multiDayLeisureFromModelSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(60),
        dayTitle: z
          .preprocess(
            (v) => (v == null ? "" : String(v).trim() || ""),
            z.string()
          )
          .optional(),
        stops: z.preprocess(
          (v) => (Array.isArray(v) ? v.slice(0, 5) : v),
          z.array(dayLeisureModelStopSchema).length(5)
        ),
      })
    )
    .min(1)
    .max(60),
});

export type MultiDayLeisureFromModel = z.infer<typeof multiDayLeisureFromModelSchema>;

export const normalizeLeisureTitle = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.…]+$/g, "")
    .trim();
