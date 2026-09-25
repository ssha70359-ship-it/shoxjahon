// Ilova holati: foydalanuvchi, savat, buyurtmalar, Davra va jonli yangilanishlar (SSE).

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { LIMITS, lineKey, normalizeLine, summarize, type CartSummary } from '@shared/pricing';
import { isActive } from '@shared/status';
import type { BootstrapDto, GroupDto, Lang, LineConfig, OrderDto, OrderMode, UserDto } from '@shared/types';

import { api, ApiError } from './api';
import { errorText, translate, type TranslationKey, type TranslationParams } from './i18n';
import { cloudGet, cloudSet, hapticNotify, setClosingConfirmation, startParam, telegramUser } from './telegram';

const CART_KEY = 'olov_cart';

export interface CartItem {
  key: string;
  config: LineConfig;
  qty: number;
}

export type ToastKind = 'info' | 'success' | 'error';

export type Launch = { type: 'group'; code: string } | { type: 'order'; id: number } | null;

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  lang: Lang;
  user: UserDto | null;
  open: boolean;
  stoplist: ReadonlySet<string>;
  payments: { online: boolean };
  cart: CartItem[];
  mode: OrderMode;
  useReward: boolean;
  orders: Record<number, OrderDto>;
  historyIds: number[] | null;
  group: GroupDto | null;
  toast: { id: number; text: string; kind: ToastKind } | null;
  launch: Launch;
}

type Action =
  | { type: 'loading' }
  | { type: 'boot'; data: BootstrapDto }
  | { type: 'bootError'; code: string }
  | { type: 'lang'; lang: Lang }
  | { type: 'user'; user: UserDto }
  | { type: 'stoplist'; ids: string[] }
  | { type: 'cart'; cart: CartItem[] }
  | { type: 'mode'; mode: OrderMode }
  | { type: 'useReward'; value: boolean }
  | { type: 'order'; order: OrderDto }
  | { type: 'history'; orders: OrderDto[] }
  | { type: 'group'; group: GroupDto | null }
  | { type: 'toast'; toast: AppState['toast'] }
  | { type: 'launch'; launch: Launch };

/** Saqlangan savatni tekshiradi (menyu o'zgargan bo'lsa eski qatorlar tashlab yuboriladi) */
function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartItem[] = [];
  for (const entry of raw as { config?: unknown; qty?: unknown }[]) {
    try {
      const config = normalizeLine(entry.config);
      const qty = Math.min(LIMITS.maxQty, Math.max(1, Number(entry.qty) || 1));
      lines.push({ key: lineKey(config), config, qty });
    } catch {
      // yaroqsiz qator
    }
  }
  return lines;
}

function loadLocalCart(): CartItem[] {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function initialLang(): Lang {
  const code = telegramUser()?.language_code ?? navigator.language ?? 'uz';
  return /^(ru|be|kk|uk)/i.test(code) ? 'ru' : 'uz';
}

const initialState: AppState = {
  status: 'loading',
  error: null,
  lang: initialLang(),
  user: null,
  open: true,
  stoplist: new Set(),
  payments: { online: false },
  cart: loadLocalCart(),
  mode: 'delivery',
  useReward: false,
  orders: {},
  historyIds: null,
  group: null,
  toast: null,
  launch: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading', error: null };
    case 'boot': {
      const { data } = action;
      const orders = { ...state.orders };
      for (const order of data.activeOrders) orders[order.id] = order;
      return {
        ...state,
        status: 'ready',
        user: data.user,
        lang: data.user.language,
        open: data.open,
        stoplist: new Set(data.stoplist),
        payments: data.payments,
        group: data.group,
        orders,
      };
    }
    case 'bootError':
      return { ...state, status: 'error', error: action.code };
    case 'lang':
      return { ...state, lang: action.lang };
    case 'user':
      return { ...state, user: state.user ? { ...state.user, ...action.user } : action.user };
    case 'stoplist':
      return { ...state, stoplist: new Set(action.ids) };
    case 'cart':
      return { ...state, cart: action.cart };
    case 'mode':
      return { ...state, mode: action.mode };
    case 'useReward':
      return { ...state, useReward: action.value };
    case 'order':
      return { ...state, orders: { ...state.orders, [action.order.id]: action.order } };
    case 'history': {
      const orders = { ...state.orders };
      for (const order of action.orders) orders[order.id] = order;
      return { ...state, orders, historyIds: action.orders.map((order) => order.id) };
    }
    case 'group':
      return { ...state, group: action.group };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'launch':
      return { ...state, launch: action.launch };
  }
}

