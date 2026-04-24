import { useState } from "react";
import { motion } from "motion/react";
import { Plane, MapPin, Calendar, DollarSign, Users, ArrowRight } from "lucide-react";
import { TRAVEL_HERO_BACKGROUND_SRC } from "@/lib/travel-hero-bg";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export interface TripData {
  from: string;
  to: string;
  dateStart: string;
  dateEnd: string;
  budget: string;
  travelers: number;
}

interface TripSetupProps {
  onComplete: (data: TripData) => void;
}

export function TripSetup({ onComplete }: TripSetupProps) {
  const [form, setForm] = useState<TripData>({
    from: "",
    to: "",
    dateStart: "",
    dateEnd: "",
    budget: "",
    travelers: 2,
  });

  const update = (key: keyof TripData, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(form);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Background image */}
      <ImageWithFallback
        src={TRAVEL_HERO_BACKGROUND_SRC}
        alt="Travel background"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[560px] rounded-3xl bg-white/10 backdrop-blur-xl p-6 sm:p-10 shadow-2xl border border-white/20"
        >
          <div className="mb-6 sm:mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#4ECDC4" }}>
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#ffffff" }}>TravelPlanner</span>
          </div>

          <h1 className="mb-2" style={{ fontSize: "24px", fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
            Куда отправимся?
          </h1>
          <p className="mb-6 sm:mb-8" style={{ fontSize: "15px", color: "rgba(255,255,255,0.7)" }}>
            Заполните детали поездки, и мы составим маршрут
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* From / To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={<MapPin className="h-4.5 w-4.5" />} label="Откуда">
                <input
                  value={form.from}
                  onChange={(e) => update("from", e.target.value)}
                  placeholder="Москва"
                  className="w-full bg-transparent text-white placeholder-white/40 outline-none"
                  style={{ fontSize: "15px" }}
                />
              </Field>
              <Field icon={<MapPin className="h-4.5 w-4.5" />} label="Куда">
                <input
                  value={form.to}
                  onChange={(e) => update("to", e.target.value)}
                  placeholder="Рим"
                  className="w-full bg-transparent text-white placeholder-white/40 outline-none"
                  style={{ fontSize: "15px" }}
                />
              </Field>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={<Calendar className="h-4.5 w-4.5" />} label="Дата вылета">
                <input
                  type="date"
                  value={form.dateStart}
                  onChange={(e) => update("dateStart", e.target.value)}
                  className="w-full bg-transparent text-white outline-none [color-scheme:dark]"
                  style={{ fontSize: "15px" }}
                />
              </Field>
              <Field icon={<Calendar className="h-4.5 w-4.5" />} label="Дата возврата">
                <input
                  type="date"
                  value={form.dateEnd}
                  onChange={(e) => update("dateEnd", e.target.value)}
                  className="w-full bg-transparent text-white outline-none [color-scheme:dark]"
                  style={{ fontSize: "15px" }}
                />
              </Field>
            </div>

            {/* Budget / Travelers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={<DollarSign className="h-4.5 w-4.5" />} label="Бюджет">
                <input
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  placeholder="150 000 ₽"
                  className="w-full bg-transparent text-white placeholder-white/40 outline-none"
                  style={{ fontSize: "15px" }}
                />
              </Field>
              <Field icon={<Users className="h-4.5 w-4.5" />} label="Путешественники">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update("travelers", Math.max(1, form.travelers - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 text-white/70 hover:bg-white/10"
                  >
                    −
                  </button>
                  <span className="text-white" style={{ fontSize: "15px", fontWeight: 500 }}>{form.travelers}</span>
                  <button
                    type="button"
                    onClick={() => update("travelers", form.travelers + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 text-white/70 hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#4ECDC4", fontSize: "15px", fontWeight: 600 }}
            >
              Создать маршрут
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block" style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm focus-within:border-[#4ECDC4] focus-within:ring-2 focus-within:ring-[#4ECDC4]/30 transition-all">
        <span className="text-white/50">{icon}</span>
        {children}
      </div>
    </div>
  );
}