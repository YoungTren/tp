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

const stripEstimatedCostDecorations = (raw: string): string => {
  let s = raw.trim();
  if (!s) return s;
  s = s.replace(/^[^:：\n]{1,80}[:：]\s*/u, "");
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  return s;
};

/** Первый фрагмент вида «12 €», «~8–20 €», «от 15 €» в строке (в т.ч. внутри пояснения). */
const extractPriceToken = (s: string): string | null => {
  const t = s.replace(/\s+/g, " ");
  const m = t.match(
    /(?:от\s+)?~?\s*[\d\s,\u2013\u2014.]+(?:\s*[\u2013\u2014-]\s*[\d\s,\u2013\u2014.]+)?\s*(?:€|₽)(?:\s*\+)?/iu
  );
  return m?.[0]?.trim() ?? null;
};

const isFreeLabel = (s: string): boolean => {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/^бесплатно$/i.test(t)) return true;
  if (/^~0\s*€$|^0\s*€$|^~0\s*₽$|^0\s*₽$|^~0$/i.test(t)) return true;
  return false;
};

/**
 * Только сумма с валютой (€/₽) или «Бесплатно» — без пояснительного текста («входит в билет…»).
 */
export const formatEstimatedCostSumOrFree = (raw: string): string => {
  const stripped = stripEstimatedCostDecorations(raw);
  let s = stripped.replace(/\s+/g, " ").trim();
  if (!s) return "~—";
  if (isFreeLabel(s)) return "Бесплатно";
  if (/^бесплатно$/i.test(s)) return "Бесплатно";

  const token = extractPriceToken(s);
  if (token) {
    return token.replace(/\s+/g, " ").trim();
  }

  const compact = /^~?\s*[\d,.\s]+(?:\s*[\u2013\u2014-]\s*[\d,.\s]+)?\s*(?:€|₽)(?:\s*\+)?\s*$/iu;
  if (compact.test(s)) {
    return s.trim();
  }

  if (!/[€₽]/.test(s) && /бесплат|без\s*оплат|вход\s*свободн/i.test(s)) {
    return "Бесплатно";
  }

  return "~—";
};

/** @deprecated Используйте formatEstimatedCostSumOrFree; оставлено для совместимости импортов. */
export const normalizeEstimatedCost = (raw: string): string =>
  formatEstimatedCostSumOrFree(raw);

const looksLikeWeakCost = (s: string): boolean => {
  const n = s.trim();
  if (!n) return true;
  if (n === "~—" || n === "~— ₽" || n === "~— €") return true;
  if (/^бесплатно$/i.test(n)) return false;
  if (/^~0\s*€$|^0\s*€$|^~0\s*₽$|^0\s*₽$/i.test(n)) return true;
  if (/~?\s*0\s*₽/i.test(n) || /~?\s*0\s*€/i.test(n)) return true;
  if (/~?\s*[—-]+\s*₽?\s*$/i.test(n) && !/\d/.test(n)) return true;
  return false;
};

/** Оставляем ответ модели, если он конкретный; иначе подставляем эвристику из карт. */
export const mergeEstimatedCost = (model: string, places: string | null): string => {
  const m = formatEstimatedCostSumOrFree(model.trim());
  if (places && looksLikeWeakCost(m)) {
    const p = formatEstimatedCostSumOrFree(places);
    if (p === "Бесплатно" || /^бесплатно$/u.test(p)) return "Бесплатно";
    return p;
  }
  if (m.length > 0 && m !== "~—") {
    return m;
  }
  return formatEstimatedCostSumOrFree(places ?? "") || "~— ₽";
};
