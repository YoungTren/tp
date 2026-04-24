import { motion } from "motion/react";
import { TravelersSection } from "./TravelersSection";
import { Checklist } from "./Checklist";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CheckCircle2, Users, Globe, Calendar } from "lucide-react";

export function SocialProof() {
  const stats = [
    { icon: Users, value: "12 000+", label: "Путешественников" },
    { icon: Globe, value: "180+", label: "Стран и городов" },
    { icon: Calendar, value: "25 000+", label: "Поездок спланировано" }
  ];

  const features = [
    "Автоматическое создание маршрута",
    "Синхронизация с командой",
    "Интеграция с бронированиями",
    "Офлайн-доступ к плану"
  ];

  return (
    <section className="px-8 py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-16 items-center">
          {/* Left: Stats & Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-12"
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Используют тысячи путешественников
              </h2>
              <p className="text-lg text-gray-600">
                От solo-трипов до семейных путешествий — TravelPlanner помогает организовать поездку любой сложности
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <stat.icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4ECDC4] flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Collaborative features preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Совместное планирование</h3>
                <p className="text-sm text-gray-600">
                  Приглашай друзей, синхронизируй планы и управляй задачами вместе
                </p>
              </div>

              <div className="space-y-4">
                <TravelersSection />
                <Checklist />
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden h-48">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1770564512491-e88eb93d48a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
                alt="Путешественники"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-white font-medium text-sm">
                  «TravelPlanner помог нам собрать всю информацию о трипе в одном месте. Больше не теряем детали в
                  чатах»
                </p>
                <p className="text-white/80 text-xs mt-2">Анастасия К., организатор поездки в Европу</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
