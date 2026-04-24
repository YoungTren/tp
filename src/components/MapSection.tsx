import { MapPin, Plus } from "lucide-react";
import { motion } from "motion/react";

export function MapSection() {
  const cities = [
    { name: "Париж", x: "35%", y: "25%", route: true },
    { name: "Рим", x: "42%", y: "42%", route: true },
    { name: "Барселона", x: "28%", y: "48%", route: true },
    { name: "Амстердам", x: "38%", y: "18%", route: false },
    { name: "Прага", x: "48%", y: "30%", route: false },
    { name: "Вена", x: "52%", y: "35%", route: false },
  ];

  return (
    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 h-full min-h-[500px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Маршрут путешествия</h3>
        <button className="text-sm text-gray-600 hover:text-gray-900">Изменить</button>
      </div>

      <div className="relative w-full h-[400px] bg-white rounded-2xl overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {cities.map((city, index) => (
          <motion.div
            key={city.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            className="absolute"
            style={{ left: city.x, top: city.y, transform: "translate(-50%, -50%)" }}
          >
            {city.route ? (
              <div className="relative">
                <div className="bg-[#4ECDC4] text-white rounded-full px-4 py-2 text-sm font-medium shadow-lg flex items-center gap-2 whitespace-nowrap">
                  <MapPin className="w-4 h-4" />
                  {city.name}
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#4ECDC4] rounded-full" />
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-full w-3 h-3" />
            )}
          </motion.div>
        ))}

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <motion.path
            d="M 35% 25% Q 38% 33%, 42% 42% Q 35% 45%, 28% 48%"
            fill="none"
            stroke="#4ECDC4"
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.8 }}
          />
        </svg>

        <button className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
