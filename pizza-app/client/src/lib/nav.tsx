import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { PizzaConfig } from '@shared/types';

import { hapticSelect, hideBackButton, setBackButton } from './telegram';

// Oddiy navigatsiya: pastki tablar + ustiga ochiladigan ekranlar steki.
// Telegram'ning "Orqaga" tugmasi stek bo'sh bo'lmaganda ko'rinadi.

export type TabId = 'menu' | 'group' | 'cart' | 'profile';

/** Har bir ekran o'z parametrlari bilan — noto'g'ri parametr kompilyatsiyada ushlanadi */
export interface ScreenParams {
  builder: { pizzaId?: string; half?: boolean; config?: PizzaConfig; lineKey?: string };
  checkout: { group?: boolean };
  tracker: { id: number };
}
export type ScreenName = keyof ScreenParams;

export type StackEntry = { [K in ScreenName]: { name: K; params: ScreenParams[K]; id: string } }[ScreenName];

interface NavValue {
  tab: TabId;
  setTab(tab: TabId): void;
  stack: StackEntry[];
  push<K extends ScreenName>(name: K, params: ScreenParams[K]): void;
  replace<K extends ScreenName>(name: K, params: ScreenParams[K]): void;
  pop(): void;
}

const NavContext = createContext<NavValue | null>(null);

const entry = <K extends ScreenName>(name: K, params: ScreenParams[K]) =>
  ({ name, params, id: `${name}-${Date.now()}` }) as StackEntry;

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<TabId>('menu');
  const [stack, setStack] = useState<StackEntry[]>([]);

  const push = useCallback(<K extends ScreenName>(name: K, params: ScreenParams[K]) => {
    setStack((current) => [...current, entry(name, params)]);
  }, []);

  const replace = useCallback(<K extends ScreenName>(name: K, params: ScreenParams[K]) => {
    setStack((current) => [...current.slice(0, -1), entry(name, params)]);
  }, []);

  const pop = useCallback(() => setStack((current) => current.slice(0, -1)), []);

  const setTab = useCallback((next: TabId) => {
    hapticSelect();
    setStack([]);
    setTabState(next);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (stack.length === 0) {
      hideBackButton();
      return undefined;
    }
    return setBackButton(pop);
  }, [stack.length, pop]);

  const value = useMemo(() => ({ tab, setTab, stack, push, pop, replace }), [tab, setTab, stack, push, pop, replace]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav NavProvider ichida ishlatilishi kerak');
  return value;
}
