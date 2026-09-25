import { useEffect, useRef, useState, type ReactNode } from 'react';

import { formatMoney } from '../lib/format';
import { hapticSelect } from '../lib/telegram';
import { useStore } from '../lib/store';
import Icon from './Icon';

/** Narx o'zgarganda raqamlar "aylanib" yangi qiymatga o'tadi */
export function Money({ value, className = '' }: { value: number; className?: string }) {
  const { state } = useStore();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return undefined;

    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
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

interface StepperProps {
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export function Stepper({ value, onChange, min = 0, max = 20, size = 'md' }: StepperProps) {
  const change = (next: number) => {
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
export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: string | null;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className = '' }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div className={`segmented ${className}`} style={{ '--count': options.length, '--index': index }} role="radiogroup">
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

export function SectionTitle({ children, hint, action }: { children: ReactNode; hint?: string; action?: ReactNode }) {
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

export function Avatar({ name, id, size = 36 }: { name: string; id: number | undefined; size?: number }) {
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
