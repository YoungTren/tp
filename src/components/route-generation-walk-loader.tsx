"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Замедление относительно оценки pace: полный цикл из двух пролётов =
 * `paceDurationMs × factor`. Импортируется в Dashboard для синхронного ожидания перед показом плана.
 */
export const ROUTE_GEN_PLANE_SLOW_FACTOR = 1.28;

/** Два пролёта за время загрузки: снизу → верх, затем снова снизу → верх (0…100% по нижнему краю). */
const planeBottomPct = (elapsed: number, durationMs: number): number => {
  if (durationMs < 1) {
    return 0;
  }
  const u = Math.min(1, elapsed / durationMs);
  const segment = u * 2;
  const halfProgress = segment <= 1 ? segment : segment - 1;
  return halfProgress * 100;
};

const useRouteLoaderElapsed = (args: { active: boolean; startTime: number }) => {
  const { active, startTime } = args;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || startTime <= 0) {
      setElapsed(0);
      return;
    }
    let raf: number;
    const tick = () => {
      setElapsed(performance.now() - startTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, startTime]);

  return elapsed;
};

type RouteGenerationWalkLoaderProps = {
  active: boolean;
  /** момент старта запроса (тот же, что зафиксирован в Dashboard) */
  startTime: number;
  /** Оценка длительности (EMA); визуально умножается на {@link ROUTE_GEN_PLANE_SLOW_FACTOR}. */
  paceDurationMs: number;
};

export const RouteGenerationWalkLoader = ({
  active,
  startTime,
  paceDurationMs,
}: RouteGenerationWalkLoaderProps) => {
  const elapsed = useRouteLoaderElapsed({ active, startTime });
  const durationMs =
    Math.max(1, paceDurationMs) * ROUTE_GEN_PLANE_SLOW_FACTOR;

  const b = planeBottomPct(elapsed, durationMs);
  const overallProgress = Math.min(1, elapsed / Math.max(1, durationMs));
  const skyParallaxY = overallProgress * -18;
  /** Первый пролёт — один текст, второй — другой (segment ∈ [0,2)). */
  const plaqueText =
    overallProgress * 2 >= 1
      ? "Осталось совсем немного"
      : "Создаем маршрут, пожалуйста подождите";

  return (
    <div
      className="relative h-full min-h-[200px] w-full flex-1 self-stretch overflow-hidden rounded-xl bg-sky-50/40 sm:min-h-[220px] [color-scheme:light]"
      role="status"
      aria-live="polite"
      aria-label={plaqueText}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 will-change-transform"
        style={{ transform: `translate3d(0, ${skyParallaxY}px, 0)` }}
        aria-hidden
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 400 280"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="routeLoaderSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#f0f9ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.95" />
            </linearGradient>
            <filter
              id="routeLoaderCloudSoft"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
            </filter>
          </defs>
          <rect width="400" height="280" fill="url(#routeLoaderSky)" />
          <g
            filter="url(#routeLoaderCloudSoft)"
            fill="#ffffff"
            fillOpacity={0.82}
          >
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 18,0; 0,0"
                dur="32s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
              <ellipse cx="72" cy="48" rx="38" ry="14" />
              <ellipse cx="100" cy="44" rx="22" ry="12" />
              <ellipse cx="50" cy="50" rx="20" ry="11" />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -14,0; 0,0"
                dur="26s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
              <ellipse cx="300" cy="90" rx="44" ry="16" />
              <ellipse cx="330" cy="86" rx="24" ry="13" />
              <ellipse cx="275" cy="92" rx="18" ry="10" />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 12,0; 0,0"
                dur="38s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
              <ellipse cx="180" cy="160" rx="52" ry="18" />
              <ellipse cx="210" cy="155" rx="28" ry="15" />
              <ellipse cx="150" cy="162" rx="22" ry="12" />
            </g>
            <g fillOpacity={0.65}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -20,0; 0,0"
                dur="22s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
              <ellipse cx="340" cy="200" rx="36" ry="12" />
              <ellipse cx="360" cy="198" rx="18" ry="9" />
            </g>
            <g fillOpacity={0.55}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 10,0; 0,0"
                dur="30s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
              <ellipse cx="40" cy="200" rx="32" ry="11" />
              <ellipse cx="20" cy="202" rx="16" ry="8" />
            </g>
          </g>
        </svg>
      </div>
      {/* Самолёт + «верёвка» + плашка: bottom у всего столбца — низ плашки привязан к траектории. */}
      <div
        className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center will-change-[bottom]"
        style={{ bottom: `${b}%` }}
      >
        <div className="h-10 w-10 shrink-0 origin-center -rotate-45">
          <Image
            src="/icons/airplane.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 select-none object-contain object-bottom drop-shadow-sm"
            unoptimized
          />
        </div>
        <div className="h-2 w-px shrink-0 bg-slate-400/60" aria-hidden />
        <div className="max-w-[min(20rem,calc(100vw-2.5rem))] rounded-lg bg-white/90 px-3 py-2 text-center shadow-sm">
          <p className="text-xs font-medium leading-snug text-slate-700 sm:text-sm">
            {plaqueText}
          </p>
        </div>
      </div>
    </div>
  );
};
