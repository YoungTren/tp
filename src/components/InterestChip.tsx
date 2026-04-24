import { Plus, User, MapPin } from "lucide-react";

interface InterestChipProps {
  label: string;
  icon?: "user" | "location" | "default";
  variant?: "default" | "dark" | "accent";
  hasAdd?: boolean;
}

export function InterestChip({ label, icon = "default", variant = "default", hasAdd = false }: InterestChipProps) {
  const icons = {
    user: <User className="w-4 h-4" />,
    location: <MapPin className="w-4 h-4" />,
    default: null,
  };

  const variants = {
    default: "bg-white border border-gray-200 text-gray-700 hover:border-gray-300",
    dark: "bg-gray-900 text-white hover:bg-gray-800",
    accent: "bg-[#4ECDC4] text-white hover:bg-[#3DBDB5]",
  };

  return (
    <button className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${variants[variant]}`}>
      {hasAdd && <Plus className="w-4 h-4" />}
      {icons[icon]}
      <span>{label}</span>
    </button>
  );
}
