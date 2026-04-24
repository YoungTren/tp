import { Search, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

export function Navigation() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">travelplanner</span>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-sm font-medium hover:text-[#4ECDC4] transition-colors">Главная</button>
          <button className="text-sm text-gray-600 hover:text-[#4ECDC4] transition-colors">Маршруты</button>
          <button className="text-sm text-gray-600 hover:text-[#4ECDC4] transition-colors">Идеи</button>
          <button className="text-sm text-gray-600 hover:text-[#4ECDC4] transition-colors">Бюджет</button>
          <button className="text-sm text-gray-600 hover:text-[#4ECDC4] transition-colors">Бронирования</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6">
          Создать поездку
        </Button>
      </div>
    </nav>
  );
}
