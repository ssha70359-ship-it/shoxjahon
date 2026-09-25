import { useEffect, useRef, useState } from 'react';

import { formatMoney } from '../lib/format.js';
import { hapticSelect } from '../lib/telegram.js';
import { useStore } from '../lib/store.jsx';
import Icon from './Icon.jsx';

/** Narx o'zgarganda raqamlar "aylanib" yangi qiymatga o'tadi */
export function Money({ value, className = '' }) {
  const { state } = useStore();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return undefined;

    const began = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - began) / 380);
      const eased = 1 - (1 - p) ** 3;
      const current = Math.round((start + (value - start) * eased) / 100) * 100;
      setShown(p === 1 ? value : current);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value]);

  return <span className={`money ${className}`}>{formatMoney(shown, state.lang)}</span>;
}

export function Stepper({ value, onChange, min = 0, max = 20, size = 'md' }) {
  const change = (next) => {
    hapticSelect();
    onChange(Math.max(min, Math.min(max, next)));
  };
  return (
    <div className={`stepper stepper--${size}`}>
      <button type="button" onClick={() => change(value - 1)} aria-label="−" disabled={value <= min}>
        <Icon name={value === 1 && min === 0 ? 'trash' : 'minus'} size={size === 'sm' ? 16 : 18} />
      </button>
      <span className="stepper__value" key={value}>
        {value}
      </span>
      <button type="button" onClick={() => change(value + 1)} aria-label="+" disabled={value >= max}>
        <Icon name="plus" size={size === 'sm' ? 16 : 18} />
      </button>
    </div>
  );
}

/** Segmentli tanlagich: harakatlanuvchi "tabletka" bilan */
export function Segmented({ options, value, onChange, className = '' }) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div
      className={`segmented ${className}`}
      style={{ '--count': options.length, '--index': index }}
      role="radiogroup"
    >
      <span className="segmented__thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'is-active' : ''}
          onClick={() => {
            if (option.value !== value) {
              hapticSelect();
              onChange(option.value);
            }
          }}
        >
          <span className="segmented__label">{option.label}</span>
          {option.hint && <span className="segmented__hint">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children, hint, action }) {
  return (
    <div className="section-title">
      <div>
        <h3>{children}</h3>
        {hint && <p>{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ size = 22 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

const AVATAR_COLORS = ['#ff6b3d', '#f5a623', '#3fb27f', '#4a90e2', '#9b59b6', '#e84a5f', '#16a085', '#d35400'];

export function Avatar({ name, id, size = 36 }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const color = AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}
