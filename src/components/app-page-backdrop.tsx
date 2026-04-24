import {
  APP_PAGE_BG_FALLBACK,
  APP_PAGE_BG_IMAGE,
  APP_PAGE_BG_OVERLAY,
} from "@/lib/app-page-surface";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export const AppPageBackdrop = () => (
  <>
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ backgroundColor: APP_PAGE_BG_FALLBACK }}
      aria-hidden
    />
    <ImageWithFallback
      src={APP_PAGE_BG_IMAGE}
      alt=""
      className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
    />
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ backgroundColor: APP_PAGE_BG_OVERLAY }}
      aria-hidden
    />
  </>
);
