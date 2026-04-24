import { motion } from "motion/react";
import { X, Star, Utensils, Camera, Landmark } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Recommendation {
  id: number;
  title: string;
  category: string;
  rating: number;
  image: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

interface RecommendationsListProps {
  onClose: () => void;
  selectedId: number | null;
}

const fullRecommendations: Recommendation[] = [
  {
    id: 1,
    title: "Колизей",
    category: "Достопримечательность",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1698103182362-51abdc45d008?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxSb21lJTIwQ29sb3NzZXVtJTIwSXRhbHl8ZW58MXx8fHwxNzc2MjU3OTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Величественный амфитеатр, построенный в I веке н.э., символ Римской империи и одно из самых узнаваемых сооружений в мире.",
    highlights: [
      "Грандиозная архитектура древнего Рима",
      "Подземные коридоры и арена гладиаторов",
      "Панорамный вид с верхних ярусов",
      "Экскурсии с аудиогидом на русском языке"
    ],
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
  {
    id: 2,
    title: "Траттория у Марио",
    category: "Ресторан",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1776015036314-0487d8ce89f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJdGFsaWFuJTIwcmVzdGF1cmFudCUyMG91dGRvb3IlMjBkaW5pbmd8ZW58MXx8fHwxNzc2MjU4MDI0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Аутентичная римская траттория с домашней кухней и уютной атмосферой. Семейный ресторан с традициями, передающимися из поколения в поколение.",
    highlights: [
      "Карбонара по классическому рецепту",
      "Свежая домашняя паста ручной работы",
      "Римская пинца и артишоки по-еврейски",
      "Отличная винная карта местных вин"
    ],
    icon: <Utensils className="h-3.5 w-3.5" />,
  },
  {
    id: 3,
    title: "Музеи Ватикана",
    category: "Музей",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1646045289790-ebb555a6ab64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWYXRpY2FuJTIwbXVzZXVtJTIwUm9tZXxlbnwxfHx8fDE3NzYyNTgwMjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Одна из величайших коллекций искусства в мире, включающая шедевры эпохи Ренессанса и уникальные археологические находки.",
    highlights: [
      "Сикстинская капелла с фресками Микеланджело",
      "Станцы Рафаэля с 'Афинской школой'",
      "Галерея географических карт",
      "Античные скульптуры в Музее Пио-Клементино"
    ],
    icon: <Camera className="h-3.5 w-3.5" />,
  },
  {
    id: 4,
    title: "Фонтан Треви",
    category: "Достопримечательность",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1662406652046-77ce0294592f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUcmV2aSUyMGZvdW50YWluJTIwUm9tZSUyMG5pZ2h0fGVufDF8fHx8MTc3NjI1ODAyNHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Самый знаменитый фонтан Рима в стиле барокко. По традиции, брошенная монета гарантирует возвращение в Вечный город.",
    highlights: [
      "Впечатляющая скульптурная композиция",
      "Красивейшая подсветка в вечернее время",
      "Традиция бросания монет",
      "Отличное джелато в близлежащих кафе"
    ],
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
  {
    id: 5,
    title: "Пантеон",
    category: "Достопримечательность",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1662759327169-e95191aa6f4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    description: "Древнеримский храм, построенный в 126 году н.э., с величественным куполом и уникальным окулусом в центре.",
    highlights: [
      "Самый большой неармированный купол в мире",
      "Гробница Рафаэля и итальянских королей",
      "Бесплатный вход для всех посетителей",
      "Уникальная игра света через окулус"
    ],
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
  {
    id: 6,
    title: "Остерия да Фортунато",
    category: "Ресторан",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    description: "Семейный ресторан в районе Трастевере, известный аутентичной римской кухней и теплой атмосферой.",
    highlights: [
      "Паста алла грициа и аматричана",
      "Тирамису домашнего приготовления",
      "Уютный дворик для летних вечеров",
      "Доступные цены для центра Рима"
    ],
    icon: <Utensils className="h-3.5 w-3.5" />,
  },
];

export function RecommendationsList({ onClose, selectedId }: RecommendationsListProps) {
  // Сортируем рекомендации: выбранная первая, остальные в исходном порядке
  const sortedRecommendations = selectedId
    ? [
        ...fullRecommendations.filter(rec => rec.id === selectedId),
        ...fullRecommendations.filter(rec => rec.id !== selectedId)
      ]
    : fullRecommendations;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#F5F5F0" }}>
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200/60 bg-white px-4 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>Все рекомендации</h1>
        </div>
        <p className="hidden sm:block" style={{ fontSize: "14px", color: "#666" }}>{fullRecommendations.length} мест</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 md:px-8 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {sortedRecommendations.map((rec, index) => {
            const isSelected = rec.id === selectedId;
            
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-2xl bg-white p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                style={{
                  border: isSelected ? "2px solid #4ECDC4" : "2px solid transparent"
                }}
              >
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  {/* Image */}
                  <ImageWithFallback
                    src={rec.image}
                    alt={rec.title}
                    className="h-48 w-full md:w-72 shrink-0 rounded-xl object-cover"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="mb-3">
                      <h3 className="mb-1.5" style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">{rec.icon}</span>
                          <span style={{ fontSize: "13px", color: "#666" }}>{rec.category}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" style={{ color: "#f5a623" }} />
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{rec.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-4" style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>
                      {rec.description}
                    </p>

                    {/* Highlights */}
                    <div className="space-y-2">
                      {rec.highlights.map((highlight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: "#4ECDC4", marginTop: "0.4em" }}
                          />
                          <span style={{ fontSize: "13px", color: "#666", lineHeight: 1.5 }}>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}