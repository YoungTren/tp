"use client";

/// <reference types="google.maps" />

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { DEFAULT_WORLD_MAP_CENTER } from "@/lib/trip-dates";
import { type WgsPoint, isPlausibleWgs } from "@/lib/day-route-path";
import { googleMapsJsApiKey } from "@/lib/public-env";
import type { YandexTripMapProps } from "@/components/yandex-trip-map";

const SCRIPT_ATTR = "data-tp-google-maps-js";

const ROUTE_STROKE = "#4ECDC4";
const ROUTE_LINE_WEIGHT = 6;
const MAX_DIRECTION_WAYPOINTS = 25;

/** Пунктир по реальной линии маршрута (геометрия Directions), по аналогу с Я.Картами. */
const dashedPolylineIcons: google.maps.IconSequence[] = [
  {
    icon: {
      path: "M 0,-1 0,1",
      strokeOpacity: 1,
      strokeColor: ROUTE_STROKE,
      scale: 4,
    },
    offset: "0",
    repeat: "12px",
  },
];

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[${SCRIPT_ATTR}]`
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
    s.setAttribute(SCRIPT_ATTR, "1");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps script load failed"));
    document.head.appendChild(s);
  });
};

const latLng = (lat: number, lon: number): google.maps.LatLngLiteral => ({
  lat,
  lng: lon,
});

export const GoogleTripMap = ({
  mapCenter,
  points,
  toLabel,
  dayRouteStartAddress,
  dayRouteStartPoint,
  dayItineraryStops,
  mapRouteFocus,
  draftRouteStartAddress,
  draftResolvedStart,
  onItineraryRoutePathChange,
  onPedestrianRouteBuildFailed,
}: YandexTripMapProps) => {
  const apiKey = googleMapsJsApiKey.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const chainedWalkingPolylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  );

  const stopsSig = useMemo(
    () =>
      dayItineraryStops
        .map((p) => `${p.id}:${p.lat},${p.lon}:${p.category}`)
        .join("|"),
    [dayItineraryStops]
  );

  const pointsSig = useMemo(
    () =>
      points.length === 0
        ? ""
        : points
            .map((p) => `${p.id}:${p.lat},${p.lon}:${p.sequence ?? ""}`)
            .join("|"),
    [points]
  );

  const draftSig = useMemo(() => {
    if (
      !draftResolvedStart ||
      !isPlausibleWgs(draftResolvedStart.lat, draftResolvedStart.lon)
    ) {
      return "";
    }
    return `${draftResolvedStart.lat},${draftResolvedStart.lon}:${draftRouteStartAddress ?? ""}`;
  }, [draftResolvedStart, draftRouteStartAddress]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !apiKey) return;

    let cancelled = false;

    const clearMarkers = () => {
      for (const m of markersRef.current) {
        m.setMap(null);
      }
      markersRef.current = [];
    };

    const clearRouteGraphics = () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (chainedWalkingPolylineRef.current) {
        chainedWalkingPolylineRef.current.setMap(null);
        chainedWalkingPolylineRef.current = null;
      }
    };

    const run = async () => {
      try {
        await loadGoogleMaps(apiKey);
      } catch {
        return;
      }
      if (cancelled || !containerRef.current) return;

      const maps = window.google?.maps;
      if (!maps) return;

      if (!mapRef.current) {
        mapRef.current = new maps.Map(el, {
          center: latLng(mapCenter.lat, mapCenter.lon),
          zoom: mapCenter.zoom,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
      }
      const map = mapRef.current;

      clearMarkers();
      clearRouteGraphics();
      onItineraryRoutePathChange?.(null);

      const sortedStops = [...dayItineraryStops].filter((s) =>
        isPlausibleWgs(s.lat, s.lon)
      );
      const hasItinerary = sortedStops.length > 0;
      const startPt =
        dayRouteStartPoint &&
        Number.isFinite(dayRouteStartPoint.lat) &&
        Number.isFinite(dayRouteStartPoint.lon)
          ? dayRouteStartPoint
          : null;

      const drawPreviewAndDraft = () => {
        map.setCenter(latLng(mapCenter.lat, mapCenter.lon));
        map.setZoom(mapCenter.zoom);

        const bounds = new maps.LatLngBounds();
        let hasBounds = false;

        points.forEach((p, idx) => {
          if (!isPlausibleWgs(p.lat, p.lon)) return;
          const pos = latLng(p.lat, p.lon);
          bounds.extend(pos);
          hasBounds = true;
          const n = p.sequence ?? idx + 1;
          markersRef.current.push(
            new maps.Marker({
              map,
              position: pos,
              title: p.title,
              label: String(n),
            })
          );
        });

        if (
          draftResolvedStart &&
          isPlausibleWgs(draftResolvedStart.lat, draftResolvedStart.lon)
        ) {
          const pos = latLng(draftResolvedStart.lat, draftResolvedStart.lon);
          bounds.extend(pos);
          hasBounds = true;
          markersRef.current.push(
            new maps.Marker({
              map,
              position: pos,
              title: draftRouteStartAddress ?? "Старт",
              label: "S",
            })
          );
        }

        if (hasBounds) {
          map.fitBounds(bounds, 72);
          return;
        }

        const city = toLabel.trim();
        if (city) {
          const geocoder = new maps.Geocoder();
          geocoder.geocode({ address: city }, (results, status) => {
            if (cancelled || status !== "OK" || !results?.[0]?.geometry?.location)
              return;
            map.setCenter(results[0].geometry.location);
            map.setZoom(12);
          });
          return;
        }

        map.setCenter(
          latLng(DEFAULT_WORLD_MAP_CENTER.lat, DEFAULT_WORLD_MAP_CENTER.lon)
        );
        map.setZoom(DEFAULT_WORLD_MAP_CENTER.zoom);
      };

      if (
        hasItinerary &&
        startPt &&
        isPlausibleWgs(startPt.lat, startPt.lon)
      ) {
        const origin = latLng(startPt.lat, startPt.lon);
        const last = sortedStops[sortedStops.length - 1]!;
        const destination = latLng(last.lat, last.lon);

        let intermediates = sortedStops.slice(0, -1).map((s) => ({
          location: latLng(s.lat, s.lon),
          stopover: true,
        }));
        if (intermediates.length > MAX_DIRECTION_WAYPOINTS) {
          intermediates = intermediates.slice(0, MAX_DIRECTION_WAYPOINTS);
        }

        const ds = new maps.DirectionsService();

        const pushItineraryMarkers = () => {
          markersRef.current.push(
            new maps.Marker({
              map,
              position: origin,
              title: dayRouteStartAddress ?? "Старт",
              label: "S",
            })
          );
          sortedStops.forEach((s, idx) => {
            markersRef.current.push(
              new maps.Marker({
                map,
                position: latLng(s.lat, s.lon),
                title: s.title,
                label: String(idx + 1),
              })
            );
          });
        };

        const chainWalkingLegs = (
          pts: google.maps.LatLngLiteral[]
        ): Promise<WgsPoint[] | null> =>
          new Promise((resolve) => {
            if (pts.length < 2) {
              resolve(null);
              return;
            }
            const merged: google.maps.LatLng[] = [];
            let legIndex = 0;

            const walkLeg = () => {
              if (cancelled) {
                resolve(null);
                return;
              }
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
                    cancelled ||
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

        ds.route(
          {
            origin,
            destination,
            travelMode: maps.TravelMode.WALKING,
            ...(intermediates.length > 0 ? { waypoints: intermediates } : {}),
          },
          (result, status) => {
            if (cancelled) return;
            clearRouteGraphics();

            if (status === maps.DirectionsStatus.OK && result?.routes?.[0]) {
              const dr = new maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                preserveViewport: false,
                polylineOptions: {
                  strokeColor: ROUTE_STROKE,
                  strokeWeight: ROUTE_LINE_WEIGHT,
                  strokeOpacity: 0,
                  icons: dashedPolylineIcons,
                },
              });
              dr.setDirections(result);
              directionsRendererRef.current = dr;

              const overviewPath = result.routes[0].overview_path;
              if (overviewPath?.length) {
                const path: WgsPoint[] = overviewPath.map((ll) => ({
                  lat: ll.lat(),
                  lon: ll.lng(),
                }));
                onItineraryRoutePathChange?.(path);
              }

              pushItineraryMarkers();
              return;
            }

            void chainWalkingLegs([
              origin,
              ...sortedStops.map((s) => latLng(s.lat, s.lon)),
            ]).then((chainPath) => {
              if (cancelled) return;
              clearRouteGraphics();

              if (chainPath && chainPath.length >= 2) {
                const pl = new maps.Polyline({
                  path: chainPath.map((p) => latLng(p.lat, p.lon)),
                  map,
                  strokeColor: ROUTE_STROKE,
                  strokeWeight: ROUTE_LINE_WEIGHT,
                  strokeOpacity: 0,
                  icons: dashedPolylineIcons,
                });
                chainedWalkingPolylineRef.current = pl;
                onItineraryRoutePathChange?.(chainPath);
                pushItineraryMarkers();
                return;
              }

              onItineraryRoutePathChange?.(null);
              onPedestrianRouteBuildFailed?.();
              pushItineraryMarkers();
            });
          }
        );
        return;
      }

      if (hasItinerary && sortedStops.length > 0 && (!startPt || !isPlausibleWgs(startPt.lat, startPt.lon))) {
        sortedStops.forEach((s, idx) => {
          markersRef.current.push(
            new maps.Marker({
              map,
              position: latLng(s.lat, s.lon),
              title: s.title,
              label: String(idx + 1),
            })
          );
        });
        const bounds = new maps.LatLngBounds();
        sortedStops.forEach((s) => bounds.extend(latLng(s.lat, s.lon)));
        map.fitBounds(bounds, 72);
        return;
      }

      drawPreviewAndDraft();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    apiKey,
    mapCenter.lat,
    mapCenter.lon,
    mapCenter.zoom,
    stopsSig,
    pointsSig,
    draftSig,
    dayRouteStartAddress,
    dayRouteStartPoint?.lat,
    dayRouteStartPoint?.lon,
    toLabel,
    onItineraryRoutePathChange,
    onPedestrianRouteBuildFailed,
  ]);

  useLayoutEffect(() => {
    if (!mapRouteFocus || !mapRef.current) return;
    const maps = window.google?.maps;
    if (!maps) return;

    if (mapRouteFocus.kind === "start") {
      const sp = dayRouteStartPoint;
      if (sp && Number.isFinite(sp.lat) && Number.isFinite(sp.lon)) {
        mapRef.current.panTo(latLng(sp.lat, sp.lon));
        mapRef.current.setZoom(17);
      }
      return;
    }

    const stop = dayItineraryStops.find((p) => p.id === mapRouteFocus.id);
    if (!stop || !isPlausibleWgs(stop.lat, stop.lon)) return;
    mapRef.current.panTo(latLng(stop.lat, stop.lon));
    mapRef.current.setZoom(17);
  }, [mapRouteFocus, dayRouteStartPoint, dayItineraryStops]);

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center rounded-2xl bg-amber-50 px-4 text-center text-sm text-amber-900">
        Задайте NEXT_PUBLIC_GOOGLE_MAPS_API_KEY для карты Google.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-tp-google-map-root
      className="h-full min-h-0 w-full min-w-0 flex-1 rounded-2xl"
    />
  );
};
