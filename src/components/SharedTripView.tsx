"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Hash, MapPin, Plane, Star } from "lucide-react";
import { AppPageBackdrop } from "./app-page-backdrop";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { DayStopsDetailDialog } from "./day-stops-detail-dialog";
import { buildDayRouteWgsPath } from "@/lib/day-route-path";
import { toDisplayAddress } from "@/lib/format-address";
import { capitalizePlaceName } from "@/lib/format-place";
import {
  resolveTripRouteStartAddress,
  resolveTripRouteStartPoint,
} from "@/lib/itinerary-route-start";
import { getStopCardTeaser } from "@/lib/leisure-facts";
import { formatEstimatedCostSumOrFree } from "@/lib/place-price-hint";
import type { MapRouteFocus, YandexMapPoint } from "./yandex-trip-map";
import type { DayPlan, TripData } from "@/types/trip";

const YandexTripMap = dynamic(
  () => import("./yandex-trip-map").then((m) => m.YandexTripMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full min-h-[320px] w-full items-center justify-center rounded-2xl bg-gray-100"
        style={{ fontSize: "14px", color: "#6b7280" }}
      >
        Загрузка карты…
      </div>
    ),
  }
);

type SharedTripViewProps = { trip: TripData };

export const SharedTripView = ({ trip }: SharedTripViewProps) => {
  const itineraryDays = trip.plan.dayPlans;
  const [selectedDay, setSelectedDay] = useState(1);
  const [mapRouteFocus, setMapRouteFocus] = useState<MapRouteFocus>(null);
  const [dayStopsDetailOpen, setDayStopsDetailOpen] = useState(false);
  const [dayStopsInitialStopId, setDayStopsInitialStopId] = useState<
    string | null
  >(null);

  const currentDayPlan = useMemo((): DayPlan => {
    if (!itineraryDays.length) {
      return { day: 1, title: "—", items: [] as string[] };
    }
    return (
      itineraryDays.find((d) => d.day === selectedDay) ?? itineraryDays[0]!
    );
  }, [itineraryDays, selectedDay]);

  const resolvedRouteStartRaw = useMemo(
    () => resolveTripRouteStartAddress(itineraryDays, currentDayPlan),
    [itineraryDays, currentDayPlan]
  );

  const dayRouteStartForMap = useMemo(
    () =>
      resolvedRouteStartRaw ? toDisplayAddress(resolvedRouteStartRaw) : null,
    [resolvedRouteStartRaw]
  );

  const mapRouteStartPoint = useMemo(
    () => resolveTripRouteStartPoint(itineraryDays, currentDayPlan),
    [itineraryDays, currentDayPlan]
  );

  const dayItineraryStops = useMemo<YandexMapPoint[]>(() => {
    const stops = currentDayPlan.routeStops;
    if (!stops?.length) return [];
    return [...stops]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        title: s.title,
        category: s.category,
      }));
  }, [currentDayPlan.routeStops]);

  const dayRouteWgsPath = useMemo(
    () =>
      buildDayRouteWgsPath({
        routeStartPoint: mapRouteStartPoint,
        routeStops: currentDayPlan.routeStops,
      }),
    [mapRouteStartPoint, currentDayPlan.routeStops]
  );

  const sortedRouteStopsForDialog = useMemo(
    () =>
      [...(currentDayPlan.routeStops ?? [])].sort((a, b) => a.order - b.order),
    [currentDayPlan.routeStops]
  );

  const manyDayTabs = itineraryDays.length > 7;

  useEffect(() => {
    setDayStopsDetailOpen(false);
    setDayStopsInitialStopId(null);
  }, [selectedDay]);

  const emptyMapPoints = useMemo<YandexMapPoint[]>(() => [], []);
  const { mapCenter } = trip.plan;
  const destination = useMemo(() => {
    const t = trip.to?.trim();
    if (!t) return "—";
    return capitalizePlaceName(t);
  }, [trip.to]);
  const departure = trip.from || "—";

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <AppPageBackdrop />
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200/60 bg-white px-4 py-3 md:px-8">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#4ECDC4" }}
          >
            <Plane className="h-4.5 w-4.5 text-white" />
          </div>
          <span
            className="hidden sm:inline"
            style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}
          >
            TravelPlanner
          </span>
        </div>
        <p className="text-sm text-gray-500">Просмотр маршрута (ссылка)</p>
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#4ECDC4" }}
        >
          На главную
        </Link>
      </header>
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 overflow-hidden p-4 md:p-6 lg:min-h-0 lg:grid lg:grid-cols-[260px_1fr_320px] lg:gap-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden h-full flex-col lg:flex"
        >
          <div
            className="flex h-full flex-col rounded-2xl p-5 text-white"
            style={{
              background:
                "linear-gradient(135deg, #4ECDC4 0%, #44B8B0 50%, #3AA89F 100%)",
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Plane className="h-5 w-5" />
              <span style={{ fontSize: "17px", fontWeight: 600 }}>
                Ваша поездка
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center gap-2 text-white/80">
                  <MapPin className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>Выбранный город</span>
                </div>
                <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                  <span style={{ fontSize: "15px", fontWeight: 500 }}>{destination}</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center gap-2 text-white/80">
                  <Hash className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>Дни отдыха</span>
                </div>
                <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                  <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.durationDays} дн.</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-1 flex min-h-0 flex-col rounded-2xl bg-white p-5 shadow-sm lg:order-2"
        >
          <h2
            className="mb-4"
            style={{ fontSize: "20px", fontWeight: 600, color: "#1a1a1a" }}
          >
            Маршрут путешествия
          </h2>
          <div
            className="mb-4 flex items-center gap-2 text-gray-500"
            style={{ fontSize: "14px" }}
          >
            <MapPin className="h-4 w-4" style={{ color: "#4ECDC4" }} />
            <span>
              Назначение:{" "}
              <span style={{ fontWeight: 500, color: "#1a1a1a" }}>
                {destination}
              </span>
            </span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-100">
            <YandexTripMap
              mapCenter={mapCenter}
              points={emptyMapPoints}
              fromLabel={departure}
              toLabel={destination}
              dayRouteStartAddress={dayRouteStartForMap}
              dayRouteStartPoint={mapRouteStartPoint}
              dayRouteWgsPath={dayRouteWgsPath}
              dayItineraryStops={dayItineraryStops}
              mapRouteFocus={mapRouteFocus}
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-2 min-h-0 min-w-0 flex-1 lg:order-3"
        >
          <div className="flex h-full min-h-0 max-h-[50vh] flex-col overflow-y-auto [scrollbar-gutter:stable] rounded-2xl bg-white p-5 pr-6 shadow-sm lg:max-h-none">
            {itineraryDays.some((d) => d.routeStartAddress?.trim()) ? (
              <div
                className={`mb-3 flex gap-1 sm:gap-1.5 ${
                  manyDayTabs ? "items-start" : "items-center"
                }`}
                role="tablist"
              >
                <span
                  className={`shrink-0 text-[13px] font-semibold text-[#1a1a1a] ${
                    manyDayTabs ? "pt-0.5 leading-6" : "leading-6"
                  }`}
                >
                  День
                </span>
                <div
                  className={
                    manyDayTabs
                      ? "grid min-w-0 flex-1 gap-0.5 [grid-template-columns:repeat(7,minmax(2rem,1fr))] sm:gap-1"
                      : "flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 sm:gap-1.5"
                  }
                >
                  {itineraryDays.map((d) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setSelectedDay(d.day);
                        setMapRouteFocus(null);
                      }}
                      className={`flex h-6 items-center justify-center rounded border border-gray-200 bg-white text-[11px] font-semibold tabular-nums leading-none text-[#555] transition whitespace-nowrap ${
                        manyDayTabs ? "w-full px-0.5" : "min-w-6 shrink-0 px-0.5"
                      }`}
                      style={
                        selectedDay === d.day
                          ? {
                              backgroundColor: "#4ECDC4",
                              color: "white",
                              borderColor: "#4ECDC4",
                            }
                          : undefined
                      }
                    >
                      {d.day}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {resolvedRouteStartRaw?.trim() ? (
              <button
                type="button"
                onClick={() => setMapRouteFocus({ kind: "start" })}
                className="mb-2 w-full rounded-lg p-0 text-left text-sm transition hover:bg-gray-50"
                style={{ fontWeight: 500, color: "#1a1a1a" }}
              >
                {toDisplayAddress(resolvedRouteStartRaw)}
              </button>
            ) : null}
            {currentDayPlan.routeStops && currentDayPlan.routeStops.length > 0 ? (
              <div className="space-y-2.5">
                {sortedRouteStopsForDialog.map((stop, idx) => (
                    <div
                      key={stop.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setDayStopsInitialStopId(stop.id);
                        setDayStopsDetailOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDayStopsInitialStopId(stop.id);
                          setDayStopsDetailOpen(true);
                        }
                      }}
                      className="relative flex cursor-pointer gap-2.5 overflow-visible rounded-xl border border-gray-100 bg-gray-50/40 p-2.5 transition hover:border-[#4ECDC4]/40"
                    >
                      <div className="shrink-0 pl-3.5 pt-3.5">
                        <div className="relative h-24 w-24">
                        <div className="h-full w-full overflow-hidden rounded-lg">
                          <ImageWithFallback
                            src={stop.image}
                            alt={stop.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span
                          className="absolute left-0 top-0 z-20 flex h-7 min-w-[1.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums leading-none text-white shadow-md ring-2 ring-white whitespace-nowrap"
                          style={{ background: "#4ECDC4" }}
                        >
                          {idx + 1}
                        </span>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-3.5">
                        <p
                          className="line-clamp-2 text-sm font-semibold leading-snug"
                          style={{ color: "#1a1a1a" }}
                        >
                          {stop.title}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-gray-500">
                          <span className="inline-flex items-center gap-0.5">
                            <Star
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: "#f5a623" }}
                            />
                            {stop.rating.toFixed(1)}
                          </span>
                          <span className="shrink-0 font-medium text-[#1a1a1a]">
                            {formatEstimatedCostSumOrFree(stop.estimatedCost)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMapRouteFocus({ kind: "stop", id: stop.id });
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-[#1a1a1a] transition hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5"
                          >
                            <Image
                              src="/icons/map-route.svg"
                              alt=""
                              width={14}
                              height={14}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            Карта
                          </button>
                        </div>
                        <p
                          className="line-clamp-2 text-xs font-normal leading-relaxed"
                          style={{ color: "#555" }}
                        >
                          {getStopCardTeaser(stop)}
                        </p>
                      </div>
                    </div>
                  ))}
                <DayStopsDetailDialog
                  open={dayStopsDetailOpen}
                  onOpenChange={(open) => {
                    setDayStopsDetailOpen(open);
                    if (!open) {
                      setDayStopsInitialStopId(null);
                    }
                  }}
                  dayTitle={currentDayPlan.title?.trim() || `День ${selectedDay}`}
                  stops={sortedRouteStopsForDialog}
                  initialStopId={dayStopsInitialStopId}
                  onFocusStopOnMap={(id) => {
                    setDayStopsDetailOpen(false);
                    setDayStopsInitialStopId(null);
                    setMapRouteFocus({ kind: "stop", id });
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Маршрут дня ещё не сформирован.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
