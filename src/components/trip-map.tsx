"use client";

import { googleMapsJsApiKey, yandexMapsApiKey } from "@/lib/public-env";
import type { YandexTripMapProps } from "@/components/yandex-trip-map";
import { GoogleTripMap } from "@/components/google-trip-map";
import { YandexTripMap } from "@/components/yandex-trip-map";

const useYandexTiles =
  process.env.NEXT_PUBLIC_USE_YANDEX_MAP?.trim() === "1" &&
  yandexMapsApiKey.trim().length > 0;

export const TripMap = (props: YandexTripMapProps) =>
  useYandexTiles ? (
    <YandexTripMap {...props} />
  ) : googleMapsJsApiKey.trim() ? (
    <GoogleTripMap {...props} />
  ) : (
    <YandexTripMap {...props} />
  );
