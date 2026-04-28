import { NextResponse } from "next/server";
import { yandexSearchMapsText } from "@/lib/yandex-geocode-server";

/**
 * Координаты центра города (Yandex Search / geo) — для стартового положения карты по полю «Куда».
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() ?? "";
  if (!city || city.length > 200) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }
  const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "";
  if (!key) {
    return NextResponse.json({ error: "Yandex API key is not configured" }, { status: 500 });
  }
  const p =
    (await yandexSearchMapsText(city, key, "geo")) ??
    (await yandexSearchMapsText(city, key)) ??
    null;
  if (!p) {
    return NextResponse.json({ error: "geocode not found" }, { status: 404 });
  }
  return NextResponse.json({ lat: p.lat, lon: p.lon, zoom: 12 as const });
}
