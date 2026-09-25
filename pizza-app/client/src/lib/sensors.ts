import { useEffect, useRef, type RefObject } from 'react';

import { sensor, tg } from './telegram';

// Telegram 8.0 sensorlari: giroskop (pitsa telefon bilan birga qiyshayadi)
// va akselerometr (telefonni silkitib, tasodifiy pitsa tanlash).

type SensorName = 'orientation' | 'accelerometer';
const users: Record<SensorName, number> = { orientation: 0, accelerometer: 0 };

function device(name: SensorName) {
  return name === 'orientation' ? sensor('orientation') : sensor('accelerometer');
}

/** Bir nechta komponent bitta sensorni ishlatsa, oxirgisi chiqquncha o'chirilmaydi */
function acquire(name: SensorName, options: Record<string, unknown>): boolean {
  const s = device(name);
  if (!s) return false;
  users[name] += 1;
  if (users[name] === 1) {
    try {
      s.start(options);
    } catch {
      return false;
    }
  }
  return true;
}

function release(name: SensorName): void {
  const s = device(name);
  if (!s || users[name] === 0) return;
  users[name] -= 1;
  if (users[name] === 0) {
    try {
      s.stop();
    } catch {
      // allaqachon to'xtagan
    }
  }
}

const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Elementga --tilt-x / --tilt-y CSS o'zgaruvchilarini yozadi (-1..1).
 * Telefonda — giroskopdan, kompyuterda — sichqoncha holatidan.
 * React qayta chizilmaydi: qiymatlar to'g'ridan-to'g'ri style ga yoziladi.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, enabled = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reducedMotion()) return undefined;

    let frame = 0;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const render = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      el.style.setProperty('--tilt-x', current.x.toFixed(3));
      el.style.setProperty('--tilt-y', current.y.toFixed(3));
      const moving = Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001;
      frame = moving ? requestAnimationFrame(render) : 0;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const cleanups: (() => void)[] = [];
    const orientation = sensor('orientation');

    if (orientation && acquire('orientation', { refresh_rate: 40, need_absolute: false })) {
      let base: { beta: number; gamma: number } | null = null;
      const onOrientation = () => {
        const { beta, gamma } = orientation;
        if (beta == null || gamma == null) return;
        base ??= { beta, gamma };
        // Radianlar. ~0.35 rad (20°) qiyshayish — to'liq og'ish
        target = { x: clamp((gamma - base.gamma) / 0.35, 1), y: clamp((beta - base.beta) / 0.35, 1) };
        // Asta-sekin yangi "neytral" holatga moslashamiz
        base.beta += (beta - base.beta) * 0.01;
        base.gamma += (gamma - base.gamma) * 0.01;
        schedule();
      };
      tg?.onEvent('deviceOrientationChanged', onOrientation);
      cleanups.push(() => {
        tg?.offEvent('deviceOrientationChanged', onOrientation);
        release('orientation');
      });
    }

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      target = {
        x: clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, 1),
        y: clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, 1),
      };
      schedule();
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
      schedule();
    };
    el.addEventListener('pointermove', onPointer);
    el.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', onPointer);
      el.removeEventListener('pointerleave', onLeave);
    });

    return () => {
      cancelAnimationFrame(frame);
      cleanups.forEach((fn) => fn());
    };
  }, [ref, enabled]);
}

export function canShake(): boolean {
  return Boolean(sensor('accelerometer'));
}

/** Telefon silkitilganda chaqiriladi */
export function useShake(onShake: () => void, enabled = true): void {
  const handler = useRef(onShake);
  handler.current = onShake;

  useEffect(() => {
    const accelerometer = sensor('accelerometer');
    if (!enabled || !accelerometer || !acquire('accelerometer', { refresh_rate: 60 })) return undefined;

    let last: { x: number; y: number; z: number } | null = null;
    let hits: number[] = [];
    let cooldown = 0;

    const onChange = () => {
      const { x, y, z } = accelerometer;
      if (x == null || y == null || z == null) return;
      if (last) {
        const jerk = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
        const now = Date.now();
        if (jerk > 18) hits.push(now);
        hits = hits.filter((t) => now - t < 900);
        if (hits.length >= 3 && now > cooldown) {
          hits = [];
          cooldown = now + 2500;
          handler.current();
        }
      }
      last = { x, y, z };
    };

    tg?.onEvent('accelerometerChanged', onChange);
    return () => {
      tg?.offEvent('accelerometerChanged', onChange);
      release('accelerometer');
    };
  }, [enabled]);
}
