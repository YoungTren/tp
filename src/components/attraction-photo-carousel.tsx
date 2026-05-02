"use client";

import { useEffect, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const AUTO_MS = 5000;

export type CarouselSlide = {
  id: string;
  title: string;
  image: string;
  /** Координаты POI (сервер) — совпадение с метками на карте */
  lat?: number | null;
  lon?: number | null;
};

type AttractionPhotoCarouselProps = {
  cityLabel: string;
  items: CarouselSlide[];
  isLoading: boolean;
  onActiveTitleChange?: (activeTitle: string) => void;
};

export const AttractionPhotoCarousel = ({
  cityLabel,
  items,
  isLoading,
  onActiveTitleChange,
}: AttractionPhotoCarouselProps) => {
  const n = items.length;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (n <= 1) {
      return;
    }
    const t = window.setInterval(() => {
      setI((j) => (j + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n]);

  useEffect(() => {
    if (i >= n) setI(0);
  }, [i, n]);

  useEffect(() => {
    const t = n ? (items[i]?.title ?? items[0]?.title ?? "") : "";
    onActiveTitleChange?.(t);
  }, [i, items, n, onActiveTitleChange]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[200px] w-full flex-1 items-center justify-center rounded-xl bg-gray-100/90">
        <p className="text-sm text-gray-500">Загрузка фото…</p>
      </div>
    );
  }

  if (n === 0) {
    return (
      <div className="flex h-full min-h-[200px] w-full flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80">
        <p className="text-center text-sm text-gray-500">Нет изображений</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-gray-100"
      role="region"
      aria-roledescription="карусель"
      aria-label={`Достопримечательности, ${cityLabel}`}
    >
      <div className="absolute inset-0 min-h-0 min-w-0">
        {items.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === i ? "z-[1] opacity-100" : "z-0 opacity-0"
            }`}
            aria-hidden={idx === i ? undefined : true}
          >
            <ImageWithFallback
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
              responsiveSizes="(max-width: 1023px) 100vw, 480px"
            />
            <div
              className="absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-transparent"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
};
