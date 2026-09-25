import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CATEGORIES, ITEMS, PIZZAS, TOPPING_BY_ID, tr, type CategoryId, type Pizza } from '@shared/menu';
import { defaultPizzaConfig } from '@shared/pricing';
import { SHOP } from '@shared/shop';
import { STATUS_LABELS } from '@shared/status';
import { ItemRow, PizzaCard } from '../components/Cards';
import Icon, { type IconName } from '../components/Icon';
import { LoyaltyPizza, PizzaStage } from '../components/PizzaStage';
import ShakeOverlay from '../components/ShakeOverlay';
import { Segmented } from '../components/ui';
import { formatMoney } from '../lib/format';
import { useNav } from '../lib/nav';
import { canShake, useShake } from '../lib/sensors';
import { useStore } from '../lib/store';
import { haptic } from '../lib/telegram';

const VISIBLE_PIZZAS = PIZZAS.filter((pizza) => !pizza.hidden);
const HERO: Pizza = VISIBLE_PIZZAS.find((pizza) => pizza.tags.includes('signature')) ?? VISIBLE_PIZZAS[0]!;
const HERO_CONFIG = defaultPizzaConfig(HERO.id, 'L');

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

function Header() {
  const { state, t, actions } = useStore();
  const { open, close } = SHOP.hours;

  return (
    <header className="home-header">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Icon name="flame" size={20} strokeWidth={2.2} />
        </span>
        <div>
          <div className="brand__name">{SHOP.name}</div>
          <div className={`brand__status ${state.open ? 'is-open' : 'is-closed'}`}>
            <i />
            {state.open ? t('home.open', { time: close }) : t('home.closed', { time: open })}
          </div>
        </div>
      </div>
      <Segmented
        className="segmented--compact"
        value={state.mode}
        onChange={actions.setMode}
        options={[
          { value: 'delivery', label: t('mode.delivery') },
          { value: 'pickup', label: t('mode.pickup') },
        ]}
      />
    </header>
  );
}

function Banners() {
  const { state, t, activeOrders, groupActive } = useStore();
  const nav = useNav();
  const group = state.group;

  return (
    <>
      {activeOrders.slice(0, 2).map((order) => (
        <button
          key={order.id}
          type="button"
          className="banner banner--order"
          onClick={() => nav.push('tracker', { id: order.id })}
        >
          <span className="banner__pulse" />
          <span className="banner__text">
            <b>{t('banner.order', { id: order.id })}</b>
            <span>{tr(STATUS_LABELS[order.status], state.lang)}</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      ))}
      {groupActive && group && (
        <button type="button" className="banner banner--group" onClick={() => nav.setTab('group')}>
          <Icon name="users" size={20} />
          <span className="banner__text">
            <b>{t('banner.group', { code: group.code, n: group.members.length })}</b>
            <span>{t('banner.groupHint')}</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}
    </>
  );
}

function Hero({ onOpen }: { onOpen(pizzaId: string): void }) {
  const { state, t } = useStore();
  const soldOut = state.stoplist.has(HERO.id);

  return (
    <section className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__text">
        <span className="hero__kicker">
          <Icon name="flame" size={14} strokeWidth={2.4} /> {t('hero.kicker')}
        </span>
        <h2 className="hero__title">{tr(HERO.name, state.lang)}</h2>
        <p className="hero__desc">{tr(HERO.desc, state.lang)}</p>
        <button type="button" className="btn btn--flame btn--sm" onClick={() => onOpen(HERO.id)} disabled={soldOut}>
          {soldOut ? t('common.soldOut') : `${t('hero.cta')} · ${formatMoney(HERO.prices.S, state.lang)}`}
        </button>
      </div>
      <div className="hero__art">
        <PizzaStage config={HERO_CONFIG} size={210} spin steam={false} seed="hero" label={tr(HERO.name, state.lang)} />
      </div>
    </section>
  );
}

function QuickActions({ onShake }: { onShake(): void }) {
  const { t } = useStore();
  const nav = useNav();

  const actions: { id: 'builder' | 'half' | 'group' | 'shake'; icon: IconName; onClick(): void }[] = [
    { id: 'builder', icon: 'palette', onClick: () => nav.push('builder', { pizzaId: 'custom' }) },
    { id: 'half', icon: 'half', onClick: () => nav.push('builder', { pizzaId: 'margarita', half: true }) },
    { id: 'group', icon: 'users', onClick: () => nav.setTab('group') },
    { id: 'shake', icon: 'dice', onClick: onShake },
  ];

  return (
    <section className="quick">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`quick__item quick__item--${action.id}`}
          onClick={action.onClick}
        >
          <span className="quick__icon">
            <Icon name={action.icon} size={22} />
          </span>
          <span className="quick__title">{t(`qa.${action.id}`)}</span>
          <span className="quick__sub">{t(`qa.${action.id}.sub`)}</span>
        </button>
      ))}
    </section>
  );
}

