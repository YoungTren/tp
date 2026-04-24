import { Sparkles, TrendingDown, Users, Calendar } from "lucide-react";
import { motion } from "motion/react";

export function ValueProposition() {
  const benefits = [
    {
      icon: Sparkles,
      title: "AI-планирование",
      description: "Персональный маршрут за минуты на основе ваших предпочтений и бюджета"
    },
    {
      icon: TrendingDown,
      title: "Контроль бюджета",
      description: "Прозрачная разбивка расходов на перелёты, жильё, еду и активности"
    },
    {
      icon: Calendar,
      title: "Детальный план",
      description: "Полное расписание по дням с местами, временем и рекомендациями"
    },
    {
      icon: Users,
      title: "Совместная организация",
      description: "Планируйте поездку вместе, делитесь идеями и синхронизируйте планы"
    }
  ];

  return (
    <section className="px-8 py-20 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Всё для твоего путешествия в одном месте
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            От идеи до готового маршрута — TravelPlanner автоматизирует рутину и даёт время на главное
          </p>
        </motion.div>

        <div className="grid grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                <benefit.icon className="w-7 h-7 text-gray-900" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
