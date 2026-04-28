const NOMINATIM_UA = "TravelPlanner/1.0 (server geocode; contact: support)";

type GeoPoint = { lat: number; lon: number };

const parseSearchMapsFirstFeaturePoint = (data: unknown): GeoPoint | null => {
  const fc = data as {
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };
  const c = fc.features?.[0]?.geometry?.coordinates;
  if (!c || c.length < 2) return null;
  const [lon, lat] = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
};

/**
 * [Search API](https://yandex.com/maps-api/docs/search-api/request.html) — положение объекта на карте
 * (топоним / организация), обычно ближе к «реальному» POI, чем один шаг Geocoder.
 */
export const yandexSearchMapsText = async (
  text: string,
  apiKey: string,
  type?: "geo" | "biz"
): Promise<GeoPoint | null> => {
  const q = text.trim();
  if (!q || !apiKey.trim()) return null;
  const url = new URL("https://search-maps.yandex.ru/v1/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("text", q);
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "1");
  if (type) {
    url.searchParams.set("type", type);
  }
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return parseSearchMapsFirstFeaturePoint(data);
  } catch {
    return null;
  }
};

/**
 * HTTP Geocoder 1.x (тот же ключ, что и у JS API), только на сервере.
 * В [кабинете](https://developer.tech.yandex.ru) у ключа должен быть включён **HTTP Geocoder**,
 * иначе `403` / пустой ответ.
 */
export const yandexGeocodeToLatLon = async (
  address: string,
  apiKey: string
): Promise<GeoPoint | null> => {
  const q = address.trim();
  if (!q || !apiKey.trim()) return null;
  const url = new URL("https://geocode-maps.yandex.ru/v1/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("geocode", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "1");
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const pos = (
      data as {
        response?: {
          GeoObjectCollection?: { featureMember?: { GeoObject?: { Point?: { pos?: string } } }[] };
        };
      }
    )?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
    if (!pos || typeof pos !== "string") return null;
    const [lon, lat] = pos.split(" ").map((x) => parseFloat(x));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
};

/** Резерв без API-ключей, если OpenStreetMap знает адрес (см. политику: умеренные запросы, User-Agent). */
export const nominatimGeocodeToLatLon = async (
  address: string
): Promise<GeoPoint | null> => {
  const q = address.trim();
  if (!q) return null;
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", q);
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "1");
  try {
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length < 1) return null;
    const row = data[0] as { lat?: string; lon?: string };
    const lat = parseFloat(String(row.lat ?? ""));
    const lon = parseFloat(String(row.lon ?? ""));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
};

/**
 * Только HTTP Geocoder Яндекса (тот же `apikey`, что и для JS API; в кабинете — пакет Geocoder).
 */
export const yandexGeocodeQueriesOnly = async (
  queries: readonly string[],
  apiKey: string
): Promise<GeoPoint | null> => {
  for (const q of queries) {
    const t = q.trim();
    if (!t) continue;
    const g = await yandexGeocodeToLatLon(t, apiKey);
    if (g) return g;
  }
  return null;
};

/**
 * Стартовый адрес: Yandex **Search** (часто хватает без пакета HTTP Geocoder) → HTTP Geocoder → Nominatim.
 */
export const yandexGeocodeFirstMatch = async (
  queries: readonly string[],
  apiKey: string
): Promise<GeoPoint | null> => {
  if (apiKey.trim()) {
    for (const q of queries) {
      const t = q.trim();
      if (!t) continue;
      const s =
        (await yandexSearchMapsText(t, apiKey, "geo")) ??
        (await yandexSearchMapsText(t, apiKey, "biz")) ??
        (await yandexSearchMapsText(t, apiKey)) ??
        null;
      if (s) return s;
    }
  }
  const y = await yandexGeocodeQueriesOnly(queries, apiKey);
  if (y) return y;
  for (const q of queries) {
    const t = q.trim();
    if (!t) continue;
    const g = await nominatimGeocodeToLatLon(t);
    if (g) return g;
  }
  return null;
};

