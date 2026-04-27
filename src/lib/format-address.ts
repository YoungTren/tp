/**
 * Аккуратный вид для отображения адреса: пробелы, не капсом, первая буква слова — заглавная.
 */
export const toDisplayAddress = (raw: string): string => {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return t;
  return t
    .split(" ")
    .map((w) => {
      if (w.length === 0) return w;
      if (/^\d+([.,]\d+)?$/.test(w)) return w;
      if (w.length === 1) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};
