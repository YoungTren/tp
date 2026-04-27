import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  Plane,
  MapPin,
  Plus,
  Loader2,
  MoreVertical,
  Share2,
  Star,
  LogOut,
  Settings,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { AppPageBackdrop } from "./app-page-backdrop";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildDayRouteWgsPath,
  buildYandexMapsPedestrianRouteUrl,
  type WgsPoint,
} from "@/lib/day-route-path";
import { toDisplayAddress } from "@/lib/format-address";
import { capitalizePlaceName } from "@/lib/format-place";
import {
  resolveTripRouteStartAddress,
  resolveTripRouteStartPoint,
} from "@/lib/itinerary-route-start";
import { getAttractionPanelItems } from "@/lib/city-attraction-preview";
import { buildItineraryState, DEFAULT_WORLD_MAP_CENTER } from "@/lib/trip-dates";
import {
  AttractionPhotoCarousel,
  type CarouselSlide,
} from "./attraction-photo-carousel";
import type { MapRouteFocus, YandexMapPoint } from "./yandex-trip-map";
import type { DayPlan, LeisureRouteStop, TripData } from "@/types/trip";

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

const MIN_DAYS = 1;

interface DashboardProps {
  tripData: TripData;
  onTripDataChange: (next: (prev: TripData) => TripData) => void;
  onLogout: () => void;
  onOpenHistory: () => void;
  onCreateNew: () => void;
}

