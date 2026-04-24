import { motion } from "motion/react";
import { AIPlanner } from "./AIPlanner";
import { MapSection } from "./MapSection";
import { BudgetCard } from "./BudgetCard";
import { DayPlan } from "./DayPlan";
import { Recommendations } from "./Recommendations";
import { ActivityGallery } from "./ActivityGallery";

export function ProductShowcase() {
  return (
    <section className="px-8 py-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Умный интерфейс планировщика
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Все инструменты для организации путешествия в одном продуманном интерфейсе
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 shadow-xl"
        >
          <div className="grid grid-cols-12 gap-6">
            {/* Left column */}
            <div className="col-span-3 space-y-6">
              <AIPlanner />
              <BudgetCard />
            </div>

            {/* Center column */}
            <div className="col-span-6 space-y-6">
              <MapSection />
              <ActivityGallery />
            </div>

            {/* Right column */}
            <div className="col-span-3 space-y-6">
              <DayPlan />
              <Recommendations />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4ECDC4] rounded-full" />
            <span>Интерактивная карта маршрута</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4ECDC4] rounded-full" />
            <span>Автоматический расчёт бюджета</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4ECDC4] rounded-full" />
            <span>Персональные рекомендации</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4ECDC4] rounded-full" />
            <span>План по дням с деталями</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
