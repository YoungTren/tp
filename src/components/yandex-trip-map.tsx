"use client";
/// <reference types="google.maps" />

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_WORLD_MAP_CENTER } from "@/lib/trip-dates";
import {
  type WgsPoint,
  isPlausibleWgs,
  resolveItineraryPathForView,
} from "@/lib/day-route-path";
import { googleMapsJsApiKey, yandexMapsApiKey } from "@/lib/public-env";
import { getLeisureStopPlacemark } from "@/lib/yandex-leisure-placemark";

export type YandexMapPoint = {
  id: string;
  lat: number;
  lon: number;
  title: string;
  /** Категория остановки дня — влияет на иконку (еда / достопр. / прочее) */
  category: string;
  /** Номер на пине, если не совпадает с индексом в массиве (превью: пропуски геокода) */
  sequence?: number;
};

export type MapRouteFocus =
  | { kind: "start" }
  | { kind: "stop"; id: string }
  | null;

type YmapsMapInstance = {
  destroy: () => void;
  container: { fitToViewport: (preservePixelPosition?: boolean) => void };
  geoObjects: {
    removeAll: () => void;
    add: (o: object) => void;
    remove: (o: object) => void;
    getBounds: () => unknown;
  };
  setCenter: (
    center: [number, number],
    zoom?: number,
    options?: { duration?: number }
  ) => void;
  setZoom: (zoom: number) => void;
  setBounds: (
    bounds: unknown,
    options?: { checkZoomRange?: boolean; zoomMargin?: number; duration?: number }
  ) => void;
};

export type YandexTripMapProps = {
  mapCenter: { lat: number; lon: number; zoom: number };
  points: YandexMapPoint[];
  fromLabel: string;
  toLabel: string;
  /** Когда задан, при отсутствии дневного маршрута — фокус на старте; при наличии dayItineraryStops маршрут рисуется вместе со стартом */
  dayRouteStartAddress: string | null;
  /**
   * Та же точка старта, что на бэкенде (геокод startAddress). Приоритет над повторным геокодом
   * в браузере — иначе линия на карте расходится с порядком/логикой сценария.
   */
  dayRouteStartPoint?: { lat: number; lon: number } | null;
  /**
   * Цепочка WGS от бэка (и ссылки в Я.Картах) — в порядке сценария.
   * Если пусто при ненулевых `dayItineraryStops`, путь строится только из остановок.
   */
  dayRouteWgsPath: readonly WgsPoint[];
  /** Упорядоченные точки дневного маршрута (ломаная + метки, масштаб на все точки) */
  dayItineraryStops: YandexMapPoint[];
  /** Сфокусироваться на старте или остановке (клик в списке) */
  mapRouteFocus: MapRouteFocus;
  /**
   * Текст черновика адреса в поле старта — для подписи метки и контекста города.
   */
  draftRouteStartAddress?: string | null;
  /**
   * Если передано свойство — координаты черновика с сервера (`null` = не найдено или другой запрос).
   * Если свойство отсутствует (`undefined`) — черновик геокодируется в браузере через `ymaps.geocode`.
   */
  draftResolvedStart?: { lat: number; lon: number } | null;
  /** Геокодер не нашёл текущий текст черновика — не центрировать карту по «ложному» адресу */
  draftGeocodeFailed?: boolean;
  /**
   * Цепочка WGS по фактической геометрии пешеходного мультимаршрута — для ссылки в веб-Я.Карты.
   */
  onItineraryRoutePathChange?: (path: readonly WgsPoint[] | null) => void;
  /** Маршрутизация не построила пеший путь (нет запасной прямой линии между точками). */
  onPedestrianRouteBuildFailed?: () => void;
};

const SCRIPT_MARK = "data-tp-yandex-2-1";

/** Метка найденного адреса старта — только поддерживаемые пресеты API 2.1 (stretchy+emoji давали runtime error до блока камеры). */
const FOUND_START_PRESET = "islands#violetIcon";
const FOUND_START_PIN_Z = 715;

const coordsApproxEqual = (
  a: readonly [number, number],
  b: readonly [number, number]
): boolean =>
  Math.abs(a[0] - b[0]) < 1e-5 && Math.abs(a[1] - b[1]) < 1e-5;

const loadScript = (apiKey: string): Promise<void> => {
  const w = window;
  if (w.ymaps) {
    return Promise.resolve();
  }
  const existing = document.querySelector<HTMLScriptElement>(
    `script[${SCRIPT_MARK}]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (w.ymaps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Yandex Maps script error")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.setAttribute(SCRIPT_MARK, "1");
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU&coordorder=latlong`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Yandex Maps script error"));
    document.body.appendChild(s);
  });
};

const geocodeCoords = async (
  ymaps: NonNullable<Window["ymaps"]>,
  query: string
): Promise<[number, number] | null> => {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await ymaps.geocode(q, { results: 1 });
    const o = res.geoObjects.get(0);
    if (!o) return null;
    const coords = o.geometry.getCoordinates() as [number, number];
    const [lat, lon] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return [lat, lon];
  } catch {
    /** Яндекс отдаёт rejected promise с message scriptError при лимитах/сбоях геокодера — не роняем отрисовку карты. */
    return null;
  }
};

/** Уточнение геокода улицы/точки контекстом города поездки */
const geocodeQueryWithCity = (addressLine: string, cityLabel: string): string => {
  const a = addressLine.trim();
  if (!a) return "";
  const c = cityLabel.trim();
  return c ? `${a}, ${c}` : a;
};

