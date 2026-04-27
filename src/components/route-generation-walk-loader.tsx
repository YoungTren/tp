"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PATH_FULL_MS = 50_000;
const PATH_CAP = 0.97;

const useProgress = (active: boolean) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const t0 = performance.now();
    let raf: number;
    const tick = () => {
      const e = performance.now() - t0;
      setProgress((prev) =>
        Math.max(prev, Math.min(PATH_CAP, e / PATH_FULL_MS))
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return progress;
};

type RouteGenerationWalkLoaderProps = {
  active: boolean;
};

export const RouteGenerationWalkLoader = ({
  active,
}: RouteGenerationWalkLoaderProps) => {
  const progress = useProgress(active);
  const pct = progress * 100;
  const topPct = (1 - progress) * 100;

  return (
    <div
      className="relative min-h-[200px] w-full flex-1 sm:min-h-[220px] [color-scheme:light]"
      role="status"
      aria-live="polite"
      aria-label="Создаём маршрут"
    >
      <div
        className="absolute bottom-0 left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full bg-gray-200/90"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-[#4ECDC4] opacity-90"
        style={{ height: `${pct}%` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: `${topPct}%`, transform: "translate(-50%, -50%)" }}
      >
        <Image
          src="/icons/airplane.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 select-none object-contain drop-shadow-sm"
          unoptimized
        />
      </div>
    </div>
  );
};
