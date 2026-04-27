import { distanceMetersWgs } from "./geo-distance";
import type { DayLeisureModelStop } from "./day-leisure-schema";

const wgs = (s: { lat: number; lon: number }): { lat: number; lon: number } => ({
  lat: s.lat,
  lon: s.lon,
});

/**
 * Сжимает путь: каждый следующий — ближайшая к текущему (остаток), без путешествий
 * «на другой конец города» между соседними по списку точками.
 */
const reorderTailByNearestNeighbor = (
  tail: DayLeisureModelStop[],
  from: { lat: number; lon: number }
): DayLeisureModelStop[] => {
  if (tail.length <= 1) return tail;
  const remaining: DayLeisureModelStop[] = tail.slice();
  const res: DayLeisureModelStop[] = [];
  let pos = wgs(from);
  while (remaining.length > 0) {
    let bestJ = 0;
    let bestD = Number.POSITIVE_INFINITY;
    for (let j = 0; j < remaining.length; j += 1) {
      const c = distanceMetersWgs(pos, wgs(remaining[j]!));
      if (c < bestD) {
        bestD = c;
        bestJ = j;
      }
    }
    const next = remaining.splice(bestJ, 1)[0]!;
    res.push(next);
    pos = wgs(next);
  }
  return res;
};

const FOOD_TOKENS = new Set([
  "завтрак",
  "обед",
  "ужин",
  "перекус",
  "кафе",
  "ресторан",
  "бар",
  "брунч",
  "гастрономия",
  "столовая",
  "трапеза",
  "суши",
  "суши-бар",
  "пицц",
  "кофе",
  "кулинария",
  "lunch",
  "dinner",
  "brunch",
  "breakfast",
  "cafe",
  "restaurant",
  "bar",
  "snack",
  "bistro",
  "bakery",
]);

const tokenizeCategory = (c: string): string[] =>
  c
    .trim()
    .toLowerCase()
    .split(/[\s,/|•–\-\u2013]+/u)
    .filter((t) => t.length > 0);

const isFood = (c: string): boolean => {
  const t = c.trim().toLowerCase();
  if (FOOD_TOKENS.has(t)) return true;
  for (const w of tokenizeCategory(c)) {
    if (FOOD_TOKENS.has(w)) return true;
  }
  const subs = ["кафе", "ресторан", "бар", "пицц", "суши", "gastro", "coffee"];
  return subs.some((s) => t.includes(s));
};

/** Категории, которые считаем гастро (иконка на карте, фильтр в API) */
export const isLeisureFoodCategory = (category: string): boolean =>
  isFood(category);

const pickHeadNearestToStart = (
  modelStops: DayLeisureModelStop[],
  start: { lat: number; lon: number } | null
): { head: DayLeisureModelStop; rest: DayLeisureModelStop[] } => {
  if (modelStops.length === 0) {
    throw new Error("pickHeadNearestToStart: empty");
  }
  if (
    !start ||
    !Number.isFinite(start.lat) ||
    !Number.isFinite(start.lon)
  ) {
    const h = modelStops[0]!;
    return { head: h, rest: modelStops.slice(1) };
  }
  let bestI = 0;
  let bestD = distanceMetersWgs(start, wgs(modelStops[0]!));
  for (let i = 1; i < modelStops.length; i += 1) {
    const d = distanceMetersWgs(start, wgs(modelStops[i]!));
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return {
    head: modelStops[bestI]!,
    rest: modelStops.filter((_, j) => j !== bestI),
  };
};

const edgeLen = (a: DayLeisureModelStop, b: DayLeisureModelStop): number =>
  distanceMetersWgs(wgs(a), wgs(b));

const reverseInPlace = (
  arr: DayLeisureModelStop[],
  l: number,
  r: number
): void => {
  let i = l;
  let j = r;
  while (i < j) {
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
    i += 1;
    j -= 1;
  }
};

/**
 * 2-opt по открытому пути: устраняет «перекрёсты» ломаной, укорачивает соседние
 * перегоны, сохраняя все те же остановки (только перестановка порядка).
 */
const refineSightsPathTwoOpt = (stops: DayLeisureModelStop[]): void => {
  if (stops.length < 4) return;
  const n = stops.length;
  const maxRounds = 30;
  for (let r = 0; r < maxRounds; r += 1) {
    let improved = false;
    for (let i = 0; i <= n - 4; i += 1) {
      for (let j = i + 2; j <= n - 2; j += 1) {
        const before =
          edgeLen(stops[i]!, stops[i + 1]!) + edgeLen(stops[j]!, stops[j + 1]!);
        const after =
          edgeLen(stops[i]!, stops[j]!) + edgeLen(stops[i + 1]!, stops[j + 1]!);
        if (after + 0.5 < before) {
          reverseInPlace(stops, i + 1, j);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
};

/**
 * Маршрут по достопримечательностям: первая остановка — ближайшая к точке старта,
 * далее жадный ближайший сосед, затем 2-opt — последовательный **удобный** путь по карте.
 */
export const orderSightsStopsByStartAndNearest = (
  modelStops: DayLeisureModelStop[],
  start: { lat: number; lon: number } | null
): DayLeisureModelStop[] => {
  if (modelStops.length === 0) return modelStops;
  if (modelStops.length === 1) return modelStops;
  const { head, rest } = pickHeadNearestToStart(modelStops, start);
  const compactTail = reorderTailByNearestNeighbor(rest, wgs(head));
  const out = [head, ...compactTail];
  refineSightsPathTwoOpt(out);
  return out;
};
