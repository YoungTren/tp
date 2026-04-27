import { isLeisureFoodCategory } from "./leisure-stop-order";

/** «Исторические» и смотровые POI: не гастро и не «прогулка без ориентира» — визуально дворец/музей. */
export const isLeisureHistoryLikeCategory = (category: string): boolean => {
  const t = category.trim().toLowerCase();
  if (t.includes("достоприм")) return true;
  if (t.includes("муз")) return true;
  if (t.includes("истор")) return true;
  if (t.includes("античн") || t.includes("колиз") || t.includes("форум") || t.includes("палатин"))
    return true;
  if (t.includes("собор") || t.includes("базил") || t.includes("храм") || t.includes("крепост") || t.includes("замк") || t.includes("двор"))
    return true;
  if (t.includes("памят") || t.includes("площад") || t.includes("квартал") || t.includes("мост") || t.includes("смотров"))
    return true;
  if (t.includes("сад/") || (t.includes("парк") && t.includes("истор"))) return true;
  if (t.includes("heritage") || t.includes("historical")) return true;
  return false;
};

type PlacPreset =
  | "islands#greenStretchyIcon"
  | "islands#redStretchyIcon"
  | "islands#blueStretchyIcon";

/**
 * Метка остановки: еда — номер + вилка/нож, наследие — номер + классик.здание, остальное — номер.
 * Пресы stretchy, чтобы влезали emoji + цифра.
 */
export const getLeisureStopPlacemark = (
  n: number,
  category: string
): { iconContent: string; preset: PlacPreset } => {
  const num = String(n);
  if (isLeisureFoodCategory(category)) {
    return { iconContent: `${num} 🍴`, preset: "islands#redStretchyIcon" };
  }
  if (isLeisureHistoryLikeCategory(category)) {
    return { iconContent: `${num} 🏛`, preset: "islands#blueStretchyIcon" };
  }
  return { iconContent: num, preset: "islands#greenStretchyIcon" };
};