const FOCUS_ZOOM = 16;
/** Приближение по найденному адресу в режиме черновика (пресеты Я.Карт ~ квартал). */
const DRAFT_ADDRESS_FOUND_ZOOM = 17;
const DRAFT_ADDRESS_FLY_MS = 480;
/** Крупный план по городу — без «уличного» 16+ */
const CITY_ZOOM = 12;
const CITY_FLY_MS = 850;
const WORLD_FLY_MS = 450;
/** Клик по списку / старт — заметный приближённый вид точки (веб-Я.Карты, ~квартал/квартал-два) */
const FOCUS_ON_LIST_CLICK_ZOOM = 18;
const FOCUS_ON_LIST_MS = 420;
const BASE_NUMBER_PIN_Z = 2500;
const START_PIN_Z = 2600;

const buildRouteSignature = (
  wgs: readonly WgsPoint[],
  stops: YandexMapPoint[],
  start: { lat: number; lon: number } | null | undefined,
  addr: string | null
): string =>
  [
    wgs.map((p) => `${p.lat},${p.lon}`).join("~"),
    stops
      .map((s) => `${s.id}:${s.lat},${s.lon}:${s.category ?? ""}`)
      .join("|"),
    start ? `${start.lat},${start.lon}` : "—",
    addr?.trim() ?? "",
  ].join("§");

const dedupeAdjacentWaypoints = (
  pts: readonly [number, number][]
): [number, number][] => {
  const out: [number, number][] = [];
  const eps = 1e-5;
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (
      prev &&
      Math.abs(prev[0] - p[0]) < eps &&
      Math.abs(prev[1] - p[1]) < eps
    ) {
      continue;
    }
    out.push([p[0], p[1]]);
  }
  return out;
};

const appendLatLonPairsToPath = (
  coords: unknown,
  out: WgsPoint[],
  eps = 1e-6,
  depth = 0
): void => {
  if (!Array.isArray(coords) || depth > 4) return;
  for (const row of coords) {
    if (
      Array.isArray(row) &&
      row.length >= 2 &&
      typeof row[0] === "number" &&
      typeof row[1] === "number"
    ) {
      const lat = row[0];
      const lon = row[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (!isPlausibleWgs(lat, lon)) continue;
      const prev = out[out.length - 1];
      if (
        prev &&
        Math.abs(prev.lat - lat) < eps &&
        Math.abs(prev.lon - lon) < eps
      ) {
        continue;
      }
      out.push({ lat, lon });
      continue;
    }
    if (Array.isArray(row)) {
      appendLatLonPairsToPath(row, out, eps, depth + 1);
    }
  }
};

const flattenGeoObjectCoords = (geom: unknown, out: WgsPoint[]): void => {
  if (!geom || typeof geom !== "object") return;
  const g = geom as {
    getCoordinates?: () => unknown;
    getGeometries?: () => {
      getLength?: () => number;
      get?: (i: number) => unknown;
    };
  };
  if (typeof g.getCoordinates === "function") {
    appendLatLonPairsToPath(g.getCoordinates(), out);
    return;
  }
  const nested = g.getGeometries?.();
  const nLen = nested?.getLength?.();
  if (typeof nLen === "number" && nested?.get) {
    for (let i = 0; i < nLen; i++) {
      flattenGeoObjectCoords(nested.get(i), out);
    }
  }
};

const countGeoCollection = (coll: unknown): number => {
  if (!coll || typeof coll !== "object") return 0;
  const c = coll as {
    getLength?: () => number;
    each?: (fn: (item: unknown, index?: number) => void) => void;
    toArray?: () => unknown[];
    length?: number;
  };
  if (typeof c.getLength === "function") {
    const n = c.getLength();
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  let viaEach = 0;
  if (typeof c.each === "function") {
    c.each(() => {
      viaEach++;
    });
    if (viaEach > 0) return viaEach;
  }
  const arr = c.toArray?.();
  if (Array.isArray(arr)) return arr.length;
  if (
    typeof c.length === "number" &&
    Number.isFinite(c.length) &&
    c.length >= 0
  ) {
    return Math.floor(c.length);
  }
  return 0;
};

const GOOGLE_MAPS_SCRIPT_ATTR = "data-tp-google-maps-js";

const loadGoogleMapsForDirections = (apiKey: string): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[${GOOGLE_MAPS_SCRIPT_ATTR}]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps script error"))
      );
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.setAttribute(GOOGLE_MAPS_SCRIPT_ATTR, "1");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps script load failed"));
    document.head.appendChild(s);
  });
};

/** Пешая геометрия от Google (цепочка участков), для подложки Яндекс-карты при отказе Яндекс-маршрутизации. */
const fetchWalkingPathGoogleDirections = async (
  apiKey: string,
  chainLatLon: [number, number][]
): Promise<WgsPoint[] | null> => {
  if (chainLatLon.length < 2) return null;
  try {
    await loadGoogleMapsForDirections(apiKey);
  } catch {
    return null;
  }
  const maps = window.google?.maps;
  if (!maps) return null;
  const pts = chainLatLon.map(([lat, lon]) => ({ lat, lng: lon }));
  const ds = new maps.DirectionsService();
  const merged: google.maps.LatLng[] = [];
  let legIndex = 0;

  return new Promise((resolve) => {
    const walkLeg = () => {
      if (legIndex >= pts.length - 1) {
        resolve(
          merged.map((ll) => ({
            lat: ll.lat(),
            lon: ll.lng(),
          }))
        );
        return;
      }
      ds.route(
        {
          origin: pts[legIndex]!,
          destination: pts[legIndex + 1]!,
          travelMode: maps.TravelMode.WALKING,
        },
        (result, status) => {
          if (
            status !== maps.DirectionsStatus.OK ||
            !result?.routes?.[0]?.overview_path?.length
          ) {
            resolve(null);
            return;
          }
          const ov = result.routes[0].overview_path!;
          if (legIndex > 0 && merged.length > 0 && ov.length > 0) {
            const firstOv = ov[0]!;
            const lastM = merged[merged.length - 1]!;
            const dup =
              Math.abs(firstOv.lat() - lastM.lat()) < 1e-5 &&
              Math.abs(firstOv.lng() - lastM.lng()) < 1e-5;
            merged.push(...(dup ? ov.slice(1) : ov));
          } else {
            merged.push(...ov);
          }
          legIndex++;
          walkLeg();
        }
      );
    };
    walkLeg();
  });
};