/** Ilova qaysi sahifa bilan ochilishi kerak: ?group=CODE, ?order=ID yoki startapp=g_CODE */
function readLaunch(): Launch {
  const params = new URLSearchParams(window.location.search);
  const start = startParam();
  const group = params.get('group') ?? start.match(/^g_([A-Za-z0-9]{6})$/)?.[1];
  const order = params.get('order') ?? start.match(/^o_(\d+)$/)?.[1];
  if (group) return { type: 'group', code: group.toUpperCase() };
  if (order) return { type: 'order', id: Number(order) };
  return null;
}

export interface StoreActions {
  boot(): Promise<void>;
  toast(text: string, kind?: ToastKind): void;
  showError(error: unknown): void;
  setLang(lang: Lang): Promise<void>;
  addLine(config: LineConfig, qty?: number): Promise<boolean>;
  replaceLine(oldKey: string, config: LineConfig): void;
  setQty(key: string, qty: number): void;
  setCart(lines: { config: LineConfig; qty: number }[]): void;
  clearCart(): void;
  setMode(mode: OrderMode): void;
  setUseReward(value: boolean): void;
  upsertOrder(order: OrderDto): void;
  loadOrder(id: number): Promise<OrderDto>;
  loadHistory(): Promise<OrderDto[]>;
  setGroup(group: GroupDto | null): void;
  clearLaunch(): void;
}

