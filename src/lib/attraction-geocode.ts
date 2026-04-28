import { yandexSearchMapsText } from "./yandex-geocode-server";

export type AttractionGeocodeInput = { id: string; title: string };

export type AttractionGeocodeResult = {
  id: string;
  lat: number;
  lon: number;
} | { id: string; lat: null; lon: null };

/**
 * Координаты POI по той же подписи, что в карусели: «{title}, {city}» в Yandex Search.
 */
export const geocodeAttractionRows = async (
  city: string,
  rows: readonly AttractionGeocodeInput[],
  apiKey: string
): Promise<AttractionGeocodeResult[]> => {
  const k = apiKey.trim();
  if (!k) {
    return rows.map((r) => ({ id: r.id, lat: null, lon: null }));
  }
  const c = city.trim();
  return Promise.all(
    rows.map(async (r) => {
      const q = c ? `${r.title}, ${c}` : r.title;
      const p =
        (await yandexSearchMapsText(q, k, "geo")) ??
        (await yandexSearchMapsText(q, k)) ??
        null;
      if (p) {
        return { id: r.id, lat: p.lat, lon: p.lon };
      }
      return { id: r.id, lat: null, lon: null };
    })
  );
};
