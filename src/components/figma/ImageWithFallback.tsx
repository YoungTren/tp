import React, { useState } from "react";
import { getResponsiveImageAttributes } from "@/lib/responsive-image-url";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export type ImageWithFallbackProps =
  React.ImgHTMLAttributes<HTMLImageElement> & {
    /** Если задано вместе с src — подставляются srcSet/sizes для Unsplash и `/api/place-photo`. */
    responsiveSizes?: string;
  };

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const {
    src,
    alt,
    style,
    className,
    responsiveSizes,
    srcSet: propSrcSet,
    sizes: propSizes,
    ...rest
  } = props;

  const attrs =
    responsiveSizes && typeof src === "string"
      ? getResponsiveImageAttributes(src, responsiveSizes)
      : {
          src: typeof src === "string" ? src : "",
          srcSet: propSrcSet,
          sizes: propSizes,
        };

  const {
    srcSet: strippedSrcSet,
    sizes: strippedSizes,
    src: strippedSrc,
    ...restSafe
  } = rest;
  void strippedSrcSet;
  void strippedSizes;
  void strippedSrc;

  return didError ? (
    <div
      className={`block h-full w-full min-h-0 bg-gray-100 text-center ${className ?? ""}`}
      style={style}
    >
      <div className="flex h-full w-full min-h-0 items-center justify-center">
        <img
          src={ERROR_IMG_SRC}
          alt="Error loading image"
          {...restSafe}
          data-original-url={attrs.src}
        />
      </div>
    </div>
  ) : (
    <img
      src={attrs.src}
      alt={alt}
      className={className}
      style={style}
      srcSet={attrs.srcSet}
      sizes={attrs.sizes}
      {...restSafe}
      onError={handleError}
    />
  );
}
