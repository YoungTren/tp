import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function FinalCTA() {
  return (
    <section className="px-8 py-24 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden bg-gray-900 text-white"
        >
          <div className="absolute inset-0">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1767708097229-36e0d9125e00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200"
              alt="Путешествие"
              className="w-full h-full object-cover opacity-30"
            />
          </div>

          <div className="relative px-16 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4 text-[#4ECDC4]" />
              <span>Начни планировать сегодня</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl font-bold mb-6 leading-tight"
            >
              Твоё следующее путешествие<br />начинается здесь
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-white/80 mb-10 max-w-2xl mx-auto"
            >
              Создай персональный маршрут с AI, управляй бюджетом и организуй всю поездку в одном месте
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center gap-4"
            >
              <Button className="bg-[#4ECDC4] hover:bg-[#3DBDB5] text-gray-900 px-10 py-7 text-lg rounded-full font-semibold group shadow-lg">
                Создать поездку бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" className="border-white/30 hover:bg-white/10 text-white px-8 py-7 text-base rounded-full">
                Узнать больше
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-sm text-white/60 mt-8"
            >
              Регистрация не требуется • Начни за 2 минуты
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
