import { useEffect, useState } from 'react';

import { tr } from '../../shared/menu.js';
import { defaultPizzaConfig, membersFromItems, splitBill } from '../../shared/pricing.js';
import { SHOP } from '../../shared/shop.js';
import { STATUS_LABELS, customerCanCancel, trackerSteps } from '../../shared/status.js';
import { LineView } from '../components/Cards.jsx';
import Icon from '../components/Icon.jsx';
import { OrderScene } from '../components/Oven.jsx';
import { Avatar, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatMoney, formatTime } from '../lib/format.js';
import { useNav } from '../lib/nav.jsx';
import { useStore } from '../lib/store.jsx';
import { callPhone, confirmDialog, hapticNotify, openInvoice } from '../lib/telegram.js';

const FALLBACK_PIZZA = defaultPizzaConfig('pepperoni', 'M');

function useNow(interval = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

function Steps({ order, lang }) {
  const steps = trackerSteps(order.mode);
  const reached = new Map(order.history.map((entry) => [entry.status, entry.at]));
  const currentIndex = steps.indexOf(order.status);

  return (
    <ol className="steps">
      {steps.map((step, i) => {
        const done = reached.has(step) || i < currentIndex;
        const current = step === order.status && order.status !== 'done';
        return (
          <li key={step} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
            <span className="steps__dot">{done && !current ? <Icon name="check" size={12} strokeWidth={3} /> : null}</span>
            <span className="steps__label">{tr(STATUS_LABELS[step], lang)}</span>
            <span className="steps__time">{reached.has(step) ? formatTime(reached.get(step)) : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Tracker({ params }) {
  const { state, t, actions } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const order = state.orders[params.id];
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (order) return;
    actions.loadOrder(params.id).catch(() => setMissing(true));
  }, [order, params.id, actions]);

  // Oxirgi holatga yetganda tabriklaymiz
  useEffect(() => {
    if (order?.status === 'done') hapticNotify('success');
  }, [order?.status]);

  if (!order) {
    return (
      <div className="screen tracker center pad">
        {missing ? <p className="muted">{t('err.order_not_found')}</p> : <Spinner size={32} />}
      </div>
    );
  }

  const firstPizza = order.items.find((item) => item.config.kind === 'pizza')?.config ?? FALLBACK_PIZZA;
  const minutesLeft = order.etaAt ? Math.round((order.etaAt - now) / 60000) : null;
  const active = !['done', 'cancelled'].includes(order.status);
  const mine = order.userId === state.user?.id;
  const shares = order.groupCode
    ? splitBill(membersFromItems(order.items), { deliveryFee: order.deliveryFee, discount: order.discount, hostId: order.userId })
    : [];

  async function run(action) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      actions.showError(error);
    } finally {
      setBusy(false);
    }
  }

  const pay = () =>
    run(async () => {
      const { invoiceUrl } = await api.invoice(order.id);
      await openInvoice(invoiceUrl);
    });

  const payCash = () =>
    run(async () => {
      const { order: updated } = await api.payCash(order.id);
      actions.upsertOrder(updated);
    });

  const cancel = async () => {
    if (!(await confirmDialog(t('track.cancelConfirm')))) return;
    run(async () => {
      const { order: updated } = await api.cancelOrder(order.id);
      actions.upsertOrder(updated);
    });
  };

  return (
    <div className="screen tracker">
      <OrderScene order={order} pizza={firstPizza} />

      <div className="tracker__head">
        <span className="tracker__id">
          {t('track.order', { id: order.id })} · {formatDate(order.createdAt, lang)}
        </span>
        <h1 className="tracker__title">{t(`track.title.${order.status}`)}</h1>
        {active && order.status !== 'pending_payment' && order.etaAt && (
          <div className="tracker__eta">
            <span className="tracker__eta-big">
              {minutesLeft > 1 ? t('track.left', { n: minutesLeft }) : t('track.soon')}
            </span>
            <span className="muted">{t('track.eta', { time: formatTime(order.etaAt) })}</span>
          </div>
        )}
        {order.status === 'baking' && <span className="tracker__oven">🔥 {t('track.oven')}</span>}
        {order.status === 'done' && order.slicesEarned > 0 && mine && (
          <span className="tracker__slices">🍕 {t('track.slices', { n: order.slicesEarned })}</span>
        )}
      </div>

      {order.status !== 'cancelled' && order.status !== 'pending_payment' && <Steps order={order} lang={lang} />}

      <div className="tracker__actions">
        {order.status === 'pending_payment' && mine && (
          <>
            <button type="button" className="btn btn--flame btn--grow" onClick={pay} disabled={busy}>
              <Icon name="bolt" size={18} /> {t('track.pay')} · {formatMoney(order.total, lang)}
            </button>
            <button type="button" className="btn btn--ghost btn--grow" onClick={payCash} disabled={busy}>
              {t('track.toCash')}
            </button>
          </>
        )}
        {active && (
          <button type="button" className="btn btn--ghost" onClick={() => callPhone(SHOP.phone)}>
            <Icon name="phone" size={18} /> {t('track.call')}
          </button>
        )}
        {mine && customerCanCancel(order) && (
          <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>
            {t('track.cancel')}
          </button>
        )}
        {!active && (
          <button type="button" className="btn btn--flame btn--grow" onClick={() => nav.setTab('menu')}>
            {t('track.again')}
          </button>
        )}
      </div>

      {shares.length > 0 && (
        <section className="card">
          <div className="form__label">{t('group.split')}</div>
          {shares.map((share) => (
            <div key={share.id} className="split-row">
              <Avatar name={share.name} id={share.id} size={30} />
              <span className="split-row__name">{share.id === state.user?.id ? t('group.you') : share.name}</span>
              <b>{formatMoney(share.amount, lang)}</b>
            </div>
          ))}
        </section>
      )}

      <section className="card lines">
        <div className="form__label">{t('track.details')}</div>
        {order.items.map((item, i) => (
          <LineView key={i} config={item.config} qty={item.qty} unit={item.unit} lang={lang} by={item.by?.name} />
        ))}
        <div className="summary">
          {order.discount > 0 && (
            <div className="summary__row is-discount">
              <span>🍕 {t('cart.discount')}</span>
              <span>−{formatMoney(order.discount, lang)}</span>
            </div>
          )}
          {order.mode === 'delivery' && (
            <div className="summary__row">
              <span>{t('cart.delivery')}</span>
              <span>{order.deliveryFee ? formatMoney(order.deliveryFee, lang) : t('cart.free')}</span>
            </div>
          )}
          <div className="summary__row summary__row--total">
            <span>{t('cart.total')}</span>
            <span>{formatMoney(order.total, lang)}</span>
          </div>
          <div className="summary__row muted">
            <span>{t('checkout.payment')}</span>
            <span>
              {t(`pay.${order.payment}`)}
              {order.paid ? ` · ${t('track.paid')}` : ''}
            </span>
          </div>
          {order.address?.text && (
            <div className="summary__row muted">
              <span>{t('checkout.address')}</span>
              <span className="summary__address">{order.address.text}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