const appendCoordsFromPathGeoObject = (
  path: unknown,
  merged: WgsPoint[]
): void => {
  const p = path as {
    geometry?: unknown;
    getSegments?: () => {
      each?: (fn: (seg: unknown) => void) => void;
    };
    properties?: { get?: (name: string) => unknown };
  };
  const before = merged.length;
  flattenGeoObjectCoords(p.geometry, merged);
  const coordsProp = p.properties?.get?.("coordinates");
  if (coordsProp != null) {
    appendLatLonPairsToPath(coordsProp, merged);
  }
  const segs = p.getSegments?.();
  if (merged.length === before && segs && typeof segs.each === "function") {
    segs.each((seg: unknown) => {
      const s = seg as {
        geometry?: unknown;
        properties?: { get?: (name: string) => unknown };
      };
      flattenGeoObjectCoords(s.geometry, merged);
      const sc = s.properties?.get?.("coordinates");
      if (sc != null) appendLatLonPairsToPath(sc, merged);
    });
  }
};

/** Данные модели мультимаршрута (иногда заполнены раньше/иначе, чем geometry у geoObjects). */
const extractPedestrianPathFromMultiRouteModel = (
  multiRoute: unknown
): WgsPoint[] | null => {
  const model = (multiRoute as { model?: unknown }).model as
    | {
        getRoutes?: () => {
          getLength?: () => number;
          get?: (i: number) => unknown;
          each?: (fn: (r: unknown) => void) => void;
        };
      }
    | undefined;
  const routes = model?.getRoutes?.();
  if (!routes) return null;
  const merged: WgsPoint[] = [];
  const consumeRoute = (route: unknown): void => {
    const r = route as {
      getPaths?: () => {
        each?: (fn: (path: unknown) => void) => void;
        getLength?: () => number;
        get?: (i: number) => unknown;
      };
    };
    const paths = r.getPaths?.();
    if (!paths) return;
    if (typeof paths.each === "function") {
      paths.each((path) => appendCoordsFromPathGeoObject(path, merged));
    } else {
      const len =
        typeof paths.getLength === "function" ? paths.getLength() : 0;
      if (typeof paths.get === "function") {
        for (let i = 0; i < len; i++) {
          appendCoordsFromPathGeoObject(paths.get(i), merged);
        }
      }
    }
  };
  if (typeof routes.each === "function") {
    routes.each(consumeRoute);
  } else if (typeof routes.getLength === "function" && typeof routes.get === "function") {
    const len = routes.getLength();
    for (let i = 0; i < len; i++) {
      consumeRoute(routes.get(i));
    }
  }
  return merged.length >= 2 ? merged : null;
};

/** Геометрия активного пешеходного мультимаршрута для ссылки «как на карте». */
const extractPedestrianPathFromMultiRoute = (
  multiRoute: unknown
): WgsPoint[] | null => {
  const mr = multiRoute as {
    getActiveRoute?: () => unknown;
    getRoutes?: () => {
      getLength?: () => number;
      get?: (i: number) => unknown;
      each?: (fn: (route: unknown) => void) => void;
    };
  };
  let route: unknown = mr.getActiveRoute?.();
  const routes = mr.getRoutes?.();
  const rLen = countGeoCollection(routes);
  if (!route && rLen > 0 && routes?.get) {
    route = routes.get(0);
  }
  if ((!route || typeof route !== "object") && rLen > 0 && routes?.each) {
    routes.each((r: unknown) => {
      if (!route) route = r;
    });
  }
  const merged: WgsPoint[] = [];
  if (route && typeof route === "object") {
    const r = route as {
      geometry?: unknown;
      getPaths?: () => {
        each?: (fn: (path: unknown) => void) => void;
      };
    };
    flattenGeoObjectCoords(r.geometry, merged);
    const paths = r.getPaths?.();
    if (paths && typeof paths.each === "function") {
      paths.each((path: unknown) =>
        appendCoordsFromPathGeoObject(path, merged)
      );
    }
  }
  if (merged.length >= 2) {
    return merged;
  }
  const fromModel = extractPedestrianPathFromMultiRouteModel(multiRoute);
  return fromModel;
};

/**
 * Точная цепочка для пешеходного мультимаршрута: старт → места справа в том же порядке.
 * Не опирается только на rawView, чтобы линия совпадала со списком достопримечательностей.
 */
const pedestrianWaypointsFromPanelOrder = (
  stopsInUiOrder: readonly YandexMapPoint[],
  serverStart: { lat: number; lon: number } | null | undefined,
  geocodedStart: [number, number] | null
): [number, number][] => {
  const stopPts = stopsInUiOrder
    .filter((s) => isPlausibleWgs(s.lat, s.lon))
    .map((s) => [s.lat, s.lon] as [number, number]);
  let startPt: [number, number] | null = null;
  if (
    serverStart &&
    isPlausibleWgs(serverStart.lat, serverStart.lon)
  ) {
    startPt = [serverStart.lat, serverStart.lon];
  } else if (geocodedStart) {
    const [a, b] = geocodedStart;
    if (isPlausibleWgs(a, b)) {
      startPt = [a, b];
    }
  }
  const chain = startPt ? [startPt, ...stopPts] : stopPts;
  return dedupeAdjacentWaypoints(chain);
};

