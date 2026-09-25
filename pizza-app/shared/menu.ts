// Menyu: pitsalar, masalliqlar, gazaklar va ichimliklar.
// Narxlar so'mda. Pitsa rasmlari fotosurat emas — Mini App har bir pitsani
// shu yerdagi masalliqlar ro'yxatidan jonli chizadi, shuning uchun yangi
// pitsa qo'shish uchun rasm kerak emas.

import type { CrustId, Lang, Localized, SauceId, SizeId } from './types.js';

export interface Size {
  id: SizeId;
  cm: number;
  mult: number;
  grams: number;
}

export interface Crust {
  id: CrustId;
  name: Localized;
  price: Record<SizeId, number>;
}

export interface Sauce {
  id: SauceId;
  name: Localized;
  color: string;
}

export type ToppingGroupId = 'meat' | 'cheese' | 'veg' | 'herb';

export interface Topping {
  id: string;
  group: ToppingGroupId;
  price: number;
  name: Localized;
}

export type PizzaTag = 'signature' | 'new' | 'hit' | 'spicy' | 'veg';

export interface Pizza {
  id: string;
  name: Localized;
  desc: Localized;
  sauce: SauceId;
  toppings: string[];
  prices: Record<SizeId, number>;
  tags: PizzaTag[];
  hidden?: boolean;
}

export type CategoryId = 'pizzas' | 'sides' | 'drinks' | 'desserts' | 'sauces';

export interface ItemArt {
  type: 'bottle' | 'cup' | 'fries' | 'wings' | 'bread' | 'sticks' | 'cake' | 'fondant' | 'dip';
  color?: string;
  label?: string;
  top?: string;
}

export interface MenuItem {
  id: string;
  category: Exclude<CategoryId, 'pizzas'>;
  price: number;
  name: Localized;
  desc: Localized;
  art: ItemArt;
}

export const SIZES: Size[] = [
  { id: 'S', cm: 25, mult: 1, grams: 450 },
  { id: 'M', cm: 30, mult: 1.3, grams: 640 },
  { id: 'L', cm: 35, mult: 1.6, grams: 870 },
];

export const CRUSTS: Crust[] = [
  { id: 'classic', name: { uz: 'Klassik', ru: 'Классическое' }, price: { S: 0, M: 0, L: 0 } },
  { id: 'thin', name: { uz: 'Yupqa', ru: 'Тонкое' }, price: { S: 0, M: 0, L: 0 } },
  {
    id: 'cheese',
    name: { uz: 'Pishloqli bortik', ru: 'Сырный борт' },
    price: { S: 12000, M: 15000, L: 19000 },
  },
];

export const SAUCES: Sauce[] = [
  { id: 'tomato', name: { uz: 'Pomidorli', ru: 'Томатный' }, color: '#c7351f' },
  { id: 'cream', name: { uz: 'Qaymoqli', ru: 'Сливочный' }, color: '#efdcb6' },
  { id: 'bbq', name: { uz: 'Barbekyu', ru: 'Барбекю' }, color: '#6d2a15' },
  { id: 'pesto', name: { uz: 'Pesto', ru: 'Песто' }, color: '#5e7f2b' },
];

export const TOPPING_GROUPS: { id: ToppingGroupId; name: Localized }[] = [
  { id: 'meat', name: { uz: 'Goʻsht', ru: 'Мясо' } },
  { id: 'cheese', name: { uz: 'Pishloq', ru: 'Сыр' } },
  { id: 'veg', name: { uz: 'Sabzavot', ru: 'Овощи' } },
  { id: 'herb', name: { uz: 'Koʻkat va ziravor', ru: 'Зелень и специи' } },
];

