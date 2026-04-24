import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";
import { Play, MapPin, Heart } from "lucide-react";

export function ActivityGallery() {
  const activities = [
    {
      image: "https://images.unsplash.com/photo-1770564512491-e88eb93d48a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Треккинг в Альпах",
      type: "Активность"
    },
    {
      image: "https://images.unsplash.com/photo-1760637627717-60f55eca66d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Водопады",
      type: "Природа"
    },
    {
      image: "https://images.unsplash.com/photo-1762375212850-3a0b41bf4ab6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Горные маршруты",
      type: "Треккинг"
    },
    {
      image: "https://images.unsplash.com/photo-1672939594708-1b38c2f7c637?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Закаты",
      type: "Фото"
    },
    {
      image: "https://images.unsplash.com/photo-1769771861451-66759edad79e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Пешие прогулки",
      type: "Активность"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="bg-gray-900 rounded-3xl p-6 text-white"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Активности и места</h3>
          <p className="text-sm text-white/70">Добавлено в избранное</p>
        </div>
        <button className="text-sm text-white/70 hover:text-white">
          Все
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 group cursor-pointer"
          >
            <ImageWithFallback
              src={activity.image}
              alt={activity.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-xs font-medium mb-0.5">{activity.title}</p>
              <p className="text-[10px] text-white/70">{activity.type}</p>
            </div>
            <button className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 text-xs">
          <Play className="w-3 h-3" />
          <span>Видеогид</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 text-xs">
          <MapPin className="w-3 h-3" />
          <span>На карте</span>
        </div>
      </div>
    </motion.div>
  );
}
