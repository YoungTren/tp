import { NextResponse } from "next/server";
import { geocodeStartAddressFirstMatch } from "@/lib/yandex-geocode-server";

const MAX_LEN = 280;

/**
 * Геокодинг произвольного адреса (улица, дом) для превью карты и валидации поля старта.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  if (!address || address.length > MAX_LEN) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const yandexKey =
    process.env.YANDEX_MAPS_API_KEY?.trim() ??
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ??
    "";

  const queries = city
    ? [`${address}, ${city}`, `${city}, ${address}`, address]
    : [address];

  const p = await geocodeStartAddressFirstMatch(queries, yandexKey);
  if (!p) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ lat: p.lat, lon: p.lon });
}