// price — 25 sm pitsa uchun. Kattaroq o'lchamda SIZES[].mult ga ko'paytiriladi.
export const TOPPINGS: Topping[] = [
  { id: 'pepperoni', group: 'meat', price: 12000, name: { uz: 'Pepperoni', ru: 'Пепперони' } },
  { id: 'qazi', group: 'meat', price: 18000, name: { uz: 'Qazi', ru: 'Казы' } },
  { id: 'chicken', group: 'meat', price: 12000, name: { uz: 'Tovuq', ru: 'Курица' } },
  { id: 'beef', group: 'meat', price: 14000, name: { uz: 'Mol qiymasi', ru: 'Говяжий фарш' } },
  { id: 'sausage', group: 'meat', price: 10000, name: { uz: 'Kolbaschalar', ru: 'Колбаски' } },
  { id: 'mozzarella', group: 'cheese', price: 10000, name: { uz: 'Motsarella', ru: 'Моцарелла' } },
  { id: 'cheddar', group: 'cheese', price: 10000, name: { uz: 'Chedder', ru: 'Чеддер' } },
  { id: 'feta', group: 'cheese', price: 10000, name: { uz: 'Feta', ru: 'Фета' } },
  { id: 'parmesan', group: 'cheese', price: 12000, name: { uz: 'Parmezan', ru: 'Пармезан' } },
  { id: 'mushroom', group: 'veg', price: 8000, name: { uz: 'Qoʻziqorin', ru: 'Шампиньоны' } },
  { id: 'tomato', group: 'veg', price: 6000, name: { uz: 'Pomidor', ru: 'Томаты' } },
  { id: 'pepper', group: 'veg', price: 6000, name: { uz: 'Bolgar qalampiri', ru: 'Болгарский перец' } },
  { id: 'onion', group: 'veg', price: 5000, name: { uz: 'Qizil piyoz', ru: 'Красный лук' } },
  { id: 'olive', group: 'veg', price: 8000, name: { uz: 'Zaytun', ru: 'Маслины' } },
  { id: 'jalapeno', group: 'veg', price: 7000, name: { uz: 'Halapenyo', ru: 'Халапеньо' } },
  { id: 'corn', group: 'veg', price: 5000, name: { uz: 'Makkajoʻxori', ru: 'Кукуруза' } },
  { id: 'pineapple', group: 'veg', price: 8000, name: { uz: 'Ananas', ru: 'Ананас' } },
  { id: 'basil', group: 'herb', price: 4000, name: { uz: 'Rayhon', ru: 'Базилик' } },
  { id: 'arugula', group: 'herb', price: 6000, name: { uz: 'Rukkola', ru: 'Руккола' } },
  { id: 'chili', group: 'herb', price: 3000, name: { uz: 'Achchiq qalampir', ru: 'Перец чили' } },
];

export const CUSTOM_PIZZA_ID = 'custom';

