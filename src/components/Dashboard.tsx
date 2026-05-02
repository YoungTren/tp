import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useId,
} from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "motion/react";
import {
  MapPin,
  Loader2,
  MoreVertical,
  Share2,
  Star,
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
  mapCenterFromWaypoints,
  type WgsPoint,
} from "@/lib/day-route-path";
import { toDisplayAddress } from "@/lib/format-address";
import { capitalizePlaceName } from "@/lib/format-place";
import {
  resolveTripRouteStartAddress,
  resolveTripRouteStartPoint,
} from "@/lib/itinerary-route-start";
import { getAttractionPanelItems } from "@/lib/city-attraction-preview";
import { getStopCardTeaser } from "@/lib/leisure-facts";
import { formatEstimatedCostSumOrFree } from "@/lib/place-price-hint";
import {
  buildItineraryState,
  dayCountForItinerary,
  DEFAULT_WORLD_MAP_CENTER,
  resizeItineraryDays,
} from "@/lib/trip-dates";
import {
  AttractionPhotoCarousel,
  type CarouselSlide,
} from "./attraction-photo-carousel";
import { DayStopsDetailDialog } from "./day-stops-detail-dialog";
import { RouteGenerationWalkLoader } from "./route-generation-walk-loader";
import type { MapRouteFocus, YandexMapPoint } from "./yandex-trip-map";
/* TripMap рендерит Google или Яндекс по NEXT_PUBLIC_GOOGLE_MAPS_API_KEY */
import type { DayPlan, LeisureRouteStop, TripData } from "@/types/trip";

