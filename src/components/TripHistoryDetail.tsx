import { useState } from "react";
import { motion } from "motion/react";
import {
  Plane, MapPin, Star, Clock, Utensils,
  Camera, Landmark, Users, ArrowLeft, Heart, ChevronDown
} from "lucide-react";
import { AppPageBackdrop } from "./app-page-backdrop";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface TripHistoryDetailProps {
  tripId: string;
  onBack: () => void;
}

const tripDetails: Record<string, {
  from: string;
  to: string;
  dateStart: string;
  dateEnd: string;
  budget: string;
  travelers: string;
  dayPlans: Array<{ day: number; title: string; items: string[] }>;
  favorites: Array<{
    id: number;
    title: string;
    category: string;
    rating: number;
    image: string;
    icon: React.ReactNode;
  }>;
}> = {
  "1": {
    from: "Москва",
    to: "Рим",
    dateStart: "2026-03-10",
    dateEnd: "2026-03-17",
    budget: "80 000",
    travelers: "2",
    dayPlans: [
      { day: 1, title: "Прибытие и знакомство", items: ["Трансфер из аэропорта", "Заселение в отель", "Прогулка по центру", "Ужин в траттории"] },
      { day: 2, title: "Античный Рим", items: ["Колизей и Палатинский холм", "Римский форум", "Обед у Пантеона", "Вечер у фнтана реви"] },
      { day: 3, title: "Ватикан и искусство", items: ["Музеи Ватикана", "Сикстинская капелла", "Собор Святого Петра", "Замок Святого Ангела"] },
    ],
    favorites: [
      {
        id: 1,
        title: "Колизей",
        category: "Достопримечательность",
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1698103182362-51abdc45d008?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        icon: <Landmark className="h-3.5 w-3.5" />,
      },
      {
        id: 2,
        title: "Траттория у Марио",
        category: "Ресторан",
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1776015036314-0487d8ce89f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        icon: <Utensils className="h-3.5 w-3.5" />,
      },
      {
        id: 3,
        title: "Фонтан Треви",
        category: "Достопримечательность",
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1662406652046-77ce0294592f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        icon: <Landmark className="h-3.5 w-3.5" />,
      },
    ],
  },
  "2": {
    from: "Москва",
    to: "Париж",
    dateStart: "2026-02-14",
    dateEnd: "2026-02-21",
    budget: "95 000",
    travelers: "2",
    dayPlans: [
      { day: 1, title: "Романтическое начало", items: ["Прибытие в Париж", "Заселение в отель", "Прогулка по Монмартру", "Ужин в бистро"] },
      { day: 2, title: "Классический Париж", items: ["Эйфелева башня", "Сена и круиз", "Лувр", "Вечер на Елисейских полях"] },
      { day: 3, title: "Культурный день", items: ["Нотр-Дам", "Латинский квартал", "Музей Орсе", "Ужин в Марэ"] },
    ],
    favorites: [
      {
        id: 1,
        title: "Эйфелева башня",
        category: "Достопримечательность",
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        icon: <Landmark className="h-3.5 w-3.5" />,
      },
      {
        id: 2,
        title: "Лувр",
        category: "Музей",
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        icon: <Camera className="h-3.5 w-3.5" />,
      },
    ],
  },
};

