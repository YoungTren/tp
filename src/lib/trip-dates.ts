import type { DayPlan, TripData } from "@/types/trip";

export const MAX_TRIP_ITINERARY_DAYS = 60;

/** 1…60, при кривом вводе — 3. */
export const normalizeDurationDays = (n: number): number => {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v) || v < 1) {
    return 3;
  }
  return Math.min(v, MAX_TRIP_ITINERARY_DAYS);
};

export const dayCountForItinerary = (durationDays: number): number =>
  normalizeDurationDays(durationDays);

export const DEFAULT_WORLD_MAP_CENTER = { lat: 20, lon: 15, zoom: 2 };

/**
 * Плитки дней: столько, сколько указано в durationDays (по умолчанию 3), с подстановкой из плана.
 */
export const buildItineraryState = (td: TripData): DayPlan[] => {
  const n = dayCountForItinerary(td.durationDays);
  const src = td.plan.dayPlans;
  return Array.from({ length: n }, (_, i) => {
    const found = src[i];
    if (found) {
      return { ...found, day: i + 1 };
    }
    return { day: i + 1, title: `День ${i + 1}`, items: [] as string[] };
  });
};

export const resizeItineraryDays = (prev: DayPlan[], nextCount: number): DayPlan[] => {
  if (nextCount < 1) {
    return prev;
  }
  if (nextCount < prev.length) {
    return prev.slice(0, nextCount).map((d, i) => ({ ...d, day: i + 1 }));
  }
  if (nextCount > prev.length) {
    const out: DayPlan[] = prev.map((d, i) => ({ ...d, day: i + 1 }));
    for (let k = prev.length; k < nextCount; k += 1) {
      out.push({ day: k + 1, title: `День ${k + 1}`, items: [] as string[] });
    }
    return out;
  }
  return prev.map((d, i) => ({ ...d, day: i + 1 }));
};
