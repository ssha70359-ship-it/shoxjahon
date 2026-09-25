import type { ReactElement } from 'react';

import type { OrderDto, PizzaConfig } from '@shared/types';

import Pizza from '../pizza/Pizza';

// Kuzatuv ekranidagi jonli sahnalar. Pechdagi pitsa — aynan mijoz buyurtma
// qilgan pitsa (o'sha masalliqlar bilan), shunchaki rasm emas.

function Ticket({ id }: { id: number }) {
  return (
    <svg viewBox="0 0 360 220" className="scene__svg" aria-hidden="true">
      <rect x="40" y="26" width="280" height="10" rx="5" fill="#8a5a3b" />
      <g className="scene__swing">
        <rect x="170" y="30" width="20" height="16" rx="3" fill="#c9c2b8" />
        <path d="M130 44h100v124l-10 8-10-8-10 8-10-8-10 8-10-8-10 8-10-8-10 8-10-8z" fill="#fffaf0" />
        <text x="180" y="72" textAnchor="middle" className="scene__ticket-id">
          #{id}
        </text>
        <rect x="146" y="88" width="68" height="7" rx="3.5" fill="#e8dccb" />
        <rect x="146" y="104" width="50" height="7" rx="3.5" fill="#e8dccb" />
        <rect x="146" y="120" width="60" height="7" rx="3.5" fill="#e8dccb" />
        <rect x="146" y="140" width="40" height="9" rx="4.5" fill="#ff6a3d" />
      </g>
      <g className="scene__sparkles">
        <circle cx="96" cy="90" r="3" fill="#ffb454" />
        <circle cx="268" cy="70" r="2.4" fill="#ffb454" />
        <circle cx="258" cy="150" r="3.2" fill="#ffb454" />
        <circle cx="104" cy="160" r="2.2" fill="#ffb454" />
      </g>
    </svg>
  );
}