export const PIZZAS: Pizza[] = [
  {
    id: 'qazi',
    name: { uz: 'Qazili', ru: 'С казы' },
    desc: {
      uz: 'Uyimizning faxri: qazi, qizil piyoz va bolgar qalampiri. Toshkentdan boshqa joyda topolmaysiz.',
      ru: 'Гордость дома: казы, красный лук и болгарский перец. Такой больше нигде нет.',
    },
    sauce: 'tomato',
    toppings: ['qazi', 'onion', 'pepper'],
    prices: { S: 79000, M: 99000, L: 129000 },
    tags: ['signature', 'new'],
  },
  {
    id: 'pepperoni',
    name: { uz: 'Pepperoni', ru: 'Пепперони' },
    desc: {
      uz: 'Mol goʻshtidan pepperoni va choʻzilib turadigan motsarella. Klassika.',
      ru: 'Говяжья пепперони и тянущаяся моцарелла. Классика.',
    },
    sauce: 'tomato',
    toppings: ['pepperoni'],
    prices: { S: 69000, M: 89000, L: 112000 },
    tags: ['hit'],
  },
  {
    id: 'margarita',
    name: { uz: 'Margarita', ru: 'Маргарита' },
    desc: {
      uz: 'Pomidor, motsarella va yangi rayhon. Oddiy, lekin mukammal.',
      ru: 'Томаты, моцарелла и свежий базилик. Просто и безупречно.',
    },
    sauce: 'tomato',
    toppings: ['tomato', 'basil'],
    prices: { S: 59000, M: 79000, L: 99000 },
    tags: ['veg'],
  },
  {
    id: 'meat',
    name: { uz: 'Goʻshtli', ru: 'Мясная' },
    desc: {
      uz: 'Mol qiymasi, pepperoni, kolbaschalar va piyoz. Toʻyimli.',
      ru: 'Говяжий фарш, пепперони, колбаски и лук. Сытно.',
    },
    sauce: 'tomato',
    toppings: ['beef', 'pepperoni', 'sausage', 'onion'],
    prices: { S: 82000, M: 105000, L: 132000 },
    tags: ['hit'],
  },
  {
    id: 'bbq-chicken',
    name: { uz: 'Tovuq BBQ', ru: 'Курица BBQ' },
    desc: {
      uz: 'Barbekyu sousi, tovuq, qizil piyoz va makkajoʻxori.',
      ru: 'Соус барбекю, курица, красный лук и кукуруза.',
    },
    sauce: 'bbq',
    toppings: ['chicken', 'onion', 'corn'],
    prices: { S: 72000, M: 92000, L: 115000 },
    tags: [],
  },
  {
    id: 'four-cheese',
    name: { uz: 'Toʻrt pishloq', ru: 'Четыре сыра' },
    desc: {
      uz: 'Qaymoqli sous ustida motsarella, chedder, feta va parmezan.',
      ru: 'Моцарелла, чеддер, фета и пармезан на сливочном соусе.',
    },
    sauce: 'cream',
    toppings: ['mozzarella', 'cheddar', 'feta', 'parmesan'],
    prices: { S: 75000, M: 95000, L: 119000 },
    tags: ['veg'],
  },
  {
    id: 'diablo',
    name: { uz: 'Diablo', ru: 'Диабло' },
    desc: {
      uz: 'Pepperoni, halapenyo, chili va qalampir. Faqat jasurlar uchun.',
      ru: 'Пепперони, халапеньо, чили и перец. Только для смелых.',
    },
    sauce: 'tomato',
    toppings: ['pepperoni', 'jalapeno', 'pepper', 'chili'],
    prices: { S: 75000, M: 95000, L: 119000 },
    tags: ['spicy'],
  },
  {
    id: 'funghi',
    name: { uz: 'Qoʻziqorinli', ru: 'Грибная' },
    desc: {
      uz: 'Qaymoqli sous, qoʻziqorin, parmezan va rukkola.',
      ru: 'Сливочный соус, шампиньоны, пармезан и руккола.',
    },
    sauce: 'cream',
    toppings: ['mushroom', 'parmesan', 'arugula'],
    prices: { S: 65000, M: 85000, L: 105000 },
    tags: ['veg'],
  },
  {
    id: 'pesto-chicken',
    name: { uz: 'Pesto va tovuq', ru: 'Песто с курицей' },
    desc: {
      uz: 'Rayhonli pesto, tovuq, pomidor va parmezan.',
      ru: 'Песто из базилика, курица, томаты и пармезан.',
    },
    sauce: 'pesto',
    toppings: ['chicken', 'tomato', 'parmesan'],
    prices: { S: 72000, M: 92000, L: 115000 },
    tags: [],
  },
  {
    id: 'hawaii',
    name: { uz: 'Gavayi', ru: 'Гавайская' },
    desc: {
      uz: 'Tovuq, ananas va makkajoʻxori — shirin va shoʻr uygʻunligi.',
      ru: 'Курица, ананас и кукуруза — сладко-солёный баланс.',
    },
    sauce: 'cream',
    toppings: ['chicken', 'pineapple', 'corn'],
    prices: { S: 69000, M: 89000, L: 112000 },
    tags: [],
  },
  {
    id: 'garden',
    name: { uz: 'Bogʻ', ru: 'Сад' },
    desc: {
      uz: 'Qalampir, qoʻziqorin, zaytun, pomidor va piyoz. Goʻshtsiz.',
      ru: 'Перец, грибы, маслины, томаты и лук. Без мяса.',
    },
    sauce: 'tomato',
    toppings: ['pepper', 'mushroom', 'olive', 'tomato', 'onion'],
    prices: { S: 65000, M: 85000, L: 105000 },
    tags: ['veg'],
  },
  {
    // Konstruktor uchun asos: sous + motsarella. Qolgan hamma narsani mijoz tanlaydi.
    id: CUSTOM_PIZZA_ID,
    hidden: true,
    name: { uz: 'Oʻz pitsangiz', ru: 'Своя пицца' },
    desc: {
      uz: 'Sous va motsarella — qolganini oʻzingiz tanlang.',
      ru: 'Соус и моцарелла — остальное выбираете вы.',
    },
    sauce: 'tomato',
    toppings: [],
    prices: { S: 49000, M: 65000, L: 85000 },
    tags: [],
  },
];

