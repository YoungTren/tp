import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ChevronDown } from "lucide-react";

export function TravelersSection() {
  const travelers = [
    { name: "Анастасия", role: "Организатор", initials: "АН", image: "" },
    { name: "Дмитрий", role: "Участник", initials: "ДМ", image: "" },
    { name: "Екатерина", role: "Участник", initials: "ЕК", image: "" },
    { name: "Александр", role: "Участник", initials: "АЛ", image: "" },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-sm mb-4 text-gray-700">Участники поездки</h3>

      <div className="space-y-3">
        {travelers.map((traveler) => (
          <div key={traveler.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={traveler.image} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                  {traveler.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{traveler.name}</p>
                <p className="text-xs text-gray-500">{traveler.role}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  );
}
