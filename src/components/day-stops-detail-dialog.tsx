"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStopInterestingFacts } from "@/lib/leisure-facts";
import { formatEstimatedCostSumOrFree } from "@/lib/place-price-hint";
import type { LeisureRouteStop } from "@/types/trip";

type DayStopsDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayTitle: string;
  stops: LeisureRouteStop[];
  /** С карточки в списке: начальное выделение в диалоге (порядок списка не меняется) */
  initialStopId?: string | null;
  /** Закрыть модалку и показать точку на карте (главный экран) */
  onFocusStopOnMap?: (stopId: string) => void;
};

const dialogShell =
  "[color-scheme:light] flex w-[min(100vw-1.25rem,56rem)] !max-w-none flex-col gap-0 overflow-hidden " +
  "sm:!w-[min(100vw-2rem,64rem)] sm:!max-w-4xl md:!max-w-5xl lg:!max-w-6xl " +
  "max-h-[min(92vh,900px)] rounded-2xl border border-gray-200/90 !bg-white p-0 text-[#1a1a1a] shadow-2xl " +
  "[&>button]:rounded-lg [&>button]:text-gray-500 [&>button]:opacity-100 " +
  "[&>button]:hover:bg-gray-100 [&>button]:hover:text-[#1a1a1a]";

export const DayStopsDetailDialog = ({
  open,
  onOpenChange,
  dayTitle,
  stops,
  initialStopId,
  onFocusStopOnMap,
}: DayStopsDetailDialogProps) => {
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedStopId(null);
      return;
    }
    setSelectedStopId(initialStopId ?? null);
  }, [open, initialStopId]);

  useEffect(() => {
    if (!open || !initialStopId) {
      return;
    }
    const t = window.setTimeout(() => {
      const root = listScrollRef.current;
      if (!root) {
        return;
      }
      const el = root.querySelector<HTMLElement>(
        `[data-stop-id="${CSS.escape(initialStopId)}"]`
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 180);
    return () => window.clearTimeout(t);
  }, [open, initialStopId, ordered.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogShell}>
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-white px-5 pb-3.5 pt-5 pr-12">
          <DialogTitle
            className="text-left text-lg tracking-tight"
            style={{ color: "#1a1a1a", fontWeight: 600 }}
          >
            {dayTitle}
          </DialogTitle>
        </DialogHeader>
        <div
          ref={listScrollRef}
          className="min-h-0 w-full max-h-[min(76vh,720px)] flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-gray-50/80 px-4 py-4 [scrollbar-gutter:stable] sm:px-6"
        >
          <ul className="space-y-3 pb-2 pr-1 sm:space-y-4">
            {ordered.map((stop, idx) => {
              const facts = getStopInterestingFacts(stop);
              const routeIndex = idx + 1;
              const isSelected = selectedStopId === stop.id;
              return (
                <li
                  key={stop.id}
                  data-stop-id={stop.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedStopId(stop.id);
                    }
                  }}
                  onClick={() => setSelectedStopId(stop.id)}
                  className={`overflow-visible rounded-xl bg-white/95 shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[#4ECDC4]/50 ${
                    isSelected
                      ? "border-2 border-[#4ECDC4] ring-0"
                      : "border border-gray-100 hover:border-[#4ECDC4]/30"
                  } `}
                >
                  <div className="flex flex-col gap-3.5 p-3.5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-5">
                    <div className="relative mx-auto w-full max-w-sm shrink-0 sm:mx-0 sm:max-w-none sm:min-w-[10rem] sm:basis-[44%] sm:shrink-0 md:max-w-[26rem]">
                      <div className="pl-3.5 pt-3.5">
                        <div className="relative w-full">
                        <div className="w-full overflow-hidden rounded-xl">
                          <ImageWithFallback
                            src={stop.image}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>
                        <span
                          className="absolute left-0 top-0 z-20 flex h-7 min-w-[1.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums leading-none text-white shadow-md ring-2 ring-white whitespace-nowrap"
                          style={{ background: "#4ECDC4" }}
                          aria-hidden
                        >
                          {routeIndex}
                        </span>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 sm:pl-0">
                      <h3
                        className="text-[15px] font-semibold leading-snug sm:text-base"
                        style={{ color: "#1a1a1a" }}
                      >
                        {stop.title}
                      </h3>
                      <div
                        className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm"
                        style={{ color: "#6b7280" }}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          <Star
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: "#f5a623" }}
                            aria-hidden
                          />
                          {stop.rating.toFixed(1)}
                        </span>
                        <span
                          className="shrink-0 font-medium"
                          style={{ color: "#1a1a1a" }}
                        >
                          {formatEstimatedCostSumOrFree(stop.estimatedCost)}
                        </span>
                        {onFocusStopOnMap ? (
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a1a1a] transition hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFocusStopOnMap(stop.id);
                            }}
                          >
                            <Image
                              src="/icons/map-route.svg"
                              alt=""
                              width={14}
                              height={14}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            Карта
                          </button>
                        ) : null}
                      </div>
                      <p
                        className="mt-2.5 text-sm font-normal leading-relaxed"
                        style={{ color: "#555" }}
                      >
                        {stop.description}
                      </p>
                      <ul
                        className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed"
                        style={{ color: "#444" }}
                      >
                        {facts.map((line, j) => (
                          <li key={j} className="marker:text-[#4ECDC4]">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};
