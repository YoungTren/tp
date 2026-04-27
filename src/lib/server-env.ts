/**
 * Серверные секреты из `.env` / `.env.local`.
 * Клиентский бандл их не видит; `NEXT_PUBLIC_*` задаются отдельно.
 *
 * `googlePlacesKey`: тот же ключ, что и для Custom Search; для геокода гастроточек на карте
 * нужны **Places API** (Text Search) и **Geocoding API** в проекте Google Cloud; иначе `GOOGLE_PLACES_API_KEY`.
 */
export const getServerEnv = () => ({
  deepseekApiKey: process.env.DEEPSEEK_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!,
  googleCseId: process.env.GOOGLE_CSE_ID!,
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_API_KEY!,
});
