import {
  DEFAULT_WORLD_MAP_CENTER,
  dayCountForItinerary,
} from "@/lib/trip-dates";
import type { GeneratedTripPlan, TripFormFields } from "@/types/trip";

/**
 * Минимальный план для экрана поездки без вызова генерации (DeepSeek / Google CSE / Places).
 */
export const buildPlaceholderTripPlan = (form: TripFormFields): GeneratedTripPlan => {
  const n = dayCountForItinerary(form.durationDays);
  return {
    dayPlans: Array.from({ length: n }, (_, i) => ({
      day: i + 1,
      title: `День ${i + 1}`,
      items: [] as string[],
    })),
    recommendations: [],
    mapCenter: { ...DEFAULT_WORLD_MAP_CENTER },
  };
};
