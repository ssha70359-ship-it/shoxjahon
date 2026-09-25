import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import { LIMITS, lineKey, normalizeLine, summarize } from '../../shared/pricing.js';
import { isActive } from '../../shared/status.js';
import { api, ApiError } from './api.js';
import { errorText, translate } from './i18n.js';
import { cloudGet, cloudSet, hapticNotify, setClosingConfirmation, startParam, telegramUser } from './telegram.js';

const CART_KEY = 'olov_cart';
const StoreContext = createContext(null);

function sanitizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const lines = [];
  for (const entry of raw) {
    try {
      const config = normalizeLine(entry.config);
      const qty = Math.min(LIMITS.maxQty, Math.max(1, Number(entry.qty) || 1));
      lines.push({ key: lineKey(config), config, qty });
    } catch {
      // Menyu o'zgargan bo'lsa eski qatorni tashlab yuboramiz
    }
  }
  return lines;
}

function loadLocalCart() {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
  } catch {
    return [];
  }
}

function initialLang() {
  const code = telegramUser()?.language_code || navigator.language || 'uz';
  return /^(ru|be|kk|uk)/i.test(code) ? 'ru' : 'uz';
}

const initialState = {
  status: 'loading',
  error: null,
  lang: initialLang(),
  user: null,
  open: true,
  stoplist: new Set(),
  payments: { online: false },
  bot: { username: null },
  cart: loadLocalCart(),
  mode: 'delivery',
  useReward: false,
  orders: {},
  historyIds: null,
  group: null,
  toast: null,
  launch: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'boot': {
      const { data } = action;
      const orders = { ...state.orders };
      for (const order of data.activeOrders) orders[order.id] = order;
      return {
        ...state,
        status: 'ready',
        user: data.user,
        lang: data.user.language || state.lang,
        open: data.open,
        stoplist: new Set(data.stoplist),
        payments: data.payments,
        bot: data.bot,
        group: data.group,
        orders,
      };
    }
    case 'loading':
      return { ...state, status: 'loading', error: null };
    case 'bootError':
      return { ...state, status: 'error', error: action.code };
    case 'lang':
      return { ...state, lang: action.lang };
    case 'user':
      return { ...state, user: { ...state.user, ...action.user } };
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
    default:
      return state;
  }
}

/** Ilova qaysi sahifa bilan ochilishi kerak: ?group=CODE, ?order=ID yoki startapp=g_CODE */
function readLaunch() {
  const params = new URLSearchParams(window.location.search);
  const start = startParam();
  const group = params.get('group') || start.match(/^g_([A-Za-z0-9]{6})$/)?.[1];
  const order = params.get('order') || start.match(/^o_(\d+)$/)?.[1];
  if (group) return { type: 'group', code: group.toUpperCase() };
  if (order) return { type: 'order', id: Number(order) };
  return null;
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const t = useCallback((key, params) => translate(stateRef.current.lang, key, params), [state.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const toast = useCallback((text, kind = 'info') => {
    dispatch({ type: 'toast', toast: { id: Date.now() + Math.random(), text, kind } });
  }, []);

  const showError = useCallback(
    (error) => {
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
    boot();
  }, [boot]);

  // --- Jonli yangilanishlar ----------------------------------------------------

  useEffect(() => {
    if (state.status !== 'ready' || typeof EventSource === 'undefined') return undefined;

    const source = new EventSource(api.streamUrl());
    const parse = (handler) => (event) => {
      try {
        handler(JSON.parse(event.data));
      } catch {
        // noto'g'ri xabar
      }
    };

    source.addEventListener(
      'order',
      parse((order) => dispatch({ type: 'order', order })),
    );
    source.addEventListener(
      'group',
      parse((group) => dispatch({ type: 'group', group })),
    );
    source.addEventListener(
      'user',
      parse((user) => dispatch({ type: 'user', user })),
    );
    source.addEventListener(
      'stoplist',
      parse((ids) => dispatch({ type: 'stoplist', ids })),
    );

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

  const groupActive = Boolean(state.group && state.group.status === 'open' && state.group.isMember);

  const actions = useMemo(
    () => ({
      boot,
      toast,
      showError,

      async setLang(lang) {
        dispatch({ type: 'lang', lang });
        try {
          const { user } = await api.updateMe({ language: lang });
          dispatch({ type: 'user', user });
        } catch {
          // til lokal almashdi, serverga keyinroq yetadi
        }
      },

      /** Savatga yoki (Davra rejimida) umumiy savatga qo'shadi */
      async addLine(rawConfig, qty = 1) {
        const config = normalizeLine(rawConfig);
        const { group } = stateRef.current;

        if (group && group.status === 'open' && group.isMember) {
          try {
            const result = await api.addGroupItem(group.code, config, qty);
            dispatch({ type: 'group', group: result.group });
            hapticNotify('success');
            toast(translate(stateRef.current.lang, 'builder.addedGroup'), 'success');
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
          ? cart.map((line) =>
              line.key === key ? { ...line, qty: Math.min(LIMITS.maxQty, line.qty + qty) } : line,
            )
          : [...cart, { key, config, qty }];

        dispatch({ type: 'cart', cart: next.slice(0, LIMITS.maxLines) });
        hapticNotify('success');
        toast(translate(stateRef.current.lang, 'builder.added'), 'success');
        return true;
      },

      replaceLine(oldKey, rawConfig) {
        const config = normalizeLine(rawConfig);
        const key = lineKey(config);
        const cart = stateRef.current.cart;
        const old = cart.find((line) => line.key === oldKey);
        if (!old) return;

        const merged = cart
          .filter((line) => line.key !== oldKey)
          .reduce((list, line) => {
            if (line.key === key) return [...list, { ...line, qty: Math.min(LIMITS.maxQty, line.qty + old.qty) }];
            return [...list, line];
          }, []);
        if (!merged.some((line) => line.key === key)) {
          const index = cart.findIndex((line) => line.key === oldKey);
          merged.splice(index, 0, { key, config, qty: old.qty });
        }
        dispatch({ type: 'cart', cart: merged });
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
    () =>
      summarize(state.cart, {
        mode: state.mode,
        useReward: state.useReward,
        slices: state.user?.slices ?? 0,
      }),
    [state.cart, state.mode, state.useReward, state.user?.slices],
  );

  const activeOrders = useMemo(
    () =>
      Object.values(state.orders)
        .filter((order) => isActive(order.status) && order.userId === state.user?.id)
        .sort((a, b) => b.id - a.id),
    [state.orders, state.user?.id],
  );

  const value = useMemo(
    () => ({ state, t, actions, summary, activeOrders, groupActive }),
    [state, t, actions, summary, activeOrders, groupActive],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
