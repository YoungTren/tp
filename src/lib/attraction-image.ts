/**
 * Картинки для карточек: Google CSE (image) → Google Places (фото места) → Picsum.
 */

const isLikelyImageUrl = (u: string): boolean => {
  try {
    const p = new URL(u).pathname.toLowerCase();
    if (p.includes(".svg")) return false;
  } catch {
    return false;
  }
  return true;
};

type CseItem = { link?: string; image?: { thumbnailLink?: string; contextLink?: string } };

const parseCse = (data: unknown): { items?: CseItem[]; error?: { message: string } } | null => {
  if (typeof data !== "object" || data === null) return null;
  return data as { items?: CseItem[]; error?: { message: string } };
};

const cseRequest = async (q: string, usePhoto: boolean, google: { apiKey: string; cseId: string }): Promise<string | null> => {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", google.apiKey);
  url.searchParams.set("cx", google.cseId);
  url.searchParams.set("q", q);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "8");
  if (usePhoto) {
    url.searchParams.set("imgType", "photo");
  }
  url.searchParams.set("imgSize", "large");
  url.searchParams.set("safe", "active");
  const res = await fetch(url.toString());
  const data: unknown = await res.json();
  if (!res.ok) return null;
  const p = parseCse(data);
  if (p?.error) return null;
  const items = p?.items;
  if (!items?.length) return null;
  for (const it of items) {
    const c =
      (it.image?.thumbnailLink && isLikelyImageUrl(it.image.thumbnailLink) ? it.image.thumbnailLink : null) ||
      (it.link && isLikelyImageUrl(it.link) ? it.link : null);
    if (c) return c;
  }
  return null;
};

export const fetchGoogleCseImage = async (q: string, google: { apiKey: string; cseId: string }): Promise<string | null> => {
  return (await cseRequest(q, true, google)) ?? (await cseRequest(q, false, google));
};

/** Относительный URL прокси — ключ Google не попадает в JSON на клиенте. */
export const buildPlacePhotoProxyPath = (photoReference: string): string =>
  `/api/place-photo?r=${encodeURIComponent(photoReference)}`;

const placeDetailsFirstPhoto = async (placeId: string, key: string): Promise<string | null> => {
  const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  u.searchParams.set("place_id", placeId);
  u.searchParams.set("fields", "photos");
  u.searchParams.set("key", key);
  u.searchParams.set("language", "ru");
  const r = await fetch(u.toString());
  const d: unknown = await r.json();
  const st = (d as { status?: string }).status;
  if (st !== "OK") return null;
  return (d as { result?: { photos?: { photo_reference: string }[] } }).result?.photos?.[0]?.photo_reference ?? null;
};

const textSearchForPhoto = async (query: string, key: string): Promise<string | null> => {
  const u = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  u.searchParams.set("query", query);
  u.searchParams.set("key", key);
  u.searchParams.set("language", "ru");
  const r = await fetch(u.toString());
  const d: unknown = await r.json();
  const status = (d as { status?: string }).status;
  if (status !== "OK" && status !== "ZERO_RESULTS") return null;
  const results = (d as { results?: { place_id: string; photos?: { photo_reference: string }[] }[] }).results ?? [];
  for (const res of results) {
    const fromTs = res.photos?.[0]?.photo_reference;
    if (fromTs) return fromTs;
    if (res.place_id) {
      const fromD = await placeDetailsFirstPhoto(res.place_id, key);
      if (fromD) return fromD;
    }
  }
  return null;
};

const fetchGooglePlacesImage = async (title: string, place: string, placesKey: string): Promise<string | null> => {
  const queries = [`${title} ${place}`, title, `${title} near ${place}`];
  for (const q of queries) {
    const ref = await textSearchForPhoto(q, placesKey);
    if (ref) return buildPlacePhotoProxyPath(ref);
  }
  return null;
};

export const resolveAttractionImageUrl = async (params: {
  title: string;
  to: string;
  google: { apiKey: string; cseId: string };
  placesApiKey: string;
}): Promise<string> => {
  const { title, to, google, placesApiKey } = params;
  const p = to.trim() || "travel";
  const googleQueries = [
    `${title} ${p} photo`,
    `${title} ${p} landmark`,
    `${title} ${p} фото`,
  ];

  for (const q of googleQueries) {
    const g = await fetchGoogleCseImage(q, google);
    if (g) return g;
  }

  const places = await fetchGooglePlacesImage(title, p, placesApiKey);
  if (places) return places;

  const seed = `${title}-${p}`.replace(/[^\w-]+/g, "-").slice(0, 80) || "place";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`;
};
