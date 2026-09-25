import { useMemo, useRef, useState } from 'react';

import {
  CRUSTS,
  CUSTOM_PIZZA_ID,
  PIZZAS,
  getPizza,
  getTopping,
  SAUCES,
  SIZES,
  SIZE_BY_ID,
  TOPPINGS,
  TOPPING_GROUPS,
  tr,
} from '@shared/menu';
import { LIMITS, defaultPizzaConfig, halfToppingPrice, normalizeLine, toppingPrice, unitPrice } from '@shared/pricing';
import type { CrustId, PizzaConfig, PizzaPart, SizeId } from '@shared/types';
import Icon from '../components/Icon';
import { PizzaStage } from '../components/PizzaStage';
import { Tags } from '../components/Cards';
import { Money, SectionTitle, Segmented, Stepper } from '../components/ui';
import { formatMoney } from '../lib/format';
import { useNav, type ScreenParams, type TabId } from '../lib/nav';
import { useStore } from '../lib/store';
import { haptic, hapticNotify, hapticSelect } from '../lib/telegram';
import Pizza from '../pizza/Pizza';
import { ToppingIcon } from '../pizza/toppings';

const SIZE_SCALE: Record<SizeId, number> = { S: 0.8, M: 0.9, L: 1 };
const HALF_CHOICES = [...PIZZAS.filter((pizza) => !pizza.hidden), getPizza(CUSTOM_PIZZA_ID)];

function partFor(pizzaId: string): PizzaPart {
  return { pizzaId, sauce: getPizza(pizzaId).sauce, removed: [], extras: [] };
}

function initialConfig(params: ScreenParams['builder']): PizzaConfig {
  if (params.config) return params.config;
  const config = defaultPizzaConfig(params.pizzaId || CUSTOM_PIZZA_ID, 'M');
  if (params.half) {
    const second = params.pizzaId === 'pepperoni' ? 'margarita' : 'pepperoni';
    config.parts = [config.parts[0]!, partFor(second)];
  }
  return config;
}

/** Savatga qo'shilganda pitsa kichrayib pastdagi savat belgisiga "uchib" boradi */
function flyToCart(stageEl: HTMLElement | null, tab: TabId): void {
  const source = stageEl?.querySelector('svg.pizza');
  const target = document.querySelector(`[data-nav="${tab}"] .bottom-nav__icon`);
  if (!source || !target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.classList.remove('pizza--animate');
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    zIndex: 1000,
    pointerEvents: 'none',
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = clone.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${dx * 0.35}px, ${dy * 0.2 - 80}px) scale(.45) rotate(120deg)`,
        opacity: 1,
        offset: 0.45,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(300deg)`, opacity: 0.6 },
    ],
    { duration: 720, easing: 'cubic-bezier(.45,.05,.55,.95)' },
  );
  animation.onfinish = () => clone.remove();
}

