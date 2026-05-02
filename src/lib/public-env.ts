/** Клиентские переменные `NEXT_PUBLIC_*` (вшиваются при сборке / dev). */
export const yandexMapsApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY!;

/** Публичный ключ Maps JavaScript API (Directions, маркеры). Если задан — карта маршрута через Google, иначе Яндекс. */
export const googleMapsJsApiKey =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
