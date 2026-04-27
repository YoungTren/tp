/**
 * Координаты гастроточек: Google (Places/Geocoding) → пины на Yandex map по тем же lat/lon.
 */

export type Wgs84 = { lat: number; lon: number };

const textSearchFirst = async (query: string, key: string): Promise<Wgs84 | null> => {
  const t = query.trim();
  if (!t || !key.trim()) return null;
  const u = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  u.searchParams.set("query", t);
  u.searchParams.set("key", key);
  u.searchParams.set("language", "ru");
  const r = await fetch(u.toString());
  const d: unknown = await r.json();
  const st = (d as { status?: string }).status;
  if (st !== "OK") return null;
  const loc = (d as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] })
    .results?.[0]?.geometry?.location;
  if (loc == null) return null;
  const { lat, lng } = loc;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lon: lng };
};

const geocodeAddress = async (address: string, key: string): Promise<Wgs84 | null> => {
  const t = address.trim();
  if (!t || !key.trim()) return null;
  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("address", t);
  u.searchParams.set("key", key);
  u.searchParams.set("language", "ru");
  const r = await fetch(u.toString());
  const d: unknown = await r.json();
  const st = (d as { status?: string }).status;
  if (st !== "OK") return null;
  const loc = (d as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] })
    .results?.[0]?.geometry?.location;
  if (loc == null) return null;
  const { lat, lng } = loc;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lon: lng };
};

/**
 * Сначала Places (лучше для «название + город»), затем Geocoding — по тому же списку запросов, что Yandex-фоллбек.
 */
export const googleGeocodeFoodStopFirstMatch = async (
  queries: readonly string[],
  placesKey: string
): Promise<Wgs84 | null> => {
  for (const q of queries) {
    const p = await textSearchFirst(q, placesKey);
    if (p) return p;
  }
  for (const q of queries) {
    const g = await geocodeAddress(q, placesKey);
    if (g) return g;
  }
  return null;
};