const TripMap = dynamic(
  () => import("./trip-map").then((m) => m.TripMap),
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

/** Не дергаем геокодер для слишком коротких строк — карту не «дергаем». */
const MIN_START_ADDR_FOR_GEOCODE = 3;

const ADDRESS_SUGGEST_DEBOUNCE_MS = 350;

const collectLockedStopTitlesForDay = (
  days: DayPlan[],
  exceptDay: number
): string[] => {
  const out: string[] = [];
  for (const d of days) {
    if (d.day === exceptDay) continue;
    for (const s of d.routeStops ?? []) {
      const t = s.title?.trim();
      if (t) {
        out.push(t);
      }
    }
  }
  return out;
};

const ItineraryDayHeaderBar = (props: {
  className?: string;
  itineraryDays: DayPlan[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onRemoveLast: () => void;
  showShareRoute?: boolean;
  onShareRoute?: () => void;
}) => {
  const {
    className,
    itineraryDays,
    selectedDay,
    onSelectDay,
    onAddDay,
    onRemoveLast,
    showShareRoute,
    onShareRoute,
  } = props;
  const manyDays = itineraryDays.length > 7;
  return (
    <div
      className={`flex w-full min-w-0 flex-wrap gap-x-1.5 gap-y-2 ${
        manyDays ? "items-start" : "items-center"
      } ${className ?? "mb-3"}`}
    >
      <div
        className={`flex min-w-0 flex-1 ${
          manyDays
            ? "items-start gap-1.5 sm:gap-2"
            : "items-center gap-x-1.5 sm:gap-x-2"
        }`}
      >
        <h3
          className={`shrink-0 text-[13px] font-semibold text-[#1a1a1a] ${
            manyDays ? "pt-0.5 leading-6" : "leading-6"
          }`}
        >
          День
        </h3>
        <div
          className={
            manyDays
              ? "grid min-w-0 flex-1 gap-0.5 [grid-template-columns:repeat(7,minmax(2rem,1fr))] sm:gap-1"
              : "flex min-w-0 flex-1 flex-nowrap items-center gap-0.5"
          }
          role="tablist"
          aria-label="Дни поездки"
        >
          {itineraryDays.map((d) => (
            <button
              key={d.day}
              type="button"
              role="tab"
              aria-selected={selectedDay === d.day}
              onClick={() => onSelectDay(d.day)}
              className={`flex h-6 items-center justify-center rounded border border-gray-300 bg-white text-[11px] font-semibold tabular-nums leading-none text-[#1a1a1a] transition focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 whitespace-nowrap ${
                manyDays ? "w-full px-0.5" : "min-w-6 shrink-0 px-0.5"
              }`}
              style={{
                borderColor: selectedDay === d.day ? "#4ECDC4" : undefined,
                backgroundColor: selectedDay === d.day ? "#4ECDC4" : undefined,
                color: selectedDay === d.day ? "#fff" : undefined,
              }}
              title={`День ${d.day}`}
            >
              {d.day}
            </button>
          ))}
        </div>
      </div>
      {showShareRoute && onShareRoute ? (
        <button
          type="button"
          onClick={onShareRoute}
          aria-label="Поделиться маршрутом"
          className="inline-flex h-7 min-h-[2.25rem] shrink-0 items-center gap-0.5 rounded-lg border-0 bg-[#4ECDC4] px-2 text-[10px] font-medium text-white shadow-sm transition hover:bg-[#45c2b9] sm:h-6 sm:min-h-0 sm:gap-1 sm:px-2 sm:text-[11px]"
        >
          <Share2
            className="h-3 w-3 shrink-0 text-white"
            aria-hidden
          />
          <span className="hidden whitespace-nowrap sm:inline">
            Поделиться маршрутом
          </span>
        </button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
            aria-label="Действия с днями"
          >
            <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem
            onSelect={() => {
              onAddDay();
            }}
          >
            Добавить день
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={itineraryDays.length <= MIN_DAYS}
            onSelect={() => {
              onRemoveLast();
            }}
          >
            Удалить день
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

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
  onLogout: _onLogout,
  onOpenHistory: _onOpenHistory,
  onCreateNew: _onCreateNew,
}: DashboardProps) {
  /** Уникальные имена полей — Chrome не подставляет сохранённые адреса как при `street-address`. */
  const routeStartFieldMainId = useId();
  const routeStartFieldInlineId = useId();

  const [selectedDay, setSelectedDay] = useState(1);
  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>(() =>
    buildItineraryState(tripData)
  );
  const [destinationInput, setDestinationInput] = useState(
    () => tripData.to ?? ""
  );
  const departure = tripData.from || "Москва";
  const { mapCenter } = tripData.plan;

  /** Город из поля «Куда» (инлайн или из мастера) — без дефолта «Рим»; для карты и геокода. */
  const cityForMap = useMemo(
    () => (destinationInput.trim() || tripData.to?.trim() || "").trim(),
    [destinationInput, tripData.to]
  );

  const destinationForTrip = useMemo(() => {
    const raw = cityForMap || "Рим";
    return capitalizePlaceName(raw);
  }, [cityForMap]);

  useEffect(() => {
    if (!cityForMap) {
      setDestinationCityGeocodeError(null);
      return;
    }
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/geocode-city?city=${encodeURIComponent(cityForMap)}`,
          { signal: ac.signal }
        );
        if (!res.ok) {
          if (res.status === 404) {
            setDestinationCityGeocodeError(
              "Город не найден. Введите корректное название."
            );
          }
          return;
        }
        setDestinationCityGeocodeError(null);
        const d = (await res.json()) as {
          lat: number;
          lon: number;
          zoom: number;
        };
        onTripDataChange((p) => ({
          ...p,
          plan: {
            ...p.plan,
            mapCenter: { lat: d.lat, lon: d.lon, zoom: d.zoom },
          },
        }));
      } catch {
        if (!ac.signal.aborted) {
          setDestinationCityGeocodeError(null);
        }
      }
    })();
    return () => ac.abort();
  }, [cityForMap, onTripDataChange]);

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
  const [debouncedAddressSuggestQ, setDebouncedAddressSuggestQ] =
    useState("");
  const [addressSuggestItems, setAddressSuggestItems] = useState<
    { label: string }[]
  >([]);
  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [createRouteLoading, setCreateRouteLoading] = useState(false);
  const [restOfDaysLoading, setRestOfDaysLoading] = useState(false);
  /** EMA: грубая оценка длит. следующего «первого» ответа. */
  const routeGenPaceMsRef = useRef(18_000);
  const [routeGenPaceForRunMs, setRouteGenPaceForRunMs] = useState(18_000);
  const [routeGenEpoch, setRouteGenEpoch] = useState(0);
  const routeGenT0Ref = useRef(0);
  const departureInlineInputRef = useRef<HTMLInputElement | null>(null);
  /** Отмена геокода по «Найти», если строка изменилась или блок закрыт. */
  const findGeocodeAbortRef = useRef<AbortController | null>(null);
  const skipCreateLoadingInFinally = useRef(false);
  const [createRouteError, setCreateRouteError] = useState<string | null>(null);
  const [destinationCityGeocodeError, setDestinationCityGeocodeError] =
    useState<string | null>(null);
  const [draftResolvedCoords, setDraftResolvedCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [draftResolvedForQuery, setDraftResolvedForQuery] = useState("");
  const [draftAddressGeocodePending, setDraftAddressGeocodePending] =
    useState(false);
  const [draftAddressGeocodeError, setDraftAddressGeocodeError] = useState<
    string | null
  >(null);
  const [mapRouteFocus, setMapRouteFocus] = useState<MapRouteFocus>(null);
  const [dayStopsDetailOpen, setDayStopsDetailOpen] = useState(false);
  const [dayStopsInitialStopId, setDayStopsInitialStopId] = useState<
    string | null
  >(null);
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

  const sortedRouteStopsForDialog = useMemo(
    () =>
      [...(currentDayPlan.routeStops ?? [])].sort((a, b) => a.order - b.order),
    [currentDayPlan.routeStops]
  );

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

  const mapCenterAlignedToGeneratedRoute = useMemo(() => {
    const path = buildDayRouteWgsPath({
      routeStartPoint: mapRouteStartPoint,
      routeStops: currentDayPlan.routeStops,
    });
    return mapCenterFromWaypoints(path);
  }, [mapRouteStartPoint, currentDayPlan.routeStops]);

  const mapCenterForView = useMemo(() => {
    if (!cityForMap) {
      return { ...DEFAULT_WORLD_MAP_CENTER };
    }
    if (
      currentDayPlan.routeGenerated &&
      (currentDayPlan.routeStops?.length ?? 0) > 0 &&
      mapCenterAlignedToGeneratedRoute
    ) {
      return mapCenterAlignedToGeneratedRoute;
    }
    return { ...mapCenter };
  }, [
    cityForMap,
    mapCenter.lat,
    mapCenter.lon,
    mapCenter.zoom,
    currentDayPlan.routeGenerated,
    currentDayPlan.routeStops,
    mapCenterAlignedToGeneratedRoute,
  ]);

  const hasAnyConfirmedDayAddress = useMemo(
    () => itineraryDays.some((d) => d.routeStartAddress?.trim()),
    [itineraryDays]
  );

  /** Пустой старт: большая форма в колонке карты. Правка адреса — в карточке справа, без isEditingStart здесь. */
  const showStartLocationForm = !resolvedRouteStartRaw?.trim();

  const showRouteOnMapInUi = Boolean(
    currentDayPlan.routeGenerated &&
      (currentDayPlan.routeStops?.length ?? 0) > 0
  );

  const startAddressPreviewActive =
    showStartLocationForm || isEditingStart;

  const draftCoordsForMap = useMemo(() => {
    const q = editingStartAddress.trim();
    if (!q || !draftResolvedCoords || draftResolvedForQuery !== q) {
      return null;
    }
    return draftResolvedCoords;
  }, [editingStartAddress, draftResolvedCoords, draftResolvedForQuery]);

  /** Точка по «Найти»: остаётся на карте после подтверждения адреса, пока дневной маршрут не построен. */
  const mapFoundStartCoords = useMemo(() => {
    if (draftCoordsForMap) {
      return {
        lat: draftCoordsForMap.lat,
        lon: draftCoordsForMap.lon,
      };
    }
    if (!currentDayPlan.routeGenerated && mapRouteStartPoint) {
      const { lat, lon } = mapRouteStartPoint;
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon };
      }
    }
    return null;
  }, [
    draftCoordsForMap,
    currentDayPlan.routeGenerated,
    mapRouteStartPoint,
  ]);

  const mapFoundStartLabel = useMemo(() => {
    const fromEdit = editingStartAddress.trim();
    if (fromEdit) return fromEdit;
    const raw = resolvedRouteStartRaw?.trim();
    return raw ? toDisplayAddress(raw) : "";
  }, [editingStartAddress, resolvedRouteStartRaw]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7309/ingest/3c435b79-d272-402e-8d24-69544295a40d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7214e4",
      },
      body: JSON.stringify({
        sessionId: "7214e4",
        location: "Dashboard.tsx:map-pin-state",
        message: "mapFound/draft/route snapshot",
        data: {
          hasMapFound: mapFoundStartCoords != null,
          mfLat: mapFoundStartCoords?.lat ?? null,
          mfLon: mapFoundStartCoords?.lon ?? null,
          hasDraftCoords: draftCoordsForMap != null,
          hasRoutePt: mapRouteStartPoint != null,
          rsrLen: (resolvedRouteStartRaw ?? "").length,
          routeGen: currentDayPlan.routeGenerated,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
  }, [
    mapFoundStartCoords,
    draftCoordsForMap,
    mapRouteStartPoint,
    resolvedRouteStartRaw,
    currentDayPlan.routeGenerated,
  ]);

  const draftGeocodeFailedForMap =
    startAddressPreviewActive &&
    editingStartAddress.trim().length >= MIN_START_ADDR_FOR_GEOCODE &&
    !draftAddressGeocodePending &&
    draftAddressGeocodeError !== null &&
    editingStartAddress.trim() === draftResolvedForQuery;

  const [sideAttractionSlides, setSideAttractionSlides] = useState<
    CarouselSlide[] | null
  >(null);
  const [sideAttractionLoading, setSideAttractionLoading] = useState(false);
  const [sideAttractionHeadline, setSideAttractionHeadline] = useState("");

  const startAddressForApi = useMemo(
    () => resolvedRouteStartRaw?.trim() ?? "",
    [resolvedRouteStartRaw]
  );

  /** Мультидневка: кнопка «Создать маршрут» скрывается после дня 1, даже если открыт день 2+ */
  const canShowCreateRouteButton = useMemo(() => {
    if (itineraryDays.length <= 1) {
      return !currentDayPlan.routeGenerated;
    }
    return !itineraryDays[0]?.routeGenerated;
  }, [itineraryDays, currentDayPlan.routeGenerated]);

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

  /** Те же ориентиры, что в карусели (до генерации маршрута) — метки 1…n на карте. */
  const previewAttractionMapPoints = useMemo<YandexMapPoint[]>(() => {
    if (!showStartLocationForm || !sideAttractionSlides?.length) return [];
    const out: YandexMapPoint[] = [];
    for (let orderIdx = 0; orderIdx < sideAttractionSlides.length; orderIdx++) {
      const s = sideAttractionSlides[orderIdx]!;
      if (
        s.lat == null ||
        s.lon == null ||
        !Number.isFinite(s.lat) ||
        !Number.isFinite(s.lon)
      ) {
        continue;
      }
      out.push({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        title: s.title,
        category: "достопримечательности",
        sequence: orderIdx + 1,
      });
    }
    return out;
  }, [showStartLocationForm, sideAttractionSlides]);

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
    const active = showStartLocationForm || isEditingStart;
    if (!active) {
      setDebouncedAddressSuggestQ("");
      setAddressSuggestItems([]);
      setAddressSuggestLoading(false);
      return;
    }
    const id = window.setTimeout(() => {
      setDebouncedAddressSuggestQ(editingStartAddress.trim());
    }, ADDRESS_SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [editingStartAddress, showStartLocationForm, isEditingStart]);

  useEffect(() => {
    const active = showStartLocationForm || isEditingStart;
    if (!active) {
      return;
    }
    const q = debouncedAddressSuggestQ.trim();
    if (q.length < MIN_START_ADDR_FOR_GEOCODE) {
      setAddressSuggestItems([]);
      setAddressSuggestLoading(false);
      return;
    }
    const city = destinationForTrip.trim();
    const ac = new AbortController();
    setAddressSuggestLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams({ q });
        if (city) params.set("city", city);
        const res = await fetch(`/api/address-suggest?${params}`, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        const data = (await res.json()) as {
          suggestions?: { label: string }[];
        };
        const items = Array.isArray(data.suggestions)
          ? data.suggestions
          : [];
        setAddressSuggestItems(items);
      } catch {
        if (!ac.signal.aborted) {
          setAddressSuggestItems([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setAddressSuggestLoading(false);
        }
      }
    })();
    return () => ac.abort();
  }, [
    debouncedAddressSuggestQ,
    destinationForTrip,
    showStartLocationForm,
    isEditingStart,
  ]);

  /** Геокод только по «Найти»; при правке строки — сброс маркера/ошибки и отмена запроса. */
  useEffect(() => {
    const active = showStartLocationForm || isEditingStart;
    if (!active) {
      findGeocodeAbortRef.current?.abort();
      findGeocodeAbortRef.current = null;
      setDraftAddressGeocodePending(false);
      setDraftAddressGeocodeError(null);
      /** Не сбрасываем draftResolved*: координаты нужны карте после подтверждения адреса (пока строится маршрут). */
      return;
    }
    const typed = editingStartAddress.trim();
    if (!typed) {
      findGeocodeAbortRef.current?.abort();
      findGeocodeAbortRef.current = null;
      setDraftResolvedCoords(null);
      setDraftResolvedForQuery("");
      setDraftAddressGeocodePending(false);
      setDraftAddressGeocodeError(null);
      return;
    }
    if (draftResolvedForQuery && typed !== draftResolvedForQuery) {
      findGeocodeAbortRef.current?.abort();
      findGeocodeAbortRef.current = null;
      setDraftAddressGeocodePending(false);
      setDraftResolvedCoords(null);
      setDraftResolvedForQuery("");
      setDraftAddressGeocodeError(null);
    }
  }, [
    editingStartAddress,
    draftResolvedForQuery,
    showStartLocationForm,
    isEditingStart,
  ]);

  useEffect(() => {
    return () => {
      findGeocodeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setIsEditingStart(false);
  }, [selectedDay]);

  useEffect(() => {
    setMapRouteFocus(null);
  }, [selectedDay]);

  useEffect(() => {
    if (!isEditingStart) {
      return;
    }
    const id = requestAnimationFrame(() => {
      const el = departureInlineInputRef.current;
      if (!el) {
        return;
      }
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => cancelAnimationFrame(id);
  }, [isEditingStart]);

  useEffect(() => {
    setDayStopsDetailOpen(false);
    setDayStopsInitialStopId(null);
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
          const base = getAttractionPanelItems(city);
          setSideAttractionSlides(base);
          void (async () => {
            try {
              const r = await fetch("/api/attraction-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  city,
                  items: base.map((p) => ({ id: p.id, title: p.title })),
                }),
                signal: ac.signal,
              });
              if (!r.ok || ac.signal.aborted) return;
              const locJson: unknown = await r.json();
              const locs = (locJson as { items: { id: string; lat: number | null; lon: number | null }[] })
                .items;
              const locById = new Map(
                locs.map((x) => [x.id, x] as [string, (typeof locs)[number]])
              );
              if (ac.signal.aborted) return;
              setSideAttractionSlides((prev) => {
                if (!prev) return prev;
                return prev.map((s) => {
                  const l = locById.get(s.id);
                  if (l && l.lat != null && l.lon != null) {
                    return { ...s, lat: l.lat, lon: l.lon };
                  }
                  return s;
                });
              });
            } catch {
              /* сетевой сбой — остаются только фото-фолбэк без меток */
            }
          })();
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

  const generateItineraryDay = useCallback(
    async (args: {
      targetDay: number;
      titleHint?: string;
      startAddressOverride?: string;
    }) => {
      const { targetDay, titleHint, startAddressOverride } = args;
      let alignedForRequest = itineraryDays;
      flushSync(() => {
        setItineraryDaysAndParent((prev) => {
          const targetN = dayCountForItinerary(
            prev.length > 0 ? prev.length : tripData.durationDays
          );
          const alignedItinerary = resizeItineraryDays(prev, targetN);
          const targetLen = dayCountForItinerary(tripData.durationDays);
          const next =
            alignedItinerary.length !== prev.length ||
            alignedItinerary.length !== targetLen
              ? alignedItinerary
              : prev;
          alignedForRequest = next;
          return next;
        });
      });
      const nDays = alignedForRequest.length;
      if (targetDay < 1 || targetDay > nDays) {
        return;
      }
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
      const lockedStopTitles =
        nDays > 1
          ? collectLockedStopTitlesForDay(alignedForRequest, targetDay)
          : [];
      setCreateRouteError(null);
      setRouteGenPaceForRunMs(routeGenPaceMsRef.current);
      routeGenT0Ref.current = performance.now();
      setRouteGenEpoch((e) => e + 1);
      setCreateRouteLoading(true);
      setRestOfDaysLoading(false);
      try {
        let res: Response;
        try {
          res = await fetch("/api/trip/day-leisure-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: destinationForTrip,
            startAddress: startForRequest,
            budget: tripData.budget,
            travelers: tripData.travelers,
            titleHint,
            lockedStopTitles,
            dayInTrip:
              nDays > 1
                ? { current: targetDay, total: nDays }
                : undefined,
          }),
          });
        } catch {
          setCreateRouteError(
            "Не удалось связаться с сервером. Проверьте сеть и что приложение запущено."
          );
          return;
        }
        const rawText = await res.text();
        let data: unknown = {};
        if (rawText.trim()) {
          try {
            data = JSON.parse(rawText) as unknown;
          } catch {
            setCreateRouteError(
              !res.ok
                ? res.status === 504
                  ? "Таймаут сервера (504): генерация не уложилась в лимит времени хостинга. Повторите попытку. На Vercel Hobby лимит ~10 с; на Pro можно задать больший maxDuration для функции."
                  : `Сервер недоступен или вернул не JSON (код ${res.status}). Проверьте сеть и ключи API.`
                : "Некорректный ответ сервера при генерации маршрута"
            );
            return;
          }
        }
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
        setItineraryDaysAndParent((prev) => {
          const p1 = prev.find((d) => d.day === 1);
          return prev.map((d) => {
            if (d.day !== targetDay) {
              return d;
            }
            return {
              ...d,
              routeGenerated: true,
              title: dayTitle,
              routeStops: stops,
              routeStartPoint:
                startPoint ?? p1?.routeStartPoint ?? d.routeStartPoint,
              items: [] as string[],
            };
          });
        });
        if (nDays > 1 && targetDay === 1) {
          setSelectedDay(1);
        }
        setMapRouteFocus(null);
        {
          const legMs = Math.max(
            1,
            Math.round(performance.now() - routeGenT0Ref.current)
          );
          routeGenPaceMsRef.current = Math.round(
            0.4 * legMs + 0.6 * routeGenPaceMsRef.current
          );
          skipCreateLoadingInFinally.current = true;
          setTimeout(() => {
            setCreateRouteLoading(false);
            skipCreateLoadingInFinally.current = false;
          }, 0);
        }
      } finally {
        if (!skipCreateLoadingInFinally.current) {
          setCreateRouteLoading(false);
        }
        setRestOfDaysLoading(false);
      }
    },
    [
      itineraryDays,
      startAddressForApi,
      destinationForTrip,
      tripData.budget,
      tripData.durationDays,
      tripData.travelers,
      setItineraryDaysAndParent,
    ]
  );

  const createLeisureRoute = useCallback(
    async (regenerateHint?: string, startAddressOverride?: string) => {
      const targetN = dayCountForItinerary(
        itineraryDays.length > 0
          ? itineraryDays.length
          : tripData.durationDays
      );
      const nDays = resizeItineraryDays(
        itineraryDays,
        targetN
      ).length;
      const targetDay = nDays > 1 ? 1 : selectedDay;
      await generateItineraryDay({
        targetDay,
        titleHint: regenerateHint,
        startAddressOverride,
      });
    },
    [
      itineraryDays,
      tripData.durationDays,
      selectedDay,
      generateItineraryDay,
    ]
  );

  type ConfirmRouteStartOpts = {
    startPoint?: { lat: number; lon: number };
    /** После явного геокода по кнопке «Найти» */
    bypassGeocodeReady?: boolean;
  };

  const confirmStartAndCreateRoute = useCallback(
    (opts?: ConfirmRouteStartOpts) => {
      const t = toDisplayAddress(editingStartAddress);
      if (!t) return;
      const previewActive = showStartLocationForm || isEditingStart;

      let startPt: { lat: number; lon: number } | undefined;
      if (previewActive) {
        startPt =
          opts?.startPoint ??
          (draftCoordsForMap
            ? { lat: draftCoordsForMap.lat, lon: draftCoordsForMap.lon }
            : undefined);
        if (!startPt) return;
        if (opts?.bypassGeocodeReady !== true) return;
      }

      setIsEditingStart(false);
      setCreateRouteError(null);
      setItineraryDaysAndParent((prev) =>
        prev.map((d) => ({
          ...d,
          routeStartAddress: t,
          routeStartPoint: startPt,
          routeStops: undefined,
          routeGenerated: false,
          items: [] as string[],
        }))
      );
      void createLeisureRoute(undefined, t);
    },
    [
      editingStartAddress,
      setItineraryDaysAndParent,
      createLeisureRoute,
      showStartLocationForm,
      isEditingStart,
      draftCoordsForMap,
    ]
  );

  const commitResolvedStartAndCreateRoute = useCallback(() => {
    if (!draftCoordsForMap) return;
    confirmStartAndCreateRoute({
      startPoint: {
        lat: draftCoordsForMap.lat,
        lon: draftCoordsForMap.lon,
      },
      bypassGeocodeReady: true,
    });
  }, [draftCoordsForMap, confirmStartAndCreateRoute]);

  const handleFindStartAddressClick = useCallback(async () => {
    const raw = editingStartAddress.trim();
    if (
      raw.length < MIN_START_ADDR_FOR_GEOCODE ||
      createRouteLoading
    ) {
      return;
    }

    findGeocodeAbortRef.current?.abort();
    const ac = new AbortController();
    findGeocodeAbortRef.current = ac;

    setDebouncedAddressSuggestQ(raw);

    setDraftAddressGeocodePending(true);
    setDraftAddressGeocodeError(null);

    const city = destinationForTrip.trim();
    const params = new URLSearchParams({ address: raw });
    if (city) params.set("city", city);

    try {
      const res = await fetch(`/api/geocode-address?${params}`, {
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      setDraftAddressGeocodePending(false);

      if (!res.ok) {
        // #region agent log
        fetch("http://127.0.0.1:7309/ingest/3c435b79-d272-402e-8d24-69544295a40d", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "7214e4",
          },
          body: JSON.stringify({
            sessionId: "7214e4",
            location: "Dashboard.tsx:handleFindStartAddressClick",
            message: "geocode HTTP not ok",
            data: { status: res.status, rawLen: raw.length },
            timestamp: Date.now(),
            hypothesisId: "E",
          }),
        }).catch(() => {});
        // #endregion
        setDraftResolvedCoords(null);
        setDraftResolvedForQuery(raw);
        setDraftAddressGeocodeError("Адрес не найден");
        return;
      }
      const d = (await res.json()) as { lat: number; lon: number };
      if (ac.signal.aborted) return;
      // #region agent log
      fetch("http://127.0.0.1:7309/ingest/3c435b79-d272-402e-8d24-69544295a40d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "7214e4",
        },
        body: JSON.stringify({
          sessionId: "7214e4",
          location: "Dashboard.tsx:handleFindStartAddressClick",
          message: "geocode OK before setState",
          data: {
            lat: d.lat,
            lon: d.lon,
            showStartLocationForm,
            rawLen: raw.length,
          },
          timestamp: Date.now(),
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion
      setDraftResolvedCoords({ lat: d.lat, lon: d.lon });
      setDraftResolvedForQuery(raw);
      setDraftAddressGeocodeError(null);
      if (showStartLocationForm) {
        confirmStartAndCreateRoute({
          startPoint: { lat: d.lat, lon: d.lon },
          bypassGeocodeReady: true,
        });
      }
    } catch {
      if (ac.signal.aborted) return;
      // #region agent log
      fetch("http://127.0.0.1:7309/ingest/3c435b79-d272-402e-8d24-69544295a40d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "7214e4",
        },
        body: JSON.stringify({
          sessionId: "7214e4",
          location: "Dashboard.tsx:handleFindStartAddressClick",
          message: "geocode catch",
          data: { rawLen: raw.length },
          timestamp: Date.now(),
          hypothesisId: "E",
        }),
      }).catch(() => {});
      // #endregion
      setDraftAddressGeocodePending(false);
      setDraftResolvedCoords(null);
      setDraftResolvedForQuery(raw);
      setDraftAddressGeocodeError("Адрес не найден");
    }
  }, [editingStartAddress, createRouteLoading, destinationForTrip, showStartLocationForm, confirmStartAndCreateRoute]);

  const findButtonDisabled =
    createRouteLoading ||
    draftAddressGeocodePending ||
    editingStartAddress.trim().length < MIN_START_ADDR_FOR_GEOCODE;

  const cancelInlineStartEdit = useCallback(() => {
    setIsEditingStart(false);
    setEditingStartAddress(resolvedRouteStartRaw ?? "");
    setMapRouteFocus(null);
    setAddressSuggestOpen(false);
  }, [resolvedRouteStartRaw]);

  const handleStartAddressBlur = useCallback(() => {
    window.setTimeout(() => setAddressSuggestOpen(false), 180);
  }, []);

  const handleStartAddressFocus = useCallback(() => {
    setAddressSuggestOpen(true);
  }, []);

  const pickAddressSuggestion = useCallback((label: string) => {
    setEditingStartAddress(label);
    setDebouncedAddressSuggestQ(label);
    setAddressSuggestItems([]);
    setAddressSuggestOpen(false);
  }, []);

  const renderAddressSuggestDropdown = () =>
    addressSuggestOpen &&
    startAddressPreviewActive &&
    (addressSuggestLoading ||
      addressSuggestItems.length > 0) ? (
      <ul
        role="listbox"
        aria-label="Подсказки адреса"
        className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      >
        {addressSuggestLoading ? (
          <li className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            Поиск адресов…
          </li>
        ) : null}
        {!addressSuggestLoading
          ? addressSuggestItems.map((s, i) => (
              <li key={`${i}:${s.label.slice(0, 48)}`}>
                <button
                  type="button"
                  role="option"
                  className="w-full px-3 py-2 text-left text-xs leading-snug text-[#1a1a1a] hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickAddressSuggestion(s.label);
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))
          : null}
      </ul>
    ) : null;

  return (
    <div className="relative flex max-h-dvh min-h-dvh flex-col overflow-hidden">
      <AppPageBackdrop />

      {/* Main */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-hidden p-3 sm:p-4 md:p-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-stretch lg:gap-5">
          {/* Center: Route map area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="order-1 flex min-h-[220px] w-full min-w-0 flex-none flex-col max-h-[min(52vh,540px)] sm:max-h-[min(54vh,580px)] md:max-h-[min(56vh,640px)] lg:h-full lg:max-h-none lg:min-h-0 lg:flex-1"
          >
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              {!showStartLocationForm && showRouteOnMapInUi ? (
                <div className="mb-4">
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                    }}
                  >
                    Маршрут путешествия
                  </h2>
                </div>
              ) : null}

              {destinationCityGeocodeError ? (
                <div
                  className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {destinationCityGeocodeError}
                </div>
              ) : null}

              {showStartLocationForm ? (
                <div className="mb-3 flex w-full shrink-0 justify-center">
                  <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <form
                      autoComplete="off"
                      className="flex min-w-0 w-full overflow-hidden rounded-xl border-0 bg-transparent shadow-none"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleFindStartAddressClick();
                      }}
                    >
                      <input
                        id={`day-route-start-${selectedDay}`}
                        type="text"
                        inputMode="text"
                        value={editingStartAddress}
                        onChange={(e) =>
                          setEditingStartAddress(e.target.value)
                        }
                        onFocus={handleStartAddressFocus}
                        onBlur={handleStartAddressBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setAddressSuggestOpen(false);
                          }
                        }}
                        placeholder="Ваше местоположение в городе"
                        aria-label="Ваше местоположение в городе"
                        aria-autocomplete="list"
                        aria-expanded={addressSuggestOpen}
                        className="min-w-0 flex-1 rounded-none border-0 bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] shadow-none outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                        autoComplete="off"
                        name={`tp-route-start-main-${routeStartFieldMainId.replaceAll(
                          ":",
                          ""
                        )}`}
                      />
                      <button
                        type="submit"
                        disabled={findButtonDisabled}
                        className="flex min-h-0 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-none border-0 px-3.5 py-2.5 !bg-[#4ECDC4] !opacity-100 text-white transition enabled:hover:brightness-[1.03] disabled:cursor-not-allowed"
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                        }}
                      >
                        {createRouteLoading ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : draftAddressGeocodePending &&
                          editingStartAddress.trim() ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/90" />
                        ) : null}
                        Найти
                      </button>
                    </form>
                    {renderAddressSuggestDropdown()}
                    {startAddressPreviewActive &&
                    draftAddressGeocodeError &&
                    !draftAddressGeocodePending &&
                    editingStartAddress.trim().length >=
                      MIN_START_ADDR_FOR_GEOCODE ? (
                      <p
                        className="mt-2 px-2 text-center text-xs font-semibold text-red-600"
                        role="alert"
                      >
                        {draftAddressGeocodeError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="relative w-full min-h-[12rem] flex-1 overflow-hidden rounded-2xl border border-gray-100 md:min-h-[16rem] lg:min-h-0">
                <div className="absolute inset-0 z-0 min-h-0 min-w-0">
                  <TripMap
                    mapCenter={mapCenterForView}
                    points={
                      showStartLocationForm
                        ? previewAttractionMapPoints
                        : emptyMapPoints
                    }
                    fromLabel={departure}
                    toLabel={destinationForTrip}
                    dayRouteStartAddress={dayRouteStartForMap}
                    dayRouteStartPoint={mapRouteStartPoint}
                    dayRouteWgsPath={dayRouteWgsPath}
                    dayItineraryStops={dayItineraryStops}
                    mapRouteFocus={mapRouteFocus}
                    draftRouteStartAddress={
                      mapFoundStartCoords
                        ? mapFoundStartLabel.trim() ||
                          dayRouteStartForMap?.trim() ||
                          null
                        : startAddressPreviewActive &&
                            editingStartAddress.trim()
                          ? editingStartAddress.trim()
                          : null
                    }
                    draftResolvedStart={
                      mapFoundStartCoords
                        ? {
                            lat: mapFoundStartCoords.lat,
                            lon: mapFoundStartCoords.lon,
                          }
                        : undefined
                    }
                    draftGeocodeFailed={draftGeocodeFailedForMap}
                    onItineraryRoutePathChange={setMapItineraryPath}
                  />
                </div>
                {startAddressPreviewActive &&
                draftAddressGeocodePending &&
                editingStartAddress.trim() ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center rounded-2xl bg-white/40"
                    aria-busy
                  >
                    <Loader2
                      className="h-9 w-9 shrink-0 animate-spin text-[#4ECDC4]"
                      aria-hidden
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>

          <motion.div
            key={showStartLocationForm ? "side-attr" : "side-day"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="order-2 flex min-h-0 min-w-0 w-full flex-1 flex-col self-stretch lg:h-full"
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
            <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              {hasAnyConfirmedDayAddress && !createRouteLoading && (
                  <ItineraryDayHeaderBar
                    className="mb-3"
                    itineraryDays={itineraryDays}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    onAddDay={addDay}
                    onRemoveLast={removeLastDay}
                    showShareRoute={showRouteOnMapInUi}
                    onShareRoute={() => {
                      void copyYandexRouteUrl();
                    }}
                  />
                )}

              {(Boolean((resolvedRouteStartRaw ?? "").trim()) ||
                isEditingStart) && (
                <div className="mb-3 overflow-visible">
                  <div
                    className="flex min-w-0 flex-wrap items-stretch gap-2"
                    key="departure-row-global"
                  >
                    <div className="flex h-16 min-h-16 max-h-16 min-w-0 flex-1 items-stretch gap-2 overflow-visible rounded-lg border border-gray-100 bg-gray-50/40 p-2 transition hover:border-[#4ECDC4]/30 sm:h-14 sm:min-h-14 sm:max-h-14">
                      <span
                        className="flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full text-white shadow-sm"
                        style={{ background: "#4ECDC4" }}
                        aria-hidden
                      >
                        <MapPin
                          className="h-4 w-4 text-white"
                          strokeWidth={2.5}
                        />
                      </span>
                      {isEditingStart ? (
                        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-visible">
                          <div className="relative flex min-h-0 min-w-0 flex-1 items-center overflow-visible py-0.5">
                            <input
                              ref={departureInlineInputRef}
                              type="text"
                              inputMode="text"
                              value={editingStartAddress}
                              onChange={(e) =>
                                setEditingStartAddress(e.target.value)
                              }
                              onFocus={handleStartAddressFocus}
                              onBlur={handleStartAddressBlur}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  if (addressSuggestOpen) {
                                    e.preventDefault();
                                    setAddressSuggestOpen(false);
                                    return;
                                  }
                                  e.preventDefault();
                                  cancelInlineStartEdit();
                                }
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleFindStartAddressClick();
                                }
                              }}
                              autoComplete="off"
                              name={`tp-route-start-inline-${routeStartFieldInlineId.replaceAll(
                                ":",
                                ""
                              )}`}
                              aria-label="Адрес старта, Esc — отмена"
                              aria-autocomplete="list"
                              aria-expanded={addressSuggestOpen}
                              placeholder="Адрес"
                              className="h-8 min-h-0 w-full min-w-0 max-w-full rounded border-0 bg-white/70 px-1.5 font-sans text-sm font-normal leading-5 text-[#1a1a1a] shadow-none outline-none ring-0 transition placeholder:text-gray-400 focus:bg-white focus:ring-0 focus-visible:ring-0"
                            />
                            {renderAddressSuggestDropdown()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void handleFindStartAddressClick();
                            }}
                            disabled={findButtonDisabled}
                            className="inline-flex h-8 min-h-8 min-w-[4rem] shrink-0 items-center justify-center gap-1 self-center rounded-lg border-0 bg-[#4ECDC4] px-2 text-[10px] font-medium leading-tight text-white transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {createRouteLoading ? (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            ) : draftAddressGeocodePending &&
                              editingStartAddress.trim() ? (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            ) : null}
                            Найти
                          </button>
                          <button
                            type="button"
                            onClick={() => commitResolvedStartAndCreateRoute()}
                            disabled={
                              !draftCoordsForMap ||
                              draftAddressGeocodePending ||
                              createRouteLoading
                            }
                            className="inline-flex h-8 min-h-8 min-w-[4rem] shrink-0 items-center justify-center self-center rounded-lg border border-gray-200 bg-white px-2 text-[10px] font-medium leading-tight text-[#1a1a1a] transition enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Готово
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setMapRouteFocus({ kind: "start" });
                              }
                            }}
                            onClick={() => setMapRouteFocus({ kind: "start" })}
                            className="flex min-h-0 min-w-0 flex-1 items-center overflow-hidden py-0.5"
                            aria-label="Старт маршрута на карте"
                          >
                            <p
                              className="min-h-0 w-full truncate font-sans text-sm font-normal leading-5"
                              style={{ color: "#1a1a1a" }}
                            >
                              {toDisplayAddress(resolvedRouteStartRaw ?? "")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingStart(true);
                              setEditingStartAddress(
                                resolvedRouteStartRaw?.trim() ?? ""
                              );
                              setMapRouteFocus(null);
                            }}
                            className="inline-flex h-8 min-h-8 w-[5.4rem] min-w-[5.4rem] shrink-0 items-center justify-center self-center rounded-lg border border-gray-200 bg-white px-1.5 text-[10px] font-medium leading-tight text-[#1a1a1a] transition hover:bg-gray-50"
                          >
                            Изменить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingStart &&
                  draftAddressGeocodeError &&
                  !draftAddressGeocodePending &&
                  editingStartAddress.trim().length >=
                    MIN_START_ADDR_FOR_GEOCODE ? (
                    <p
                      className="mt-1.5 text-xs font-semibold text-red-600"
                      role="alert"
                    >
                      {draftAddressGeocodeError}
                    </p>
                  ) : null}
                </div>
              )}

              {Boolean(resolvedRouteStartRaw?.trim()) &&
                !isEditingStart &&
                canShowCreateRouteButton &&
                (itineraryDays.length === 1 ||
                  Boolean(resolvedRouteStartRaw?.trim())) &&
                !(createRouteLoading && !restOfDaysLoading) && (
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        void createLeisureRoute();
                      }}
                      disabled={createRouteLoading || restOfDaysLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4ECDC4] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45c2b9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createRouteLoading || restOfDaysLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : null}
                      Создать маршрут
                    </button>
                  </div>
                )}

              {Boolean(resolvedRouteStartRaw?.trim()) &&
                !isEditingStart &&
                !canShowCreateRouteButton &&
                itineraryDays.length > 1 &&
                !currentDayPlan.routeGenerated &&
                !(createRouteLoading && !restOfDaysLoading) && (
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        void generateItineraryDay({ targetDay: selectedDay });
                      }}
                      disabled={createRouteLoading || restOfDaysLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4ECDC4] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45c2b9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createRouteLoading || restOfDaysLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : null}
                      Создать
                    </button>
                  </div>
                )}

              {createRouteError ? (
                <p className="mb-2 text-xs text-red-500">{createRouteError}</p>
              ) : null}

              {createRouteLoading &&
                !restOfDaysLoading &&
                hasAnyConfirmedDayAddress && (
                  <div className="flex min-h-[12rem] w-full min-w-0 flex-1 flex-col self-stretch">
                    <RouteGenerationWalkLoader
                      key={routeGenEpoch}
                      active={createRouteLoading}
                      startTime={routeGenT0Ref.current}
                      paceDurationMs={routeGenPaceForRunMs}
                    />
                  </div>
                )}

              {currentDayPlan.routeGenerated &&
                (currentDayPlan.routeStops?.length ?? 0) > 0 && (
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto [scrollbar-gutter:stable] pr-3">
                  {sortedRouteStopsForDialog.map((stop, idx) => {
                      const listIndex = idx + 1;
                      return (
                        <div
                          key={stop.id}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDayStopsInitialStopId(stop.id);
                              setDayStopsDetailOpen(true);
                            }
                          }}
                          onClick={() => {
                            setDayStopsInitialStopId(stop.id);
                            setDayStopsDetailOpen(true);
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
                                responsiveSizes="96px"
                              />
                            </div>
                            <span
                              className="absolute left-0 top-0 z-20 flex h-7 min-w-[1.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums leading-none text-white shadow-md ring-2 ring-white whitespace-nowrap"
                              style={{ background: "#4ECDC4" }}
                              aria-label={`Пункт ${listIndex} маршрута`}
                            >
                              {listIndex}
                            </span>
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-3.5">
                            <p
                              className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug"
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
                              <span
                                className="shrink-0 font-medium"
                                style={{ color: "#1a1a1a" }}
                              >
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
                      );
                    })}
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
                )}
            </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
