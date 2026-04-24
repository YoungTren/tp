import { Plane, Home, Utensils, Camera, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

export function BudgetCard() {
  const items = [
    { icon: Plane, label: "Перелёты", amount: "45 600", color: "text-blue-500" },
    { icon: Home, label: "Жильё", amount: "28 000", color: "text-purple-500" },
    { icon: Utensils, label: "Питание", amount: "18 400", color: "text-orange-500" },
    { icon: Camera, label: "Активности", amount: "12 800", color: "text-green-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Разбивка бюджета</h3>
        <div className="flex items-center gap-2 text-[#4ECDC4]">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">-8%</span>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
            <span className="font-semibold">₽{item.amount}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Всего на человека</span>
          <span className="text-xl font-bold">₽104 800</span>
        </div>
      </div>
    </motion.div>
  );
}
