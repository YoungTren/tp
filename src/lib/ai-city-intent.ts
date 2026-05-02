/**
 * Опциональная классификация: похоже ли пользовательское поле на запрос названия
 * города / посёлка / деревни (RU/EN, транслит). Если ключа нет или ошибка сети — `null`
 * (решает геокодер без блокировки).
 */
export const classifyCityLikeIntent = async (
  text: string
): Promise<boolean | null> => {
  const key = process.env.OPENAI_API_KEY?.trim();
  const q = text.trim();
  if (!key || q.length < 2 || q.length > 160) return null;

  const body = {
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 48,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You classify a single travel destination query.",
          'Reply ONLY JSON: {"cityLike":boolean}',
          "cityLike=true: the text plausibly names a city, town, village, or common transliteration (e.g. Moskva → Moscow).",
          "cityLike=false: nonsense/random letters, obvious non-place words, jokes, insults, brands/products as sole token, full sentences that are not a place name.",
          "When unsure between real obscure places vs gibberish, prefer cityLike=true.",
        ].join(" "),
      },
      { role: "user", content: q },
    ],
  };

  const parseCityLike = (raw: string): boolean | null => {
    const s = raw.trim();
    try {
      const j = JSON.parse(s) as { cityLike?: unknown };
      return typeof j.cityLike === "boolean" ? j.cityLike : null;
    } catch {
      const m = s.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try {
        const j = JSON.parse(m[0]) as { cityLike?: unknown };
        return typeof j.cityLike === "boolean" ? j.cityLike : null;
      } catch {
        return null;
      }
    }
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  return parseCityLike(content);
};
