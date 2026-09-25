import { memo, type ReactNode } from 'react';

import type { MenuItem, Pizza as MenuPizza, PizzaTag } from '@shared/menu';
import type { Lang, LineConfig } from '@shared/types';

import { ITEM_BY_ID, TOPPING_BY_ID, tr } from '@shared/menu';
import { defaultPizzaConfig, describeLine, unitPrice } from '@shared/pricing';
import { formatMoney } from '../lib/format';
import type { TranslationKey, TranslationParams } from '../lib/i18n';
import { useStore } from '../lib/store';
import Pizza from '../pizza/Pizza';
import Icon from './Icon';
import ItemArt from './ItemArt';
import { Stepper } from './ui';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const TAG_ORDER: PizzaTag[] = ['signature', 'new', 'hit', 'spicy', 'veg'];

export function Tags({ tags, t }: { tags: PizzaTag[]; t: Translate }) {
  const list = TAG_ORDER.filter((tag) => tags?.includes(tag)).slice(0, 2);
  if (!list.length) return null;
  return (
    <div className="tags">
      {list.map((tag) => (
        <span key={tag} className={`tag tag--${tag}`}>
          {t(`tag.${tag}`)}
        </span>
      ))}
    </div>
  );
}

interface PizzaCardProps {
  pizza: MenuPizza;
  lang: Lang;
  t: Translate;
  soldOut: boolean;
  onOpen(pizzaId: string): void;
}

function PizzaCardImpl({ pizza, lang, t, soldOut, onOpen }: PizzaCardProps) {
  const config = defaultPizzaConfig(pizza.id, 'M');
  const ingredients = pizza.toppings.map((id) => tr(TOPPING_BY_ID[id]?.name, lang).toLowerCase()).join(', ');

  return (
    <button
      type="button"
      className={`pizza-card ${soldOut ? 'is-soldout' : ''}`}
      onClick={() => onOpen(pizza.id)}
      disabled={soldOut}
    >
      <div className="pizza-card__art">
        <Pizza config={config} size={148} label={tr(pizza.name, lang)} />
      </div>
      <Tags tags={pizza.tags} t={t} />
      <h4 className="pizza-card__name">{tr(pizza.name, lang)}</h4>
      <p className="pizza-card__desc">{ingredients}</p>
      <div className="pizza-card__foot">
        <span className="pizza-card__price">
          {soldOut ? t('common.soldOut') : t('common.from', { price: formatMoney(pizza.prices.S, lang) })}
        </span>
        {!soldOut && (
          <span className="pizza-card__add" aria-hidden="true">
            <Icon name="plus" size={18} strokeWidth={2.4} />
          </span>
        )}
      </div>
    </button>
  );
}

export const PizzaCard = memo(PizzaCardImpl);

export function ItemRow({ item }: { item: MenuItem }) {
  const { state, t, actions, groupActive } = useStore();
  const lang = state.lang;
  const soldOut = state.stoplist.has(item.id);
  const line = !groupActive && state.cart.find((l) => l.config.kind === 'item' && l.config.itemId === item.id);

  return (
    <div className={`item-row ${soldOut ? 'is-soldout' : ''}`}>
      <div className="item-row__art">
        <ItemArt art={item.art} size={64} label={tr(item.name, lang)} />
      </div>
      <div className="item-row__body">
        <h4>{tr(item.name, lang)}</h4>
        <p>{tr(item.desc, lang)}</p>
        <span className="item-row__price">{soldOut ? t('common.soldOut') : formatMoney(item.price, lang)}</span>
      </div>
      {!soldOut &&
        (line ? (
          <Stepper size="sm" value={line.qty} onChange={(qty) => actions.setQty(line.key, qty)} />
        ) : (
          <button
            type="button"
            className="round-add"
            aria-label={t('common.add')}
            onClick={() => actions.addLine({ kind: 'item', itemId: item.id })}
          >
            <Icon name="plus" size={20} strokeWidth={2.4} />
          </button>
        ))}
    </div>
  );
}

/** Savat / davra / buyurtma qatori */
interface LineViewProps {
  config: LineConfig;
  qty: number;
  /** narx (bo'lmasa menyudan hisoblanadi) */
  unit?: number;
  lang: Lang;
  onOpen?(): void;
  children?: ReactNode;
  by?: string;
}

export function LineView({ config, qty, unit, lang, onOpen, children, by }: LineViewProps) {
  const { title, details } = describeLine(config, lang);
  const price = (unit ?? unitPrice(config)) * qty;

  return (
    <div className="line">
      <button type="button" className="line__art" onClick={onOpen} disabled={!onOpen} tabIndex={onOpen ? 0 : -1}>
        {config.kind === 'pizza' ? (
          <Pizza config={config} size={64} />
        ) : (
          <ItemArt art={ITEM_BY_ID[config.itemId]?.art} size={60} />
        )}
      </button>
      <div className="line__body">
        <div className="line__title">
          {qty > 1 && !children && <b>{qty}× </b>}
          {title}
        </div>
        {details.length > 0 && <div className="line__details">{details.join(' · ')}</div>}
        {by && <div className="line__by">{by}</div>}
        <div className="line__foot">
          <span className="line__price">{formatMoney(price, lang)}</span>
          {children}
        </div>
      </div>
    </div>
  );
}
