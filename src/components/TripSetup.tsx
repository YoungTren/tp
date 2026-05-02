"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, Plane, MapPin } from "lucide-react";
import { cityInputFailsClientRules, normalizeCityInput } from "@/lib/city-input-validation";
import { capitalizePlaceName } from "@/lib/format-place";
import {
  MAX_TRIP_ITINERARY_DAYS,
  normalizeDurationDays,
} from "@/lib/trip-dates";
import { buildPlaceholderTripPlan } from "@/lib/placeholder-trip-plan";
import type { MapCenter, TripData, TripFormFields } from "@/types/trip";

interface TripSetupProps {
  onComplete: (data: TripData) => void;
}

const CITY_ERROR_MESSAGE = "Указан несуществующий город";
const CITY_FOUND_HINT = "Город найден";
const DEBOUNCE_REMOTE_MS = 400;
const DURATION_ERROR_FLASH_MS = 2600;
const DAYS_ERROR_LABEL = "Неверное количество дней";

export function TripSetup({ onComplete }: TripSetupProps) {
  const [form, setForm] = useState<{ to: string; durationDays: string }>({
    to: "",
    durationDays: "",
  });
  const [debouncedCityTrim, setDebouncedCityTrim] = useState("");
  const [cityAiValid, setCityAiValid] = useState<boolean | null>(null);
  const [cityAiPending, setCityAiPending] = useState(false);
  const [cityAiValidatedForQuery, setCityAiValidatedForQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [durationLabelFlash, setDurationLabelFlash] = useState(false);
  const durationFlashTimerRef = useRef<number | null>(null);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedCityTrim(normalizeCityInput(form.to)),
      DEBOUNCE_REMOTE_MS
    );
    return () => window.clearTimeout(id);
  }, [form.to]);

  const validateAbortRef = useRef<AbortController | null>(null);

  const validateCityNow = useCallback((rawInput: string) => {
    const q = normalizeCityInput(rawInput);
    validateAbortRef.current?.abort();

    if (!q || cityInputFailsClientRules(rawInput)) {
      setCityAiValid(null);
      setCityAiValidatedForQuery("");
      setCityAiPending(false);
      return;
    }

    const ac = new AbortController();
    validateAbortRef.current = ac;
    setCityAiPending(true);

    void (async () => {
      try {
        const res = await fetch("/api/validate-city", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: q }),
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          is_city?: boolean;
          corrected_name?: string | null;
        };
        if (ac.signal.aborted) return;

        const ok = data.is_city === true;
        let marker = q;

        if (
          ok &&
          typeof data.corrected_name === "string" &&
          data.corrected_name.trim()
        ) {
          const c = normalizeCityInput(data.corrected_name);
          if (c.length > 0 && c !== q) {
            setForm((f) => ({ ...f, to: c }));
            setDebouncedCityTrim(c);
            marker = c;
          }
        }

        setCityAiValid(ok);
        setCityAiValidatedForQuery(marker);
      } catch {
        if (!ac.signal.aborted) {
          setCityAiValid(false);
          setCityAiValidatedForQuery(q);
        }
      } finally {
        if (!ac.signal.aborted) {
          setCityAiPending(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    validateCityNow(debouncedCityTrim || "");
  }, [debouncedCityTrim, validateCityNow]);

  useEffect(() => {
    return () => {
      if (durationFlashTimerRef.current !== null) {
        window.clearTimeout(durationFlashTimerRef.current);
      }
    };
  }, []);

  const trimmedCity = normalizeCityInput(form.to);
  const syncMismatch = trimmedCity !== debouncedCityTrim;

  const clientInvalid =
    trimmedCity.length > 0 && cityInputFailsClientRules(form.to);
  const aiInvalid =
    trimmedCity.length > 0 &&
    !clientInvalid &&
    !syncMismatch &&
    !cityAiPending &&
    cityAiValid === false &&
    cityAiValidatedForQuery === debouncedCityTrim;

  const showCityError = clientInvalid || aiInvalid;

  const cityFoundOk =
    trimmedCity.length > 0 &&
    !clientInvalid &&
    !syncMismatch &&
    !cityAiPending &&
    cityAiValid === true &&
    cityAiValidatedForQuery === debouncedCityTrim;

  const parsedDurationDays = parseInt(form.durationDays.trim(), 10);
  const durationDaysOk =
    Number.isFinite(parsedDurationDays) &&
    parsedDurationDays >= 1 &&
    parsedDurationDays <= MAX_TRIP_ITINERARY_DAYS;

  const flashDurationErrorLabel = useCallback(() => {
    setDurationLabelFlash(true);
    if (durationFlashTimerRef.current !== null) {
      window.clearTimeout(durationFlashTimerRef.current);
    }
    durationFlashTimerRef.current = window.setTimeout(() => {
      setDurationLabelFlash(false);
      durationFlashTimerRef.current = null;
    }, DURATION_ERROR_FLASH_MS);
  }, []);

  useEffect(() => {
    if (!durationDaysOk || !durationLabelFlash) return;
    if (durationFlashTimerRef.current !== null) {
      window.clearTimeout(durationFlashTimerRef.current);
      durationFlashTimerRef.current = null;
    }
    setDurationLabelFlash(false);
  }, [durationDaysOk, durationLabelFlash]);

  const canSubmit =
    trimmedCity.length > 0 &&
    !clientInvalid &&
    !syncMismatch &&
    cityAiValid === true &&
    !cityAiPending &&
    cityAiValidatedForQuery === debouncedCityTrim &&
    durationDaysOk &&
    !submitting;

  /** Только нормализация пробелов — без подстановки названия из геокодера. */
  const handleCityBlur = () => {
    const q = normalizeCityInput(form.to);
    if (q !== form.to) {
      setForm((f) => ({ ...f, to: q }));
    }
    validateCityNow(q);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationDaysOk) {
      flashDurationErrorLabel();
      return;
    }
    if (!canSubmit) return;
    const durationDays = normalizeDurationDays(parsedDurationDays);
    void (async () => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/validate-city", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: trimmedCity }),
        });
        const data = (await res.json()) as {
          is_city?: boolean;
          corrected_name?: string | null;
          map?: {
            lat?: unknown;
            lon?: unknown;
            zoom?: unknown;
          } | null;
        };
        if (data.is_city !== true) {
          setCityAiValid(false);
          setCityAiValidatedForQuery(trimmedCity);
          return;
        }
        let finalCity = trimmedCity;
        if (
          typeof data.corrected_name === "string" &&
          data.corrected_name.trim()
        ) {
          finalCity = normalizeCityInput(data.corrected_name);
        }
        const fields: TripFormFields = {
          from: "",
          to: capitalizePlaceName(finalCity),
          durationDays,
          budget: "",
          travelers: 2,
        };
        let initialMapCenter: MapCenter | null = null;
        const m = data.map;
        if (
          m &&
          typeof m === "object" &&
          Number.isFinite(Number(m.lat)) &&
          Number.isFinite(Number(m.lon))
        ) {
          const z = Number(m.zoom);
          initialMapCenter = {
            lat: Number(m.lat),
            lon: Number(m.lon),
            zoom: Number.isFinite(z) ? z : 12,
          };
        }
        onComplete({
          ...fields,
          plan: buildPlaceholderTripPlan(fields, initialMapCenter),
        });
      } catch {
        setCityAiValid(false);
        setCityAiValidatedForQuery(trimmedCity);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const glassPanelStyle = {
    backgroundColor: "transparent",
  } as const;

  const inputBusy =
    !syncMismatch &&
    trimmedCity.length >= 2 &&
    !clientInvalid &&
    cityAiPending;

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-white">
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]"
        >
          <div
            className="rounded-3xl border border-zinc-200/90 p-6 shadow-sm shadow-zinc-200/50 sm:p-10"
            style={glassPanelStyle}
          >
            <div className="mb-6 sm:mb-8 flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#4ECDC4" }}
              >
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span
                className="text-[20px] font-semibold text-zinc-900 sm:text-[22px]"
              >
                TravelPlanner
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-12 sm:gap-3">
                <div className="relative sm:col-span-8">
                  <label
                    className={`mb-1.5 block text-[13px] ${showCityError ? "font-semibold" : cityFoundOk ? "font-medium text-teal-700" : "font-medium text-zinc-600"}`}
                    htmlFor="trip-city-to"
                    style={{
                      fontSize: "13px",
                      fontWeight: showCityError ? 600 : 500,
                      color: showCityError
                        ? "#ef4444"
                        : cityFoundOk
                          ? "#0f7668"
                          : undefined,
                    }}
                  >
                    {showCityError
                      ? CITY_ERROR_MESSAGE
                      : cityFoundOk
                        ? CITY_FOUND_HINT
                        : "Куда отправимся?"}
                  </label>
                  <div
                    className={`relative flex items-center gap-2 rounded-xl border bg-zinc-50 px-3 py-2.5 transition focus-within:ring-2 ${
                      showCityError
                        ? "border-red-400/50 ring-1 ring-red-400/25 focus-within:border-red-400/55 focus-within:ring-red-400/30"
                        : cityFoundOk
                          ? "border-[#4ECDC4]/70 ring-1 ring-[#4ECDC4]/25 focus-within:border-[#4ECDC4] focus-within:ring-[#4ECDC4]/35"
                          : "border-zinc-200 focus-within:border-[#4ECDC4] focus-within:ring-[#4ECDC4]/30"
                    } ${inputBusy ? "opacity-90" : ""}`}
                  >
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${showCityError ? "text-red-500/90" : cityFoundOk ? "text-[#4ECDC4]" : "text-zinc-400"}`}
                      aria-hidden
                    />
                    <input
                      id="trip-city-to"
                      value={form.to}
                      onChange={(e) => update("to", e.target.value)}
                      onBlur={handleCityBlur}
                      placeholder="Введите город"
                      aria-invalid={showCityError}
                      autoComplete="off"
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                    />
                    {inputBusy ? (
                      <Loader2
                        className="h-4 w-4 shrink-0 animate-spin text-zinc-500"
                        aria-hidden
                      />
                    ) : cityFoundOk ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-[#4ECDC4]"
                        aria-hidden
                      />
                    ) : null}
                  </div>

                </div>

                <div className="min-w-0 sm:col-span-4">
                  <label
                    className={`mb-1.5 block text-[13px] ${durationLabelFlash ? "font-semibold text-red-600" : "font-medium text-zinc-600"}`}
                    htmlFor="trip-duration-days"
                    style={{
                      fontSize: "13px",
                      fontWeight: durationLabelFlash ? 600 : 500,
                      color: durationLabelFlash ? "#ef4444" : undefined,
                    }}
                  >
                    {durationLabelFlash ? DAYS_ERROR_LABEL : "Количество дней"}
                  </label>
                  <div
                    className={`flex min-h-[42px] items-center justify-center rounded-xl border bg-zinc-50 px-3 py-2.5 transition ${
                      durationLabelFlash
                        ? "border-red-400/50 ring-1 ring-red-400/25"
                        : "border-zinc-200"
                    }`}
                  >
                    <input
                      id="trip-duration-days"
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
                      className="w-full min-w-0 max-w-full border-0 bg-transparent text-center text-sm tabular-nums text-zinc-900 outline-none [appearance:textfield] focus:outline-none focus-visible:outline-none sm:max-w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      style={{ colorScheme: "light" }}
                      aria-invalid={durationLabelFlash}
                      aria-label={
                        durationLabelFlash ? DAYS_ERROR_LABEL : "Количество дней"
                      }
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition enabled:hover:opacity-90 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#4ECDC4" }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : null}
                Создать маршрут
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
