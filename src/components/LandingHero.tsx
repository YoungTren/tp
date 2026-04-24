import { Button } from "./ui/button";
import { motion } from "motion/react";
import { Sparkles, ArrowRight, MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function LandingHero() {
  const destinations = ["Париж", "Токио", "Бали", "Рим", "Исландия"];

  return (
    <section className="relative px-8 pt-16 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 bg-[#4ECDC4]/10 text-[#4ECDC4] px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Планирование с AI помощником</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl font-bold leading-tight text-gray-900">
                Планируй путешествия
                <br />
                <span className="text-gray-600">за минуты</span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Автоматизируй создание маршрутов, управляй бюджетом и организуй всю поездку в одном месте
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-full group">
                Создать поездку
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" className="text-gray-700 px-6 py-6 text-base hover:text-gray-900">
                Посмотреть пример
              </Button>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <span className="text-sm text-gray-500">Популярные направления:</span>
              <div className="flex items-center gap-2">
                {destinations.map((dest) => (
                  <button
                    key={dest}
                    className="text-xs bg-white border border-gray-200 hover:border-[#4ECDC4] hover:text-[#4ECDC4] px-3 py-1.5 rounded-full transition-all"
                  >
                    {dest}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Visual Hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1659083101984-43dc981999cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
                alt="Путешествие"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Floating stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#4ECDC4] to-[#3DBDB5] rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AI маршрут готов</p>
                    <p className="text-sm font-semibold">7 дней · ₽104 800</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute bottom-8 left-8 right-8"
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Европа · 3 города</h3>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[#4ECDC4]" />
                      <span className="text-xs text-gray-600">12 мест</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {["Париж", "Рим", "Барселона"].map((city) => (
                      <div key={city} className="bg-[#4ECDC4]/10 text-[#4ECDC4] px-3 py-1 rounded-full text-xs font-medium">
                        {city}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