export function Dashboard({
  tripData,
  onTripDataChange,
  onLogout,
  onOpenHistory,
  onCreateNew,
}: DashboardProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>(() =>
    buildItineraryState(tripData)
  );
  const [destinationInput, setDestinationInput] = useState(
    () => tripData.to ?? ""
  );
  const departure = tripData.from || "Москва";
  const { mapCenter } = tripData.plan;

  const destinationForTrip = useMemo(() => {
    const raw = destinationInput.trim() || (tripData.to?.trim() ?? "") || "Рим";
    return capitalizePlaceName(raw);
  }, [destinationInput, tripData.to]);

  const destinationLabel = useMemo(() => {
    const raw = destinationInput.trim() || (tripData.to?.trim() ?? "");
    if (!raw) return "—";
    return capitalizePlaceName(raw);
  }, [destinationInput, tripData.to]);

  const mapCenterForView = useMemo(
    () =>
      !destinationInput.trim()
        ? { ...DEFAULT_WORLD_MAP_CENTER }
        : { ...mapCenter },
    [destinationInput, mapCenter.lat, mapCenter.lon, mapCenter.zoom]
  );

  const setItineraryDaysAndParent = useCallback(
    (value: DayPlan[] | ((prev: DayPlan[]) => DayPlan[])) => {
      setItineraryDays((prev) => {
        const next =
          typeof value === "function"
            ? (value as (p: DayPlan[]) => DayPlan[])(prev)
            : value;
        queueMicrotask(() => {
          onTripDataChange((p) => ({
            ...p,
            durationDays: next.length,
            plan: { ...p.plan, dayPlans: next },
          }));
        });
        return next;
      });
    },
    [onTripDataChange]
  );
  const [editingStartAddress, setEditingStartAddress] = useState("");
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [createRouteLoading, setCreateRouteLoading] = useState(false);
  const [createRouteError, setCreateRouteError] = useState<string | null>(null);
  const [mapRouteFocus, setMapRouteFocus] = useState<MapRouteFocus>(null);
  /** viewPath с карты — совпадает с ymaps.route (после геокода старта при необходимости) */
  const [mapItineraryPath, setMapItineraryPath] = useState<
    readonly WgsPoint[] | null
  >(null);
  const currentDayPlan = useMemo(() => {
    if (!itineraryDays.length) {
      return { day: 1, title: "—", items: [] as string[] };
    }
    return (
      itineraryDays.find((d) => d.day === selectedDay) || itineraryDays[0]
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

  const hasAnyConfirmedDayAddress = useMemo(
    () => itineraryDays.some((d) => d.routeStartAddress?.trim()),
    [itineraryDays]
  );

  const showStartLocationForm =
    !resolvedRouteStartRaw?.trim() || isEditingStart;

  const showRouteOnMapInUi = Boolean(
    currentDayPlan.routeGenerated &&
      (currentDayPlan.routeStops?.length ?? 0) > 0
  );

  const [sideAttractionSlides, setSideAttractionSlides] = useState<
    CarouselSlide[] | null
  >(null);
  const [sideAttractionLoading, setSideAttractionLoading] = useState(false);
  const [sideAttractionHeadline, setSideAttractionHeadline] = useState("");

  const startAddressForApi = useMemo(
    () => resolvedRouteStartRaw?.trim() ?? "",
    [resolvedRouteStartRaw]
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

  const itineraryForShareKey = useMemo(
    () =>
      [
        dayRouteWgsPath.map((p) => `${p.lat},${p.lon}`).join("~"),
        dayItineraryStops
          .map((s) => `${s.id}:${s.lat},${s.lon}`)
          .join("|"),
        mapRouteStartPoint
          ? `${mapRouteStartPoint.lat},${mapRouteStartPoint.lon}`
          : "—",
        dayRouteStartForMap ?? "—",
      ].join("§"),
    [
      dayRouteWgsPath,
      dayItineraryStops,
      mapRouteStartPoint,
      dayRouteStartForMap,
    ]
  );

  const needsClientGeocodedStart = useMemo(() => {
    const addr = resolveTripRouteStartAddress(itineraryDays, currentDayPlan);
    if (!addr) return false;
    const sp = mapRouteStartPoint;
    return !(
      sp != null && Number.isFinite(sp.lat) && Number.isFinite(sp.lon)
    );
  }, [itineraryDays, currentDayPlan, mapRouteStartPoint]);

  useEffect(() => {
    setMapItineraryPath(null);
  }, [selectedDay, itineraryForShareKey]);

  const emptyMapPoints = useMemo<YandexMapPoint[]>(() => [], []);

  const copyYandexRouteUrl = useCallback(async () => {
    const fromMap = mapItineraryPath;
    const fromWhenServerSuffices =
      !needsClientGeocodedStart && dayRouteWgsPath.length >= 2
        ? dayRouteWgsPath
        : null;
    const path: readonly WgsPoint[] | null = fromMap ?? fromWhenServerSuffices;
    if (path == null) {
      toast.error("Сначала дождитесь отрисовки маршрута на карте");
      return;
    }
    const url = buildYandexMapsPedestrianRouteUrl(path);
    if (!url) {
      toast.error("Недостаточно точек с координатами для ссылки");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка на пешеходный маршрут в Яндекс.Картах скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }, [mapItineraryPath, dayRouteWgsPath, needsClientGeocodedStart]);

  useEffect(() => {
    setEditingStartAddress(resolvedRouteStartRaw ?? "");
  }, [selectedDay, resolvedRouteStartRaw]);

  useEffect(() => {
    setIsEditingStart(false);
  }, [selectedDay]);

  useEffect(() => {
    setMapRouteFocus(null);
  }, [selectedDay]);

  useEffect(() => {
    setDestinationInput(tripData.to ?? "");
  }, [tripData.to]);

  useEffect(() => {
    if (!showStartLocationForm) {
      return;
    }
    const city = destinationForTrip.trim() || "Рим";
    const ac = new AbortController();
    setSideAttractionLoading(true);
    setSideAttractionHeadline("");
    setSideAttractionSlides(null);
    void (async () => {
      try {
        const res = await fetch("/api/city-attraction-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city }),
          signal: ac.signal,
        });
        if (!res.ok) {
          throw new Error("attraction photos");
        }
        const data: unknown = await res.json();
        const items = (data as { items: CarouselSlide[] }).items;
        if (!ac.signal.aborted) {
          setSideAttractionSlides(items);
        }
      } catch {
        if (!ac.signal.aborted) {
          setSideAttractionSlides(getAttractionPanelItems(city));
        }
      } finally {
        if (!ac.signal.aborted) {
          setSideAttractionLoading(false);
        }
      }
    })();
    return () => ac.abort();
  }, [showStartLocationForm, destinationForTrip]);

  useEffect(() => {
    if (!itineraryDays.length) return;
    const hasDay = itineraryDays.some((d) => d.day === selectedDay);
    if (!hasDay) {
      const last = itineraryDays[itineraryDays.length - 1]!;
      setSelectedDay(last.day);
    }
  }, [itineraryDays, selectedDay]);

  const addDay = useCallback(() => {
    setItineraryDaysAndParent((prev) => {
      const n = prev.length + 1;
      const base = prev[0];
      return [
        ...prev,
        {
          day: n,
          title: `День ${n}`,
          items: [] as string[],
          ...(base?.routeStartAddress
            ? {
                routeStartAddress: base.routeStartAddress,
                routeStartPoint: base.routeStartPoint,
              }
            : {}),
        },
      ].map((d, i) => ({ ...d, day: i + 1 }));
    });
  }, [setItineraryDaysAndParent]);

  const removeLastDay = useCallback(() => {
    setItineraryDaysAndParent((prev) => {
      if (prev.length <= MIN_DAYS) return prev;
      return prev.slice(0, -1).map((d, i) => ({ ...d, day: i + 1 }));
    });
  }, [setItineraryDaysAndParent]);

  const createLeisureRoute = useCallback(
    async (regenerateHint?: string, startAddressOverride?: string) => {
      const nDays = itineraryDays.length;
      const startForRequest = (() => {
        if (startAddressOverride?.trim()) {
          return startAddressOverride.trim();
        }
        return startAddressForApi;
      })();
      if (nDays > 1 && !startForRequest) {
        toast.error(
          "Сначала в Дне 1 укажите и подтвердите адрес старта — с него строятся маршруты на все дни"
        );
        return;
      }
      if (nDays <= 1 && !startForRequest) {
        return;
      }
      setCreateRouteError(null);
      setCreateRouteLoading(true);
      try {
        if (nDays > 1) {
          const res = await fetch("/api/trip/multi-day-leisure-route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: destinationForTrip,
              startAddress: startForRequest,
              budget: tripData.budget,
              travelers: tripData.travelers,
              durationDays: nDays,
              titleHint: regenerateHint,
            }),
          });
          const data: unknown = await res.json();
          if (!res.ok) {
            setCreateRouteError(
              (data as { error?: string })?.error ??
                "Не удалось создать маршруты"
            );
            return;
          }
          const { days: packed } = data as {
            days: {
              day: number;
              dayTitle: string;
              stops: LeisureRouteStop[];
              startPoint?: { lat: number; lon: number };
            }[];
          };
          setItineraryDaysAndParent((prev) => {
            const m = new Map(
              packed.map(
                (x) =>
                  [x.day, x] as [
                    number,
                    {
                      day: number;
                      dayTitle: string;
                      stops: LeisureRouteStop[];
                      startPoint?: { lat: number; lon: number };
                    }
                  ]
              )
            );
            const day1StartAddr = prev[0]?.routeStartAddress?.trim() ?? "";
            const sharedPoint = m.get(1)?.startPoint;
            return prev.map((d) => {
              const p = m.get(d.day);
              if (!p) {
                return d;
              }
              return {
                ...d,
                routeStartAddress: day1StartAddr || d.routeStartAddress,
                routeGenerated: true,
                title: p.dayTitle,
                routeStops: p.stops,
                items: [] as string[],
                routeStartPoint: sharedPoint ?? d.routeStartPoint,
              };
            });
          });
          return;
        }

        const res = await fetch("/api/trip/day-leisure-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: destinationForTrip,
            startAddress: startForRequest,
            budget: tripData.budget,
            travelers: tripData.travelers,
            titleHint: regenerateHint,
          }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          setCreateRouteError(
            (data as { error?: string })?.error ?? "Не удалось создать маршрут"
          );
          return;
        }
        const { dayTitle, stops, startPoint } = data as {
          dayTitle: string;
          stops: LeisureRouteStop[];
          startPoint?: { lat: number; lon: number };
        };
        setItineraryDaysAndParent((prev) =>
          prev.map((d) =>
            d.day === selectedDay
              ? {
                  ...d,
                  routeGenerated: true,
                  title: dayTitle,
                  routeStops: stops,
                  routeStartPoint: startPoint,
                  items: [] as string[],
                }
              : d
          )
        );
      } finally {
        setCreateRouteLoading(false);
      }
    },
    [
      itineraryDays,
      startAddressForApi,
      destinationForTrip,
      tripData.budget,
      tripData.travelers,
      selectedDay,
      setItineraryDaysAndParent,
    ]
  );

  const confirmStartAndCreateRoute = useCallback(() => {
    const t = toDisplayAddress(editingStartAddress);
    if (!t) return;
    setIsEditingStart(false);
    setCreateRouteError(null);
    setItineraryDaysAndParent((prev) =>
      prev.map((d) => ({
        ...d,
        routeStartAddress: t,
        routeStartPoint: undefined,
        routeStops: undefined,
        routeGenerated: false,
        items: [] as string[],
      }))
    );
    void createLeisureRoute(undefined, t);
  }, [editingStartAddress, setItineraryDaysAndParent, createLeisureRoute]);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <AppPageBackdrop />

      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200/60 bg-white px-4 md:px-8 py-3">
        <div className="flex items-center gap-3 md:gap-6">
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

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNew}
              className="rounded-lg px-3 md:px-4 py-2 transition-all hover:scale-105"
              style={{
                backgroundColor: "#4ECDC4",
                color: "white",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Создать
            </button>
            <button
              onClick={onOpenHistory}
              className="rounded-lg border px-3 md:px-4 py-2 transition-all hover:bg-gray-50"
              style={{
                borderColor: "#e5e5e5",
                color: "#555",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              История
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <Bell className="h-4.5 w-4.5" />
          </button>
          <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <Settings className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-hidden p-4 md:p-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-stretch lg:gap-5">
          {/* Center: Route map area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="order-1 flex h-full min-h-0 min-w-0 flex-1 flex-col"
          >
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
              {showStartLocationForm ? (
                <div className="mb-4 w-1/2 min-w-0 max-w-full shrink-0">
                  <div className="flex w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white transition focus-within:ring-2 focus-within:ring-[#4ECDC4]/20">
                    <input
                      id={`day-route-start-${selectedDay}`}
                      type="text"
                      value={editingStartAddress}
                      onChange={(e) => setEditingStartAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingStartAddress.trim()) {
                          e.preventDefault();
                          confirmStartAndCreateRoute();
                        }
                      }}
                      placeholder="Укажите ваше местоположение"
                      aria-label="Укажите ваше местоположение"
                      className="min-w-0 flex-1 border-0 bg-gray-50/80 px-3.5 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-gray-400"
                      autoComplete="street-address"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void confirmStartAndCreateRoute();
                      }}
                      disabled={!editingStartAddress.trim() || createRouteLoading}
                      className="flex min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-r-xl border-0 px-3 py-2 !bg-[#4ECDC4] !opacity-100 text-white transition enabled:hover:scale-105 disabled:cursor-not-allowed"
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      {createRouteLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : null}
                      Найти
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {showRouteOnMapInUi ? (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2
                        style={{
                          fontSize: "20px",
                          fontWeight: 600,
                          color: "#1a1a1a",
                        }}
                      >
                        Маршрут путешествия
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          void copyYandexRouteUrl();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 transition hover:bg-gray-50"
                        style={{ fontSize: "13px", fontWeight: 500 }}
                      >
                        <Share2
                          className="h-3.5 w-3.5"
                          style={{ color: "#4ECDC4" }}
                        />
                        Поделиться
                      </button>
                    </div>
                  ) : null}
                  <div
                    className="mb-4 flex items-center gap-2 text-gray-500"
                    style={{ fontSize: "14px" }}
                  >
                    <MapPin className="h-4 w-4" style={{ color: "#4ECDC4" }} />
                      <span>
                      Назначение:{" "}
                      <span style={{ fontWeight: 500, color: "#1a1a1a" }}>
                        {destinationLabel}
                      </span>
                    </span>
                  </div>
                </>
              )}

              <div className="relative w-full min-h-[12rem] flex-1 overflow-hidden rounded-2xl border border-gray-100 md:min-h-[16rem] lg:min-h-0">
                <div className="absolute inset-0 z-0 min-h-0 min-w-0">
                  <YandexTripMap
                    mapCenter={mapCenterForView}
                    points={emptyMapPoints}
                    fromLabel={departure}
                    toLabel={destinationForTrip}
                    dayRouteStartAddress={dayRouteStartForMap}
                    dayRouteStartPoint={mapRouteStartPoint}
                    dayRouteWgsPath={dayRouteWgsPath}
                    dayItineraryStops={dayItineraryStops}
                    mapRouteFocus={mapRouteFocus}
                    onItineraryRoutePathChange={setMapItineraryPath}
                  />
                </div>
                <button
                  type="button"
                  className="absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105"
                  style={{ color: "#4ECDC4" }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            key={showStartLocationForm ? "side-attr" : "side-day"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="order-2 flex h-full min-h-0 min-w-0 w-full self-stretch flex-col"
          >
            {showStartLocationForm ? (
              <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <h2
                  className="mb-2.5 shrink-0 line-clamp-2"
                  style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}
                >
                  {sideAttractionHeadline || destinationForTrip}
                </h2>
                <div className="min-h-0 w-full min-w-0 flex-1">
                  <AttractionPhotoCarousel
                    key={destinationForTrip}
                    cityLabel={destinationForTrip}
                    items={sideAttractionSlides ?? []}
                    isLoading={
                      sideAttractionLoading || sideAttractionSlides === null
                    }
                    onActiveTitleChange={setSideAttractionHeadline}
                  />
                </div>
              </div>
            ) : (
            <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
              {hasAnyConfirmedDayAddress && (
                <div className="mb-3 flex w-full min-w-0 items-center gap-1.5">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                    <h3
                      className="shrink-0"
                      style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}
                    >
                      День
                    </h3>
                    <div
                      className="flex min-w-0 max-w-full flex-1 flex-wrap content-center items-center gap-1"
                      role="tablist"
                      aria-label="Дни поездки"
                    >
                      {itineraryDays.map((d) => (
                        <button
                          key={d.day}
                          type="button"
                          role="tab"
                          aria-selected={selectedDay === d.day}
                          onClick={() => setSelectedDay(d.day)}
                          className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-xs font-semibold leading-none text-[#1a1a1a] transition focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50"
                          style={{
                            borderColor:
                              selectedDay === d.day ? "#4ECDC4" : undefined,
                            backgroundColor:
                              selectedDay === d.day ? "#4ECDC4" : undefined,
                            color: selectedDay === d.day ? "#fff" : undefined,
                          }}
                          title={`День ${d.day}`}
                        >
                          {d.day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
                        aria-label="Действия с днями"
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[11rem]">
                      <DropdownMenuItem
                        onSelect={() => {
                          addDay();
                        }}
                      >
                        Добавить день
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={itineraryDays.length <= MIN_DAYS}
                        onSelect={() => {
                          removeLastDay();
                        }}
                      >
                        Удалить день
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {Boolean(resolvedRouteStartRaw?.trim()) &&
                !isEditingStart &&
                !currentDayPlan.routeGenerated &&
                (itineraryDays.length === 1 ||
                  Boolean(resolvedRouteStartRaw?.trim())) && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        void createLeisureRoute();
                      }}
                      disabled={createRouteLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-[#1a1a1a] transition enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createRouteLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : null}
                      Создать маршрут
                    </button>
                  </div>
                )}

              {createRouteError ? (
                <p className="mb-2 text-xs text-red-500">{createRouteError}</p>
              ) : null}

                  {currentDayPlan.routeGenerated &&
                (currentDayPlan.routeStops?.length ?? 0) > 0 && (
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                  {Boolean((resolvedRouteStartRaw ?? "").trim()) && (
                    <div
                      key="departure"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMapRouteFocus({ kind: "start" });
                        }
                      }}
                      onClick={() => setMapRouteFocus({ kind: "start" })}
                      className="relative flex cursor-pointer gap-2.5 rounded-xl border border-gray-100 bg-gray-50/40 p-2.5 transition hover:border-[#4ECDC4]/40"
                    >
                      <span
                        className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white/80"
                        style={{ background: "#7E57C2" }}
                        aria-label="Старт маршрута"
                      >
                        <MapPin
                          className="h-3.5 w-3.5 text-white"
                          strokeWidth={2.5}
                        />
                      </span>
                      <div
                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-200/90 bg-slate-50/90"
                        aria-hidden
                      >
                        <MapPin
                          className="h-12 w-12 drop-shadow-sm"
                          style={{ color: "#d32f2f" }}
                          fill="currentColor"
                          strokeWidth={0}
                          aria-hidden
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p
                          className="text-[11px] font-medium"
                          style={{ color: "#6b7280" }}
                        >
                          Место отправления
                        </p>
                        <p
                          className="line-clamp-2 pr-0.5 text-sm font-semibold"
                          style={{ color: "#1a1a1a" }}
                        >
                          {toDisplayAddress(
                            resolvedRouteStartRaw ?? ""
                          )}
                        </p>
                        <div className="mt-auto flex flex-wrap justify-end pt-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingStart(true);
                              setMapRouteFocus(null);
                            }}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[#1a1a1a] transition hover:bg-gray-50"
                          >
                            Изменить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {[...(currentDayPlan.routeStops ?? [])]
                    .sort((a, b) => a.order - b.order)
                    .map((stop, idx) => {
                      const listIndex = idx + 1;
                      return (
                        <div
                          key={stop.id}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setMapRouteFocus({ kind: "stop", id: stop.id });
                            }
                          }}
                          onClick={() =>
                            setMapRouteFocus({ kind: "stop", id: stop.id })
                          }
                          className="relative flex cursor-pointer gap-2.5 rounded-xl border border-gray-100 bg-gray-50/40 p-2.5 transition hover:border-[#4ECDC4]/40"
                        >
                          <span
                            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-white/80"
                            style={{ background: "#4ECDC4" }}
                            aria-label={`Пункт ${listIndex} маршрута`}
                          >
                            {listIndex}
                          </span>
                          <ImageWithFallback
                            src={stop.image}
                            alt={stop.title}
                            className="h-24 w-24 shrink-0 rounded-lg object-cover"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div>
                              <p
                                className="line-clamp-2 text-sm font-semibold"
                                style={{ color: "#1a1a1a" }}
                              >
                                {stop.title}
                              </p>
                              <p
                                className="mt-0.5 line-clamp-2 text-xs leading-relaxed"
                                style={{ color: "#555" }}
                              >
                                {stop.description}
                              </p>
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
                              style={{ fontSize: "12px", color: "#6b7280" }}
                            >
                              <span className="inline-flex items-center gap-0.5">
                                <Star
                                  className="h-3.5 w-3.5 shrink-0"
                                  style={{ color: "#f5a623" }}
                                />
                                {stop.rating.toFixed(1)}
                              </span>
                              <span>{stop.estimatedCost}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                )}
            </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
