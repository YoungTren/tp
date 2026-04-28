export type CityAttractionPreview = {
  id: string;
  title: string;
  image: string;
};

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=82`;

const ROME: CityAttractionPreview[] = [
  { id: "r1", title: "Колизей", image: U("photo-1552832230-c0197dd311b5") },
  { id: "r2", title: "Пантеон", image: U("photo-1529154036614-0487d8ce89f5") },
  { id: "r3", title: "Собор Святого Петра", image: U("photo-1526779259212-939b68261c6a") },
  { id: "r4", title: "Фонтан Треви", image: U("photo-1515542622106-78bda8ba0e5b") },
  { id: "r5", title: "Римский форум", image: U("photo-1511739001486-6bfe10ce785f") },
];

const PARIS: CityAttractionPreview[] = [
  { id: "p1", title: "Эйфелева башня", image: U("photo-1502602898657-3e91760cbb34") },
  { id: "p2", title: "Лувр", image: U("photo-1566139880616-75be3360ddc4") },
  { id: "p3", title: "Собор Парижской Богоматери", image: U("photo-1499856871958-5b9627545d1a") },
  { id: "p4", title: "Триумфальная арка", image: U("photo-1540959733332-eab4deabeeaf") },
  { id: "p5", title: "Базилика Сакре-Кер", image: U("photo-1507525428034-b723cf961d5e") },
];

const MOSCOW: CityAttractionPreview[] = [
  { id: "m1", title: "Красная площадь", image: U("photo-1520106212290-86ccfbba33f0") },
  { id: "m2", title: "Собор Василия Блаженного", image: U("photo-1513326738679-b51b567baae6") },
  { id: "m3", title: "Московский Кремль", image: U("photo-1509021436665-8f07a5a8e5c0") },
  { id: "m4", title: "ВДНХ", image: U("photo-1565008576549-5755e8e8d7e4") },
  { id: "m5", title: "Третьяковская галерея", image: U("photo-1529154036614-0487d8ce89f5") },
];

const SPB: CityAttractionPreview[] = [
  { id: "s1", title: "Государственный Эрмитаж", image: U("photo-1529927066849-79a7910e7e9d") },
  { id: "s2", title: "Исаакиевский собор", image: U("photo-1509021436665-8f07a5a8e5c0") },
  { id: "s3", title: "Петергоф", image: U("photo-1507525428034-b723cf961d5e") },
  { id: "s4", title: "Петропавловская крепость", image: U("photo-1520106212290-86ccfbba33f0") },
  { id: "s5", title: "Спас-на-крови", image: U("photo-1529154036614-0487d8ce89f5") },
];

const LONDON: CityAttractionPreview[] = [
  { id: "l1", title: "Вестминстер и Биг-Бен", image: U("photo-1529655683826-aba9b3e77283") },
  { id: "l2", title: "Лондонский глаз", image: U("photo-1505761675566-0e4d4c5e4a5a") },
  { id: "l3", title: "Тауэрский мост", image: U("photo-1520986606214-8b2cdb0e6d5d") },
  { id: "l4", title: "Букингемский дворец", image: U("photo-1513635269971-596e144e8c5d") },
  { id: "l5", title: "Тауэр", image: U("photo-1540959733332-eab4deabeeaf") },
];

const BARCELONA: CityAttractionPreview[] = [
  { id: "b1", title: "Саграда-Фамилия", image: U("photo-1583422409516-2895a77efded") },
  { id: "b2", title: "Парк Гуэля", image: U("photo-1541849546-216549ae216d") },
  { id: "b3", title: "Каса Мила", image: U("photo-1524231757912-21f4fe3a7200") },
  { id: "b4", title: "Арх де Триомф, Барселона", image: U("photo-1540959733332-eab4deabeeaf") },
];

/** Поисковые подписи с названием города, чтобы CSE/Places не подтягивали картинки «не того» места. */
const defaultPreviewForCity = (destination: string): CityAttractionPreview[] => {
  const c = destination.trim() || "город";
  return [
    { id: "d1", title: `Исторический центр, ${c}`, image: U("photo-1476514525535-07fb3b4ae5f1") },
    { id: "d2", title: `Достопримечательности ${c}`, image: U("photo-1526779259212-939b68261c6a") },
    { id: "d3", title: `Старый город, ${c}`, image: U("photo-1507525428034-b723cf961d5e") },
    { id: "d4", title: `Главная площадь, ${c}`, image: U("photo-1502602898657-3e91760cbb34") },
    { id: "d5", title: `Панорама, ${c}`, image: U("photo-1529154036614-0487d8ce89f5") },
  ];
};

const PRESET_RULES: { test: (n: string) => boolean; items: CityAttractionPreview[] }[] = [
  { test: (n) => /рим|rome|roma|рім/i.test(n), items: ROME },
  { test: (n) => /париж|paris|parigi/.test(n) || n === "france", items: PARIS },
  { test: (n) => /москв|moscow|moskva/.test(n), items: MOSCOW },
  { test: (n) => /санкт|петербург|petersburg|piter|спб/.test(n), items: SPB },
  { test: (n) => /лондон|london|англи|england/.test(n), items: LONDON },
  { test: (n) => /барселон|barcelona|катал/.test(n), items: BARCELONA },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();

const resolvePreset = (destination: string): CityAttractionPreview[] => {
  const n = norm(destination);
  if (n.length === 0) return defaultPreviewForCity("город");
  for (const rule of PRESET_RULES) {
    if (rule.test(n)) {
      return rule.items;
    }
  }
  return defaultPreviewForCity(destination);
};

/**
 * Список ориентиров и подписей только по направлению (поле «Куда»), без подмеса из
 * `plan.recommendations` — тот план мог быть от предыдущей поездки или другого города.
 */
export const getAttractionPanelItems = (destination: string): CityAttractionPreview[] =>
  resolvePreset(destination);
