import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { hapticSelect, hideBackButton, setBackButton } from './telegram.js';

// Oddiy navigatsiya: pastki tablar + ustiga ochiladigan ekranlar steki.
// Telegram'ning "Orqaga" tugmasi stek bo'sh bo'lmaganda ko'rinadi.

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [tab, setTabState] = useState('menu');
  const [stack, setStack] = useState([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((name, params = {}) => {
    setStack((current) => [...current, { name, params, id: `${name}-${Date.now()}` }]);
  }, []);

  const pop = useCallback(() => {
    setStack((current) => current.slice(0, -1));
  }, []);

  const replace = useCallback((name, params = {}) => {
    setStack((current) => [...current.slice(0, -1), { name, params, id: `${name}-${Date.now()}` }]);
  }, []);

  const setTab = useCallback((next) => {
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
    return setBackButton(() => pop());
  }, [stack.length, pop]);

  const value = useMemo(
    () => ({ tab, setTab, stack, top: stack[stack.length - 1] ?? null, push, pop, replace }),
    [tab, setTab, stack, push, pop, replace],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  return useContext(NavContext);
}
