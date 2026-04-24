import { useState } from "react";
import { motion } from "motion/react";
import {
  Plane, MapPin, Plus, ChevronRight, Star, Clock, Utensils,
  Camera, Landmark, LogOut, Settings, Bell, Users, ChevronDown
} from "lucide-react";
import { AppPageBackdrop } from "./app-page-backdrop";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { TripData } from "./TripSetup";

interface DashboardProps {
  tripData: TripData;
  onLogout: () => void;
  onOpenHistory: () => void;
  onCreateNew: () => void;
  onOpenRecommendations: () => void;
  onOpenRecommendationById: (id: number) => void;
}

const recommendations = [
  {
    id: 1,
    title: "Колизей",
    category: "Достопримечательность",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1698103182362-51abdc45d008?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxSb21lJTIwQ29sb3NzZXVtJTIwSXRhbHl8ZW58MXx8fHwxNzc2MjU3OTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
  {
    id: 2,
    title: "Траттория у Марио",
    category: "Ресторан",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1776015036314-0487d8ce89f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJdGFsaWFuJTIwcmVzdGF1cmFudCUyMG91dGRvb3IlMjBkaW5pbmd8ZW58MXx8fHwxNzc2MjU4MDI0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    icon: <Utensils className="h-3.5 w-3.5" />,
  },
  {
    id: 3,
    title: "Музеи Ватикана",
    category: "Мзей",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1646045289790-ebb555a6ab64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWYXRpY2FuJTIwbXVzZXVtJTIwUm9tZXxlbnwxfHx8fDE3NzYyNTgwMjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    icon: <Camera className="h-3.5 w-3.5" />,
  },
  {
    id: 4,
    title: "Фонтан Треви",
    category: "Достопримечательность",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1662406652046-77ce0294592f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUcmV2aSUyMGZvdW50YWluJTIwUm9tZSUyMG5pZ2h0fGVufDF8fHx8MTc3NjI1ODAyNHww&ixlib=rb-4.1.0&q=80&w=1080",
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
];

const dayPlans = [
  { day: 1, title: "Прибытие и знакомство", items: ["Трансфер из аэропорта", "Заселение в отель", "Прогулка по центру", "Ужин в траттории"] },
  { day: 2, title: "Античный Рим", items: ["Колизей и Палатинский холм", "Римский форум", "Обед у Пантеона", "Вечер у фонтана Треви"] },
  { day: 3, title: "Ватикан и искусство", items: ["Музеи Ватикана", "Сикстинская капелла", "Собор Святого Петра", "Замок Святого Ангела"] },
];

export function Dashboard({ tripData, onLogout, onOpenHistory, onCreateNew, onOpenRecommendations, onOpenRecommendationById }: DashboardProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isTripExpanded, setIsTripExpanded] = useState(false);
  const destination = tripData.to || "Рим";
  const departure = tripData.from || "Москва";
  const currentDayPlan = dayPlans.find((d) => d.day === selectedDay) || dayPlans[0];

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
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "#4ECDC4" }}>
              <Plane className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="hidden sm:inline" style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>TravelPlanner</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNew}
              className="rounded-lg px-3 md:px-4 py-2 transition-all hover:scale-105"
              style={{
                backgroundColor: "#4ECDC4",
                color: "white",
                fontSize: "14px",
                fontWeight: 500
              }}
            >
              Создать
            </button>
            <button
              onClick={onOpenHistory}
              className="rounded-lg border px-3 md:px-4 py-2 transition-all hover:bg-gray-50"
              style={{
                borderColor: "#e5e5e5",
                color: "#555",
                fontSize: "14px",
                fontWeight: 500
              }}
            >
              История
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <Bell className="h-4.5 w-4.5" />
          </button>
          <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <Settings className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
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
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{departure || "—"}</span>
                    </div>
                  </div>

                  {/* Город / направление */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <MapPin className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город / направление</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{destination || "—"}</span>
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
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(tripData.dateStart)}</span>
                      </div>
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(tripData.dateEnd)}</span>
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
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{tripData.budget || "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Users className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Количество людей</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{tripData.travelers}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Mobile: Recommendations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:hidden order-2"
          >
            <button
              onClick={onOpenRecommendations}
              className="rounded-2xl bg-white p-3 shadow-sm flex items-center justify-between gap-1.5 w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                Рекомендации
              </h3>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </motion.div>

          {/* Left: Trip card - Desktop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="hidden lg:flex lg:flex-col lg:h-full"
          >
            <div
              className="rounded-2xl lg:p-5 p-3 text-white flex flex-col lg:h-full"
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
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{departure || "—"}</span>
                    </div>
                  </div>

                  {/* Город / направление */}
                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <MapPin className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Город / направление</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{destination || "—"}</span>
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
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(tripData.dateStart)}</span>
                      </div>
                      <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatDate(tripData.dateEnd)}</span>
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
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{tripData.budget || "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/15 p-3.5 backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-white/80">
                      <Users className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>Количество людей</span>
                    </div>
                    <div className="rounded-lg bg-white/15 px-3.5 py-2.5">
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{tripData.travelers}</span>
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
                <button
                  className="rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                  style={{ fontSize: "13px", fontWeight: 500 }}
                >
                  Изменить
                </button>
              </div>

              <div className="mb-4 flex items-center gap-2 text-gray-500" style={{ fontSize: "14px" }}>
                <MapPin className="h-4 w-4" style={{ color: "#4ECDC4" }} />
                <span>Назначение: <span style={{ fontWeight: 500, color: "#1a1a1a" }}>{destination}</span></span>
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
                  <p className="text-gray-300" style={{ fontSize: "12px" }}>{departure} → {destination}</p>
                </div>

                {/* Add point button */}
                <button
                  className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105"
                  style={{ color: "#4ECDC4" }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right: Day plan + Recommendations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-col gap-5 order-4 lg:order-3"
          >
            {/* Day plan */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>План на день</h3>
              </div>

              {/* Day selector */}
              <div className="mb-3 flex gap-1.5">
                {dayPlans.map((d) => (
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

            {/* Recommendations */}
            <div className="rounded-2xl bg-white p-5 shadow-sm lg:flex-1 lg:min-h-0 flex flex-col hidden lg:flex">
              <div className="mb-3 flex items-center justify-between">
                <h3
                  onClick={onOpenRecommendations}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}
                >
                  Рекомендации
                </h3>
                <button
                  onClick={onOpenRecommendations}
                  className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ fontSize: "13px" }}
                >
                  Все <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 lg:flex-1 lg:overflow-auto">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => onOpenRecommendationById(rec.id)}
                    className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-gray-50 cursor-pointer"
                  >
                    <ImageWithFallback
                      src={rec.image}
                      alt={rec.title}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{rec.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{rec.icon}</span>
                        <span style={{ fontSize: "11px", color: "#999" }}>{rec.category}</span>
                        <Star className="h-3 w-3" style={{ color: "#f5a623" }} />
                        <span style={{ fontSize: "11px", color: "#999" }}>{rec.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}