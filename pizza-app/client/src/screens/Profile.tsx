import { useEffect, useState } from 'react';

import { tr } from '@shared/menu';
import { isAvailable } from '@shared/pricing';
import type { OrderDto } from '@shared/types';
import { SHOP } from '@shared/shop';
import { STATUS_LABELS } from '@shared/status';
import Icon from '../components/Icon';
import { LoyaltyPizza } from '../components/PizzaStage';
import { Avatar, Segmented, Spinner } from '../components/ui';
import { formatDate, formatMoney, formatPhone } from '../lib/format';
import { useNav } from '../lib/nav';
import { useStore } from '../lib/store';
import { addToHomeScreen, callPhone, canAddToHomeScreen } from '../lib/telegram';
import Pizza from '../pizza/Pizza';
import ItemArt from '../components/ItemArt';
import { ITEM_BY_ID } from '@shared/menu';

export default function Profile() {
  const { state, t, actions } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const user = state.user;
  const max = SHOP.loyalty.slicesForReward;
  const slices = user?.slices ?? 0;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    actions
      .loadHistory()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actions]);

  const history = (state.historyIds ?? [])
    .map((id) => state.orders[id])
    .filter((order): order is OrderDto => Boolean(order));

  function repeat(order: OrderDto) {
    const own = order.items.filter((item) => !item.by || item.by.id === user?.id);
    const available = own.filter((item) => isAvailable(item.config, state.stoplist));
    actions.setCart(available.map(({ config, qty }) => ({ config, qty })));
    if (available.length < own.length) actions.toast(t('profile.repeatPartial'));
    nav.setTab('cart');
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';

  return (
    <div className="screen profile">
      <section className="profile-head">
        <Avatar name={name} id={user?.id} size={56} />
        <div>
          <h1>{name}</h1>
          <p className="muted">
            {user?.username ? `@${user.username}` : ''}
            {user?.phone ? ` · ${formatPhone(user.phone)}` : ''}
          </p>
        </div>
      </section>

      <section className="loyalty-card">
        <div className="loyalty-card__art">
          <LoyaltyPizza filled={slices} total={max} size={132} />
        </div>
        <div className="loyalty-card__text">
          <span className="loyalty-card__label">{t('profile.loyalty')}</span>
          <div className="loyalty-card__count">
            {Math.min(slices, max)}
            <small>/{max}</small>
          </div>
          <p>{t('profile.loyaltyText', { max })}</p>
          {slices >= max && (
            <button type="button" className="btn btn--light btn--sm" onClick={() => nav.setTab('cart')}>
              <Icon name="gift" size={16} /> {t('cart.reward')}
            </button>
          )}
        </div>
      </section>

      <h2 className="section-heading">{t('profile.orders')}</h2>
      {loading && history.length === 0 ? (
        <div className="center pad">
          <Spinner />
        </div>
      ) : history.length === 0 ? (
        <p className="muted pad">{t('profile.noOrders')}</p>
      ) : (
        <div className="orders">
          {history.map((order) => {
            const first = order.items[0]?.config;
            return (
              <div key={order.id} className="order-row">
                <button type="button" className="order-row__main" onClick={() => nav.push('tracker', { id: order.id })}>
                  <span className="order-row__art">
                    {first?.kind === 'pizza' ? (
                      <Pizza config={first} size={48} />
                    ) : first ? (
                      <ItemArt art={ITEM_BY_ID[first.itemId]?.art} size={46} />
                    ) : null}
                  </span>
                  <span className="order-row__text">
                    <b>#{order.id}</b>
                    <span className="muted small">{formatDate(order.createdAt, lang)}</span>
                  </span>
                  <span className="order-row__right">
                    <b>{formatMoney(order.total, lang)}</b>
                    <span className={`status status--${order.status}`}>{tr(STATUS_LABELS[order.status], lang)}</span>
                  </span>
                </button>
                {order.status === 'done' && (
                  <button type="button" className="link-btn" onClick={() => repeat(order)}>
                    <Icon name="refresh" size={15} /> {t('profile.repeat')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="section-heading">{t('profile.language')}</h2>
      <Segmented
        value={lang}
        onChange={actions.setLang}
        options={[
          { value: 'uz', label: 'Oʻzbekcha' },
          { value: 'ru', label: 'Русский' },
        ]}
      />

      {canAddToHomeScreen() && (
        <button type="button" className="settings-row" onClick={addToHomeScreen}>
          <Icon name="phoneScreen" size={20} />
          <span>{t('profile.homeScreen')}</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <h2 className="section-heading">{t('profile.contacts')}</h2>
      <div className="card contacts">
        <button type="button" className="settings-row" onClick={() => callPhone(SHOP.phone)}>
          <Icon name="phone" size={20} />
          <span>{SHOP.phone}</span>
          <Icon name="chevron" size={18} />
        </button>
        <div className="settings-row">
          <Icon name="pin" size={20} />
          <span>{tr(SHOP.address, lang)}</span>
        </div>
        <div className="settings-row">
          <Icon name="clock" size={20} />
          <span>{t('profile.hours', SHOP.hours)}</span>
        </div>
      </div>

      <p className="footer-note">
        <Icon name="flame" size={14} /> {SHOP.name} · {tr(SHOP.tagline, lang)}
      </p>
    </div>
  );
}
