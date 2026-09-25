// Server va Mini App o'rtasidagi umumiy turlar (DTO).
// Backend javoblari va frontend holati aynan shu turlardan foydalanadi.

export type Lang = 'uz' | 'ru';
export type Localized = Record<Lang, string>;

export type SizeId = 'S' | 'M' | 'L';
export type CrustId = 'classic' | 'thin' | 'cheese';
export type SauceId = 'tomato' | 'cream' | 'bbq' | 'pesto';
export type OrderMode = 'delivery' | 'pickup';
export type PaymentMethod = 'cash' | 'card' | 'online';

export type OrderStatus =
  'pending_payment' | 'new' | 'accepted' | 'baking' | 'delivering' | 'ready' | 'done' | 'cancelled';

export type GroupStatus = 'open' | 'ordered' | 'closed' | 'expired';

/** Pitsaning bir qismi (butun pitsa — 1 qism, yarim-yarim — 2 qism) */
export interface PizzaPart {
  pizzaId: string;
  sauce: SauceId;
  removed: string[];
  extras: string[];
}

export interface PizzaConfig {
  kind: 'pizza';
  size: SizeId;
  crust: CrustId;
  parts: PizzaPart[];
}

export interface ItemConfig {
  kind: 'item';
  itemId: string;
}

export type LineConfig = PizzaConfig | ItemConfig;

export interface CartLine {
  config: LineConfig;
  qty: number;
}

export interface Address {
  text: string;
  entrance: string;
  floor: string;
  apartment: string;
  lat?: number;
  lng?: number;
}

export interface OrderItem {
  config: LineConfig;
  qty: number;
  unit: number;
  by?: { id: number; name: string };
}

export interface HistoryEntry {
  status: OrderStatus;
  at: number;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  language: Lang;
  phone: string;
  slices: number;
  address: Address | null;
}

export interface OrderDto {
  id: number;
  userId: number;
  groupCode: string | null;
  status: OrderStatus;
  mode: OrderMode;
  items: OrderItem[];
  address: Address | null;
  phone: string;
  comment: string;
  payment: PaymentMethod;
  paid: boolean;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  slicesUsed: number;
  slicesEarned: number;
  history: HistoryEntry[];
  distanceKm: number | null;
  etaAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface GroupItemDto {
  id: number;
  config: LineConfig;
  qty: number;
  unit: number;
}

export interface GroupMemberDto {
  id: number;
  name: string;
  isHost: boolean;
  items: GroupItemDto[];
  subtotal: number;
}

export interface GroupDto {
  code: string;
  status: GroupStatus;
  hostId: number;
  orderId: number | null;
  createdAt: number;
  expiresAt: number;
  isHost: boolean;
  isMember: boolean;
  members: GroupMemberDto[];
  subtotal: number;
  itemsCount: number;
}

export interface BootstrapDto {
  user: UserDto;
  open: boolean;
  stoplist: string[];
  activeOrders: OrderDto[];
  group: GroupDto | null;
  payments: { online: boolean };
  bot: { username: string | null };
  startParam: string;
}

export interface GroupShareDto {
  preparedId: string | null;
  link: string | null;
  text: string;
}

/** Barcha API javoblari shu ko'rinishda */
export type ApiSuccess<T> = { ok: true } & T;
export interface ApiFailure {
  ok: false;
  error: string;
  detail?: string;
}
