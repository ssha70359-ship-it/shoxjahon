import { useEffect, useState } from 'react';

import { useNav, type TabId } from '../lib/nav';
import { useStore, type AppState } from '../lib/store';
import Icon, { type IconName } from './Icon';

export function BottomNav() {
  const { tab, setTab } = useNav();
  const { t, state, groupActive } = useStore();
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
  const groupCount = groupActive ? (state.group?.itemsCount ?? 0) : 0;

  const tabs: { id: TabId; icon: IconName; label: string; badge?: number; live?: boolean }[] = [
    { id: 'menu', icon: 'slice', label: t('nav.menu') },
    { id: 'group', icon: 'users', label: t('nav.group'), badge: groupCount, live: groupActive },
    { id: 'cart', icon: 'bag', label: t('nav.cart'), badge: count },
    { id: 'profile', icon: 'user', label: t('nav.profile') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigatsiya">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          data-nav={item.id}
          className={`bottom-nav__item ${tab === item.id ? 'is-active' : ''}`}
          onClick={() => setTab(item.id)}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon">
            <Icon name={item.icon} size={23} />
            {(item.badge ?? 0) > 0 && (
              <span className="badge" key={item.badge}>
                {item.badge}
              </span>
            )}
            {item.live && !item.badge && <span className="badge badge--dot" />}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Toast() {
  const { state } = useStore();
  const [visible, setVisible] = useState<AppState['toast']>(null);

  useEffect(() => {
    if (!state.toast) return undefined;
    setVisible(state.toast);
    const timer = setTimeout(() => setVisible(null), 2400);
    return () => clearTimeout(timer);
  }, [state.toast]);

  if (!visible) return null;
  return (
    <div className={`toast toast--${visible.kind}`} role="status" key={visible.id}>
      {visible.kind === 'success' && <Icon name="check" size={18} />}
      <span>{visible.text}</span>
    </div>
  );
}
