import { useState } from "react";
import { motion } from "motion/react";
import { Plane, MapPin } from "lucide-react";
import { capitalizePlaceName } from "@/lib/format-place";
import { normalizeDurationDays } from "@/lib/trip-dates";
import { buildPlaceholderTripPlan } from "@/lib/placeholder-trip-plan";
import { TRAVEL_HERO_BACKGROUND_SRC } from "@/lib/travel-hero-bg";
import type { TripData, TripFormFields } from "@/types/trip";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface TripSetupProps {
  onComplete: (data: TripData) => void;
}

export function TripSetup({ onComplete }: TripSetupProps) {
  const [form, setForm] = useState<{ to: string; durationDays: string }>({
    to: "",
    durationDays: "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationDays = normalizeDurationDays(
      parseInt(form.durationDays.trim(), 10)
    );
    const fields: TripFormFields = {
      from: "",
      to: capitalizePlaceName(form.to.trim()),
      durationDays,
      budget: "",
      travelers: 2,
    };
    onComplete({ ...fields, plan: buildPlaceholderTripPlan(fields) });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <ImageWithFallback
        src={TRAVEL_HERO_BACKGROUND_SRC}
        alt="Travel background"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 flex h-full items-center justify-center px-4 p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          <div className="mb-6 sm:mb-8 flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#4ECDC4" }}
            >
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-[20px] sm:text-[22px]"
              style={{ fontWeight: 600, color: "#ffffff" }}
            >
              TravelPlanner
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-12 sm:gap-3">
              <div className="sm:col-span-8">
                <label
                  className="mb-1.5 block"
                  style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}
                >
                  Куда отправимся?
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition focus-within:border-[#4ECDC4] focus-within:ring-2 focus-within:ring-[#4ECDC4]/30">
                  <MapPin
                    className="h-4 w-4 shrink-0"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  />
                  <input
                    value={form.to}
                    onChange={(e) => update("to", e.target.value)}
                    placeholder="Рим"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="min-w-0 sm:col-span-4">
                <label
                  className="mb-1.5 block"
                  style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}
                >
                  Количество дней
                </label>
                <div className="flex min-h-[42px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={form.durationDays}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        update("durationDays", "");
                        return;
                      }
                      const n = parseInt(raw, 10);
                      if (!Number.isFinite(n)) return;
                      if (n < 1) {
                        update("durationDays", "");
                        return;
                      }
                      update("durationDays", String(Math.min(60, n)));
                    }}
                    className="w-full min-w-0 max-w-full border-0 bg-transparent text-center text-sm tabular-nums text-white outline-none [appearance:textfield] focus:outline-none focus-visible:outline-none sm:max-w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ colorScheme: "dark" }}
                    aria-label="Количество дней"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#4ECDC4" }}
            >
              Создать маршрут
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
