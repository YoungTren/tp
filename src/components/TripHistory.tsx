import { motion } from "motion/react";
import { ArrowLeft, MapPin, Plane } from "lucide-react";
import { AppPageBackdrop } from "./app-page-backdrop";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface HistoryTrip {
  id: string;
  destination: string;
  country: string;
  imageUrl: string;
  durationDays: number;
}

interface TripHistoryProps {
  onClose: () => void;
  onSelectTrip: (tripId: string) => void;
}

const historyTrips: HistoryTrip[] = [
  {
    id: "1",
    destination: "Рим",
    country: "Италия",
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 8,
  },
  {
    id: "2",
    destination: "Париж",
    country: "Франция",
    imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 7,
  },
  {
    id: "3",
    destination: "Барселона",
    country: "Испания",
    imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 7,
  },
  {
    id: "4",
    destination: "Токио",
    country: "Япония",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 8,
  },
  {
    id: "5",
    destination: "Стамбул",
    country: "Турция",
    imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 5,
  },
  {
    id: "6",
    destination: "Прага",
    country: "Чехия",
    imageUrl: "https://images.unsplash.com/photo-1541849546-216549ae216d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    durationDays: 7,
  },
];

export function TripHistory({ onClose, onSelectTrip }: TripHistoryProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <AppPageBackdrop />

      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200/60 bg-white px-4 md:px-8 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "#4ECDC4" }}>
              <Plane className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="hidden sm:inline" style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>История маршрутов</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            {historyTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => onSelectTrip(trip.id)}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <ImageWithFallback
                  src={trip.imageUrl}
                  alt={trip.destination}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                  <div>
                    <h3 style={{ fontSize: "24px", fontWeight: 600, color: "white" }}>
                      {trip.destination}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-white/70" />
                      <span style={{ fontSize: "13px", color: "white", opacity: 0.7 }}>
                        {trip.country}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-white/70" style={{ fontSize: "12px" }}>
                      {trip.durationDays} дн.
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}