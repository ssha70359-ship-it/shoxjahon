import { memo, useMemo } from 'react';

import { PIZZA_BY_ID, SAUCE_BY_ID } from '../../shared/menu.js';
import { partToppings } from '../../shared/pricing.js';
import { TOPPING_ART } from './toppings.jsx';
import { blobPath, scatter, seeded } from './rng.js';

const CRUST_INNER = { classic: 82, thin: 88, cheese: 79 };

const SAUCE_STOPS = {
  tomato: ['#d9492c', '#b92c18'],
  cream: ['#f6ead0', '#e7d3a8'],
  bbq: ['#86391f', '#5a2210'],
  pesto: ['#6f9234', '#4d6c22'],
};

/**
 * Barcha pitsalar uchun umumiy gradientlar. Ilovada bir marta chiziladi,
 * har bir pitsa ularga id orqali murojaat qiladi — DOM yengil bo'ladi.
 */
export function PizzaDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="pz-crust">
          <stop offset=".78" stopColor="#f3c67f" />
          <stop offset=".87" stopColor="#e4a354" />
          <stop offset=".95" stopColor="#c47a35" />
          <stop offset="1" stopColor="#8f4c1e" />
        </radialGradient>
        <radialGradient id="pz-crust-cheese">
          <stop offset=".76" stopColor="#f7d690" />
          <stop offset=".86" stopColor="#efb865" />
          <stop offset=".95" stopColor="#cf8a3f" />
          <stop offset="1" stopColor="#9a5421" />
        </radialGradient>
        <radialGradient id="pz-char">
          <stop offset="0" stopColor="#3a1808" stopOpacity=".85" />
          <stop offset="1" stopColor="#3a1808" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pz-cheese" cx="45%" cy="42%">
          <stop offset="0" stopColor="#fff4d8" />
          <stop offset=".6" stopColor="#fbe2a8" />
          <stop offset="1" stopColor="#f0c273" />
        </radialGradient>
        <radialGradient id="pz-bake">
          <stop offset="0" stopColor="#e2a04a" stopOpacity=".75" />
          <stop offset="1" stopColor="#e2a04a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pz-bake-dark">
          <stop offset="0" stopColor="#b0661f" stopOpacity=".7" />
          <stop offset=".5" stopColor="#c47b2c" stopOpacity=".35" />
          <stop offset="1" stopColor="#c47b2c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pz-puff">
          <stop offset="0" stopColor="#ffe6b0" stopOpacity=".75" />
          <stop offset="1" stopColor="#ffe6b0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pz-sheen">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pz-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        {Object.entries(SAUCE_STOPS).map(([id, [inner, outer]]) => (
          <radialGradient key={id} id={`pz-sauce-${id}`}>
            <stop offset=".6" stopColor={inner} />
            <stop offset="1" stopColor={outer} />
          </radialGradient>
        ))}
        <radialGradient id="pz-pep" cx="45%" cy="40%">
          <stop offset="0" stopColor="#cc4430" />
          <stop offset=".75" stopColor="#a8291b" />
          <stop offset="1" stopColor="#7a170e" />
        </radialGradient>
        <radialGradient id="pz-qazi" cx="45%" cy="60%">
          <stop offset="0" stopColor="#8f2c22" />
          <stop offset="1" stopColor="#551410" />
        </radialGradient>
        <radialGradient id="pz-tomato" cx="45%" cy="40%">
          <stop offset="0" stopColor="#f4704f" />
          <stop offset="1" stopColor="#d23822" />
        </radialGradient>
        <linearGradient id="pz-mush" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1e3cb" />
          <stop offset="1" stopColor="#d6bc98" />
        </linearGradient>
        <radialGradient id="pz-chicken" cx="40%" cy="35%">
          <stop offset="0" stopColor="#f5dcae" />
          <stop offset=".7" stopColor="#e2b273" />
          <stop offset="1" stopColor="#c68a45" />
        </radialGradient>
        <linearGradient id="pz-basil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f9442" />
          <stop offset="1" stopColor="#1e5e22" />
        </linearGradient>
        <clipPath id="pz-half-0">
          <rect x="0" y="0" width="100" height="200" />
        </clipPath>
        <clipPath id="pz-half-1">
          <rect x="100" y="0" width="100" height="200" />
        </clipPath>
      </defs>
    </svg>
  );
}

