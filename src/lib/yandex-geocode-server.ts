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
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data: unknown = await res.json();
  return parseSearchMapsFirstFeaturePoint(data);
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

/** Сначала Яндекс по всем вариантам строки, затем Nominatim (для стартового адреса и пр. fallback). */
export const yandexGeocodeFirstMatch = async (
  queries: readonly string[],
  apiKey: string
): Promise<GeoPoint | null> => {
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
  const forSearch = uniqueLines(c ? [`${t}, ${c}`, `${c}, ${t}`] : [t]);
  const forGeocoder = uniqueLines(
    c ? [`${t}, ${c}`, `${c}, ${t}`, t, c] : [t]
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

/** Подмена lat/lon в остановках плана на координаты геокодера (модель часто даёт неточные WGS). */
export const resolveStopsWithGeocodedCoords = async <
  T extends { title: string; lat: number; lon: number }
>(
  stops: T[],
  city: string,
  yandexKey: string
): Promise<T[]> =>
  Promise.all(
    stops.map(async (s) => {
      const g = await geocodePoiInCity(s.title, city, yandexKey);
      return g ? { ...s, lat: g.lat, lon: g.lon } : s;
    })
  );
