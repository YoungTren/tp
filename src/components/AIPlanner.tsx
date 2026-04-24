import { Calendar, DollarSign, Users, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";

export function AIPlanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-[#4ECDC4] to-[#3DBDB5] rounded-3xl p-6 text-white"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-semibold text-lg">Создать поездку с AI</h3>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-3">
          <Calendar className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-xs text-white/80">Даты</p>
            <p className="text-sm font-medium">15 апр — 22 апр</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-3">
          <DollarSign className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-xs text-white/80">Бюджет на человека</p>
            <p className="text-sm font-medium">₽120 000</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-3">
          <Users className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-xs text-white/80">Путешественников</p>
            <p className="text-sm font-medium">2 человека</p>
          </div>
        </div>
      </div>

      <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold rounded-xl py-3">
        Сгенерировать план
      </Button>
    </motion.div>
  );
}