function buildScene(config, seed) {
  const halves = config.parts.length === 2;
  const inner = CRUST_INNER[config.crust] ?? CRUST_INNER.classic;
  const rand = seeded(`${seed}|base|${config.crust}`);

  // Qobiq: biroz notekis doira + kuygan dog'lar va ko'pchigan joylar (o'tin pechi belgisi)
  const crustPath = blobPath(100, 100, 96, rand, { points: 28, wobble: 0.009 });
  const rim = (inner + 96) / 2;
  const chars = [];
  for (let i = 0; i < 15; i += 1) {
    const angle = rand() * Math.PI * 2;
    const r = rim + (rand() - 0.3) * (96 - inner) * 0.7;
    chars.push({
      x: 100 + Math.cos(angle) * r,
      y: 100 + Math.sin(angle) * r,
      rx: 2.4 + rand() * 3.4,
      ry: 1.4 + rand() * 1.6,
      rot: (angle * 180) / Math.PI + 90,
    });
  }
  const puffs = [];
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 + rand() * 0.4;
    const r = rim - 1 + rand() * 2;
    puffs.push({
      x: 100 + Math.cos(angle) * r,
      y: 100 + Math.sin(angle) * r,
      rx: 6 + rand() * 6,
      ry: 2 + rand() * 1.2,
      rot: (angle * 180) / Math.PI + 90,
    });
  }

  const saucePath = blobPath(100, 100, inner + 1.5, rand, { points: 18, wobble: 0.018 });
  const cheesePath = blobPath(100, 100, inner - 3, rand, { points: 26, wobble: 0.032 });

  // Pishloq orasidan ko'rinib turgan sous va qizarib pishgan joylar
  const peeks = scatter(rand, 9, { radius: inner - 12, minDist: 18 }).map((p) => ({
    d: blobPath(p.x, p.y, 1.8 + p.k * 2.6, rand, { points: 7, wobble: 0.25 }),
    part: halves ? (p.x < 100 ? 0 : 1) : 0,
  }));
  const bakes = scatter(rand, 24, { radius: inner - 7, minDist: 9 }).map((p) => ({
    ...p,
    r: 2.4 + p.k * 5,
    dark: p.k > 0.72,
  }));
  const sheens = scatter(rand, 7, { radius: inner - 14, minDist: 18 });

  const sliceOffset = halves ? 0 : rand() * 20;

  const toppings = [];
  config.parts.forEach((part, partIndex) => {
    const side = halves ? (partIndex === 0 ? -1 : 1) : 0;
    for (const { id, double } of partToppings(part)) {
      const art = TOPPING_ART[id];
      if (!art) continue;

      const count = Math.max(1, Math.round(art.count * (double ? 1.7 : 1) * (halves ? 0.55 : 1)));
      const r2 = seeded(`${seed}|${halves ? `h${partIndex}` : 'w'}|${id}`);
      const points = scatter(r2, count, {
        radius: inner - 9 - art.r * 0.4,
        minDist: art.r * 1.6,
        side,
        margin: art.r + 1.5,
      });

      points.forEach((p, i) => {
        const drawRand = seeded(`${id}|${i}|${seed}`);
        toppings.push({
          key: `${halves ? `h${partIndex}` : 'w'}-${id}-${i}`,
          layer: art.layer,
          x: p.x,
          y: p.y,
          rot: p.rot,
          s: p.s,
          order: i,
          node: art.draw(drawRand),
        });
      });
    }
  });

  toppings.sort((a, b) => a.layer - b.layer);

  return { halves, inner, crustPath, chars, puffs, saucePath, cheesePath, peeks, bakes, sheens, sliceOffset, toppings };
}

/**
 * Pitsa rasmi.
 * config — savatcha qatori ko'rinishidagi pitsa ({ size, crust, parts })
 * animate — masalliqlar tepadan "tushib" joylashadi (konstruktor)
 * activePart — yarim-yarim rejimida tanlangan yarmi (0/1), ikkinchisi xiraroq
 */
