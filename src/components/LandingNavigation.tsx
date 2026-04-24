import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";

export function LandingNavigation() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100"
    >
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">TravelPlanner</span>
        </div>

        <div className="flex items-center gap-8">
          <button className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Возможности</button>
          <button className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Как работает</button>
          <button className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Примеры</button>
          <button className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Цены</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
          Войти
        </Button>
        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6">
          Создать поездку
        </Button>
      </div>
    </motion.nav>
  );
}