export interface StoreValue {
  state: AppState;
  t(key: TranslationKey, params?: TranslationParams): string;
  actions: StoreActions;
  summary: CartSummary;
  activeOrders: OrderDto[];
  /** Foydalanuvchi ochiq davrada: tanlagani umumiy savatga tushadi */
  groupActive: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const lang = state.lang;
  const t = useCallback((key: TranslationKey, params?: TranslationParams) => translate(lang, key, params), [lang]);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    dispatch({ type: 'toast', toast: { id: Date.now() + Math.random(), text, kind } });
  }, []);

  const showError = useCallback(
    (error: unknown) => {
      const code = error instanceof ApiError ? error.code : 'server_error';
      hapticNotify('error');
      toast(errorText(stateRef.current.lang, code), 'error');
    },
    [toast],
  );

  // --- Ishga tushish ---------------------------------------------------------

  const boot = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      const data = await api.bootstrap();
      dispatch({ type: 'boot', data });
      dispatch({ type: 'launch', launch: readLaunch() });

      // Savat bo'sh bo'lsa — Telegram bulutidan (boshqa qurilmada yig'ilgan bo'lishi mumkin)
      if (stateRef.current.cart.length === 0) {
        const cloud = await cloudGet(CART_KEY);
        if (cloud) {
          try {
            const cart = sanitizeCart(JSON.parse(cloud));
            if (cart.length) dispatch({ type: 'cart', cart });
          } catch {
            // buzilgan qiymat
          }
        }
      }
    } catch (error) {
      dispatch({ type: 'bootError', code: error instanceof ApiError ? error.code : 'network' });
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  // --- Jonli yangilanishlar ----------------------------------------------------

  useEffect(() => {
    if (state.status !== 'ready' || typeof EventSource === 'undefined') return undefined;

    const source = new EventSource(api.streamUrl());
    const on = <T,>(event: string, handler: (data: T) => void) =>
      source.addEventListener(event, (message) => {
        try {
          handler(JSON.parse((message as MessageEvent<string>).data) as T);
        } catch {
          // noto'g'ri xabar
        }
      });

    on<OrderDto>('order', (order) => dispatch({ type: 'order', order }));
    on<GroupDto>('group', (group) => dispatch({ type: 'group', group }));
    on<UserDto>('user', (user) => dispatch({ type: 'user', user }));
    on<string[]>('stoplist', (ids) => dispatch({ type: 'stoplist', ids }));

    return () => source.close();
  }, [state.status]);

  // --- Savatni saqlash ---------------------------------------------------------

  useEffect(() => {
    const raw = JSON.stringify(state.cart.map(({ config, qty }) => ({ config, qty })));
    try {
      localStorage.setItem(CART_KEY, raw);
    } catch {
      // yopiq xotira
    }
    const timer = setTimeout(() => cloudSet(CART_KEY, raw), 800);
    setClosingConfirmation(state.cart.length > 0);
    return () => clearTimeout(timer);
  }, [state.cart]);

  // --- Amallar -------------------------------------------------------------------

  const actions = useMemo<StoreActions>(
    () => ({
      boot,
      toast,
      showError,

      async setLang(next) {
        dispatch({ type: 'lang', lang: next });
        try {
          const { user } = await api.updateMe({ language: next });
          dispatch({ type: 'user', user });
        } catch {
          // til lokal almashdi, serverga keyinroq yetadi
        }
      },

      async addLine(rawConfig, qty = 1) {
        const config = normalizeLine(rawConfig);
        const { group, lang: current } = stateRef.current;

        if (group && group.status === 'open' && group.isMember) {
          try {
            const result = await api.addGroupItem(group.code, config, qty);
            dispatch({ type: 'group', group: result.group });
            hapticNotify('success');
            toast(translate(current, 'builder.addedGroup'), 'success');
            return true;
          } catch (error) {
            showError(error);
            return false;
          }
        }

        const key = lineKey(config);
        const cart = stateRef.current.cart;
        const existing = cart.find((line) => line.key === key);
        const next = existing
          ? cart.map((line) => (line.key === key ? { ...line, qty: Math.min(LIMITS.maxQty, line.qty + qty) } : line))
          : [...cart, { key, config, qty }];

        dispatch({ type: 'cart', cart: next.slice(0, LIMITS.maxLines) });
        hapticNotify('success');
        toast(translate(current, 'builder.added'), 'success');
        return true;
      },

      replaceLine(oldKey, rawConfig) {
        const config = normalizeLine(rawConfig);
        const key = lineKey(config);
        const cart = stateRef.current.cart;
        const index = cart.findIndex((line) => line.key === oldKey);
        const old = cart[index];
        if (!old) return;

        const rest = cart.filter((line) => line.key !== oldKey);
        const same = rest.find((line) => line.key === key);
        const next = same
          ? rest.map((line) => (line === same ? { ...line, qty: Math.min(LIMITS.maxQty, line.qty + old.qty) } : line))
          : [...rest.slice(0, index), { key, config, qty: old.qty }, ...rest.slice(index)];
        dispatch({ type: 'cart', cart: next });
      },

      setQty(key, qty) {
        const cart = stateRef.current.cart;
        const next =
          qty <= 0
            ? cart.filter((line) => line.key !== key)
            : cart.map((line) => (line.key === key ? { ...line, qty: Math.min(LIMITS.maxQty, qty) } : line));
        dispatch({ type: 'cart', cart: next });
      },

      setCart(lines) {
        dispatch({ type: 'cart', cart: sanitizeCart(lines) });
      },

      clearCart() {
        dispatch({ type: 'cart', cart: [] });
        dispatch({ type: 'useReward', value: false });
      },

      setMode(mode) {
        dispatch({ type: 'mode', mode });
      },

      setUseReward(value) {
        dispatch({ type: 'useReward', value });
      },

      upsertOrder(order) {
        dispatch({ type: 'order', order });
      },

      async loadOrder(id) {
        const { order } = await api.order(id);
        dispatch({ type: 'order', order });
        return order;
      },

      async loadHistory() {
        const { orders } = await api.orders();
        dispatch({ type: 'history', orders });
        return orders;
      },

      setGroup(group) {
        dispatch({ type: 'group', group });
      },

      clearLaunch() {
        dispatch({ type: 'launch', launch: null });
      },
    }),
    [boot, toast, showError],
  );

  const summary = useMemo(
    () => summarize(state.cart, { mode: state.mode, useReward: state.useReward, slices: state.user?.slices ?? 0 }),
    [state.cart, state.mode, state.useReward, state.user?.slices],
  );

  const userId = state.user?.id;
  const activeOrders = useMemo(
    () =>
      Object.values(state.orders)
        .filter((order) => isActive(order.status) && order.userId === userId)
        .sort((a, b) => b.id - a.id),
    [state.orders, userId],
  );

  const groupActive = Boolean(state.group && state.group.status === 'open' && state.group.isMember);

  const value = useMemo<StoreValue>(
    () => ({ state, t, actions, summary, activeOrders, groupActive }),
    [state, t, actions, summary, activeOrders, groupActive],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore StoreProvider ichida ishlatilishi kerak');
  return value;
}