function PizzaImpl({ config, size = 160, seed, animate = false, activePart = null, className = '', label }) {
  const key = seed ?? config.parts.map((part) => part.pizzaId).join('+');
  const scene = useMemo(() => buildScene(config, key), [config, key]);
  const sauces = config.parts.map((part) => part.sauce ?? PIZZA_BY_ID[part.pizzaId].sauce);

  return (
    <svg
      className={`pizza ${animate ? 'pizza--animate' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
    >
      <path d={scene.crustPath} fill={`url(#${config.crust === 'cheese' ? 'pz-crust-cheese' : 'pz-crust'})`} />
      {scene.chars.map((c, i) => (
        <ellipse
          key={i}
          cx={c.x.toFixed(1)}
          cy={c.y.toFixed(1)}
          rx={c.rx.toFixed(1)}
          ry={c.ry.toFixed(1)}
          fill="url(#pz-char)"
          transform={`rotate(${c.rot.toFixed(0)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`}
        />
      ))}
      {scene.puffs.map((c, i) => (
        <ellipse
          key={i}
          cx={c.x.toFixed(1)}
          cy={c.y.toFixed(1)}
          rx={c.rx.toFixed(1)}
          ry={c.ry.toFixed(1)}
          fill="url(#pz-puff)"
          transform={`rotate(${c.rot.toFixed(0)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`}
        />
      ))}
      <path d={scene.crustPath} fill="url(#pz-rim)" opacity=".7" />

      {sauces.map((sauce, i) => (
        <path
          key={`${i}-${sauce}`}
          className="pizza__sauce"
          d={scene.saucePath}
          fill={`url(#pz-sauce-${SAUCE_BY_ID[sauce] ? sauce : 'tomato'})`}
          clipPath={scene.halves ? `url(#pz-half-${i})` : undefined}
        />
      ))}

      <path d={scene.saucePath} fill="none" stroke="#5a2308" strokeOpacity=".22" strokeWidth="2.2" />

      <path d={scene.cheesePath} fill="url(#pz-cheese)" stroke="#eab765" strokeOpacity=".7" strokeWidth="1.2" />
      {scene.peeks.map((p, i) => (
        <path key={i} d={p.d} fill={SAUCE_BY_ID[sauces[p.part]]?.color ?? '#c7351f'} opacity=".6" />
      ))}
      {scene.bakes.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r={p.r.toFixed(1)}
          fill={p.dark ? 'url(#pz-bake-dark)' : 'url(#pz-bake)'}
        />
      ))}
      {scene.sheens.map((p, i) => (
        <ellipse
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          rx={(2.5 + p.k * 3).toFixed(1)}
          ry="1.2"
          fill="url(#pz-sheen)"
          transform={`rotate(-30 ${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
        />
      ))}

      {scene.toppings.map((t) => (
        <g key={t.key} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.rot.toFixed(0)}) scale(${t.s.toFixed(2)})`}>
          {/* Kechikish har bir bo'lak uchun o'zgarmas — aks holda qayta chizishda eski bo'laklar yo'qolib qoladi */}
          <g className="pizza__topping" style={animate ? { animationDelay: `${Math.min(t.order * 38 + t.layer * 45, 900)}ms` } : undefined}>
            {t.node}
          </g>
        </g>
      ))}

      {/* Bo'laklarga kesilgan chiziqlar */}
      <g stroke="#6b2f10" strokeOpacity=".16" strokeWidth=".9">
        {[0, 45, 90, 135].map((angle) => {
          const a = ((angle + scene.sliceOffset) * Math.PI) / 180;
          const r = scene.inner - 1;
          return (
            <line
              key={angle}
              x1={(100 - Math.cos(a) * r).toFixed(1)}
              y1={(100 - Math.sin(a) * r).toFixed(1)}
              x2={(100 + Math.cos(a) * r).toFixed(1)}
              y2={(100 + Math.sin(a) * r).toFixed(1)}
            />
          );
        })}
      </g>

      {scene.halves && activePart != null && (
        <path
          className="pizza__dim"
          d={scene.crustPath}
          fill="#1a0f08"
          opacity=".3"
          clipPath={`url(#pz-half-${activePart === 0 ? 1 : 0})`}
        />
      )}
    </svg>
  );
}

export const Pizza = memo(PizzaImpl);
export default Pizza;
