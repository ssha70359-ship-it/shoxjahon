import { useMemo, useState } from 'react';

import { tr } from '@shared/menu';
import { summarize } from '@shared/pricing';
import type { Address, CartLine, PaymentMethod } from '@shared/types';
import { SHOP, distanceKm, estimateMinutes } from '@shared/shop';
import { FreeDelivery, SummaryRows } from './Cart';
import Icon, { type IconName } from '../components/Icon';
import { Segmented, Spinner } from '../components/ui';
import { api, type CreateOrderPayload } from '../lib/api';
import { formatMoney, formatPhone } from '../lib/format';
import { useNav, type ScreenParams } from '../lib/nav';
import { useStore } from '../lib/store';
import { ensureWriteAccess, hapticNotify, openInvoice, openLink, requestLocation, requestPhone } from '../lib/telegram';

export default function Checkout({ params }: { params: ScreenParams['checkout'] }) {
  const { state, t, actions } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const { mode, useReward, user } = state;
  const group = params.group ? state.group : null;

  const lines = useMemo<CartLine[]>(() => {
    if (group) return group.members.flatMap((member) => member.items.map(({ config, qty }) => ({ config, qty })));
    return state.cart.map(({ config, qty }) => ({ config, qty }));
  }, [group, state.cart]);

  const summary = useMemo(
    () => summarize(lines, { mode, useReward, slices: user?.slices ?? 0 }),
    [lines, mode, useReward, user?.slices],
  );

  const saved: Partial<Address> = user?.address ?? {};
  const [address, setAddress] = useState<Omit<Address, 'lat' | 'lng'> & { lat: number | null; lng: number | null }>({
    text: saved.text || '',
    entrance: saved.entrance || '',
    floor: saved.floor || '',
    apartment: saved.apartment || '',
    lat: saved.lat ?? null,
    lng: saved.lng ?? null,
  });
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const km =
    address.lat != null && address.lng != null
      ? distanceKm(SHOP.location, { lat: address.lat, lng: address.lng })
      : null;
  const tooFar = mode === 'delivery' && km != null && km > SHOP.delivery.radiusKm;
  const eta = estimateMinutes(mode, km);

  const phoneOk = phone.replace(/\D/g, '').length >= 9;
  const addressOk = mode === 'pickup' || address.text.trim().length >= 3;
  const belowMin = mode === 'delivery' && summary.belowMinimum;
  const canSubmit = state.open && lines.length > 0 && phoneOk && addressOk && !tooFar && !belowMin && !submitting;

  const setField = (field: 'text' | 'entrance' | 'floor' | 'apartment') => (event: { target: { value: string } }) =>
    setAddress((current) => ({ ...current, [field]: event.target.value }));

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

    const payload: CreateOrderPayload = {
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
              ...(address.lat != null && address.lng != null ? { lat: address.lat, lng: address.lng } : {}),
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
          {address.lat != null && address.lng != null && (
            <MapPreview lat={address.lat} lng={address.lng} title={t('checkout.mapTitle')} />
          )}
          {km != null && (
            <div className="map-actions">
              <button type="button" className="link-btn" onClick={locate} disabled={locating}>
                <Icon name="refresh" size={16} /> {t('checkout.relocate')}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => openLink(yandexMapUrl(address.lat as number, address.lng as number))}
              >
                <Icon name="pin" size={16} /> {t('checkout.openMap')}
              </button>
            </div>
          )}
          {tooFar && <p className="note note--warn">{t('err.too_far')}</p>}
          <input
            className="input"
            value={address.text}
            onChange={setField('text')}
            placeholder={t('checkout.addressPh')}
            maxLength={200}
            autoComplete="street-address"
          />
          {km != null && !addressOk && <p className="note note--warn">{t('checkout.addressAfterPin')}</p>}
          <div className="form__row">
            <input
              className="input"
              value={address.entrance}
              onChange={setField('entrance')}
              placeholder={t('checkout.entrance')}
              maxLength={12}
              inputMode="numeric"
            />
            <input
              className="input"
              value={address.floor}
              onChange={setField('floor')}
              placeholder={t('checkout.floor')}
              maxLength={12}
              inputMode="numeric"
            />
            <input
              className="input"
              value={address.apartment}
              onChange={setField('apartment')}
              placeholder={t('checkout.apartment')}
              maxLength={12}
            />
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
          {(
            [
              { id: 'cash', icon: 'cash', sub: null },
              { id: 'card', icon: 'card', sub: t('pay.cardSub') },
              ...(state.payments.online ? [{ id: 'online', icon: 'bolt', sub: t('pay.onlineSub') }] : []),
            ] as { id: PaymentMethod; icon: IconName; sub: string | null }[]
          ).map((option) => (
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
      {belowMin && (
        <p className="note note--warn">{t('cart.minOrder', { sum: formatMoney(SHOP.delivery.minOrder, lang) })}</p>
      )}
      {/* Tugma nega bosilmayotganini aytamiz: aks holda mijoz nima yetishmasligini topolmaydi */}
      {state.open && !addressOk && <p className="note note--warn">{t('err.address_required')}</p>}
      {state.open && addressOk && !phoneOk && <p className="note note--warn">{t('err.phone_required')}</p>}

      <div className="action-bar">
        <button type="button" className="btn btn--flame btn--grow btn--split" disabled={!canSubmit} onClick={submit}>
          {submitting ? <Spinner size={20} /> : <span>{t('checkout.submit')}</span>}
          <span>{formatMoney(summary.total, lang)}</span>
        </button>
      </div>
    </div>
  );
}

const yandexMapUrl = (lat: number, lng: number) => `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map`;

/** Mijoz nuqta to'g'ri belgilanganini ko'zi bilan tekshirishi uchun kichik xarita (OpenStreetMap, kalit shart emas) */
function MapPreview({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const dLat = 0.0025;
  const dLng = 0.004;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(5)).join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
  return <iframe className="map-preview" src={src} title={title} loading="lazy" />;
}
