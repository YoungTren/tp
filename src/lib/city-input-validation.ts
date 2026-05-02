/**
 * Нормализация ввода города: NFKC, обрезка краёв, схлопывание пробелов.
 * Поддерживаются кириллица и латиница (RU/EN и другие буквы `\p{L}`); регистр не меняется.
 */
export const normalizeCityInput = (raw: string): string =>
  raw.normalize("NFKC").trim().replace(/\s+/g, " ");

/**
 * Быстрая клиентская проверка: недопустимы цифры и «лишние» символы.
 * Окончательная проверка — через геокодер на сервере (любое написание города, транслит и т.д.).
 */
export const cityInputFailsClientRules = (raw: string): boolean => {
  const t = normalizeCityInput(raw);
  if (t.length === 0) return false;
  if (/\p{N}/u.test(t)) return true;
  // Буквы любого алфавита (RU, EN, умлауты и т.д.), пробел, дефис, апострофы, точка (St.), запятая — «Город, страна»
  if (/[^\p{L}\s\-'\u2019.,]/u.test(t)) return true;
  return false;
};