export default function Builder({ params }: { params: ScreenParams['builder'] }) {
  const { state, t, actions, groupActive } = useStore();
  const nav = useNav();
  const lang = state.lang;

  const [config, setConfig] = useState<PizzaConfig>(() => initialConfig(params));
  const [activePart, setActivePart] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const halves = config.parts.length === 2;
  const part = config.parts[Math.min(activePart, config.parts.length - 1)] ?? config.parts[0]!;
  const pizza = getPizza(part.pizzaId);
  const isCustom = !halves && pizza.id === CUSTOM_PIZZA_ID;
  const editing = Boolean(params.lineKey);

  const unit = useMemo(() => unitPrice(normalizeLine(config)), [config]);
  const size = SIZE_BY_ID[config.size];

  const title = halves ? config.parts.map((p) => tr(getPizza(p.pizzaId).name, lang)).join(' / ') : tr(pizza.name, lang);

  function update(patch: Partial<Pick<PizzaConfig, 'size' | 'crust'>>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function updatePart(patch: Partial<PizzaPart>) {
    setConfig((current) => ({
      ...current,
      parts: current.parts.map((p, i) =>
        i === Math.min(activePart, current.parts.length - 1) ? { ...p, ...patch } : p,
      ),
    }));
  }

  function toggleHalf() {
    haptic('medium');
    if (halves) {
      setConfig((current) => ({ ...current, parts: [current.parts[activePart] ?? current.parts[0]!] }));
      setActivePart(0);
    } else {
      const second = config.parts[0]?.pizzaId === 'pepperoni' ? 'margarita' : 'pepperoni';
      setConfig((current) => ({ ...current, parts: [current.parts[0]!, partFor(second)] }));
      setActivePart(1);
    }
  }

  function choosePizzaForPart(pizzaId: string) {
    hapticSelect();
    updatePart(partFor(pizzaId));
  }

  function toggleRemoved(id: string) {
    hapticSelect();
    const removed = part.removed.includes(id) ? part.removed.filter((x) => x !== id) : [...part.removed, id];
    updatePart({ removed });
  }

  function toggleExtra(id: string) {
    if (part.extras.includes(id)) {
      hapticSelect();
      updatePart({ extras: part.extras.filter((x) => x !== id) });
      return;
    }
    if (part.extras.length >= LIMITS.maxExtras) {
      hapticNotify('warning');
      actions.toast(t('builder.maxExtras', { n: LIMITS.maxExtras }));
      return;
    }
    haptic('light');
    updatePart({ extras: [...part.extras, id] });
  }

  async function submit() {
    if (busy) return;
    if (params.lineKey) {
      actions.replaceLine(params.lineKey, config);
      hapticNotify('success');
      nav.pop();
      return;
    }
    setBusy(true);
    const toGroup = groupActive;
    const ok = await actions.addLine(config, qty);
    setBusy(false);
    if (ok) {
      flyToCart(stageRef.current, toGroup ? 'group' : 'cart');
      nav.pop();
    }
  }

  const soldOut = config.parts.some((p) => state.stoplist.has(p.pizzaId));

  return (
    <div className="screen builder">
      <div className="builder__stage" ref={stageRef}>
        <div className="builder__glow" aria-hidden="true" />
        <PizzaStage
          config={config}
          size={Math.min(300, window.innerWidth - 72)}
          scale={SIZE_SCALE[config.size]}
          animate
          seed="builder"
          activePart={halves ? activePart : null}
          onPartTap={(i) => {
            hapticSelect();
            setActivePart(i);
          }}
          label={title}
        />
        <div className="builder__size-badge">
          {size.cm} {lang === 'ru' ? 'см' : 'sm'} · {t('builder.grams', { g: size.grams })}
        </div>
      </div>

      <div className="builder__sheet">
        <div className="builder__head">
          {!halves && !isCustom && <Tags tags={pizza.tags} t={t} />}
          <h1 className="builder__title">{isCustom ? t('builder.custom') : title}</h1>
          <p className="builder__desc">
            {halves ? t('builder.halfNote') : isCustom ? t('builder.emptyCustom') : tr(pizza.desc, lang)}
          </p>
        </div>

        <Segmented
          value={config.size}
          onChange={(value: SizeId) => update({ size: value })}
          options={SIZES.map((s) => ({ value: s.id, label: `${s.cm} ${lang === 'ru' ? 'см' : 'sm'}` }))}
        />

        <Segmented
          className="segmented--crust"
          value={config.crust}
          onChange={(value: CrustId) => update({ crust: value })}
          options={CRUSTS.map((crust) => ({
            value: crust.id,
            label: tr(crust.name, lang),
            hint: crust.price[config.size]
              ? `+${formatMoney(crust.price[config.size], lang, { withCurrency: false })}`
              : null,
          }))}
        />

        <button
          type="button"
          className={`half-toggle ${halves ? 'is-on' : ''}`}
          onClick={toggleHalf}
          aria-pressed={halves}
        >
          <span className="half-toggle__icon">
            <Icon name="half" size={22} />
          </span>
          <span className="half-toggle__text">
            <b>{t('builder.half')}</b>
            <span>{halves ? t('builder.halfOn') : t('qa.half.sub')}</span>
          </span>
          <span className="switch" aria-hidden="true">
            <i />
          </span>
        </button>

        {halves && (
          <div className="half-panel">
            <div className="half-panel__tabs">
              {config.parts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={activePart === i ? 'is-active' : ''}
                  onClick={() => {
                    hapticSelect();
                    setActivePart(i);
                  }}
                >
                  <span>{i === 0 ? t('builder.left') : t('builder.right')}</span>
                  <b>{tr(getPizza(p.pizzaId).name, lang)}</b>
                </button>
              ))}
            </div>
            <div className="half-panel__choices">
              {HALF_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`half-choice ${part.pizzaId === choice.id ? 'is-active' : ''}`}
                  onClick={() => choosePizzaForPart(choice.id)}
                  disabled={state.stoplist.has(choice.id)}
                >
                  <Pizza config={defaultPizzaConfig(choice.id)} size={58} />
                  <span>{choice.id === CUSTOM_PIZZA_ID ? t('builder.custom') : tr(choice.name, lang)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <SectionTitle>{t('builder.sauce')}</SectionTitle>
        <div className="sauces">
          {SAUCES.map((sauce) => (
            <button
              key={sauce.id}
              type="button"
              className={`sauce ${part.sauce === sauce.id ? 'is-active' : ''}`}
              onClick={() => {
                hapticSelect();
                updatePart({ sauce: sauce.id });
              }}
            >
              <span className="sauce__dot" style={{ background: sauce.color }} />
              {tr(sauce.name, lang)}
            </button>
          ))}
        </div>

        {pizza.toppings.length > 0 && (
          <>
            <SectionTitle hint={t('builder.compositionHint')}>{t('builder.composition')}</SectionTitle>
            <div className="composition">
              {pizza.toppings.map((id) => {
                const removed = part.removed.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`composition__item ${removed ? 'is-removed' : ''}`}
                    onClick={() => toggleRemoved(id)}
                    aria-pressed={!removed}
                  >
                    <ToppingIcon id={id} size={26} />
                    <span>{tr(getTopping(id).name, lang)}</span>
                    <Icon name={removed ? 'plus' : 'close'} size={14} strokeWidth={2.4} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <SectionTitle hint={`${part.extras.length} / ${LIMITS.maxExtras}`}>{t('builder.extras')}</SectionTitle>
        {TOPPING_GROUPS.map((group) => (
          <div key={group.id} className="extras-group">
            <div className="extras-group__title">{tr(group.name, lang)}</div>
            <div className="extras">
              {TOPPINGS.filter((topping) => topping.group === group.id).map((topping) => {
                const selected = part.extras.includes(topping.id);
                const stopped = state.stoplist.has(topping.id);
                const doubled = selected && pizza.toppings.includes(topping.id) && !part.removed.includes(topping.id);
                const price = toppingPrice(topping.id, config.size);
                const shown = halves ? halfToppingPrice(topping.id, config.size) : price;
                return (
                  <button
                    key={topping.id}
                    type="button"
                    className={`extra ${selected ? 'is-active' : ''}`}
                    onClick={() => toggleExtra(topping.id)}
                    disabled={stopped}
                    aria-pressed={selected}
                  >
                    {selected && (
                      <span className="extra__check">
                        {doubled ? t('builder.double') : <Icon name="check" size={12} strokeWidth={3} />}
                      </span>
                    )}
                    <ToppingIcon id={topping.id} size={40} />
                    <span className="extra__name">{tr(topping.name, lang)}</span>
                    <span className="extra__price">
                      {stopped ? t('common.soldOut') : `+${formatMoney(shown, lang, { withCurrency: false })}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="action-bar">
        {!editing && <Stepper value={qty} min={1} onChange={setQty} />}
        <button
          type="button"
          className="btn btn--flame btn--grow btn--split"
          onClick={submit}
          disabled={busy || soldOut}
        >
          <span>
            {soldOut
              ? t('common.soldOut')
              : editing
                ? t('builder.save')
                : groupActive
                  ? t('builder.addGroup')
                  : t('builder.addCart')}
          </span>
          {!soldOut && <Money value={unit * (editing ? 1 : qty)} />}
        </button>
      </div>
    </div>
  );
}
