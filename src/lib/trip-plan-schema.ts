import { z } from "zod";

const rawAttractionSchema = z.object({
  title: z.string(),
  category: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
  lat: z.number(),
  lon: z.number(),
  rating: z.number().min(0).max(5).optional(),
});

const mapCenterSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  zoom: z.number().min(1).max(18).optional(),
});

const dayPlanSchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  items: z.array(z.string()),
});

export const rawTripPlanFromModelSchema = z.object({
  dayPlans: z.array(dayPlanSchema),
  recommendations: z.array(rawAttractionSchema),
  mapCenter: mapCenterSchema,
});

export type RawTripPlanFromModel = z.infer<typeof rawTripPlanFromModelSchema>;
