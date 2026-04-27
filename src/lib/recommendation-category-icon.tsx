import { Utensils, Camera, Landmark } from "lucide-react";

export const recommendationCategoryIcon = (category: string) => {
  if (category.includes("Ресторан")) {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  if (category.includes("Муз")) {
    return <Camera className="h-3.5 w-3.5" />;
  }
  return <Landmark className="h-3.5 w-3.5" />;
};
