import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { Clock, TrendingUp } from "lucide-react";

export function HeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative rounded-3xl overflow-hidden bg-gray-900 text-white h-[580px]"
    >
      <div className="absolute inset-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1659083101984-43dc981999cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHx0cmF2ZWxlciUyMHdvbWFuJTIwaGF0JTIwbW91bnRhaW5zJTIwbGFuZHNjYXBlJTIwYWR2ZW50dXJlfGVufDF8fHx8MTc3NTkxODIxOXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Путешественник в горах"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      <div className="relative h-full flex flex-col justify-between p-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">7 дней</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">₽85 600</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-white/70 mb-2">Автоматизация путешествий с AI помощником</p>
            <h2 className="text-5xl font-bold leading-tight mb-4">
              Планируй путешествия<br />за минуты
            </h2>
            <p className="text-white/80 text-base max-w-md">
              Умный планировщик создаст персональный маршрут с учётом вашего бюджета и предпочтений
            </p>
          </div>

          <Button className="bg-[#4ECDC4] hover:bg-[#3DBDB5] text-gray-900 font-semibold rounded-full px-8 py-6 text-base">
            Начать планирование
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