export const CATEGORIES: { id: CategoryId; name: Localized }[] = [
  { id: 'pizzas', name: { uz: 'Pitsalar', ru: 'Пиццы' } },
  { id: 'sides', name: { uz: 'Gazaklar', ru: 'Закуски' } },
  { id: 'drinks', name: { uz: 'Ichimliklar', ru: 'Напитки' } },
  { id: 'desserts', name: { uz: 'Shirinliklar', ru: 'Десерты' } },
  { id: 'sauces', name: { uz: 'Souslar', ru: 'Соусы' } },
];

// art — Mini App'dagi chizilgan rasm turi (src/components/ItemArt.jsx)
export const ITEMS: MenuItem[] = [
  {
    id: 'fries',
    category: 'sides',
    price: 22000,
    name: { uz: 'Kartoshka fri', ru: 'Картофель фри' },
    desc: { uz: 'Tuzli, qarsildoq, 150 g', ru: 'Хрустящий, с солью, 150 г' },
    art: { type: 'fries' },
  },
  {
    id: 'wings',
    category: 'sides',
    price: 39000,
    name: { uz: 'Tovuq qanotlari', ru: 'Куриные крылья' },
    desc: { uz: 'BBQ sousida, 6 dona', ru: 'В соусе BBQ, 6 шт.' },
    art: { type: 'wings' },
  },
  {
    id: 'garlic-bread',
    category: 'sides',
    price: 19000,
    name: { uz: 'Sarimsoqli non', ru: 'Чесночный хлеб' },
    desc: { uz: 'Oʻtin pechidan, sariyogʻ bilan', ru: 'Из дровяной печи, со сливочным маслом' },
    art: { type: 'bread' },
  },
  {
    id: 'cheese-sticks',
    category: 'sides',
    price: 29000,
    name: { uz: 'Pishloqli tayoqchalar', ru: 'Сырные палочки' },
    desc: { uz: 'Motsarella, 5 dona', ru: 'Моцарелла, 5 шт.' },
    art: { type: 'sticks' },
  },
  {
    id: 'cola',
    category: 'drinks',
    price: 12000,
    name: { uz: 'Coca-Cola 0,5 l', ru: 'Coca-Cola 0,5 л' },
    desc: { uz: 'Muzdek', ru: 'Ледяная' },
    art: { type: 'bottle', color: '#b3121b', label: '#f4f1ea' },
  },
  {
    id: 'fanta',
    category: 'drinks',
    price: 12000,
    name: { uz: 'Fanta 0,5 l', ru: 'Fanta 0,5 л' },
    desc: { uz: 'Apelsinli', ru: 'Апельсиновая' },
    art: { type: 'bottle', color: '#f28a17', label: '#1d4fa3' },
  },
  {
    id: 'tarragon',
    category: 'drinks',
    price: 18000,
    name: { uz: 'Tarxun limonadi 0,4 l', ru: 'Лимонад тархун 0,4 л' },
    desc: { uz: 'Oʻzimiz tayyorlaymiz', ru: 'Готовим сами' },
    art: { type: 'cup', color: '#6dbb3c' },
  },
  {
    id: 'ayran',
    category: 'drinks',
    price: 9000,
    name: { uz: 'Ayron 0,4 l', ru: 'Айран 0,4 л' },
    desc: { uz: 'Achchiq pitsadan keyin — eng zoʻri', ru: 'Лучшее после острой пиццы' },
    art: { type: 'cup', color: '#f3efe6' },
  },
  {
    id: 'water',
    category: 'drinks',
    price: 6000,
    name: { uz: 'Mineral suv 0,5 l', ru: 'Минеральная вода 0,5 л' },
    desc: { uz: 'Gazsiz', ru: 'Без газа' },
    art: { type: 'bottle', color: '#9fd3ec', label: '#1f6f9f' },
  },
  {
    id: 'cheesecake',
    category: 'desserts',
    price: 32000,
    name: { uz: 'Chizkeyk', ru: 'Чизкейк' },
    desc: { uz: 'Nyu-York, malina sousi bilan', ru: 'Нью-Йорк с малиновым соусом' },
    art: { type: 'cake', color: '#f6e6c4', top: '#d8364a' },
  },
  {
    id: 'tiramisu',
    category: 'desserts',
    price: 34000,
    name: { uz: 'Tiramisu', ru: 'Тирамису' },
    desc: { uz: 'Maskarpone va espresso', ru: 'Маскарпоне и эспрессо' },
    art: { type: 'cake', color: '#ead7b5', top: '#6b4226' },
  },
  {
    id: 'fondant',
    category: 'desserts',
    price: 29000,
    name: { uz: 'Shokoladli fondan', ru: 'Шоколадный фондан' },
    desc: { uz: 'Ichi suyuq, issiq', ru: 'Горячий, с жидким центром' },
    art: { type: 'fondant' },
  },
  {
    id: 'sauce-garlic',
    category: 'sauces',
    price: 5000,
    name: { uz: 'Sarimsoqli sous', ru: 'Чесночный соус' },
    desc: { uz: '40 g', ru: '40 г' },
    art: { type: 'dip', color: '#f4ecd8' },
  },
  {
    id: 'sauce-cheese',
    category: 'sauces',
    price: 5000,
    name: { uz: 'Pishloqli sous', ru: 'Сырный соус' },
    desc: { uz: '40 g', ru: '40 г' },
    art: { type: 'dip', color: '#f2b53a' },
  },
  {
    id: 'sauce-bbq',
    category: 'sauces',
    price: 5000,
    name: { uz: 'Barbekyu sousi', ru: 'Соус барбекю' },
    desc: { uz: '40 g', ru: '40 г' },
    art: { type: 'dip', color: '#6d2a15' },
  },
  {
    id: 'sauce-hot',
    category: 'sauces',
    price: 5000,
    name: { uz: 'Achchiq sous', ru: 'Острый соус' },
    desc: { uz: '40 g', ru: '40 г' },
    art: { type: 'dip', color: '#d33b2c' },
  },
];

