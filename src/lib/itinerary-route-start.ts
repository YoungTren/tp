import type { DayPlan } from "@/types/trip";

/**
 * Адрес начала маршрута, введённый пользователем, хранится в дне 1;
 * для карт/маршрута на любом дне подставляем его, если у текущего дня пусто.
 */
export const resolveTripRouteStartAddress = (
  days: DayPlan[],
  current: DayPlan
): string | null => {
  const cur = current.routeStartAddress?.trim();
  if (cur) return cur;
  for (const d of days) {
    const t = d.routeStartAddress?.trim();
    if (t) return t;
  }
  return null;
};

/**
 * Та же логика для геоточки старта: одна на всю поездку, дублируем на карту для каждого дня.
 */
export const resolveTripRouteStartPoint = (
  days: DayPlan[],
  current: DayPlan
): { lat: number; lon: number } | undefined => {
  const sp0 = current.routeStartPoint;
  if (
    sp0 != null &&
    Number.isFinite(sp0.lat) &&
    Number.isFinite(sp0.lon)
  ) {
    return sp0;
  }
  for (const d of days) {
    const sp = d.routeStartPoint;
    if (
      sp != null &&
      Number.isFinite(sp.lat) &&
      Number.isFinite(sp.lon)
    ) {
      return sp;
    }
  }
  return undefined;
};
