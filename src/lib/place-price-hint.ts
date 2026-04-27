const CIS_OR_RUB_HINT = /москв|санкт|петерб|спб|казан|сочи|ростов|самар|екатерин|новосиб|калинин|тула|тамбов|челяб|нижн|рф|росси|белорус|минск|киев|одесс|харьк|львов|беларус|украин|алмат|астан|нур-сул|казах|баку|ереван|тбилис|кишин/i;

export const currencyForDestination = (to: string): "₽" | "€" =>
  CIS_OR_RUB_HINT.test(to.trim()) ? "₽" : "€";

const priceLevelToLabel = (level: number, cur: "₽" | "€"): string => {
  if (level <= 0) return "Бесплатно";
  if (cur === "€") {
    const map = ["~3–8 €", "~8–20 €", "~20–40 €", "~40+ €"];
    return map[Math.min(level, 4) - 1] ?? "~—";
  }
  const map = ["~200–600 ₽", "~600–1500 ₽", "~1500–3000 ₽", "~3000+ ₽"];
  return map[Math.min(level, 4) - 1] ?? "~—";
};

/**
 * Подтягивает `price_level` из Google Places (если есть ключ) — ориентир по «дороговизне» для туристических POI.
 */
export const fetchGooglePlacePriceHint = async (
  title: string,
  to: string,
  placesKey: string
): Promise<string | null> => {
  const key = placesKey.trim();
  if (!key) return null;
  const q = `${title} ${to}`.trim();
  if (!q) return null;
  const u = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  u.searchParams.set("query", q);
  u.searchParams.set("key", key);
  u.searchParams.set("language", "ru");
  const r = await fetch(u.toString());
  if (!r.ok) return null;
  const d: unknown = await r.json();
  const first = (d as { results?: { place_id?: string; price_level?: number }[] })
    .results?.[0];
  if (!first) return null;
  let pl = first.price_level;
  if (pl === undefined && first.place_id) {
    const u2 = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    u2.searchParams.set("place_id", first.place_id);
    u2.searchParams.set("fields", "price_level");
    u2.searchParams.set("key", key);
    u2.searchParams.set("language", "ru");
    const r2 = await fetch(u2.toString());
    if (!r2.ok) return null;
    const d2: unknown = await r2.json();
    pl = (d2 as { result?: { price_level?: number } }).result?.price_level;
  }
  if (pl == null) return null;
  return priceLevelToLabel(pl, currencyForDestination(to));
};

const looksLikeWeakCost = (s: string): boolean => {
  const n = s.trim();
  if (!n) return true;
  if (n === "~— ₽" || n === "~— €") return true;
  if (/^бесплатно$/i.test(n)) return false;
  if (/~?\s*0\s*₽/i.test(n) || /~?\s*0\s*€/i.test(n)) return true;
  if (/~?\s*[—-]+\s*₽?\s*$/i.test(n) && !/\d/.test(n)) return true;
  return false;
};

/** Оставляем ответ модели, если он конкретный; иначе подставляем эвристику из карт. */
export const mergeEstimatedCost = (model: string, places: string | null): string => {
  const m = model.trim();
  if (places && looksLikeWeakCost(m)) {
    if (/^бесплатно$/i.test(places)) return "Бесплатно";
    return places;
  }
  return m.length > 0 ? m : places ?? "~— ₽";
};