function index<T extends { id: string }>(list: readonly T[]): Record<string, T> {
  return Object.fromEntries(list.map((entry) => [entry.id, entry]));
}

export const SIZE_BY_ID = index(SIZES) as Record<SizeId, Size>;
export const CRUST_BY_ID = index(CRUSTS) as Record<CrustId, Crust>;
export const SAUCE_BY_ID = index(SAUCES) as Record<SauceId, Sauce>;
export const TOPPING_BY_ID = index(TOPPINGS);
export const PIZZA_BY_ID = index(PIZZAS);
export const ITEM_BY_ID = index(ITEMS);

/** Til bo'yicha nomni oladi, topilmasa o'zbekchasini */
export function tr(value: Localized | string | null | undefined, lang: Lang = 'uz'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.uz ?? '';
}

/** Menyudagi pitsa (id noto'g'ri bo'lsa — dasturchi xatosi) */
export function getPizza(id: string): Pizza {
  const pizza = PIZZA_BY_ID[id];
  if (!pizza) throw new Error(`Nomaʼlum pitsa: ${id}`);
  return pizza;
}

export function getTopping(id: string): Topping {
  const topping = TOPPING_BY_ID[id];
  if (!topping) throw new Error(`Nomaʼlum masalliq: ${id}`);
  return topping;
}
