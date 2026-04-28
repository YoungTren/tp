import type { LeisureRouteStop, MapCenter } from "@/types/trip";

export type WgsPoint = { readonly lat: number; readonly lon: number };

/**
 * (0,0) в океане — часто «заглушка» при сбое геокода; в цепочке WGS она
 * растягивает границы карты на весь мир.
 */
export const isPlausibleWgs = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  (Math.abs(lat) > 1e-5 || Math.abs(lon) > 1e-5);

/**
 * Та же цепочка, что в API: старт (если есть) + остановки по `order` —
 * для ссылки yandex.ru/maps и пешеходного multiroute в виджете.
 */
export const buildDayRouteWgsPath = (args: {
  routeStartPoint?: { lat: number; lon: number } | null;
  routeStops?: Pick<LeisureRouteStop, "order" | "lat" | "lon">[] | null;
}): WgsPoint[] => {
  const ordered = [...(args.routeStops ?? [])]
    .filter(
      (s) =>
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lon) &&
        isPlausibleWgs(s.lat, s.lon)
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ lat: s.lat, lon: s.lon } as const));
  const sp = args.routeStartPoint;
  if (sp && isPlausibleWgs(sp.lat, sp.lon)) {
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
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lon) &&
      isPlausibleWgs(p.lat, p.lon)
  );
  if (pts.length < 2) return null;
  const rtext = pts.map((p) => `${p.lat},${p.lon}`).join("~");
  const u = new URL("https://yandex.ru/maps/");
  u.searchParams.set("rtext", rtext);
  u.searchParams.set("rtt", "pd");
  return u.toString();
};

/**
 * Центр и zoom карты по bbox точек маршрута — чтобы виджет изначально смотрел на реальные координаты достопримечательностей, а не только на общий центр города.
 */
export const mapCenterFromWaypoints = (
  points: readonly WgsPoint[]
): MapCenter | null => {
  const pts = points.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lon) &&
      isPlausibleWgs(p.lat, p.lon)
  );
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const p = pts[0]!;
    return { lat: p.lat, lon: p.lon, zoom: 14 };
  }
  let minLat = pts[0]!.lat;
  let maxLat = pts[0]!.lat;
  let minLon = pts[0]!.lon;
  let maxLon = pts[0]!.lon;
  for (const p of pts) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  const lat = (minLat + maxLat) / 2;
  const lon = (minLon + maxLon) / 2;
  const latSpan = Math.max(1e-7, maxLat - minLat);
  const lonSpan = Math.max(1e-7, maxLon - minLon);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const effLonSpan = lonSpan * Math.max(0.35, Math.abs(cosLat));
  const span = Math.max(latSpan, effLonSpan);
  let zoom = 13;
  if (span > 0.35) zoom = 11;
  else if (span > 0.18) zoom = 12;
  else if (span > 0.09) zoom = 13;
  else if (span > 0.045) zoom = 14;
  else zoom = 15;
  return {
    lat,
    lon,
    zoom: Math.min(15, Math.max(10, zoom)),
  };
};
