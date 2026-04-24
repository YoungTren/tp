import { motion } from "motion/react";
import { Heart, Sparkles, Plane } from "lucide-react";
import { InterestChip } from "./InterestChip";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Heart,
      title: "Выбери интересы и стиль",
      description: "Укажи даты, бюджет и что тебе нравится — пляжи, культура, горы или гастрономия",
      preview: (
        <div className="flex flex-wrap gap-2">
          <InterestChip label="Пляж" variant="accent" />
          <InterestChip label="Культура" variant="default" />
          <InterestChip label="Горы" variant="default" />
          <InterestChip label="Гастрономия" variant="default" />
        </div>
      )
    },
    {
      number: "02",
      icon: Sparkles,
      title: "Получи готовый маршрут",
      description: "AI создаст персональный план с городами, активностями и рекомендованными местами",
      preview: (
        <div className="space-y-2">
          <div className="bg-[#4ECDC4]/10 border border-[#4ECDC4]/20 rounded-xl p-3">
            <p className="text-xs text-gray-600 mb-1">День 1 · Париж</p>
            <p className="text-sm font-medium">Лувр → Эйфелева башня → Сена</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-600 mb-1">День 2 · Париж</p>
            <p className="text-sm font-medium">Монмартр → Версаль → Латинский квартал</p>
          </div>
        </div>
      )
    },
    {
      number: "03",
      icon: Plane,
      title: "Управляй всем в одном месте",
      description: "Бюджет, бронирования, участники, чек-листы — всё синхронизировано и доступно команде",
      preview: (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600">Общий бюджет</p>
            <p className="text-lg font-bold">₽104 800</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Перелёты</span>
              <span className="font-medium">₽45 600</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Жильё</span>
              <span className="font-medium">₽28 000</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="px-8 py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Как это работает
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Три простых шага от идеи до готовой поездки
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-gray-200">{step.number}</div>
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <step.icon className="w-6 h-6 text-gray-900" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">{step.description}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  {step.preview}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="absolute top-20 -right-6 text-4xl text-gray-300">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
