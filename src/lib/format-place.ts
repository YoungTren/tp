/**
 * Показывает название места/nазначения с заглавной буквы («рим» → «Рим»), даже если пользователь ввёл строчными.
 */
export const capitalizePlaceName = (s: string): string => {
  const t = s.trim();
  if (!t) return t;
  const cp = [...t];
  const i = cp.findIndex((ch) => /\p{L}/u.test(ch));
  if (i === -1) return t;
  cp[i] = cp[i]!.toLocaleUpperCase("ru-RU");
  return cp.join("");
};
