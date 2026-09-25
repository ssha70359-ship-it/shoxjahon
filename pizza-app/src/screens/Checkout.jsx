import { useMemo, useState } from 'react';

import { tr } from '../../shared/menu.js';
import { summarize } from '../../shared/pricing.js';
import { SHOP, distanceKm, estimateMinutes } from '../../shared/shop.js';
import { FreeDelivery, SummaryRows } from './Cart.jsx';
import Icon from '../components/Icon.jsx';
import { Segmented, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatMoney, formatPhone } from '../lib/format.js';
import { useNav } from '../lib/nav.jsx';
import { useStore } from '../lib/store.jsx';
import { ensureWriteAccess, hapticNotify, openInvoice, requestLocation, requestPhone } from '../lib/telegram.js';

export default function Checkout({ params }) {
  const { state, t, actions } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const { mode, useReward, user } = state;
  const group = params.group ? state.group : null;

  const lines = useMemo(() => {
    if (group) return group.members.flatMap((member) => member.items.map(({ config, qty }) => ({ config, qty })));
    return state.cart.map(({ config, qty }) => ({ config, qty }));
  }, [group, state.cart]);

  const summary = useMemo(
    () => summarize(lines, { mode, useReward, slices: user?.slices ?? 0 }),
    [lines, mode, useReward, user?.slices],
  );

  const saved = user?.address || {};
  const [address, setAddress] = useState({
    text: saved.text || '',
    entrance: saved.entrance || '',
    floor: saved.floor || '',
    apartment: saved.apartment || '',
    lat: saved.lat ?? null,
    lng: saved.lng ?? null,
  });
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '');
  const [payment, setPayment] = useState('cash');
  const [comment, setComment] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const km = address.lat != null ? distanceKm(SHOP.location, address) : null;
  const tooFar = mode === 'delivery' && km != null && km > SHOP.delivery.radiusKm;
  const eta = estimateMinutes(mode, km);

  const phoneOk = phone.replace(/\D/g, '').length >= 9;
  const addressOk = mode === 'pickup' || address.text.trim().length >= 3;
  const belowMin = mode === 'delivery' && summary.belowMinimum;
  const canSubmit = state.open && lines.length > 0 && phoneOk && addressOk && !tooFar && !belowMin && !submitting;

  const setField = (field) => (event) => setAddress((current) => ({ ...current, [field]: event.target.value }));

  async function locate() {
    setLocating(true);
    const point = await requestLocation();
    setLocating(false);
    if (!point) {
      actions.toast(t('checkout.locateFail'));
      return;
    }
    hapticNotify('success');
    setAddress((current) => ({ ...current, lat: point.lat, lng: point.lng }));
  }

  async function sharePhone() {
    const number = await requestPhone();
    if (number) setPhone(formatPhone(`+${number.replace(/\D/g, '')}`));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const payload = {
      mode,
      phone,
      payment,
      comment,
      useReward: summary.discount > 0,
      ...(group ? { groupCode: group.code } : { items: lines }),
      ...(mode === 'delivery'
        ? {
            address: {
              text: address.text,
              entrance: address.entrance,
              floor: address.floor,
              apartment: address.apartment,
              ...(address.lat != null ? { lat: address.lat, lng: address.lng } : {}),
            },
          }
        : {}),
    };

    try {
      const { order, invoiceUrl } = await api.createOrder(payload);
      actions.upsertOrder(order);
      if (!group) actions.clearCart();
      else actions.setUseReward(false);
      hapticNotify('success');
      nav.replace('tracker', { id: order.id });
      ensureWriteAccess();
      if (invoiceUrl) openInvoice(invoiceUrl);
    } catch (error) {
      actions.showError(error);
      setSubmitting(false);
    }
  }

  return (
    <div className="screen checkout">
      <h1 className="screen__title">{t('checkout.title')}</h1>
      {group && (
        <p className="muted">
          <Icon name="users" size={16} /> {t('checkout.group', { n: group.members.length })}
        </p>
      )}

      <Segmented
        value={mode}
        onChange={actions.setMode}
        options={[
          { value: 'delivery', label: t('mode.delivery') },
          { value: 'pickup', label: t('mode.pickup') },
        ]}
      />

      {mode === 'delivery' ? (
        <section className="card form">
          <div className="form__label">{t('checkout.address')}</div>
          <button type="button" className={`locate ${km != null ? 'is-set' : ''}`} onClick={locate} disabled={locating}>
            {locating ? <Spinner size={18} /> : <Icon name={km != null ? 'check' : 'target'} size={20} />}
            <span>
              {locating
                ? t('checkout.locating')
                : km != null
                  ? t('checkout.located', { km: km.toFixed(1) })
                  : t('checkout.locate')}
            </span>
          </button>
          {tooFar && <p className="note note--warn">{t('err.too_far')}</p>}
          <input
            className="input"
            value={address.text}
            onChange={setField('text')}
            placeholder={t('checkout.addressPh')}
            maxLength={200}
            autoComplete="street-address"
          />
          <div className="form__row">
            <input className="input" value={address.entrance} onChange={setField('entrance')} placeholder={t('checkout.entrance')} maxLength={12} inputMode="numeric" />
            <input className="input" value={address.floor} onChange={setField('floor')} placeholder={t('checkout.floor')} maxLength={12} inputMode="numeric" />
            <input className="input" value={address.apartment} onChange={setField('apartment')} placeholder={t('checkout.apartment')} maxLength={12} />
          </div>
        </section>
      ) : (
        <section className="card pickup">
          <Icon name="store" size={24} />
          <div>
            <div className="form__label">{t('checkout.pickupFrom')}</div>
            <b>{tr(SHOP.address, lang)}</b>
            <p className="muted">{t('profile.hours', SHOP.hours)}</p>
          </div>
        </section>
      )}

      <section className="card form">
        <div className="form__label">{t('checkout.phone')}</div>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+998 90 123 45 67"
          autoComplete="tel"
          maxLength={20}
        />
        <button type="button" className="link-btn" onClick={sharePhone}>
          <Icon name="phone" size={16} /> {t('checkout.sharePhone')}
        </button>
      </section>

      <section className="card form">
        <div className="form__label">{t('checkout.payment')}</div>
        <div className="pay-options">
          {[
            { id: 'cash', icon: 'cash', sub: null },
            { id: 'card', icon: 'card', sub: t('pay.cardSub') },
            ...(state.payments.online ? [{ id: 'online', icon: 'bolt', sub: t('pay.onlineSub') }] : []),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pay-option ${payment === option.id ? 'is-active' : ''}`}
              onClick={() => setPayment(option.id)}
              aria-pressed={payment === option.id}
            >
              <Icon name={option.icon} size={22} />
              <span>
                <b>{t(`pay.${option.id}`)}</b>
                {option.sub && <small>{option.sub}</small>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card form">
        <div className="form__label">{t('checkout.comment')}</div>
        <textarea
          className="input"
          rows={2}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t('checkout.commentPh')}
          maxLength={300}
        />
      </section>

      {mode === 'delivery' && <FreeDelivery summary={summary} lang={lang} t={t} />}

      <section className="card">
        <SummaryRows summary={summary} mode={mode} lang={lang} t={t} />
        <div className="eta">
          <Icon name="clock" size={18} /> {t('checkout.eta', { min: eta })}
        </div>
      </section>

      {!state.open && <p className="note note--warn">{t('checkout.closed', { time: SHOP.hours.open })}</p>}
      {belowMin && <p className="note note--warn">{t('cart.minOrder', { sum: formatMoney(SHOP.delivery.minOrder, lang) })}</p>}

      <div className="action-bar">
        <button type="button" className="btn btn--flame btn--grow btn--split" disabled={!canSubmit} onClick={submit}>
          {submitting ? <Spinner size={20} /> : <span>{t('checkout.submit')}</span>}
          <span>{formatMoney(summary.total, lang)}</span>
        </button>
      </div>
    </div>
  );
}
