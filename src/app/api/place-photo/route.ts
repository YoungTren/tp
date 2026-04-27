import { getServerEnv } from "@/lib/server-env";

const PLACES_PHOTO = "https://maps.googleapis.com/maps/api/place/photo";

/**
 * Прокси фото Google Places, чтобы `photo_reference` + API key оставались на сервере.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("r");
  if (!ref || ref.length > 2000) {
    return new Response("Bad request", { status: 400 });
  }
  const max = Math.min(1600, Math.max(200, Number(searchParams.get("w")) || 800));
  const { googlePlacesKey } = getServerEnv();
  const u = new URL(PLACES_PHOTO);
  u.searchParams.set("maxwidth", String(max));
  u.searchParams.set("photo_reference", ref);
  u.searchParams.set("key", googlePlacesKey);
  const upstream = await fetch(u);
  if (!upstream.ok) {
    return new Response("Photo unavailable", { status: upstream.status === 404 ? 404 : 502 });
  }
  const type = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = upstream.body;
  if (!body) {
    return new Response("No body", { status: 502 });
  }
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
