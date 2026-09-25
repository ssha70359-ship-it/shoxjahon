// Har bir masalliqning chizmasi. Koordinatalar pitsa viewBox'ida (0..200),
// har bir bo'lak o'z markazida (0,0) chiziladi.
//
// r      — taxminiy radius (joylashtirishda to'qnashuvni hisoblash uchun)
// count  — butun pitsadagi soni
// layer  — qatlam: 0 pishloq bilan birga, 1 go'sht, 2 sabzavot, 3 eng ustida

import { seeded } from './rng.js';

const shadow = (r, dx = 0.7, dy = 1.1, opacity = 0.22) => (
  <circle cx={dx} cy={dy} r={r} fill={`rgba(50,18,6,${opacity})`} />
);

function dots(rand, n, maxR, size, fill, opacity = 1) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * maxR;
    out.push(
      <circle
        key={i}
        cx={(Math.cos(a) * r).toFixed(2)}
        cy={(Math.sin(a) * r).toFixed(2)}
        r={(size * (0.6 + rand() * 0.6)).toFixed(2)}
        fill={fill}
        opacity={opacity}
      />,
    );
  }
  return out;
}

const PEPPER_COLORS = ['#3d8b2e', '#3d8b2e', '#d8402e', '#eeb127'];

export const TOPPING_ART = {
  pepperoni: {
    r: 9,
    count: 13,
    layer: 1,
    draw: (rand) => (
      <>
        {shadow(9.2)}
        <circle r="9" fill="url(#pz-pep)" />
        <circle r="7.4" fill="none" stroke="#e98a6a" strokeOpacity=".22" strokeWidth=".9" />
        {dots(rand, 5, 5.6, 1, '#eaa27f', 0.7)}
        <ellipse cx="-3" cy="-3.4" rx="2.8" ry="1.2" fill="#fff" opacity=".22" transform="rotate(-35)" />
      </>
    ),
  },

  qazi: {
    r: 7.8,
    count: 11,
    layer: 1,
    draw: (rand) => (
      <>
        {shadow(7.9)}
        <circle r="7.6" fill="url(#pz-qazi)" />
        <path d="M-7.6 0A7.6 7.6 0 0 1 7.6 0A7.6 4.4 0 0 0 -7.6 0Z" fill="#f4e7d1" />
        <path d="M-7.6 0A7.6 4.4 0 0 0 7.6 0" fill="none" stroke="#d9b894" strokeWidth=".6" />
        {dots(rand, 4, 3.2, 0.8, '#f0d9bd', 0.8).map((dot, i) => (
          <g key={i} transform="translate(0 3)">
            {dot}
          </g>
        ))}
        <ellipse cx="2.5" cy="3.4" rx="2.4" ry=".9" fill="#fff" opacity=".18" />
      </>
    ),
  },

  chicken: {
    r: 7,
    count: 12,
    layer: 1,
    draw: (rand) => {
      const w = 10 + rand() * 3.5;
      const h = 6.4 + rand() * 2;
      return (
        <>
          <rect x={-w / 2 + 0.6} y={-h / 2 + 1} width={w} height={h} rx={h / 2.2} fill="rgba(80,40,10,.2)" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2.2} fill="url(#pz-chicken)" />
          <path
            d={`M${-w / 4} ${-h / 2 + 0.8}L${-w / 4 + 1.6} ${h / 2 - 0.8}M${w / 8} ${-h / 2 + 0.8}L${w / 8 + 1.6} ${h / 2 - 0.8}`}
            stroke="#a4652f"
            strokeWidth=".9"
            strokeLinecap="round"
            opacity=".55"
          />
          <ellipse cx={-w / 5} cy={-h / 5} rx={w / 5} ry=".7" fill="#fff" opacity=".25" />
        </>
      );
    },
  },

  beef: {
    r: 5,
    count: 17,
    layer: 1,
    draw: (rand) => {
      const blobs = [];
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i += 1) {
        const a = rand() * Math.PI * 2;
        const d = rand() * 2.8;
        blobs.push(
          <circle
            key={i}
            cx={(Math.cos(a) * d).toFixed(2)}
            cy={(Math.sin(a) * d).toFixed(2)}
            r={(1.5 + rand() * 1.3).toFixed(2)}
            fill={rand() > 0.5 ? '#6c321e' : '#824329'}
          />,
        );
      }
      return (
        <>
          {shadow(3.6, 0.6, 0.9, 0.18)}
          {blobs}
          <circle cx="-1" cy="-1.2" r=".7" fill="#c98a67" opacity=".6" />
        </>
      );
    },
  },

  sausage: {
    r: 5.6,
    count: 12,
    layer: 1,
    draw: (rand) => (
      <>
        {shadow(5.8)}
        <circle r="5.6" fill="#a9492f" />
        <circle r="4.5" fill="#c9694a" />
        {dots(rand, 5, 3.2, 0.55, '#eab291', 0.9)}
        <ellipse cx="-1.8" cy="-2" rx="1.6" ry=".7" fill="#fff" opacity=".22" />
      </>
    ),
  },

  mozzarella: {
    r: 7,
    count: 8,
    layer: 0,
    draw: (rand) => (
      <>
        <ellipse rx={6.5 + rand() * 2} ry={5.5 + rand() * 1.5} fill="#fffaf0" stroke="#ecd7ad" strokeWidth=".5" />
        <ellipse cx="-1.5" cy="-1.4" rx="2.4" ry="1" fill="#fff" opacity=".7" />
      </>
    ),
  },

  cheddar: {
    r: 6,
    count: 9,
    layer: 0,
    draw: (rand) => (
      <>
        <ellipse rx={5 + rand() * 1.8} ry={4.4 + rand() * 1.4} fill="#f2a53a" opacity=".92" />
        <ellipse cx="-1.2" cy="-1.3" rx="1.8" ry=".8" fill="#ffd792" opacity=".8" />
      </>
    ),
  },

  feta: {
    r: 3.6,
    count: 13,
    layer: 2,
    draw: () => (
      <>
        <rect x="-2.4" y="-1.9" width="5.2" height="5.2" rx="1.2" fill="rgba(90,60,20,.18)" />
        <rect x="-2.8" y="-2.8" width="5.2" height="5.2" rx="1.2" fill="#fcfaf4" stroke="#ddd3c0" strokeWidth=".5" />
      </>
    ),
  },

  parmesan: {
    r: 3.5,
    count: 14,
    layer: 3,
    draw: (rand) => (
      <path
        d={`M-3.4 -.6L${(1 + rand()).toFixed(1)} -1.4L3.4 .3L-1.2 1.3Z`}
        fill="#fff6dc"
        stroke="#e5d3a4"
        strokeWidth=".4"
        strokeLinejoin="round"
      />
    ),
  },

  mushroom: {
    r: 8,
    count: 10,
    layer: 2,
    draw: () => (
      <g transform="scale(1.2)">
        <path
          d="M-6.4 1.4C-6.8 -5.6 6.8 -5.6 6.4 1.4L2.6 1.4L2.3 5.8C.8 6.6 -.8 6.6 -2.3 5.8L-2.6 1.4Z"
          fill="rgba(70,40,15,.2)"
          transform="translate(.6 .9)"
        />
        <path
          d="M-6.4 1.4C-6.8 -5.6 6.8 -5.6 6.4 1.4L2.6 1.4L2.3 5.8C.8 6.6 -.8 6.6 -2.3 5.8L-2.6 1.4Z"
          fill="url(#pz-mush)"
          stroke="#9b7a55"
          strokeWidth=".7"
          strokeLinejoin="round"
        />
        <path d="M-4.6 .2C-4.4 -3.4 4.4 -3.4 4.6 .2" fill="none" stroke="#bb9b73" strokeWidth=".6" />
      </g>
    ),
  },

  tomato: {
    r: 7.6,
    count: 9,
    layer: 2,
    draw: (rand) => {
      const offset = rand() * 120;
      return (
        <>
          {shadow(7.7)}
          <circle r="7.5" fill="url(#pz-tomato)" />
          <circle r="5.8" fill="none" stroke="#f79478" strokeWidth=".8" opacity=".55" />
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle + offset})`}>
              <ellipse cx="0" cy="-3.1" rx="1.7" ry="2.3" fill="#f7a58b" />
              <circle cx="-.5" cy="-3.3" r=".45" fill="#f6dfa0" />
              <circle cx=".6" cy="-2.6" r=".45" fill="#f6dfa0" />
            </g>
          ))}
          <ellipse cx="-2.6" cy="-3.6" rx="2" ry=".8" fill="#fff" opacity=".3" transform="rotate(-30)" />
        </>
      );
    },
  },

  pepper: {
    r: 6,
    count: 12,
    layer: 2,
    draw: (rand) => {
      const color = PEPPER_COLORS[Math.floor(rand() * PEPPER_COLORS.length)];
      return (
        <>
          <path d="M-6 2.2Q0 -4 6 2.2" fill="none" stroke="rgba(40,20,5,.22)" strokeWidth="3" strokeLinecap="round" transform="translate(.5 .9)" />
          <path d="M-6 1.6Q0 -4.6 6 1.6" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-4.6 .4Q0 -3.8 4.6 .4" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".7" strokeLinecap="round" />
        </>
      );
    },
  },

  onion: {
    r: 6,
    count: 11,
    layer: 2,
    draw: () => (
      <>
        <path d="M-6 0A6 6 0 0 1 6 0" fill="none" stroke="#a24a8b" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-6 0A6 6 0 0 1 6 0" fill="none" stroke="#f1d8ea" strokeWidth=".6" strokeLinecap="round" transform="translate(0 .9)" />
        <path d="M-3.8 .8A3.8 3.8 0 0 1 3.8 .8" fill="none" stroke="#b9629f" strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
      </>
    ),
  },

  olive: {
    r: 3.8,
    count: 14,
    layer: 2,
    draw: () => (
      <>
        <circle cx=".5" cy=".8" r="3.4" fill="none" stroke="rgba(30,15,5,.25)" strokeWidth="2.6" />
        <circle r="3.4" fill="none" stroke="#2a2220" strokeWidth="2.6" />
        <path d="M-2.6 -1.6A3 3 0 0 1 0 -3.1" fill="none" stroke="#8a7a74" strokeWidth=".7" strokeLinecap="round" />
      </>
    ),
  },

  jalapeno: {
    r: 4.6,
    count: 12,
    layer: 2,
    draw: (rand) => (
      <>
        {shadow(4.6)}
        <circle r="4.5" fill="#4b8a2b" />
        <circle r="3.1" fill="#d3e6a8" />
        {dots(rand, 4, 1.8, 0.45, '#f4ecc8')}
        <path d="M-3 -2.4A4 4 0 0 1 0 -3.9" fill="none" stroke="#9fd07a" strokeWidth=".6" />
      </>
    ),
  },

  corn: {
    r: 2.4,
    count: 26,
    layer: 2,
    draw: () => (
      <>
        <ellipse cx=".4" cy=".6" rx="2.2" ry="1.8" fill="rgba(90,50,0,.2)" />
        <ellipse rx="2.2" ry="1.8" fill="#f5c11d" />
        <ellipse cx="-.6" cy="-.6" rx=".8" ry=".5" fill="#fff4b3" opacity=".9" />
      </>
    ),
  },

  pineapple: {
    r: 5.5,
    count: 12,
    layer: 2,
    draw: () => (
      <>
        <path d="M0 -4.4L5.4 3.4Q0 5 -5.4 3.4Z" fill="rgba(90,60,0,.18)" transform="translate(.5 .9)" />
        <path d="M0 -4.4L5.4 3.4Q0 5 -5.4 3.4Z" fill="#f8d64c" stroke="#e1b22a" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M0 -2.4L0 3.6M-2.6 .4L2.6 .4" stroke="#fff1a8" strokeWidth=".5" opacity=".8" />
      </>
    ),
  },

  basil: {
    r: 5.5,
    count: 7,
    layer: 3,
    draw: (rand) => {
      const s = 0.9 + rand() * 0.35;
      return (
        <g transform={`scale(${s.toFixed(2)})`}>
          <path d="M0 -7.2C5.2 -4.4 5.2 3.4 0 7.2C-5.2 3.4 -5.2 -4.4 0 -7.2Z" fill="rgba(10,40,10,.22)" transform="translate(.6 .9)" />
          <path d="M0 -7.2C5.2 -4.4 5.2 3.4 0 7.2C-5.2 3.4 -5.2 -4.4 0 -7.2Z" fill="url(#pz-basil)" />
          <path d="M0 -6L0 6.2" stroke="#a8d6a2" strokeWidth=".55" opacity=".7" />
        </g>
      );
    },
  },

  arugula: {
    r: 6,
    count: 9,
    layer: 3,
    draw: () => (
      <>
        <path
          d="M0 -7.5L2 -5.6L1.3 -4L3.6 -3.6L2.4 -1.6L4.6 -.4L2.6 1.2L3.8 3.4L1.2 3.4L.6 7L-.6 7L-1.2 3.4L-3.8 3.4L-2.6 1.2L-4.6 -.4L-2.4 -1.6L-3.6 -3.6L-1.3 -4L-2 -5.6Z"
          fill="#4d8a2c"
          stroke="#3a6f20"
          strokeWidth=".4"
          strokeLinejoin="round"
        />
        <path d="M0 -6L0 6.6" stroke="#9cc97a" strokeWidth=".5" />
      </>
    ),
  },

  chili: {
    r: 1.4,
    count: 40,
    layer: 3,
    draw: (rand) => (
      <path
        d={`M-1 -.6L${(0.6 + rand()).toFixed(1)} -.9L.9 .8Z`}
        fill={rand() > 0.4 ? '#c8261b' : '#8e1a10'}
      />
    ),
  },
};

// Belgi uchun ko'rinish maydoni (kattaroq son — kichikroq ko'rinadi)
const ICON_VIEW = {
  pepperoni: 10,
  qazi: 8.8,
  chicken: 8,
  beef: 5.8,
  sausage: 6.6,
  mozzarella: 8.6,
  cheddar: 7,
  feta: 4.6,
  parmesan: 4.4,
  mushroom: 9.4,
  tomato: 8.6,
  pepper: 7.4,
  onion: 7.2,
  olive: 5.2,
  jalapeno: 5.8,
  corn: 5.6,
  pineapple: 6.4,
  basil: 8,
  arugula: 8.2,
  chili: 3.6,
};

const CLUSTERS = {
  corn: [
    [-2.4, -1.5],
    [2.3, -1.9],
    [0, 2.1],
  ],
  chili: [
    [-1.6, -1.2],
    [1.5, -1.4],
    [0, 1.2],
    [1.9, 1.5],
    [-2, 1.6],
  ],
};

/** Masalliqlar gridida ko'rsatiladigan kichik belgi */
export function ToppingIcon({ id, size = 36 }) {
  const art = TOPPING_ART[id];
  if (!art) return null;
  const view = ICON_VIEW[id] ?? art.r * 1.3;
  const cluster = CLUSTERS[id];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
      aria-hidden="true"
      className="topping-icon"
    >
      {cluster ? (
        cluster.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 67})`}>
            {art.draw(seeded(`icon-${id}-${i}`))}
          </g>
        ))
      ) : (
        <g transform="rotate(-12)">{art.draw(seeded(`icon-${id}`))}</g>
      )}
    </svg>
  );
}
