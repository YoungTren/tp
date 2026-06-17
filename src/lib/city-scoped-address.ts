type LatLon = { lat: number; lon: number };

type NominatimAddressFields = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
};

export const normalizePlaceToken = (s: string): string =>
  s.trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");

const uniqueLines = (lines: readonly string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of lines) {
    const t = x.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
};

/** Запросы геокодера: адрес всегда с контекстом города (без «голого» адреса). */
export const buildCityScopedAddressQueries = (
  address: string,
  city: string
): string[] => {
  const a = address.trim();
  const c = city.trim();
  if (!a) return [];
  if (!c) return [a];
  return uniqueLines([
    `${a}, ${c}`,
    `${c}, ${a}`,
    `${a} ${c}`,
    `${c} ${a}`,
  ]);
};

export const nominatimResultMatchesCity = (
  row: { display_name?: string; address?: NominatimAddressFields },
  city: string
): boolean => {
  const c = normalizePlaceToken(city);
  if (!c) return true;

  const addr = row.address;
  if (addr) {
    const localityFields = [
      addr.city,
      addr.town,
      addr.village,
      addr.municipality,
      addr.hamlet,
    ];
    for (const field of localityFields) {
      if (!field) continue;
      const t = normalizePlaceToken(field);
      if (t === c || t.includes(c) || c.includes(t)) return true;
    }
  }

  const display = normalizePlaceToken(row.display_name ?? "");
  return display.includes(c);
};

export const haversineKm = (a: LatLon, b: LatLon): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Nominatim viewbox: left, top, right, bottom (lon/lat). */
export const nominatimViewboxForCenter = (
  lat: number,
  lon: number,
  deltaDeg = 0.12
): { viewbox: string; bounded: "1" } => ({
  viewbox: `${lon - deltaDeg},${lat + deltaDeg},${lon + deltaDeg},${lat - deltaDeg}`,
  bounded: "1",
});
