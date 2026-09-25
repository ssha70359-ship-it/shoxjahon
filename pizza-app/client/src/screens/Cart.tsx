import type { ReactNode } from 'react';

import { ITEMS, tr, type MenuItem } from '@shared/menu';
import type { CartSummary } from '@shared/pricing';
import type { Lang, OrderMode } from '@shared/types';
import { SHOP } from '@shared/shop';
import { LineView } from '../components/Cards';
import Icon from '../components/Icon';
import ItemArt from '../components/ItemArt';
import { LoyaltyPizza } from '../components/PizzaStage';
import { Money, SectionTitle, Segmented, Stepper } from '../components/ui';
import { formatMoney } from '../lib/format';
import { useNav } from '../lib/nav';
import type { StoreValue } from '../lib/store';
import { useStore } from '../lib/store';
import { confirmDialog, haptic } from '../lib/telegram';

const UPSELL = ['cola', 'tarragon', 'ayran', 'sauce-garlic', 'sauce-cheese', 'fries', 'cheesecake'];

export function EmptyBox({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 160 120" width="160" height="120" aria-hidden="true" className="empty__art">
        <ellipse cx="80" cy="108" rx="62" ry="7" fill="currentColor" opacity=".08" />
        <path d="M22 54h116l-8 48H30z" fill="#e7b57d" />
        <path d="M22 54l14-34h88l14 34z" fill="#f0c38e" />
        <path d="M36 20l-14 34M124 20l14 34" stroke="#d49c62" strokeWidth="2" />
        <circle cx="64" cy="76" r="3" fill="#b07a45" />
        <circle cx="96" cy="76" r="3" fill="#b07a45" />
        <path d="M70 90c6-5 14-5 20 0" stroke="#b07a45" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

interface SummaryProps {
  summary: CartSummary;
  lang: Lang;
  t: StoreValue['t'];
}

export function SummaryRows({ summary, mode, lang, t }: SummaryProps & { mode: OrderMode }) {
  return (
    <div className="summary">
      <div className="summary__row">
        <span>{t('cart.subtotal')}</span>
        <span>{formatMoney(summary.subtotal, lang)}</span>
      </div>
      {mode === 'delivery' && (
        <div className="summary__row">
          <span>{t('cart.delivery')}</span>
          <span className={summary.deliveryFee ? '' : 'is-free'}>
            {summary.deliveryFee ? formatMoney(summary.deliveryFee, lang) : t('cart.free')}
          </span>
        </div>
      )}
      {summary.discount > 0 && (
        <div className="summary__row is-discount">
          <span>🍕 {t('cart.discount')}</span>
          <span>−{formatMoney(summary.discount, lang)}</span>
        </div>
      )}
      <div className="summary__row summary__row--total">
        <span>{t('cart.total')}</span>
        <Money value={summary.total} />
      </div>
    </div>
  );
}

export function FreeDelivery({ summary, lang, t }: SummaryProps) {
  const { freeFrom } = SHOP.delivery;
  const progress = Math.min(1, 1 - summary.freeDeliveryLeft / freeFrom);
  return (
    <div className={`free-delivery ${summary.freeDeliveryLeft === 0 ? 'is-done' : ''}`}>
      <div className="free-delivery__text">
        <Icon name="scooter" size={18} />
        {summary.freeDeliveryLeft === 0
          ? t('cart.freeDone')
          : t('cart.freeLeft', { sum: formatMoney(summary.freeDeliveryLeft, lang) })}
      </div>
      <div className="progress">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}

export default function Cart() {
  const { state, t, actions, summary, groupActive } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const { cart, mode, useReward } = state;

  const inCart = new Set(cart.flatMap((line) => (line.config.kind === 'item' ? [line.config.itemId] : [])));
  const upsell = UPSELL.map((id) => ITEMS.find((item) => item.id === id)).filter(
    (item): item is MenuItem => item !== undefined && !inCart.has(item.id) && !state.stoplist.has(item.id),
  );

  if (cart.length === 0) {
    return (
      <div className="screen cart">
        <h1 className="screen__title">{t('cart.title')}</h1>
        {groupActive && state.group && (
          <button type="button" className="banner banner--group" onClick={() => nav.setTab('group')}>
            <Icon name="users" size={20} />
            <span className="banner__text">
              <b>{t('banner.group', { code: state.group.code, n: state.group.members.length })}</b>
              <span>{t('banner.groupHint')}</span>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        )}
        <EmptyBox
          title={t('cart.empty')}
          text={t('cart.emptyText')}
          action={
            <button type="button" className="btn btn--flame" onClick={() => nav.setTab('menu')}>
              {t('cart.toMenu')}
            </button>
          }
        />
      </div>
    );
  }

  const blocked = mode === 'delivery' && summary.belowMinimum;

  return (
    <div className="screen cart">
      <div className="screen__head">
        <h1 className="screen__title">{t('cart.title')}</h1>
        <button
          type="button"
          className="link-btn"
          onClick={async () => {
            if (await confirmDialog(t('cart.clearConfirm'))) actions.clearCart();
          }}
        >
          {t('cart.clear')}
        </button>
      </div>

      <Segmented
        value={mode}
        onChange={actions.setMode}
        options={[
          { value: 'delivery', label: t('mode.delivery') },
          { value: 'pickup', label: t('mode.pickup') },
        ]}
      />

      <div className="card lines">
        {cart.map((line) => (
          <LineView
            key={line.key}
            config={line.config}
            qty={line.qty}
            lang={lang}
            onOpen={(() => {
              const { config } = line;
              return config.kind === 'pizza' ? () => nav.push('builder', { config, lineKey: line.key }) : undefined;
            })()}
          >
            <Stepper size="sm" value={line.qty} onChange={(qty) => actions.setQty(line.key, qty)} />
          </LineView>
        ))}
      </div>

      {mode === 'delivery' && <FreeDelivery summary={summary} lang={lang} t={t} />}

      {summary.rewardReady && (
        <button
          type="button"
          className={`reward ${useReward ? 'is-on' : ''}`}
          onClick={() => {
            haptic('medium');
            actions.setUseReward(!useReward);
          }}
          aria-pressed={useReward}
        >
          <LoyaltyPizza filled={SHOP.loyalty.slicesForReward} size={46} />
          <span className="reward__text">
            <b>{t('cart.reward')}</b>
            <span>
              {t('cart.rewardText', {
                n: SHOP.loyalty.slicesForReward,
                sum: formatMoney(summary.rewardValue, lang),
              })}
            </span>
          </span>
          <span className="switch" aria-hidden="true">
            <i />
          </span>
        </button>
      )}

      {upsell.length > 0 && (
        <>
          <SectionTitle>{t('cart.upsell')}</SectionTitle>
          <div className="upsell">
            {upsell.map((item) => (
              <button
                key={item.id}
                type="button"
                className="upsell__item"
                onClick={() => actions.addLine({ kind: 'item', itemId: item.id })}
              >
                <ItemArt art={item.art} size={64} />
                <span className="upsell__name">{tr(item.name, lang)}</span>
                <span className="upsell__price">
                  <Icon name="plus" size={14} strokeWidth={2.6} /> {formatMoney(item.price, lang)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="card">
        <SummaryRows summary={summary} mode={mode} lang={lang} t={t} />
      </div>
      {blocked && (
        <p className="note note--warn">{t('cart.minOrder', { sum: formatMoney(SHOP.delivery.minOrder, lang) })}</p>
      )}

      <div className="action-bar action-bar--tab">
        <button
          type="button"
          className="btn btn--flame btn--grow btn--split"
          disabled={blocked}
          onClick={() => nav.push('checkout', {})}
        >
          <span>{t('cart.checkout')}</span>
          <Money value={summary.total} />
        </button>
      </div>
    </div>
  );
}
