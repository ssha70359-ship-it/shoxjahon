import { useEffect, useState } from 'react';

import { SHOP } from '../shared/shop.js';
import { tr } from '../shared/menu.js';
import { BottomNav, Toast } from './components/Chrome.jsx';
import Icon from './components/Icon.jsx';
import { NavProvider, useNav } from './lib/nav.jsx';
import { StoreProvider, useStore } from './lib/store.jsx';
import { errorText, translate } from './lib/i18n.js';
import { colorScheme, onThemeChange, setChrome } from './lib/telegram.js';
import Pizza, { PizzaDefs } from './pizza/Pizza.jsx';
import Builder from './screens/Builder.jsx';
import Cart from './screens/Cart.jsx';
import Checkout from './screens/Checkout.jsx';
import Group from './screens/Group.jsx';
import Home from './screens/Home.jsx';
import Profile from './screens/Profile.jsx';
import Tracker from './screens/Tracker.jsx';

const TABS = { menu: Home, group: Group, cart: Cart, profile: Profile };
const SCREENS = { builder: Builder, checkout: Checkout, tracker: Tracker };

const SPLASH_PIZZA = {
  kind: 'pizza',
  size: 'L',
  crust: 'classic',
  parts: [{ pizzaId: 'pepperoni', sauce: 'tomato', removed: [], extras: ['basil'] }],
};

function applyTheme() {
  const scheme = colorScheme();
  document.documentElement.dataset.theme = scheme;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) setChrome(bg);
}

function Splash({ error, lang, onRetry }) {
  return (
    <div className="splash">
      <div className="splash__pizza">
        <Pizza config={SPLASH_PIZZA} size={190} animate seed="splash" />
      </div>
      <div className="splash__name">
        <Icon name="flame" size={22} strokeWidth={2.2} /> {SHOP.name}
      </div>
      <p className="splash__tagline">{tr(SHOP.tagline, lang)}</p>
      {error ? (
        <div className="splash__error">
          <p>{errorText(lang, error)}</p>
          <button type="button" className="btn btn--flame" onClick={onRetry}>
            <Icon name="refresh" size={18} /> {translate(lang, 'common.retry')}
          </button>
        </div>
      ) : (
        <p className="splash__status">{translate(lang, 'splash.loading')}</p>
      )}
    </div>
  );
}

function Shell() {
  const { state, actions } = useStore();
  const nav = useNav();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    applyTheme();
    const off = onThemeChange(applyTheme);
    const timer = setTimeout(() => setSplashDone(true), 1300);
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  // Bot tugmasi yoki havola orqali kelganda kerakli sahifani ochamiz
  useEffect(() => {
    if (state.status !== 'ready' || !state.launch) return;
    if (state.launch.type === 'group') nav.setTab('group');
    if (state.launch.type === 'order') {
      nav.push('tracker', { id: state.launch.id });
      actions.clearLaunch();
    }
  }, [state.status, state.launch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status !== 'ready' || !splashDone) {
    return <Splash error={state.status === 'error' ? state.error : null} lang={state.lang} onRetry={actions.boot} />;
  }

  const Tab = TABS[nav.tab] ?? Home;

  return (
    <>
      <main className="tab-content" aria-hidden={nav.stack.length > 0 || undefined}>
        <Tab key={nav.tab} />
      </main>
      <BottomNav />
      {nav.stack.map((entry, i) => {
        const Screen = SCREENS[entry.name];
        return (
          <div key={entry.id} className="layer" style={{ zIndex: 30 + i }}>
            <Screen params={entry.params} />
          </div>
        );
      })}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <NavProvider>
        <PizzaDefs />
        <Shell />
      </NavProvider>
    </StoreProvider>
  );
}