export function TripHistoryDetail({ tripId, onBack }: TripHistoryDetailProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isTripExpanded, setIsTripExpanded] = useState(false);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false);
  const trip = tripDetails[tripId] || tripDetails["1"];
  const currentDayPlan = trip.dayPlans.find((d) => d.day === selectedDay) || trip.dayPlans[0];

  const formatDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <AppPageBackdrop />

      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200/60 bg-white px-4 md:px-8 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "#4ECDC4" }}>
              <Plane className="h-4.5 w-4.5 text-white" />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>{trip.to}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex-1 overflow-hidden mx-auto w-full max-w-[1400px] p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:gap-5 h-full lg:grid lg:grid-cols-[260px_1fr_280px]">
          {/* Mobile: Trip card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:hidden order-1"
          >
            <div
              className="rounded-2xl p-3 text-white flex flex-col"
              style={{
                background: "linear-gradient(135deg, #4ECDC4 0%, #44B8B0 50%, #3AA89F 100%)",
              }}
            >
              <button
                onClick={() => setIsTripExpanded(!isTripExpanded)}
                className="flex items-center justify-between gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Поездка</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${isTripExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: isTripExpanded ? "auto" : "0px",
                  opacity: isTripExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 mt-3">
                  {/* Город вылета */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Plane className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город вылета</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.from}</span>
                    </div>
                  </div>

                  {/* Город / направление */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <MapPin className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город / направление</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.to}</span>
                    </div>
                  </div>

                  {/* Даты */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Clock className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Даты</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(trip.dateStart)}</span>
                      </div>
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(trip.dateEnd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Бюджет + Люди */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Star className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Бюджет / чел., ₽</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.budget}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Users className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Количество людей</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.travelers}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Mobile: Favorites */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:hidden order-2"
          >
            <div className="rounded-2xl bg-white p-3 shadow-sm flex flex-col">
              <button
                onClick={() => setIsFavoritesExpanded(!isFavoritesExpanded)}
                className="flex items-center justify-between gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" style={{ color: "#4ECDC4" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>Избранное</h3>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isFavoritesExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: isFavoritesExpanded ? "auto" : "0px",
                  opacity: isFavoritesExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-3">
                  {trip.favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-gray-50 cursor-pointer"
                    >
                      <ImageWithFallback
                        src={fav.image}
                        alt={fav.title}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{fav.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{fav.icon}</span>
                          <span style={{ fontSize: "11px", color: "#999" }}>{fav.category}</span>
                          <Star className="h-3 w-3" style={{ color: "#f5a623" }} />
                          <span style={{ fontSize: "11px", color: "#999" }}>{fav.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Left: Trip card - Desktop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="hidden lg:flex lg:flex-col lg:h-full"
          >
            <div
              className="rounded-2xl lg:p-5 p-3 text-white flex flex-col"
              style={{
                background: "linear-gradient(135deg, #4ECDC4 0%, #44B8B0 50%, #3AA89F 100%)",
              }}
            >
              <button
                onClick={() => setIsTripExpanded(!isTripExpanded)}
                className={`flex items-center justify-between gap-2 lg:pointer-events-none ${isTripExpanded ? 'mb-4' : 'mb-0'} lg:mb-4 lg:py-0 py-0`}
              >
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span style={{ fontSize: "14px", fontWeight: 600 }} className="lg:text-[17px]">Ваша поездка</span>
                </div>
                <ChevronDown 
                  className={`h-4 w-4 lg:h-5 lg:w-5 transition-transform lg:hidden ${isTripExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{ 
                  height: isTripExpanded ? "auto" : "0px",
                  opacity: isTripExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden lg:!h-auto lg:!opacity-100"
              >
                <div className={`flex flex-col gap-3 ${isTripExpanded ? 'mt-0' : ''} lg:mt-0`}>
                  {/* Город вылета */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Plane className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город вылета</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.from}</span>
                    </div>
                  </div>

                  {/* Город / направление */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <MapPin className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город / направление</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.to}</span>
                    </div>
                  </div>

                  {/* Даты */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Clock className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Даты</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(trip.dateStart)}</span>
                      </div>
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(trip.dateEnd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Бюджет + Люди */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Star className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Бюджет / чел., ₽</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.budget}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Users className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Количество людей</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{trip.travelers}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Center: Route map area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="order-3 lg:order-2"
          >
            <div className="rounded-2xl bg-white p-5 shadow-sm h-full lg:min-h-0 min-h-[400px] flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#1a1a1a" }}>Маршрут путешествия</h2>
              </div>

              <div className="mb-4 flex items-center gap-2 text-gray-500" style={{ fontSize: "14px" }}>
                <MapPin className="h-4 w-4" style={{ color: "#4ECDC4" }} />
                <span>Назначение: <span style={{ fontWeight: 500, color: "#1a1a1a" }}>{trip.to}</span></span>
              </div>

              {/* Map placeholder */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: "radial-gradient(circle at 30% 40%, #4ECDC4 0%, transparent 60%), radial-gradient(circle at 70% 60%, #4ECDC4 0%, transparent 60%)",
                  }}
                />
                <div className="z-10 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-gray-400" style={{ fontSize: "14px" }}>Карта маршрута</p>
                  <p className="text-gray-300" style={{ fontSize: "12px" }}>{trip.from} → {trip.to}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Day plan + Favorites */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col gap-5 order-4 lg:order-3"
          >
            {/* Day plan */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>План на день</h3>
              </div>

              {/* Day selector */}
              <div className="mb-3 flex gap-1.5">
                {trip.dayPlans.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      backgroundColor: selectedDay === d.day ? "#4ECDC4" : "#f3f3f5",
                      color: selectedDay === d.day ? "white" : "#717182",
                    }}
                  >
                    {d.day}
                  </button>
                ))}
              </div>

              <p className="mb-3" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                {currentDayPlan.title}
              </p>

              <div className="space-y-2">
                {currentDayPlan.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full mt-1.5"
                      style={{ backgroundColor: "#4ECDC4" }}
                    />
                    <span style={{ fontSize: "13px", color: "#555", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorites */}
            <div className="rounded-2xl bg-white p-5 shadow-sm lg:flex-1 lg:min-h-0 flex flex-col">
              <button
                onClick={() => setIsFavoritesExpanded(!isFavoritesExpanded)}
                className={`flex items-center justify-between gap-2 lg:pointer-events-none ${isFavoritesExpanded ? 'mb-3' : 'mb-0'} lg:mb-3`}
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" style={{ color: "#4ECDC4" }} />
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>Понравившиеся</h3>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 text-gray-400 transition-transform lg:hidden ${isFavoritesExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{ 
                  height: isFavoritesExpanded ? "auto" : "0px",
                  opacity: isFavoritesExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden lg:!h-auto lg:!opacity-100 lg:flex-1 lg:flex lg:flex-col"
              >
                <div className="space-y-2 lg:flex-1 lg:overflow-auto">
                  {trip.favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-gray-50 cursor-pointer"
                    >
                      <ImageWithFallback
                        src={fav.image}
                        alt={fav.title}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{fav.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{fav.icon}</span>
                          <span style={{ fontSize: "11px", color: "#999" }}>{fav.category}</span>
                          <Star className="h-3 w-3" style={{ color: "#f5a623" }} />
                          <span style={{ fontSize: "11px", color: "#999" }}>{fav.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}