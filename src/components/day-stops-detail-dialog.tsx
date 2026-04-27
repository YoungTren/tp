"use client";

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
import type { LeisureRouteStop } from "@/types/trip";

type DayStopsDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayTitle: string;
  stops: LeisureRouteStop[];
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
  onFocusStopOnMap,
}: DayStopsDetailDialogProps) => {
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogShell}>
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-white px-5 pb-3.5 pt-5 pr-12">
          <div
            className="mb-0.5 h-1 w-10 rounded-full"
            style={{ background: "#4ECDC4" }}
            aria-hidden
          />
          <DialogTitle
            className="text-left text-lg tracking-tight"
            style={{ color: "#1a1a1a", fontWeight: 600 }}
          >
            {dayTitle}
          </DialogTitle>
        </DialogHeader>
        <div
          className="min-h-0 w-full max-h-[min(76vh,720px)] flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-gray-50/80 px-4 py-4 [scrollbar-gutter:stable] sm:px-6"
        >
          <ul className="space-y-3 pb-2 pr-1 sm:space-y-4">
            {ordered.map((stop, idx) => {
              const facts = getStopInterestingFacts(stop);
              return (
                <li
                  key={stop.id}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-white/95 shadow-sm transition hover:border-[#4ECDC4]/35"
                >
                  <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:gap-4 sm:p-4">
                    <div className="relative mx-auto w-full max-w-[min(100%,220px)] shrink-0 sm:mx-0 sm:w-44 sm:max-w-none">
                      <span
                        className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-white/90"
                        style={{ background: "#4ECDC4" }}
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                      <ImageWithFallback
                        src={stop.image}
                        alt=""
                        className="aspect-[4/3] w-full rounded-lg object-cover sm:aspect-square sm:h-36 sm:max-w-[176px]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-[15px] font-semibold leading-snug sm:text-base"
                        style={{ color: "#1a1a1a" }}
                      >
                        {stop.title}
                      </h3>
                      <p
                        className="mt-1.5 text-sm leading-relaxed"
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
                      <div
                        className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-gray-100 pt-3 text-sm"
                        style={{ color: "#6b7280" }}
                      >
                        <div className="inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
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
                            {stop.estimatedCost}
                          </span>
                        </div>
                        {onFocusStopOnMap ? (
                          <div className="ml-auto flex shrink-0 items-center gap-2">
                            <Image
                              src="/icons/map-route.svg"
                              alt=""
                              width={18}
                              height={18}
                              className="h-4 w-4 shrink-0 opacity-90"
                            />
                            <button
                              type="button"
                              className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a1a1a] transition hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5"
                              onClick={() => onFocusStopOnMap(stop.id)}
                            >
                              На карте
                            </button>
                          </div>
                        ) : null}
                      </div>
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
