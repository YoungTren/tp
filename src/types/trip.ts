export type TripFormFields = {
  from: string;
  to: string;
  /** Сколько дней отдыха (плитки «День 1…N») */
  durationDays: number;
  budget: string;
  travelers: number;
};

export type TripRecommendation = {
  id: string;
  title: string;
  category: string;
  description: string;
  highlights: string[];
  rating: number;
  image: string;
  lat: number;
  lon: number;
};

export type LeisureRouteStop = {
  id: string;
  order: number;
  title: string;
  description: string;
  category: string;
  rating: number;
  /** Прим.: «~800 ₽» */
  estimatedCost: string;
  lat: number;
  lon: number;
  image: string;
};

export type DayPlan = {
  day: number;
  title: string;
  items: string[];
  /** Подтверждённый адрес начала маршрута (день) — «Показать на карте» */
  routeStartAddress?: string;
  /** Координаты старта (с сервера, для ссылки в Яндекс.Картах) */
  routeStartPoint?: { lat: number; lon: number };
  /** Создан дневной досуговой маршрут (карточки) */
  routeGenerated?: boolean;
  /** Точки дня: еда, достопримечательности, прогулки (по порядку) */
  routeStops?: LeisureRouteStop[];
};

export type MapCenter = {
  lat: number;
  lon: number;
  zoom: number;
};

export type GeneratedTripPlan = {
  dayPlans: DayPlan[];
  recommendations: TripRecommendation[];
  mapCenter: MapCenter;
};

export type TripData = TripFormFields & { plan: GeneratedTripPlan };
