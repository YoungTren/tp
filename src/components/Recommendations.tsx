import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export function Recommendations() {
  const places = [
    {
      image: "https://images.unsplash.com/photo-1576682953661-a056a5073019?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Пляжи Таиланда",
      description: "Белоснежный песок и лазурная вода",
      rating: "4.8",
      reviews: "287"
    },
    {
      image: "https://images.unsplash.com/photo-1720988583730-1191f37e5fcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Париж вечером",
      description: "Эйфелева башня и романтика города",
      rating: "5.0",
      reviews: "421"
    },
    {
      image: "https://images.unsplash.com/photo-1546661869-cf589fac7085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Храмы Бали",
      description: "Духовность и красота острова",
      rating: "4.9",
      reviews: "356"
    },
    {
      image: "https://images.unsplash.com/photo-1672939594708-1b38c2f7c637?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      title: "Закаты Санторини",
      description: "Незабываемые виды на Эгейское море",
      rating: "5.0",
      reviews: "512"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Рекомендации для вас</h3>
        <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
          Все
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {places.map((place, index) => (
          <motion.div
            key={place.title}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex gap-4 p-3">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={place.image}
                  alt={place.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  responsiveSizes="96px"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h4 className="font-semibold text-sm mb-1">{place.title}</h4>
                  <p className="text-xs text-gray-600">{place.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium text-gray-700">{place.rating}</span>
                  <span>({place.reviews})</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 my-auto flex-shrink-0" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
