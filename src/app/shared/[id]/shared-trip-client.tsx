"use client";

import { useEffect, useState } from "react";
import { SharedTripView } from "@/components/SharedTripView";
import type { TripData } from "@/types/trip";

type SharedTripClientProps = { shareId: string };

export const SharedTripClient = ({ shareId }: SharedTripClientProps) => {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      const res = await fetch(`/api/trip/share/${encodeURIComponent(shareId)}`);
      const data: unknown = await res.json();
      if (cancel) return;
      if (!res.ok) {
        setError(
          (data as { error?: string })?.error === "not found"
            ? "Ссылка устарела или неверна."
            : "Не удалось загрузить маршрут."
        );
        return;
      }
      setTrip(data as TripData);
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [shareId]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-gray-700">{error}</p>
        <a
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#4ECDC4" }}
        >
          На главную
        </a>
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-gray-500">
        Загрузка…
      </div>
    );
  }
  return <SharedTripView trip={trip} />;
};