function LoyaltyStrip() {
  const { state, t } = useStore();
  const nav = useNav();
  const max = SHOP.loyalty.slicesForReward;
  const slices = state.user?.slices ?? 0;
  const ready = slices >= max;

  return (
    <button
      type="button"
      className={`loyalty-strip ${ready ? 'is-ready' : ''}`}
      onClick={() => nav.setTab(ready ? 'cart' : 'profile')}
    >
      <LoyaltyPizza filled={slices} total={max} size={48} />
      <span className="loyalty-strip__text">
        <b>{t('loyalty.progress', { n: Math.min(slices, max), max })}</b>
        <span>{ready ? t('loyalty.ready') : t('loyalty.left', { n: max - slices })}</span>
      </span>
      <Icon name="chevron" size={18} />
    </button>
  );
}

export default function Home() {
  const { state, t } = useStore();
  const nav = useNav();
  const lang = state.lang;

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('pizzas');
  const [shaking, setShaking] = useState(false);
  const sections = useRef<Partial<Record<CategoryId, HTMLElement | null>>>({});
  const chipsRef = useRef<HTMLDivElement>(null);

  const openPizza = useCallback((pizzaId: string) => nav.push('builder', { pizzaId }), [nav]);

  const startShake = useCallback(() => {
    haptic('heavy');
    setShaking(true);
  }, []);
  useShake(startShake, nav.stack.length === 0 && !shaking);

  const q = query.trim().toLowerCase();

  const pizzas = useMemo(() => {
    if (!q) return VISIBLE_PIZZAS;
    return VISIBLE_PIZZAS.filter(
      (pizza) =>
        matches(tr(pizza.name, lang), q) || pizza.toppings.some((id) => matches(tr(TOPPING_BY_ID[id]?.name, lang), q)),
    );
  }, [q, lang]);

  const items = useMemo(() => (q ? ITEMS.filter((item) => matches(tr(item.name, lang), q)) : ITEMS), [q, lang]);

  // Ro'yxatni aylantirganda faol kategoriya avtomatik almashadi
  useEffect(() => {
    if (q) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          const category = (top?.target as HTMLElement | undefined)?.dataset.category as CategoryId | undefined;
          if (category) setActiveCategory(category);
        }
      },
      { rootMargin: '-120px 0px -55% 0px' },
    );
    Object.values(sections.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [q]);

  useEffect(() => {
    const chip = chipsRef.current?.querySelector('.is-active');
    chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  const jump = (id: CategoryId) => {
    setActiveCategory(id);
    sections.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pizzaGrid = (
    <div className="pizza-grid">
      {pizzas.map((pizza) => (
        <PizzaCard
          key={pizza.id}
          pizza={pizza}
          lang={lang}
          t={t}
          soldOut={state.stoplist.has(pizza.id)}
          onOpen={openPizza}
        />
      ))}
    </div>
  );

  return (
    <div className="screen home">
      <Header />
      <Banners />
      {!q && (
        <>
          <Hero onOpen={openPizza} />
          <QuickActions onShake={startShake} />
          <LoyaltyStrip />
        </>
      )}

      <div className="search">
        <Icon name="search" size={19} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search.placeholder')}
          enterKeyHint="search"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('common.close')}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {q ? (
        <div className="search-results">
          {pizzas.length > 0 && pizzaGrid}
          {items.length > 0 && (
            <div className="item-list">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {pizzas.length === 0 && items.length === 0 && <p className="muted center pad">{t('search.empty')}</p>}
        </div>
      ) : (
        <>
          <div className="chips" ref={chipsRef}>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip ${activeCategory === category.id ? 'is-active' : ''}`}
                onClick={() => jump(category.id)}
              >
                {tr(category.name, lang)}
              </button>
            ))}
          </div>

          {CATEGORIES.map((category) => (
            <section
              key={category.id}
              className="menu-section"
              data-category={category.id}
              ref={(el) => {
                sections.current[category.id] = el;
              }}
            >
              <h3 className="menu-section__title">{tr(category.name, lang)}</h3>
              {category.id === 'pizzas' ? (
                pizzaGrid
              ) : (
                <div className="item-list">
                  {ITEMS.filter((item) => item.category === category.id).map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {shaking && (
        <ShakeOverlay
          canShake={canShake()}
          onClose={() => setShaking(false)}
          onPick={(pizzaId) => {
            setShaking(false);
            openPizza(pizzaId);
          }}
        />
      )}
    </div>
  );
}
