import { Sparkles } from "lucide-react";

export function Footer() {
  const links = {
    product: ["Возможности", "Цены", "Интеграции", "Changelog"],
    company: ["О нас", "Блог", "Вакансии", "Пресс-кит"],
    resources: ["Помощь", "FAQ", "Сообщество", "Контакты"],
    legal: ["Условия", "Конфиденциальность", "Безопасность"]
  };

  return (
    <footer className="px-8 py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 gap-12 mb-12">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">TravelPlanner</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Умный планировщик путешествий с AI помощником
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Продукт</h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Компания</h4>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Ресурсы</h4>
            <ul className="space-y-2">
              {links.resources.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Документы</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <p>© 2026 TravelPlanner. Все права защищены.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-900 transition-colors">Twitter</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Instagram</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
