declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DEEPSEEK_API_KEY: string;
      GOOGLE_API_KEY: string;
      GOOGLE_CSE_ID: string;
      /** Опционально: только для Places, если не совпадает с GOOGLE_API_KEY */
      GOOGLE_PLACES_API_KEY?: string;
      NEXT_PUBLIC_YANDEX_MAPS_API_KEY: string;
      /** Карта маршрута через Google Maps JS (Directions); если пусто — Яндекс */
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
      /** Resend: отправка письма со ссылкой на маршрут */
      RESEND_API_KEY?: string;
      /** Resend: адрес «от кого» (см. консоль Resend / верификация домена) */
      RESEND_FROM?: string;
      /** Публичный URL сайта для ссылок в письме (например https://example.com) */
      NEXT_PUBLIC_APP_URL?: string;
      /** Опционально: Upstash Redis для ссылок на Vercel (см. trip-share-store) */
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;
    }
  }
}

export {};
