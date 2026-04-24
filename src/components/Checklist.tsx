import { Checkbox } from "./ui/checkbox";
import { motion } from "motion/react";

export function Checklist() {
  const items = [
    { id: "1", label: "Забронировать отели", checked: true },
    { id: "2", label: "Купить билеты на поезд", checked: true },
    { id: "3", label: "Оформить страховку", checked: false },
    { id: "4", label: "Заказать экскурсии", checked: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
    >
      <h3 className="font-semibold text-lg mb-4">Чек-лист подготовки</h3>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            className="flex items-center gap-3"
          >
            <Checkbox id={item.id} checked={item.checked} className="border-gray-300" />
            <label
              htmlFor={item.id}
              className={`text-sm cursor-pointer ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}
            >
              {item.label}
            </label>
          </motion.div>
        ))}
      </div>

      <button className="mt-4 w-full text-sm text-[#4ECDC4] font-medium hover:text-[#3DBDB5] transition-colors">
        + Добавить задачу
      </button>
    </motion.div>
  );
}
