export type DeepSeekCityJson = {
  is_city: boolean;
  corrected_name: string | null;
};

/**
 * DeepSeek Chat API (OpenAI-совместимый). При отсутствии ключа или ошибке — `null`.
 */
export const validateCityWithDeepSeek = async (
  input: string
): Promise<DeepSeekCityJson | null> => {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  const q = input.trim();
  if (!key || !q || q.length > 200) return null;

  const model =
    (() => {
      const m = process.env.DEEPSEEK_MODEL?.trim();
      return m && m.length > 0 ? m : "deepseek-chat";
    })();

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You classify travel destination input as a real populated place (city, town, or notable village) worldwide.",
            'Reply ONLY JSON: {"is_city":boolean,"corrected_name":string|null}',
            "is_city=true only for real places (known in OSM/OpenStreetMap sense). false for nonsense, random words, jokes, insults, fictional places, brands alone.",
            "corrected_name: canonical spelling users expect (fix typos like масква→Москва, translit Moskva→Москва or Moscow per common usage); null if input is already fine or no safe correction.",
            "If is_city is false, corrected_name must be null.",
          ].join(" "),
        },
        { role: "user", content: q },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) return null;

  const parse = (s: string): DeepSeekCityJson | null => {
    try {
      const j = JSON.parse(s) as {
        is_city?: unknown;
        corrected_name?: unknown;
      };
      if (j.is_city !== true && j.is_city !== false) return null;
      let corrected_name: string | null = null;
      if (j.is_city === true && typeof j.corrected_name === "string") {
        const t = j.corrected_name.trim();
        corrected_name = t.length > 0 ? t : null;
      }
      return { is_city: j.is_city === true, corrected_name };
    } catch {
      const m = s.match(/\{[\s\S]*\}/);
      if (!m) return null;
      return parse(m[0]);
    }
  };

  return parse(raw.trim());
};
