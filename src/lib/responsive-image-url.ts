import type { ImgHTMLAttributes } from "react";

const parseUrl = (src: string): URL | null => {
  try {
    return src.startsWith("http")
      ? new URL(src)
      : new URL(src, "http://local.invalid");
  } catch {
    return null;
  }
};

const isPlacePhotoPath = (pathname: string): boolean =>
  pathname === "/api/place-photo" || pathname.endsWith("/api/place-photo");

/**
 * Для URL из генерации поездки (Places proxy, Unsplash пресеты) собирает srcSet + sizes,
 * чтобы на телефоне не тянуть лишние мегапиксели, а на планшете — не мыться в upscale.
 */
export const getResponsiveImageAttributes = (
  src: string,
  sizes: string
): Pick<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> => {
  const trimmed = src.trim();
  if (!trimmed) {
    return { src: trimmed };
  }

  const parsed = parseUrl(trimmed);
  if (!parsed) {
    return { src: trimmed };
  }

  if (isPlacePhotoPath(parsed.pathname)) {
    const r = parsed.searchParams.get("r");
    if (!r) {
      return { src: trimmed };
    }
    const widths = [480, 800, 1200, 1600] as const;
    const base =
      trimmed.startsWith("http") && parsed.hostname !== "local.invalid"
        ? `${parsed.origin}${parsed.pathname}`
        : "/api/place-photo";
    const qs = (w: number) =>
      new URLSearchParams({ r, w: String(w) }).toString();
    const srcSet = widths.map((w) => `${base}?${qs(w)} ${w}w`).join(", ");
    const defaultSrc = `${base}?${qs(800)}`;
    return { src: defaultSrc, srcSet, sizes };
  }

  if (parsed.hostname === "images.unsplash.com") {
    const absolute = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(parsed.pathname + parsed.search, "https://images.unsplash.com");
    const widths = [640, 828, 1080, 1440, 1920] as const;
    const srcSet = widths
      .map((w) => {
        const copy = new URL(absolute.toString());
        copy.searchParams.set("w", String(w));
        return `${copy.toString()} ${w}w`;
      })
      .join(", ");
    const def = new URL(absolute.toString());
    def.searchParams.set("w", "1080");
    return { src: def.toString(), srcSet, sizes };
  }

  if (parsed.hostname === "picsum.photos") {
    const upgraded = trimmed.replace(/\/(\d+)\/(\d+)(\/?)?$/, "/1600/1200$3");
    return { src: upgraded };
  }

  return { src: trimmed };
};
