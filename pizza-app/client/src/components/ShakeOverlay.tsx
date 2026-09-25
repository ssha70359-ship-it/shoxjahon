import { useCallback, useEffect, useRef, useState } from 'react';

import { PIZZAS, tr } from '@shared/menu';
import { defaultPizzaConfig } from '@shared/pricing';
import { formatMoney } from '../lib/format';
import { useShake } from '../lib/sensors';
import { useStore } from '../lib/store';
import { hapticNotify, hapticSelect, hideBackButton, setBackButton } from '../lib/telegram';
import Icon from './Icon';
import { PizzaStage } from './PizzaStage';

/** "Taqdir pitsasi": telefonni silkiting — ruletka tasodifiy pitsada to'xtaydi */
interface ShakeOverlayProps {
  onClose(): void;
  onPick(pizzaId: string): void;
  canShake: boolean;
}

export default function ShakeOverlay({ onClose, onPick, canShake }: ShakeOverlayProps) {
  const { state, t } = useStore();
  const pool = useRef(PIZZAS.filter((pizza) => !pizza.hidden && !state.stoplist.has(pizza.id)));
  const [index, setIndex] = useState(() => Math.floor(Math.random() * pool.current.length));
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const spin = useCallback(() => {
    const list = pool.current;
    if (list.length < 2) return;

    clearTimeout(timer.current);
    setSpinning(true);
    let step = 0;
    const total = 10 + Math.floor(Math.random() * 8);
    let delay = 55;

    const next = () => {
      setIndex((current) => (current + 1) % list.length);
      hapticSelect();
      step += 1;
      if (step < total) {
        delay *= 1.1;
        timer.current = setTimeout(next, delay);
      } else {
        setSpinning(false);
        hapticNotify('success');
      }
    };
    timer.current = setTimeout(next, delay);
  }, []);

  useEffect(() => {
    spin();
    return () => clearTimeout(timer.current);
  }, [spin]);

  useShake(spin, !spinning);

  useEffect(() => {
    const off = setBackButton(onClose);
    return () => {
      off();
      hideBackButton();
    };
  }, [onClose]);

  const pizza = pool.current[index];
  if (!pizza) return null;

  return (
    <div className="overlay shake" role="dialog" aria-modal="true" aria-label={t('shake.title')}>
      <button type="button" className="overlay__close" onClick={onClose} aria-label={t('common.close')}>
        <Icon name="close" size={22} />
      </button>
      <div className="shake__head">
        <span className="shake__kicker">
          <Icon name="dice" size={16} /> {t('shake.title')}
        </span>
        <p>{canShake ? t('shake.hint') : ''}</p>
      </div>

      <div className={`shake__stage ${spinning ? 'is-spinning' : 'is-landed'}`}>
        <PizzaStage config={defaultPizzaConfig(pizza.id, 'L')} size={250} seed={pizza.id} steam={!spinning} />
      </div>

      <div className="shake__result" aria-live="polite">
        <h2 key={pizza.id}>{tr(pizza.name, state.lang)}</h2>
        <p>{spinning ? '…' : t('common.from', { price: formatMoney(pizza.prices.S, state.lang) })}</p>
      </div>

      <div className="shake__actions">
        <button type="button" className="btn btn--ghost" onClick={spin} disabled={spinning}>
          <Icon name="refresh" size={18} /> {t('shake.again')}
        </button>
        <button type="button" className="btn btn--flame" onClick={() => onPick(pizza.id)} disabled={spinning}>
          {t('shake.take')}
        </button>
      </div>
    </div>
  );
}