/**
 * Старт маршрута на карте: только Яндекс (Search / HTTP Geocoder) и Nominatim внутри `yandexGeocodeFirstMatch` — без Google.
 */
export const geocodeStartAddressFirstMatch = async (
  queries: readonly string[],
  yandexKey: string
): Promise<GeoPoint | null> => yandexGeocodeFirstMatch(queries, yandexKey);

const uniqueLines = (lines: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of lines) {
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

/**
 * Ориентиры на карте: сначала **Search API** (как в картах: объект/организация), затем HTTP Geocoder.
 * В кабинете Yandex к ключу должны быть подключены **Search** и **Geocoder** (по тарифу).
 */
export const geocodePoiInCity = async (
  placeTitle: string,
  city: string,
  yandexKey: string
): Promise<GeoPoint | null> => {
  const t = placeTitle.trim();
  const c = city.trim();
  if (!t) return null;
  const forSearch = uniqueLines(
    c
      ? [`${t}, ${c}`, `${c}, ${t}`, `${t} ${c}`, `${c} ${t}`]
      : [t]
  );
  const forGeocoder = uniqueLines(
    c ? [`${t}, ${c}`, `${c}, ${t}`, `${t} ${c}`, t, c] : [t]
  );

  for (const line of forSearch) {
    const g = await yandexSearchMapsText(line, yandexKey, "geo");
    if (g) return g;
  }
  for (const line of forSearch) {
    const b = await yandexSearchMapsText(line, yandexKey, "biz");
    if (b) return b;
  }
  for (const line of forSearch) {
    const a = await yandexSearchMapsText(line, yandexKey);
    if (a) return a;
  }
  return yandexGeocodeQueriesOnly(forGeocoder, yandexKey);
};

/** Старший вызов Search + `«название, город»` — только Яндекс, без доверия к координатам из ИИ. */
export const geocodeOneStopYandexOnly = async (
  placeTitle: string,
  city: string,
  yandexKey: string
): Promise<GeoPoint | null> => {
  const g1 = await geocodePoiInCity(placeTitle, city, yandexKey);
  if (g1) return g1;
  const t = placeTitle.trim();
  const c = city.trim();
  if (!t || !c) return null;
  if (!yandexKey.trim()) return null;
  return (
    (await yandexSearchMapsText(`${t}, ${c}`, yandexKey, "geo")) ??
    (await yandexSearchMapsText(`${t}, ${c}`, yandexKey)) ??
    null
  );
};

const buildMoscowRedSquareHeuristic = (t: string, c: string): boolean =>
  c.length > 0 &&
  /моск|moscow|мск|moskva|moskau/i.test(c) &&
  /красн/i.test(t) &&
  /площад/i.test(t);

const tryYandexPoiForRouteMap = async (
  t: string,
  c: string,
  yandexKey: string,
  moscowRed: boolean
): Promise<GeoPoint | null> => {
  if (yandexKey.trim()) {
    const y1 = await geocodeOneStopYandexOnly(t, c, yandexKey);
    if (y1) {
      return y1;
    }
  }
  if (yandexKey.trim()) {
    const yandexMore = c
      ? uniqueLines([
          `${t} ${c}`,
          `${c} ${t}`,
          `${t} — ${c}`,
          `${c}. ${t}`,
          ...(moscowRed
            ? [
                "Red Square, Moscow, Russia",
                "Красная площадь, Москва, Россия",
                "Red Square, Moscow, Russian Federation",
              ]
            : []),
        ])
      : [t];
    for (const line of yandexMore) {
      const g =
        (await yandexSearchMapsText(line, yandexKey, "geo")) ??
        (await yandexSearchMapsText(line, yandexKey, "biz")) ??
        (await yandexSearchMapsText(line, yandexKey)) ??
        (await yandexGeocodeToLatLon(line, yandexKey));
      if (g) {
        return g;
      }
    }
  }
  return null;
};

const tryNominatimPoiForRoute = async (
  t: string,
  c: string,
  moscowRed: boolean
): Promise<GeoPoint | null> => {
  const nomLines = c
    ? uniqueLines([
        `${t}, ${c}`,
        `${t}, ${c}, Россия`,
        `${t}, ${c}, Russia`,
        `${c}, ${t}, Россия`,
        `${c}, ${t}, Russia`,
        ...(moscowRed
          ? [
              "Red Square, Moscow, Russia",
              "Красная площадь, Москва, Россия",
            ]
          : []),
      ])
    : uniqueLines([t, `${t}, Russia`]);
  for (const line of nomLines) {
    const n = await nominatimGeocodeToLatLon(line);
    if (n) {
      return n;
    }
  }
  return null;
};

/**
 * Координаты для **отрисовки маршрута**: только **Яндекс** (и резерв Nominatim). Координаты из ИИ не учитываются.
 */
export const geocodeOneStopForRouteMap = async (
  placeTitle: string,
  city: string,
  yandexKey: string
): Promise<GeoPoint | null> => {
  const t = placeTitle.trim();
  const c = city.trim();
  if (!t) {
    return null;
  }
  const moscowRed = buildMoscowRedSquareHeuristic(t, c);
  const yY = await tryYandexPoiForRouteMap(t, c, yandexKey, moscowRed);
  if (yY) {
    return yY;
  }
  return tryNominatimPoiForRoute(t, c, moscowRed);
};

/** Центр для города — Яндекс, затем Nominatim (тот же ключ, что ref для fallback-точек). */
export const refPointNearCity = async (
  city: string,
  yandexKey: string
): Promise<GeoPoint | null> => {
  const c = city.trim();
  if (!c) return null;
  if (yandexKey.trim()) {
    const y =
      (await yandexSearchMapsText(c, yandexKey, "geo")) ??
      (await yandexSearchMapsText(c, yandexKey)) ??
      (await yandexGeocodeToLatLon(c, yandexKey)) ??
      null;
    if (y) return y;
  }
  return (
    (await nominatimGeocodeToLatLon(c)) ??
    (await nominatimGeocodeToLatLon(`${c}, Россия`)) ??
    (await nominatimGeocodeToLatLon(`${c}, Europe`)) ??
    null
  );
};

/**
 * Сохраняет `title` и остальные поля, **lat/lon** **не** из ИИ: Яндекс → Nominatim → точка вокруг центра города
 * (чтобы маршрут всегда строился и пины не сливались в одну клетку).
 */
export const resolveStopsWithGeocodedCoords = async <
  T extends { title: string; lat: number; lon: number }
>(
  stops: T[],
  city: string,
  yandexKey: string
): Promise<T[]> => {
  let cityRef: GeoPoint | null | undefined;
  const getRef = async (): Promise<GeoPoint | null> => {
    if (cityRef !== undefined) return cityRef;
    cityRef = await refPointNearCity(city, yandexKey);
    return cityRef;
  };

  return Promise.all(
    stops.map(async (s, idx) => {
      let g = await geocodeOneStopForRouteMap(s.title, city, yandexKey);
      if (!g) {
        const r = await getRef();
        if (r) {
          const a = 0.008;
          g = {
            lat: r.lat + Math.sin((idx + 1) * 1.7) * a,
            lon: r.lon + Math.cos((idx + 1) * 1.7) * a,
          };
        } else {
          const n =
            (await nominatimGeocodeToLatLon(city)) ??
            (await nominatimGeocodeToLatLon(`${s.title} ${city}`)) ??
            (await nominatimGeocodeToLatLon(`${city}, Europe`));
          if (n && (n.lat !== 0 || n.lon !== 0)) {
            const a = 0.01;
            g = {
              lat: n.lat + Math.sin((idx + 1) * 1.7) * a,
              lon: n.lon + Math.cos((idx + 1) * 1.7) * a,
            };
          } else {
            g = { lat: 0, lon: 0 };
          }
        }
      }
      return { ...s, lat: g.lat, lon: g.lon };
    })
  );
};
