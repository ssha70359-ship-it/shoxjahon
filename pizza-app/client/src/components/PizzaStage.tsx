import { useId, useRef } from 'react';

import { useTilt } from '../lib/sensors';
import type { PizzaConfig } from '@shared/types';

import Pizza from '../pizza/Pizza';

/**
 * Pitsa "sahnasi": soya, bug', telefon qiyshayganda 3D og'ish va yaltirash.
 * scale — o'lcham tanlanganda pitsa silliq kattalashadi/kichrayadi.
 */
interface PizzaStageProps {
  config: PizzaConfig;
  size?: number;
  /** o'lcham tanlanganda pitsa silliq kattalashadi/kichrayadi */
  scale?: number;
  animate?: boolean;
  steam?: boolean;
  tilt?: boolean;
  spin?: boolean;
  seed?: string;
  activePart?: number | null;
  onPartTap?(part: number): void;
  label?: string;
}

export function PizzaStage({
  config,
  size = 260,
  scale = 1,
  animate = false,
  steam = true,
  tilt = true,
  spin = false,
  seed,
  activePart = null,
  onPartTap,
  label,
}: PizzaStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, tilt);
  const halves = config.parts.length === 2;

  return (
    <div className="stage" ref={ref} style={{ '--size': `${size}px` }}>
      <div className="stage__scale" style={{ '--scale': scale }}>
        <div className="stage__shadow" />
        <div className="stage__tilt">
          <div className={spin ? 'stage__spin' : undefined}>
            <Pizza config={config} size={size} animate={animate} seed={seed} activePart={activePart} label={label} />
          </div>
          <div className="stage__shine" />
          {halves && onPartTap && (
            <div className="stage__halves">
              <button type="button" aria-label="0" onClick={() => onPartTap(0)} />
              <button type="button" aria-label="1" onClick={() => onPartTap(1)} />
            </div>
          )}
        </div>
      </div>
      {steam && (
        <div className="steam" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}

const SLICE_PATH = (i: number): string => {
  const a0 = ((-90 + i * 45) * Math.PI) / 180;
  const a1 = ((-90 + (i + 1) * 45) * Math.PI) / 180;
  const r = 96;
  const x0 = 100 + Math.cos(a0) * r;
  const y0 = 100 + Math.sin(a0) * r;
  const x1 = 100 + Math.cos(a1) * r;
  const y1 = 100 + Math.sin(a1) * r;
  return `M100 100L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
};

const LOYALTY_PIZZA: PizzaConfig = {
  kind: 'pizza',
  size: 'L',
  crust: 'classic',
  parts: [{ pizzaId: 'pepperoni', sauce: 'tomato', removed: [], extras: [] }],
};

/** Tilim kartasi: to'plangan tilimlar pitsa bo'lagi bo'lib ko'rinadi */
export function LoyaltyPizza({ filled, total = 8, size = 120 }: { filled: number; total?: number; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const count = Math.min(filled, total);

  return (
    <svg className="loyalty-pizza" width={size} height={size} viewBox="-6 -6 212 212" aria-hidden="true">
      <defs>
        {Array.from({ length: total }, (_, i) => (
          <clipPath key={i} id={`${uid}-s${i}`}>
            <path d={SLICE_PATH(i)} />
          </clipPath>
        ))}
      </defs>
      {Array.from({ length: total }, (_, i) => {
        const mid = ((-90 + i * 45 + 22.5) * Math.PI) / 180;
        const dx = (Math.cos(mid) * 4).toFixed(2);
        const dy = (Math.sin(mid) * 4).toFixed(2);

        if (i < count) {
          return (
            <g
              key={i}
              transform={`translate(${dx} ${dy})`}
              className="loyalty-pizza__slice is-filled"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <g clipPath={`url(#${uid}-s${i})`}>
                <Pizza config={LOYALTY_PIZZA} size={200} seed="loyalty" />
              </g>
            </g>
          );
        }
        return (
          <path
            key={i}
            d={SLICE_PATH(i)}
            transform={`translate(${dx} ${dy})`}
            className={`loyalty-pizza__slice ${i === count ? 'is-next' : ''}`}
          />
        );
      })}
    </svg>
  );
}
