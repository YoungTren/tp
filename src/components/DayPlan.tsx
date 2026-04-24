import { Coffee, Utensils, Camera, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

export function DayPlan() {
  const activities = [
    { time: "08:00", icon: Coffee, title: "Завтрак в Café de Flore", duration: "1 час" },
    { time: "10:00", icon: Camera, title: "Лувр и окрестности", duration: "3 часа" },
    { time: "13:30", icon: Utensils, title: "Обед в Le Marais", duration: "1.5 часа" },
    { time: "16:00", icon: Sun, title: "Прогулка по Сене", duration: "2 часа" },
    { time: "19:30", icon: Moon, title: "Эйфелева башня на закате", duration: "2 часа" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">План на день</h3>
          <p className="text-sm text-gray-600">День 3, Париж</p>
        </div>
        <div className="text-sm text-gray-600">Пт, 17 апр</div>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200" />

        {activities.map((activity, index) => (
          <motion.div
            key={activity.time}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            className="flex gap-4 relative"
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700 relative z-10">
                <activity.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-gray-500 font-medium">{activity.time}</span>
            </div>

            <div className="flex-1 pb-2">
              <h4 className="font-medium text-sm mb-1">{activity.title}</h4>
              <p className="text-xs text-gray-600">{activity.duration}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
