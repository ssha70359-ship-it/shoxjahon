import { money } from '../lib/format.js';
import { canPayInApp, haptic } from '../lib/telegram.js';

const REMEMBER_KEY = 'fb_payment_method';

/**
 * Usul hozir tanlanishi mumkinmi. Mumkin bo'lmasa sababini qaytaradi -
 * mijoz nima qilishni bilishi uchun (masalan "yana 5 700 so'm qo'shing").
 */
export function availability(option, total) {
  if (!option.card) return { ok: true };

  if (!canPayInApp()) return { ok: false, reason: 'Telegram ichida ochganda ishlaydi' };

  if (option.minAmount && total < option.minAmount) {
    return {
      ok: false,
      reason: `Kamida ${money(option.minAmount)} · yana ${money(option.minAmount - total)} qo‘shing`,
    };
  }

  return { ok: true };
}

export function rememberMethod(id) {
  try {
    localStorage.setItem(REMEMBER_KEY, id);
  } catch {
    /* localStorage yopiq */
  }
}

/**
 * Tanlangan usul endi mavjud bo'lmasa (masalan summa kamaydi) - keyingi
 * mavjudiga o'tadi. Avval oxirgi marta ishlatilgani, keyin karta, oxirida naqd.
 */
export function resolveMethod(options, selected, total) {
  const usable = options.filter((option) => availability(option, total).ok);
  if (usable.some((option) => option.id === selected)) return selected;

  let remembered = null;
  try {
    remembered = localStorage.getItem(REMEMBER_KEY);
  } catch {
    remembered = null;
  }

  return (
    usable.find((option) => option.id === remembered)?.id ||
    usable.find((option) => option.card)?.id ||
    usable[0]?.id ||
    'NAQD'
  );
}

function Badge({ id }) {
  if (id === 'CLICK') return <span className="pay-badge click">click</span>;
  if (id === 'PAYME') return <span className="pay-badge payme">payme</span>;
  return <span className="pay-badge cash">{'\u{1F4B5}'}</span>;
}

export default function PaymentOptions({ options, value, total, onChange }) {
  return (
    <div className="pay-options" role="radiogroup" aria-label="To‘lov usuli">
      {options.map((option) => {
        const state = availability(option, total);
        const selected = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={!state.ok}
            className={`pay-option${selected ? ' selected' : ''}${state.ok ? '' : ' disabled'}`}
            onClick={() => {
              if (!state.ok) {
                haptic('rigid');
                return;
              }
              haptic();
              rememberMethod(option.id);
              onChange(option.id);
            }}
          >
            <Badge id={option.id} />
            <span className="pay-text">
              <b>{option.title}</b>
              <small>{state.ok ? option.subtitle : state.reason}</small>
            </span>
            <span className="pay-radio" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