export const YandexTripMap = ({
  mapCenter,
  points,
  fromLabel: _fromLabel,
  toLabel,
  dayRouteStartAddress,
  dayRouteStartPoint,
  dayRouteWgsPath,
  dayItineraryStops,
  mapRouteFocus,
  draftRouteStartAddress = null,
  draftResolvedStart,
  draftGeocodeFailed = false,
  onItineraryRoutePathChange,
  onPedestrianRouteBuildFailed,
}: YandexTripMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YmapsMapInstance | null>(null);
  const onItineraryPathRef = useRef<typeof onItineraryRoutePathChange | undefined>(
    onItineraryRoutePathChange
  );
  onItineraryPathRef.current = onItineraryRoutePathChange;
  const onPedestrianFailRef = useRef(onPedestrianRouteBuildFailed);
  onPedestrianFailRef.current = onPedestrianRouteBuildFailed;
  /** После клика по списку не вызывать setBounds — иначе карта отдаляется и мешает смотреть приближение */
  const lockAutoBoundsRef = useRef(false);
  const lastRouteSignatureRef = useRef<string>("");
  const apiKey = yandexMapsApiKey;

  const pointsSig = useMemo(
    () =>
      points.length === 0
        ? ""
        : points
            .map((p) => `${p.id}:${p.lat},${p.lon}:${p.sequence ?? ""}`)
            .join("|"),
    [points]
  );
  const stopsSig = useMemo(
    () =>
      dayItineraryStops
        .map((p) => `${p.id}:${p.lat},${p.lon}:${p.category}`)
        .join("|"),
    [dayItineraryStops]
  );
  const wgsPathSig = useMemo(
    () => dayRouteWgsPath.map((p) => `${p.lat},${p.lon}`).join("~"),
    [dayRouteWgsPath]
  );

  const draftStartSig = useMemo(
    () => draftRouteStartAddress?.trim() ?? "",
    [draftRouteStartAddress]
  );

  const dayStopsForRaceGuardRef = useRef(dayItineraryStops);
  const dayWgsForRaceGuardRef = useRef(dayRouteWgsPath);
  dayStopsForRaceGuardRef.current = dayItineraryStops;
  dayWgsForRaceGuardRef.current = dayRouteWgsPath;

  const [debouncedToLabel, setDebouncedToLabel] = useState(toLabel);
  const lastCityFlyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedToLabel(toLabel);
    }, 150);
    return () => window.clearTimeout(t);
  }, [toLabel]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapInstanceRef.current?.container.fitToViewport(true);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let pedestrianFinalizeTimer: number | undefined;

    const run = async () => {
      await loadScript(apiKey);
      if (cancelled) return;
      const ymaps = window.ymaps;
      if (!ymaps) return;

      ymaps.ready(() => {
        if (cancelled) return;
        void (async () => {
          if (cancelled) return;
          const nextSig = buildRouteSignature(
            dayRouteWgsPath,
            dayItineraryStops,
            dayRouteStartPoint,
            dayRouteStartAddress
          );
          if (lastRouteSignatureRef.current !== nextSig) {
            lastRouteSignatureRef.current = nextSig;
            lockAutoBoundsRef.current = false;
          }
          let map: YmapsMapInstance;
          if (mapInstanceRef.current) {
            map = mapInstanceRef.current;
            map.geoObjects.removeAll();
          } else {
            const MapClass = ymaps.Map as unknown as new (
              node: HTMLElement,
              state: {
                center: [number, number];
                zoom: number;
                controls: string[];
              },
              options?: {
                autoFitToViewport?: "always" | "ifNull" | "none";
                suppressMapOpenBlock?: boolean;
                suppressObsoleteBrowserNotifier?: boolean;
                yandexMapDisablePoiInteractivity?: boolean;
              }
            ) => YmapsMapInstance;
            const created = new MapClass(
              el,
              {
                center: [mapCenter.lat, mapCenter.lon],
                zoom: mapCenter.zoom,
                controls: [],
              },
              {
                autoFitToViewport: "always",
                suppressMapOpenBlock: true,
                suppressObsoleteBrowserNotifier: true,
                yandexMapDisablePoiInteractivity: true,
              }
            );
            map = created;
            mapInstanceRef.current = map;
            requestAnimationFrame(() => {
              map.container.fitToViewport(true);
            });
          }
          const fitToRoute = () => {
            if (lockAutoBoundsRef.current) return;
            const b = map.geoObjects.getBounds();
            if (b) {
              map.setBounds(b, {
                checkZoomRange: true,
                zoomMargin: 50,
                duration: 0,
              });
            }
          };
          /** После `ymaps.route` границы у коллекции часто пусты до отрисовки — подгоняем по WGS-точкам, затем догоняем getBounds. */
          const fitToItineraryPath = (pathCoords: [number, number][]) => {
            if (lockAutoBoundsRef.current) return;
            const ymapsW = window.ymaps;
            if (!ymapsW) return;
            const valid = pathCoords.filter(
              (p) =>
                Number.isFinite(p[0]) &&
                Number.isFinite(p[1]) &&
                isPlausibleWgs(p[0]!, p[1]!)
            );
            if (valid.length === 0) return;
            if (valid.length === 1) {
              const p0 = valid[0]!;
              map.setCenter(p0, Math.min(CITY_ZOOM, 14), { duration: 300 });
              return;
            }
            const fromPoints = ymapsW.util?.bounds?.fromPoints;
            if (typeof fromPoints === "function") {
              try {
                const b = fromPoints(valid);
                if (b) {
                  map.setBounds(b, {
                    checkZoomRange: true,
                    zoomMargin: 72,
                    duration: 380,
                  });
                }
              } catch {
                /* ymaps.util.bounds */
              }
            }
            window.setTimeout(() => {
              if (lockAutoBoundsRef.current) return;
              const b2 = map.geoObjects.getBounds();
              if (b2) {
                map.setBounds(b2, {
                  checkZoomRange: true,
                  zoomMargin: 72,
                  duration: 0,
                });
              }
            }, 220);
          };
          if (cancelled) return;

          const hasItinerary = dayItineraryStops.length > 0;

          if (
            !hasItinerary &&
            !debouncedToLabel?.trim() &&
            !dayRouteStartAddress?.trim() &&
            !draftStartSig
          ) {
            onItineraryPathRef.current?.(null);
            lastCityFlyKeyRef.current = null;
            points.forEach((p, idx) => {
              const n = p.sequence ?? idx + 1;
              const pin = getLeisureStopPlacemark(n, p.category);
              const placemark = new ymaps.Placemark(
                [p.lat, p.lon],
                {
                  iconContent: pin.iconContent,
                  balloonContent: `${n}. ${p.title}`,
                  hintContent: p.title,
                },
                { preset: pin.preset, zIndex: 600 + idx }
              );
              map.geoObjects.add(placemark);
            });
            map.setCenter(
              [DEFAULT_WORLD_MAP_CENTER.lat, DEFAULT_WORLD_MAP_CENTER.lon],
              DEFAULT_WORLD_MAP_CENTER.zoom,
              { duration: WORLD_FLY_MS }
            );
            return;
          }

          const sp = dayRouteStartPoint;
          const hasServerStart =
            sp != null &&
            Number.isFinite(sp.lat) &&
            Number.isFinite(sp.lon);

          const draftQ =
            !dayRouteStartAddress?.trim() && draftStartSig ? draftStartSig : "";
          const draftGeocodeQuery =
            draftQ && debouncedToLabel?.trim()
              ? `${draftQ}, ${debouncedToLabel.trim()}`
              : draftQ;

          const startAddrTrim = dayRouteStartAddress?.trim() ?? "";
          const confirmedStartGeocodeQuery =
            startAddrTrim && !hasServerStart
              ? geocodeQueryWithCity(startAddrTrim, debouncedToLabel)
              : "";

          const draftUsesServer = draftResolvedStart != null;

          const [toCoord, dayStartCoord, draftStartCoord] = await Promise.all([
            geocodeCoords(ymaps, debouncedToLabel),
            hasServerStart
              ? Promise.resolve([sp.lat, sp.lon] as [number, number])
              : confirmedStartGeocodeQuery
                ? geocodeCoords(ymaps, confirmedStartGeocodeQuery)
                : Promise.resolve(null as [number, number] | null),
            draftUsesServer
              ? Promise.resolve(
                  draftResolvedStart &&
                    isPlausibleWgs(
                      draftResolvedStart.lat,
                      draftResolvedStart.lon
                    )
                    ? ([draftResolvedStart.lat, draftResolvedStart.lon] as [
                        number,
                        number,
                      ])
                    : (null as [number, number] | null)
                )
              : draftGeocodeQuery
                ? geocodeCoords(ymaps, draftGeocodeQuery)
                : Promise.resolve(null as [number, number] | null),
          ]);
          if (cancelled) return;

          if (!hasItinerary) {
            onItineraryPathRef.current?.(null);
          }

          if (hasItinerary) {
            const serverWgs: WgsPoint[] =
              dayRouteWgsPath.length > 0
                ? [...dayRouteWgsPath]
                : dayItineraryStops.map((s) => ({
                    lat: s.lat,
                    lon: s.lon,
                  } as WgsPoint));
            const gStart: WgsPoint | null = dayStartCoord
              ? {
                  lat: dayStartCoord[0]!,
                  lon: dayStartCoord[1]!,
                }
              : null;
            const rawView = resolveItineraryPathForView({
              serverPath: serverWgs,
              routeStartPoint: dayRouteStartPoint,
              geocodedStart: gStart,
            });
            const refLatLon: [number, number][] = rawView
              .filter((p) => isPlausibleWgs(p.lat, p.lon))
              .map((p) => [p.lat, p.lon] as [number, number]);
            const hasServerStart = Boolean(
              dayRouteStartPoint &&
                Number.isFinite(dayRouteStartPoint.lat) &&
                Number.isFinite(dayRouteStartPoint.lon) &&
                isPlausibleWgs(
                  dayRouteStartPoint.lat,
                  dayRouteStartPoint.lon
                )
            );
            const includeStartPoi =
              hasServerStart || rawView.length > serverWgs.length;

            /** Пеший маршрут по тем же точкам и порядку, что список справа: старт → остановки. */
            let routeWaypoints = pedestrianWaypointsFromPanelOrder(
              dayItineraryStops,
              dayRouteStartPoint ?? undefined,
              dayStartCoord
            );
            if (routeWaypoints.length < 2) {
              const plausibleStopLatLon: [number, number][] =
                dayItineraryStops
                  .filter((s) => isPlausibleWgs(s.lat, s.lon))
                  .map((s) => [s.lat, s.lon] as [number, number]);
              let fb = refLatLon;
              if (fb.length < 2) {
                if (
                  includeStartPoi &&
                  rawView[0] &&
                  isPlausibleWgs(rawView[0].lat, rawView[0].lon) &&
                  plausibleStopLatLon.length >= 1
                ) {
                  const combined: [number, number][] = [
                    [rawView[0].lat, rawView[0].lon],
                    ...plausibleStopLatLon,
                  ];
                  fb =
                    combined.length >= 2 ? combined : plausibleStopLatLon;
                } else if (plausibleStopLatLon.length >= 2) {
                  fb = plausibleStopLatLon;
                }
              }
              if (fb.length >= 2) {
                routeWaypoints = fb;
              }
            }
            if (routeWaypoints.length < 2) {
              onItineraryPathRef.current?.(
                rawView
                  .filter((p) => isPlausibleWgs(p.lat, p.lon))
                  .map((p) => ({ lat: p.lat, lon: p.lon }))
              );
            } else {
              onItineraryPathRef.current?.(null);
            }

            /** Те же вершины, что в rawView / при необходимости — метки остановок без рассинхрона с линией */
            const wgsForStopIndex = (idx: number): WgsPoint => {
              if (includeStartPoi) {
                const w = rawView[idx + 1];
                if (w) return w;
              } else {
                const w = rawView[idx];
                if (w) return w;
              }
              const p = dayItineraryStops[idx]!;
              return { lat: p.lat, lon: p.lon };
            };

            const addPlacemarks = () => {
              if (
                includeStartPoi &&
                rawView[0] &&
                isPlausibleWgs(rawView[0].lat, rawView[0].lon)
              ) {
                const s0: [number, number] = [
                  rawView[0].lat,
                  rawView[0].lon,
                ];
                const sPm = new ymaps.Placemark(
                  s0,
                  {
                    balloonContent: `Старт: ${dayRouteStartAddress?.trim() || "—"}`,
                    hintContent: "Старт маршрута",
                  },
                  { preset: "islands#violetIcon", zIndex: START_PIN_Z }
                );
                map.geoObjects.add(sPm);
              }
              dayItineraryStops.forEach((p, idx) => {
                const w = isPlausibleWgs(p.lat, p.lon)
                  ? { lat: p.lat, lon: p.lon }
                  : wgsForStopIndex(idx);
                if (!isPlausibleWgs(w.lat, w.lon)) return;
                const n = idx + 1;
                const pin = getLeisureStopPlacemark(n, p.category);
                const pm = new ymaps.Placemark(
                  [w.lat, w.lon],
                  {
                    iconContent: pin.iconContent,
                    balloonContent: `${n}. ${p.title}`,
                    hintContent: p.title,
                  },
                  {
                    preset: pin.preset,
                    zIndex: BASE_NUMBER_PIN_Z + idx,
                  }
                );
                map.geoObjects.add(pm);
              });
            };

            if (routeWaypoints.length < 2) {
              addPlacemarks();
              const fb: [number, number][] =
                routeWaypoints.length > 0
                  ? routeWaypoints
                  : dayItineraryStops
                      .filter((s) =>
                        isPlausibleWgs(s.lat, s.lon)
                      )
                      .map((s) => [s.lat, s.lon] as [number, number]);
              fitToItineraryPath(fb);
              return;
            }

            type MultiRouteInstance = {
              options: {
                set: (k: Record<string, string | number | boolean>) => void;
              };
              events: { add: (e: string, f: () => void) => void };
              model: { events: { add: (e: string, f: () => void) => void } };
              getBounds?: () => unknown;
              getRoutes?: () => unknown;
            };

            const ymapsRoot = ymaps as unknown as {
              multiRouter?: {
                MultiRoute?: new (
                  model: {
                    referencePoints: [number, number][];
                    params: { routingMode: string; reverseGeocoding?: boolean };
                  },
                  options: Record<string, string | number | boolean>
                ) => MultiRouteInstance;
              };
            };

            const MultiRouteCtor = ymapsRoot.multiRouter?.MultiRoute;

            const viewOpts: Record<string, string | number | boolean> = {
              wayPointVisible: false,
              boundsAutoApply: false,
              pinVisible: false,
              routeOpenBalloonOnClick: false,
              routeActiveBalloonAutoPan: false,
              routeBalloonAutoPan: false,
              routeActiveMarkerVisible: false,
              routeMarkerVisible: false,
              routeActiveWalkMarkerVisible: false,
              routeWalkMarkerVisible: false,
              zoomMargin: 50,
              routeActiveStrokeColor: "#4ECDC4",
              routeActiveStrokeWidth: 7,
              routeActiveStrokeOpacity: 1,
              routeActiveStrokeStyle: "shortdash",
              routeStrokeColor: "#9ca3af",
              routeStrokeWidth: 4,
              routeStrokeOpacity: 1,
              routeStrokeStyle: "shortdash",
              routeActivePedestrianSegmentStrokeColor: "#4ECDC4",
              routeActivePedestrianSegmentStrokeWidth: 7,
              routeActivePedestrianSegmentStrokeOpacity: 1,
              routeActivePedestrianSegmentStrokeStyle: "shortdash",
            };

            const safeRemoveMr = (mr: MultiRouteInstance) => {
              if (cancelled) return;
              window.clearTimeout(pedestrianFinalizeTimer);
              try {
                map.geoObjects.remove(
                  mr as Parameters<typeof map.geoObjects.remove>[0]
                );
              } catch {
                /* уже снят с карты */
              }
            };

            const syncPedestrianPathFromMr = (mr: MultiRouteInstance) => {
              const path = extractPedestrianPathFromMultiRoute(mr);
              if (path?.length) {
                onItineraryPathRef.current?.(path);
              }
            };

            const tryLegacyYmapsPedestrianRoute = async (): Promise<
              MultiRouteInstance | null
            > => {
              try {
                const routePromise = ymaps.route(routeWaypoints, {
                  mapStateAutoApply: false,
                  multiRoute: true,
                  routingMode: "pedestrian",
                  searchCoordOrder: "latlong",
                }) as Promise<unknown>;
                const raw = await routePromise;
                return raw != null ? (raw as MultiRouteInstance) : null;
              } catch {
                return null;
              }
            };

            const mountWalkingPolylineFromWgs = (path: readonly WgsPoint[]) => {
              if (path.length < 2) return;
              const line = new ymaps.Polyline(
                path.map((p) => [p.lat, p.lon] as [number, number]),
                {},
                {
                  strokeColor: "#4ECDC4",
                  strokeWidth: 7,
                  strokeOpacity: 0.95,
                  zIndex: 180,
                  /** Пунктир Polyline в JSAPI 2.1: «длина штриха пробел» в пикселях. */
                  // @ts-expect-error strokeStyle не описан в типах SDK
                  strokeStyle: "10 14",
                }
              );
              map.geoObjects.add(line);
            };

            const runPedestrianFallbackChain = async () => {
              if (cancelled) return;
              const legacyMr = await tryLegacyYmapsPedestrianRoute();
              if (cancelled) return;
              if (legacyMr) {
                legacyMr.options.set(viewOpts);
                legacyMr.events.add("update", () => {
                  legacyMr.options.set({ boundsAutoApply: false });
                  if (cancelled) return;
                  syncPedestrianPathFromMr(legacyMr);
                  const n = countGeoCollection(legacyMr.getRoutes?.());
                  if (!lockAutoBoundsRef.current && n > 0) {
                    const b =
                      legacyMr.getBounds?.() ?? map.geoObjects.getBounds();
                    if (b) {
                      map.setBounds(b, {
                        checkZoomRange: true,
                        zoomMargin: 72,
                        duration: 280,
                      });
                    }
                  }
                });
                map.geoObjects.add(
                  legacyMr as Parameters<typeof map.geoObjects.add>[0]
                );
                window.setTimeout(() => {
                  if (cancelled) return;
                  syncPedestrianPathFromMr(legacyMr);
                  const n = countGeoCollection(legacyMr.getRoutes?.());
                  if (!lockAutoBoundsRef.current && n > 0) {
                    const b =
                      legacyMr.getBounds?.() ?? map.geoObjects.getBounds();
                    if (b) {
                      map.setBounds(b, {
                        checkZoomRange: true,
                        zoomMargin: 72,
                        duration: 280,
                      });
                    }
                  }
                }, 400);
                return;
              }
              const gKey = googleMapsJsApiKey.trim();
              if (gKey) {
                const path = await fetchWalkingPathGoogleDirections(
                  gKey,
                  routeWaypoints
                );
                if (cancelled) return;
                if (path && path.length >= 2) {
                  mountWalkingPolylineFromWgs(path);
                  onItineraryPathRef.current?.(path);
                  fitToItineraryPath(
                    path.map((p) => [p.lat, p.lon] as [number, number])
                  );
                  return;
                }
              }
              onItineraryPathRef.current?.(null);
              onPedestrianFailRef.current?.();
            };

            if (!MultiRouteCtor) {
              if (!cancelled) {
                void runPedestrianFallbackChain();
                addPlacemarks();
                fitToItineraryPath(routeWaypoints);
              }
              return;
            }

            const multiRoute = new MultiRouteCtor(
              {
                referencePoints: routeWaypoints,
                params: {
                  routingMode: "pedestrian",
                  reverseGeocoding: false,
                },
              },
              viewOpts
            );

            const syncPedestrianPathAndBounds = () => {
              if (cancelled) return;
              syncPedestrianPathFromMr(multiRoute);
              const nRoutes = countGeoCollection(multiRoute.getRoutes?.());
              if (!lockAutoBoundsRef.current && nRoutes > 0) {
                const b =
                  multiRoute.getBounds?.() ?? map.geoObjects.getBounds();
                if (b) {
                  map.setBounds(b, {
                    checkZoomRange: true,
                    zoomMargin: 72,
                    duration: 220,
                  });
                }
              }
            };

            multiRoute.events.add("update", () => {
              multiRoute.options.set({ boundsAutoApply: false });
              syncPedestrianPathAndBounds();
            });

            multiRoute.model.events.add("requestfail", () => {
              safeRemoveMr(multiRoute);
              void runPedestrianFallbackChain();
            });

            multiRoute.model.events.add("requestsuccess", () => {
              if (cancelled) return;
              syncPedestrianPathAndBounds();
              window.clearTimeout(pedestrianFinalizeTimer);
              pedestrianFinalizeTimer = window.setTimeout(() => {
                if (cancelled) return;
                syncPedestrianPathAndBounds();
                const nRoutes = countGeoCollection(multiRoute.getRoutes?.());
                if (nRoutes === 0) {
                  safeRemoveMr(multiRoute);
                  void runPedestrianFallbackChain();
                  return;
                }
                const path = extractPedestrianPathFromMultiRoute(multiRoute);
                if (!path?.length) {
                  onItineraryPathRef.current?.(null);
                }
              }, 1200);
            });

            map.geoObjects.add(
              multiRoute as Parameters<typeof map.geoObjects.add>[0]
            );
            addPlacemarks();
            fitToItineraryPath(routeWaypoints);
            return;
          }

          const dayFocus = Boolean(
            dayRouteStartAddress?.trim() && dayStartCoord
          );

          if (!dayFocus) {
            const hasDayLeisureContent =
              dayStopsForRaceGuardRef.current.length > 0 ||
              dayWgsForRaceGuardRef.current.length > 0;
            if (toCoord && !hasDayLeisureContent) {
              const pm = new ymaps.Placemark(
                toCoord,
                {
                  balloonContent: `Назначение: ${debouncedToLabel || "—"}`,
                  hintContent: debouncedToLabel || "—",
                },
                { preset: "islands#redCircleIcon", zIndex: 650 }
              );
              map.geoObjects.add(pm);
            }
          } else {
            if (toCoord) {
              const destPm = new ymaps.Placemark(
                toCoord,
                {
                  balloonContent: `Поездка: ${debouncedToLabel || "—"}`,
                  hintContent: debouncedToLabel || "—",
                },
                { preset: "islands#redCircleIcon", zIndex: 550 }
              );
              map.geoObjects.add(destPm);
            }
            if (dayStartCoord) {
              const startPm = new ymaps.Placemark(
                dayStartCoord,
                {
                  balloonContent: `🚩 Начало дня: ${dayRouteStartAddress || "—"}`,
                  hintContent: "Старт маршрута (найденный адрес)",
                },
                {
                  preset: FOUND_START_PRESET,
                  zIndex: START_PIN_Z,
                }
              );
              map.geoObjects.add(startPm);
            }
          }
          points.forEach((p, idx) => {
            const n = p.sequence ?? idx + 1;
            const pin = getLeisureStopPlacemark(n, p.category);
            const placemark = new ymaps.Placemark(
              [p.lat, p.lon],
              {
                iconContent: pin.iconContent,
                balloonContent: `${n}. ${p.title}`,
                hintContent: p.title,
              },
              { preset: pin.preset, zIndex: 600 + idx }
            );
            map.geoObjects.add(placemark);
          });
          if (
            !hasItinerary &&
            draftStartCoord &&
            isPlausibleWgs(draftStartCoord[0], draftStartCoord[1])
          ) {
            const draftBalloonLabel =
              draftRouteStartAddress?.trim() ||
              draftQ.trim() ||
              "Ваш адрес";
            const duplicateOfConfirmedStart =
              dayFocus &&
              dayStartCoord &&
              coordsApproxEqual(draftStartCoord, dayStartCoord);
            if (!duplicateOfConfirmedStart) {
              const draftPm = new ymaps.Placemark(
                draftStartCoord,
                {
                  balloonContent: `🚩 ${draftBalloonLabel}`,
                  hintContent: draftBalloonLabel,
                },
                {
                  preset: FOUND_START_PRESET,
                  zIndex: FOUND_START_PIN_Z,
                }
              );
              map.geoObjects.add(draftPm);
            }
          }
          const hasDayLeisureOnMap =
            dayStopsForRaceGuardRef.current.length > 0 ||
            dayWgsForRaceGuardRef.current.length > 0;
          const focusOnDestinationOnly =
            !dayFocus && toCoord && !hasDayLeisureOnMap;

          /** При ошибке геокода черновика не двигаем камеру (ТЗ: адрес не найден → карту не трогать). */
          const freezeCameraOnDraftGeocodeFail =
            !hasItinerary && Boolean(draftStartSig) && draftGeocodeFailed;

          const fitDraftStartScene = (): boolean => {
            if (
              !draftStartCoord ||
              !isPlausibleWgs(draftStartCoord[0], draftStartCoord[1])
            ) {
              return false;
            }
            /** Плавно центрируемся на адресе с приближением ~15–18. */
            map.setCenter(
              [draftStartCoord[0], draftStartCoord[1]],
              DRAFT_ADDRESS_FOUND_ZOOM,
              { duration: DRAFT_ADDRESS_FLY_MS }
            );
            return true;
          };

          if (freezeCameraOnDraftGeocodeFail) {
            /* только объекты перерисованы выше; камера без изменений */
          } else if (dayFocus && dayStartCoord) {
            map.setCenter(dayStartCoord, FOCUS_ON_LIST_CLICK_ZOOM, {
              duration: CITY_FLY_MS,
            });
          } else if (!hasItinerary && fitDraftStartScene()) {
            /* превью по черновику адреса */
          } else if (
            focusOnDestinationOnly &&
            !(draftStartSig && draftGeocodeFailed)
          ) {
            if (points.length > 0) {
              fitToRoute();
            } else if (!toCoord) {
              fitToRoute();
            } else {
              const k = debouncedToLabel?.trim() ?? "";
              if (k) {
                const isNewKey = lastCityFlyKeyRef.current !== k;
                if (isNewKey) {
                  lastCityFlyKeyRef.current = k;
                }
                map.setCenter(toCoord, CITY_ZOOM, {
                  duration: isNewKey ? CITY_FLY_MS : 0,
                });
              } else {
                map.setCenter(toCoord, FOCUS_ZOOM, { duration: 0 });
              }
            }
          } else {
            fitToRoute();
          }
        })();
      });
    };

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(pedestrianFinalizeTimer);
    };
  }, [
    apiKey,
    debouncedToLabel,
    mapCenter.lat,
    mapCenter.lon,
    mapCenter.zoom,
    pointsSig,
    dayRouteStartAddress,
    dayRouteStartPoint?.lat,
    dayRouteStartPoint?.lon,
    wgsPathSig,
    stopsSig,
    draftResolvedStart?.lat,
    draftResolvedStart?.lon,
    draftResolvedStart === undefined ? "u" : draftResolvedStart ? "o" : "n",
    draftGeocodeFailed,
    draftStartSig,
  ]);

  useLayoutEffect(() => {
    if (!mapRouteFocus) return;
    const m = mapInstanceRef.current;
    if (!m) return;
    let cancel = false;

    if (mapRouteFocus.kind === "stop") {
      const stop = dayItineraryStops.find((p) => p.id === mapRouteFocus.id);
      if (!stop) return;
      if (!isPlausibleWgs(stop.lat, stop.lon)) return;
      lockAutoBoundsRef.current = true;
      m.setCenter([stop.lat, stop.lon], FOCUS_ON_LIST_CLICK_ZOOM, {
        duration: FOCUS_ON_LIST_MS,
      });
      return;
    }
    if (mapRouteFocus.kind === "start") {
      if (
        dayRouteStartPoint &&
        Number.isFinite(dayRouteStartPoint.lat) &&
        Number.isFinite(dayRouteStartPoint.lon)
      ) {
        lockAutoBoundsRef.current = true;
        m.setCenter(
          [dayRouteStartPoint.lat, dayRouteStartPoint.lon],
          FOCUS_ON_LIST_CLICK_ZOOM,
          { duration: FOCUS_ON_LIST_MS }
        );
        return;
      }
    }

    const run = async () => {
      await loadScript(apiKey);
      if (cancel) return;
      const ymaps = window.ymaps;
      if (!ymaps) return;
      if (mapRouteFocus?.kind !== "start") return;
      const q = dayRouteStartAddress?.trim();
      if (!q) return;
      const c = await geocodeCoords(ymaps, q);
      if (cancel) return;
      if (!c) return;
      const inst = mapInstanceRef.current;
      if (!inst) return;
      lockAutoBoundsRef.current = true;
      inst.setCenter([c[0], c[1]], FOCUS_ON_LIST_CLICK_ZOOM, {
        duration: FOCUS_ON_LIST_MS,
      });
    };

    void run();
    return () => {
      cancel = true;
    };
  }, [apiKey, mapRouteFocus, stopsSig, dayRouteStartPoint, dayRouteStartAddress]);

  return (
    <div
      ref={containerRef}
      data-tp-yandex-map-root
      className="h-full min-h-0 w-full min-w-0 flex-1 rounded-2xl"
    />
  );
};
