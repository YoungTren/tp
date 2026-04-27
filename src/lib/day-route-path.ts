import type { LeisureRouteStop } from "@/types/trip";

export type WgsPoint = { readonly lat: number; readonly lon: number };

/**
 * Та же цепочка, что в API: старт (если есть) + остановки по `order` —
 * для ссылки yandex.ru/maps и пешеходного multiroute в виджете.
 */
export const buildDayRouteWgsPath = (args: {
  routeStartPoint?: { lat: number; lon: number } | null;
  routeStops?: Pick<LeisureRouteStop, "order" | "lat" | "lon">[] | null;
}): WgsPoint[] => {
  const ordered = [...(args.routeStops ?? [])]
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ lat: s.lat, lon: s.lon } as const));
  const sp = args.routeStartPoint;
  if (sp && Number.isFinite(sp.lat) && Number.isFinite(sp.lon)) {
    return [sp, ...ordered];
  }
  return ordered;
};

/**
 * Для встроенной карты: как `buildDayRouteWgsPath`, плюс старт с клиентского геокода,
 * если с сервера `routeStartPoint` не пришёл.
 */
export const resolveItineraryPathForView = (args: {
  serverPath: WgsPoint[];
  routeStartPoint?: { lat: number; lon: number } | null;
  geocodedStart: WgsPoint | null;
}): WgsPoint[] => {
  if (args.serverPath.length === 0) return [];
  if (args.routeStartPoint) return args.serverPath;
  if (args.geocodedStart) {
    return [args.geocodedStart, ...args.serverPath];
  }
  return args.serverPath;
};

/**
 * Веб-Я.Карты: тот же порядок WGS, что `ymaps.route(…, { multiRoute, routingMode: "pedestrian" })` и rtt=pd.
 */
export const buildYandexMapsPedestrianRouteUrl = (
  path: readonly WgsPoint[]
): string | null => {
  const pts = path.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
  );
  if (pts.length < 2) return null;
  const rtext = pts.map((p) => `${p.lat},${p.lon}`).join("~");
  const u = new URL("https://yandex.ru/maps/");
  u.searchParams.set("rtext", rtext);
  u.searchParams.set("rtt", "pd");
  return u.toString();
};
