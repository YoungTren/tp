import {
  DEFAULT_WORLD_MAP_CENTER,
  dayCountForItinerary,
} from "@/lib/trip-dates";
import type {
  GeneratedTripPlan,
  MapCenter,
  TripFormFields,
} from "@/types/trip";

/**
 * Минимальный план для экрана поездки без вызова генерации (DeepSeek / Google CSE / Places).
 * `initialMapCenter` — координаты города из ответа `/api/validate-city`, чтобы карта Dashboard не стартовала с вида «весь мир».
 */
export const buildPlaceholderTripPlan = (
  form: TripFormFields,
  initialMapCenter?: MapCenter | null
): GeneratedTripPlan => {
  const n = dayCountForItinerary(form.durationDays);
  const center =
    initialMapCenter &&
    Number.isFinite(initialMapCenter.lat) &&
    Number.isFinite(initialMapCenter.lon) &&
    Number.isFinite(initialMapCenter.zoom)
      ? {
          lat: initialMapCenter.lat,
          lon: initialMapCenter.lon,
          zoom: initialMapCenter.zoom,
        }
      : { ...DEFAULT_WORLD_MAP_CENTER };
  return {
    dayPlans: Array.from({ length: n }, (_, i) => ({
      day: i + 1,
      title: `День ${i + 1}`,
      items: [] as string[],
    })),
    recommendations: [],
    mapCenter: center,
  };
};
