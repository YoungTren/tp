import { motion } from "motion/react";
import { X, Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { TripRecommendation } from "@/types/trip";
import { recommendationCategoryIcon } from "@/lib/recommendation-category-icon";

interface RecommendationsListProps {
  onClose: () => void;
  selectedId: string | null;
  recommendations: TripRecommendation[];
}

export function RecommendationsList({ onClose, selectedId, recommendations }: RecommendationsListProps) {
  const sorted =
    selectedId
      ? [
          ...recommendations.filter((rec) => rec.id === selectedId),
          ...recommendations.filter((rec) => rec.id !== selectedId),
        ]
      : recommendations;

  return (
    <div
      className="flex max-h-dvh min-h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 bg-white px-3 py-3 sm:px-4 md:px-8 md:py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="truncate text-base font-semibold text-[#1a1a1a] sm:text-lg">
            Все рекомендации
          </h1>
        </div>
        <p className="hidden sm:block" style={{ fontSize: "14px", color: "#666" }}>{recommendations.length} мест</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-4 sm:px-4 md:px-10 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-4 lg:max-w-6xl">
          {sorted.map((rec, index) => {
            const isSelected = rec.id === selectedId;

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-2xl bg-white p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                style={{
                  border: isSelected ? "2px solid #4ECDC4" : "2px solid transparent"
                }}
              >
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <ImageWithFallback
                    src={rec.image}
                    alt={rec.title}
                    className="h-48 w-full md:w-72 shrink-0 rounded-xl object-cover"
                    responsiveSizes="(max-width: 767px) 100vw, 288px"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <h3 className="mb-1.5" style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">{recommendationCategoryIcon(rec.category)}</span>
                          <span style={{ fontSize: "13px", color: "#666" }}>{rec.category}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" style={{ color: "#f5a623" }} />
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{rec.rating}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mb-4" style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>
                      {rec.description}
                    </p>

                    <div className="space-y-2">
                      {rec.highlights.map((highlight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: "#4ECDC4", marginTop: "0.4em" }}
                          />
                          <span style={{ fontSize: "13px", color: "#666", lineHeight: 1.5 }}>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
