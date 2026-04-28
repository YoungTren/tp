/**
 * Серверные секреты из `.env` / `.env.local`.
 * Клиентский бандл их не видит; `NEXT_PUBLIC_*` задаются отдельно.
 *
 * `googlePlacesKey`: фото и подсказки цен (Places и др.). Геокод точек маршрута: Яндекс → при необходимости **Google Geocoding** (`GOOGLE_API_KEY`) → Nominatim.
 */
export const getServerEnv = () => ({
  deepseekApiKey: process.env.DEEPSEEK_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!,
  googleCseId: process.env.GOOGLE_CSE_ID!,
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_API_KEY!,
});