function Dough() {
  return (
    <svg viewBox="0 0 360 220" className="scene__svg" aria-hidden="true">
      <ellipse cx="180" cy="196" rx="70" ry="9" fill="rgba(0,0,0,.18)" className="scene__dough-shadow" />
      <g className="scene__dough">
        <ellipse cx="180" cy="104" rx="80" ry="27" fill="#c98f45" />
        <ellipse cx="180" cy="100" rx="78" ry="25" fill="#e8b96f" />
        <ellipse cx="180" cy="97" rx="68" ry="19" fill="#f6dcaa" />
        <ellipse cx="164" cy="92" rx="24" ry="5" fill="#fff1d2" />
        <circle cx="206" cy="98" r="2.2" fill="#fff" opacity=".8" />
        <circle cx="150" cy="102" r="1.8" fill="#fff" opacity=".8" />
      </g>
      <g className="scene__flour">
        {[
          [120, 60],
          [230, 48],
          [256, 120],
          [104, 132],
          [200, 30],
          [150, 150],
          [270, 80],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2 + (i % 3)}
            fill="#fff"
            opacity=".85"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

function OvenScene({ pizza }: { pizza: PizzaConfig }) {
  const bricks: ReactElement[] = [];
  for (let row = 0; row < 7; row += 1) {
    const y = 58 + row * 20;
    const offset = row % 2 ? 0 : 18;
    for (let x = 30 + offset; x < 330; x += 36) {
      bricks.push(<rect key={`${row}-${x}`} x={x} y={y} width="32" height="16" rx="3" />);
    }
  }

  return (
    <svg viewBox="0 0 360 220" className="scene__svg" aria-hidden="true">
      <defs>
        <radialGradient id="ov-glow" cx="50%" cy="70%">
          <stop offset="0" stopColor="#ffcf6b" />
          <stop offset=".45" stopColor="#ff7a2e" />
          <stop offset="1" stopColor="#ff7a2e" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ov-dome">
          <path d="M28 212V132C28 60 96 30 180 30s152 30 152 102v80z" />
        </clipPath>
      </defs>
      <path d="M28 212V132C28 60 96 30 180 30s152 30 152 102v80z" fill="#7b4128" />
      <g clipPath="url(#ov-dome)" fill="#8f4d30" stroke="#6a331d" strokeWidth="2">
        {bricks}
      </g>
      <path d="M96 212v-52c0-40 38-66 84-66s84 26 84 66v52z" fill="#c26a3a" />
      <path d="M106 212v-50c0-34 34-58 74-58s74 24 74 58v50z" fill="#1a0b05" />
      <ellipse cx="180" cy="184" rx="90" ry="52" fill="url(#ov-glow)" className="scene__glow" />
      <g className="scene__flames">
        <path d="M128 200c-8-16 4-26 6-42 10 12 16 22 10 42z" fill="#ff8a2a" />
        <path d="M140 202c-6-12 4-20 4-32 8 10 10 18 6 32z" fill="#ffd05a" />
        <path d="M226 202c-6-18 8-28 8-46 10 14 14 28 6 46z" fill="#ff8a2a" />
        <path d="M216 204c-4-12 4-18 4-28 6 8 8 18 4 28z" fill="#ffd05a" />
      </g>
      <g transform="translate(134 164) scale(1 .34)">
        <Pizza config={pizza} size={92} seed="oven" />
      </g>
      <rect x="0" y="206" width="360" height="14" fill="#3b2016" />
    </svg>
  );
}

function Road() {
  const skyline = (y: number, color: string, className: string) => (
    <g className={className}>
      {[0, 360].map((dx) => (
        <path
          key={dx}
          transform={`translate(${dx} 0)`}
          fill={color}
          d={`M0 ${y}h24v-30h30v18h22v-44h26v26h20v-18h34v38h18v-26h30v34h26v-52h32v40h24v-22h26v36h28v-14h20v${220 - y}H0z`}
        />
      ))}
    </g>
  );

  return (
    <svg viewBox="0 0 360 220" className="scene__svg" aria-hidden="true">
      <defs>
        <linearGradient id="rd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb86b" />
          <stop offset="1" stopColor="#ffe3bd" />
        </linearGradient>
      </defs>
      <rect width="360" height="220" fill="url(#rd-sky)" />
      <circle cx="286" cy="62" r="26" fill="#fff1c9" opacity=".9" />
      {skyline(150, '#f39b62', 'scene__city scene__city--far')}
      {skyline(170, '#dc7446', 'scene__city scene__city--near')}
      <rect y="176" width="360" height="44" fill="#3d2b25" />
      <g className="scene__lane">
        {[0, 60, 120, 180, 240, 300, 360].map((x) => (
          <rect key={x} x={x} y="196" width="32" height="4" rx="2" fill="#f6e2bd" />
        ))}
      </g>
      <g className="scene__scooter" transform="translate(126 118)">
        <g className="scene__speed" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8">
          <path d="M-40 28h26M-52 44h30M-36 60h20" />
        </g>
        <rect x="-2" y="2" width="44" height="34" rx="5" fill="#ff5a2a" />
        <path d="M20 12c-4 6-2 10 0 14 2-4 4-8 0-14z" fill="#ffd05a" />
        <path d="M40 40h58l12-24" stroke="#2b1d18" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M-4 40h52l8 16H2z" fill="#ff7a3d" />
        <circle cx="64" cy="4" r="11" fill="#2b1d18" />
        <path d="M54 12l-8 30h20l10-20z" fill="#2b1d18" />
        <path d="M58 6h14" stroke="#ff5a2a" strokeWidth="5" strokeLinecap="round" />
        <g className="scene__wheel" transform="translate(12 62)">
          <circle r="12" fill="#1b1311" />
          <circle r="5" fill="#9b8b83" />
          <path d="M0-10v20M-10 0h20" stroke="#6b5c55" strokeWidth="2" />
        </g>
        <g className="scene__wheel" transform="translate(104 62)">
          <circle r="12" fill="#1b1311" />
          <circle r="5" fill="#9b8b83" />
          <path d="M0-10v20M-10 0h20" stroke="#6b5c55" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

function Box({ pizza, open = true }: { pizza: PizzaConfig; open?: boolean }) {
  return (
    <svg viewBox="0 0 360 220" className="scene__svg" aria-hidden="true">
      <ellipse cx="180" cy="198" rx="120" ry="12" fill="rgba(0,0,0,.18)" />
      {open ? (
        <>
          <path d="M84 104l24-78h144l24 78z" fill="#d8a36a" />
          <path d="M96 100l20-66h128l20 66z" fill="#c68d55" />
          <path d="M70 110h220l-12 80H82z" fill="#e7b57d" />
          <path d="M70 110h220v8H70z" fill="#d49c62" />
          <g transform="translate(116 118) scale(1 .5)">
            <Pizza config={pizza} size={128} seed="box" />
          </g>
        </>
      ) : (
        <>
          <path d="M70 120h220l-12 70H82z" fill="#e2ad73" />
          <path d="M70 120l30-40h160l30 40z" fill="#f0c38e" />
          <path d="M160 96c-10-12-30-2-20 12l20 16 20-16c10-14-10-24-20-12z" fill="#ff5a2a" />
        </>
      )}
    </svg>
  );
}

function Confetti() {
  const colors = ['#ff5a2a', '#ffb13d', '#3fb27f', '#4a90e2', '#e84a5f'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 8) * 0.12}s`,
            '--drift': `${((i * 53) % 60) - 30}px`,
          }}
        />
      ))}
    </div>
  );
}

export function OrderScene({ order, pizza }: { order: OrderDto; pizza: PizzaConfig }) {
  const status = order.status;
  let scene;
  let tone = 'warm';

  if (status === 'pending_payment' || status === 'new') scene = <Ticket id={order.id} />;
  else if (status === 'accepted') scene = <Dough />;
  else if (status === 'baking') {
    scene = <OvenScene pizza={pizza} />;
    tone = 'fire';
  } else if (status === 'delivering') {
    scene = <Road />;
    tone = 'sky';
  } else if (status === 'ready') scene = <Box pizza={pizza} open />;
  else if (status === 'done') scene = <Box pizza={pizza} open={false} />;
  else {
    tone = 'muted';
    scene = <Box pizza={pizza} open={false} />;
  }

  return (
    <div className={`scene scene--${tone} scene--${status}`} key={status}>
      {scene}
      {status === 'done' && <Confetti />}
    </div>
  );
}
