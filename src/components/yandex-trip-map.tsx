"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_WORLD_MAP_CENTER } from "@/lib/trip-dates";
import {
  type WgsPoint,
  isPlausibleWgs,
  resolveItineraryPathForView,
} from "@/lib/day-route-path";
import { yandexMapsApiKey } from "@/lib/public-env";
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

type YandexTripMapProps = {
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
   * Та же цепочка WGS, что `ymaps.route(…, multiRoute, pedestrian)` — для ссылки в веб-Я.Карты
   * (геокод старта, если с бэка точки нет, совпадает с рисунком на карте).
   */
  onItineraryRoutePathChange?: (path: readonly WgsPoint[] | null) => void;
};

const SCRIPT_MARK = "data-tp-yandex-2-1";

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
  const res = await ymaps.geocode(q, { results: 1 });
  const o = res.geoObjects.get(0);
  if (!o) return null;
  // coordorder=latlong в URL скрипта — [широта, долгота], как в наших { lat, lon }.
  return o.geometry.getCoordinates() as [number, number];
};

const FOCUS_ZOOM = 16;
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
  onItineraryRoutePathChange,
}: YandexTripMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YmapsMapInstance | null>(null);
  const onItineraryPathRef = useRef<typeof onItineraryRoutePathChange | undefined>(
    onItineraryRoutePathChange
  );
  onItineraryPathRef.current = onItineraryRoutePathChange;
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
              options?: { autoFitToViewport: "always" | "ifNull" | "none" }
            ) => YmapsMapInstance;
            const created = new MapClass(
              el,
              {
                center: [mapCenter.lat, mapCenter.lon],
                zoom: mapCenter.zoom,
                controls: ["zoomControl", "geolocationControl"],
              },
              { autoFitToViewport: "always" }
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
            !dayRouteStartAddress?.trim()
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

          const [toCoord, dayStartCoord] = await Promise.all([
            geocodeCoords(ymaps, debouncedToLabel),
            hasServerStart
              ? Promise.resolve([sp.lat, sp.lon] as [number, number])
              : dayRouteStartAddress?.trim()
                ? geocodeCoords(ymaps, dayRouteStartAddress)
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
            onItineraryPathRef.current?.(
              routeWaypoints.length >= 2
                ? routeWaypoints.map(([lat, lon]) => ({
                    lat,
                    lon,
                  }))
                : rawView
                    .filter((p) => isPlausibleWgs(p.lat, p.lon))
                    .map((p) => ({ lat: p.lat, lon: p.lon }))
            );

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

            const addStraightFallback = () => {
              if (routeWaypoints.length < 2) return;
              const line = new ymaps.Polyline(
                routeWaypoints,
                { balloonContent: "Пеший маршрут дня (линия)" },
                {
                  strokeColor: "#4ECDC4",
                  strokeWidth: 5,
                  strokeOpacity: 0.95,
                  zIndex: 220,
                }
              );
              map.geoObjects.add(line);
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

            ymaps
              .route(routeWaypoints, {
                mapStateAutoApply: false,
                multiRoute: true,
                routingMode: "pedestrian",
                searchCoordOrder: "latlong",
              })
              .then(
                (multiRoute) => {
                  if (cancelled) return;
                  const mr = multiRoute as {
                    options: {
                      set: (k: Record<string, string | number | boolean>) => void;
                    };
                    events: { add: (e: string, f: () => void) => void };
                  };
                  const viewOpts: Record<string, string | number | boolean> = {
                    wayPointVisible: false,
                    boundsAutoApply: false,
                    pinVisible: false,
                    routeActiveMarkerVisible: false,
                    routeMarkerVisible: false,
                    routeActiveWalkMarkerVisible: false,
                    routeWalkMarkerVisible: false,
                    zoomMargin: 50,
                    routeActiveStrokeColor: "4ecdc4",
                    routeStrokeColor: "9ca3af",
                  };
                  mr.options.set(viewOpts);
                  mr.events.add("update", () => {
                    mr.options.set({ boundsAutoApply: false });
                  });
                  map.geoObjects.add(
                    multiRoute as Parameters<typeof map.geoObjects.add>[0]
                  );
                },
                () => {
                  if (cancelled) return;
                  addStraightFallback();
                }
              )
              .then(() => {
                if (cancelled) return;
                addPlacemarks();
                fitToItineraryPath(routeWaypoints);
              });
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
                  balloonContent: `Начало дня: ${dayRouteStartAddress || "—"}`,
                  hintContent: "Старт маршрута",
                },
                { preset: "islands#violetIcon", zIndex: 700 }
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
          const hasDayLeisureOnMap =
            dayStopsForRaceGuardRef.current.length > 0 ||
            dayWgsForRaceGuardRef.current.length > 0;
          const focusOnDestinationOnly =
            !dayFocus && toCoord && !hasDayLeisureOnMap;
          if (dayFocus && dayStartCoord) {
            map.setCenter(dayStartCoord, FOCUS_ZOOM, { duration: 0 });
          } else if (focusOnDestinationOnly) {
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
      className="h-full min-h-0 w-full min-w-0 flex-1 rounded-2xl"
    />
  );
};
