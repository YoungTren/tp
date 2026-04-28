import { NextResponse } from "next/server";
import { refPointNearCity } from "@/lib/yandex-geocode-server";

/**
 * Центр карты по названию города (поле «Куда»).
 * Сервер: Яндекс при наличии ключа → иначе Nominatim → при наличии `GOOGLE_API_KEY` — Google Geocoding.
 * Так карта не залипает на «весь мир» на Vercel, если забыли `NEXT_PUBLIC_*` или Яндекс временно не отвечает.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() ?? "";
  if (!city || city.length > 200) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }

  const yandexKey =
    process.env.YANDEX_MAPS_API_KEY?.trim() ??
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ??
    "";

  const p = await refPointNearCity(city, yandexKey);
  if (!p) {
    return NextResponse.json({ error: "geocode not found" }, { status: 404 });
  }
  return NextResponse.json({ lat: p.lat, lon: p.lon, zoom: 12 as const });
}
