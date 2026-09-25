import { memo, type ComponentType } from 'react';

import type { ItemArt as ItemArtSpec } from '@shared/menu';

// Ichimlik, gazak va shirinliklar uchun chizilgan rasmlar (fotosurat shart emas).

const Shadow = ({ rx = 26, cy = 106 }) => <ellipse cx="60" cy={cy} rx={rx} ry="5" fill="rgba(40,20,10,.16)" />;

type ArtProps = Omit<ItemArtSpec, 'type'>;

function Bottle({ color = '#b3121b', label = '#fff' }: ArtProps) {
  return (
    <>
      <Shadow rx={20} />
      <path d="M53 20h14v8c0 5 11 10 11 24v48c0 4-3 7-7 7H49c-4 0-7-3-7-7V52c0-14 11-19 11-24z" fill={color} />
      <rect x="51.5" y="11" width="17" height="10" rx="2.5" fill="#e3e1dc" />
      <rect x="51.5" y="17" width="17" height="2" fill="#bdbab3" />
      <path d="M42 60h36v22H42z" fill={label} opacity=".95" />
      <path d="M42 64h36M42 78h36" stroke={color} strokeWidth="1.2" opacity=".35" />
      <path
        d="M48 36c-2 4-4 7-4 14v44"
        stroke="#fff"
        strokeOpacity=".4"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

function Cup({ color = '#6dbb3c' }: ArtProps) {
  const light = color === '#f3efe6';
  return (
    <>
      <Shadow rx={24} />
      <path d="M36 30h48l-6 72a6 6 0 0 1-6 5H48a6 6 0 0 1-6-5z" fill="#fff" opacity=".55" />
      <path d="M38 46h44l-4.6 55a5 5 0 0 1-5 4.6H47.6a5 5 0 0 1-5-4.6z" fill={color} />
      {!light && (
        <>
          <rect x="46" y="52" width="12" height="12" rx="2.5" fill="#fff" opacity=".45" transform="rotate(-12 52 58)" />
          <rect x="62" y="60" width="11" height="11" rx="2.5" fill="#fff" opacity=".4" transform="rotate(14 67 65)" />
          <circle cx="54" cy="84" r="1.6" fill="#fff" opacity=".6" />
          <circle cx="66" cy="92" r="1.2" fill="#fff" opacity=".6" />
        </>
      )}
      {light && <ellipse cx="60" cy="47" rx="21" ry="3" fill="#fff" />}
      <path d="M66 18l-6 70" stroke={light ? '#6fb3d9' : '#ff6a4a'} strokeWidth="4" strokeLinecap="round" />
      <path d="M36 30h48" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      <path d="M41 36l4 60" stroke="#fff" strokeOpacity=".6" strokeWidth="2.5" strokeLinecap="round" />
      {!light && (
        <g transform="translate(78 34) rotate(20)">
          <circle r="10" fill="#f4e04d" />
          <circle r="8" fill="#fbf1a0" />
          <path d="M0-8V8M-8 0H8M-5.6-5.6l11.2 11.2M5.6-5.6L-5.6 5.6" stroke="#f4e04d" strokeWidth="1" />
        </g>
      )}
    </>
  );
}

function Fries() {
  const sticks: [number, number, number][] = [
    [40, 28, -12],
    [48, 20, -6],
    [56, 16, -2],
    [63, 18, 3],
    [70, 22, 8],
    [77, 28, 14],
    [52, 26, -4],
    [66, 26, 5],
  ];
  return (
    <>
      <Shadow rx={28} />
      {sticks.map(([x, y, r], i) => (
        <rect
          key={i}
          x={x - 3.5}
          y={y}
          width="7.5"
          height="52"
          rx="2"
          fill={i % 2 ? '#f6c649' : '#f2b83a'}
          stroke="#d99a25"
          strokeWidth=".8"
          transform={`rotate(${r} ${x} 70)`}
        />
      ))}
      <path d="M32 52h56l-7 50a5 5 0 0 1-5 4H44a5 5 0 0 1-5-4z" fill="#e0322a" />
      <path d="M32 52h56l-1.4 10H33.4z" fill="#b8241e" />
      <path d="M52 74c3-5 13-5 16 0-2 7-14 7-16 0z" fill="#ffd34d" />
    </>
  );
}

function Wings() {
  const wing = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M-18-4c6-10 26-11 32-2 4 6 0 14-8 14-6 0-8-3-14-2-6 1-12-3-10-10z" fill="#b5541f" />
      <path
        d="M-14-4c6-7 20-8 25-2"
        stroke="#e08a44"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
      <circle cx="-4" cy="2" r="1" fill="#f6ead0" />
      <circle cx="4" cy="-1" r="1" fill="#f6ead0" />
      <circle cx="8" cy="5" r="1" fill="#f6ead0" />
    </g>
  );
  return (
    <>
      <Shadow rx={34} cy={100} />
      <ellipse cx="60" cy="86" rx="40" ry="14" fill="#f4efe7" />
      <ellipse cx="60" cy="84" rx="36" ry="11" fill="#fffdf8" />
      {wing(44, 76, -8)}
      {wing(74, 78, 12)}
      {wing(60, 64, -2)}
    </>
  );
}

function Bread() {
  const slice = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse rx="24" ry="11" fill="#c9843a" />
      <ellipse rx="21" ry="8.5" fill="#f3cd83" />
      <ellipse cx="-4" cy="-2" rx="12" ry="4" fill="#fbe2a6" />
      <circle cx="-8" cy="1" r="1.3" fill="#4d8a2c" />
      <circle cx="3" cy="-3" r="1.1" fill="#4d8a2c" />
      <circle cx="9" cy="2" r="1.2" fill="#4d8a2c" />
      <circle cx="-1" cy="3" r="1" fill="#4d8a2c" />
    </g>
  );
  return (
    <>
      <Shadow rx={34} cy={100} />
      {slice(44, 82, -18)}
      {slice(66, 72, -6)}
      {slice(58, 52, 8)}
    </>
  );
}

function Sticks() {
  return (
    <>
      <Shadow rx={34} cy={100} />
      {[
        [30, 70, -22],
        [40, 82, -10],
        [52, 60, -30],
        [62, 80, -14],
      ].map(([x = 0, y = 0, r = 0], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <rect x="0" y="-7" width="48" height="14" rx="7" fill="#d98e38" />
          <rect x="3" y="-5" width="42" height="6" rx="3" fill="#efb35a" opacity=".8" />
          <circle cx="12" cy="3" r="1" fill="#a86424" />
          <circle cx="30" cy="-2" r="1" fill="#a86424" />
        </g>
      ))}
      <path d="M92 58c4 6 2 16-4 18-4 1-5-4-2-8 3-3 5-6 6-10z" fill="#fff4cf" />
      <ellipse cx="88" cy="56" rx="7" ry="5" fill="#f5c55c" />
    </>
  );
}

function Cake({ color = '#f6e6c4', top = '#d8364a' }: ArtProps) {
  return (
    <>
      <Shadow rx={34} cy={100} />
      <ellipse cx="60" cy="94" rx="40" ry="11" fill="#f5f1ea" />
      <path d="M26 58l62-20 6 44-62 12z" fill={color} />
      <path d="M26 58l62-20v8L26 66z" fill={top} />
      <path d="M32 94l62-12v6L32 100z" fill="#b0773f" />
      <path d="M26 58l6 36v6l-6-36z" fill="#c9965f" opacity=".6" />
      <path d="M26 58c10 4 20-6 30-2s20-8 32-18" stroke={top} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="70" cy="36" r="6" fill={top} />
      <circle cx="68" cy="34" r="1.6" fill="#fff" opacity=".5" />
      <path d="M72 30c2-4 6-5 8-4" stroke="#4d8a2c" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  );
}

function Fondant() {
  return (
    <>
      <Shadow rx={36} cy={100} />
      <ellipse cx="60" cy="92" rx="44" ry="13" fill="#f5f1ea" />
      <path d="M34 84c0-26 10-40 26-40s26 14 26 40z" fill="#4a2616" />
      <path d="M40 60c4-10 10-14 20-14" stroke="#7a4a33" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 70c8 0 14 6 18 14 6 2 12 3 14 6-10 2-40 2-44-2 2-6 6-18 12-18z" fill="#2d1409" />
      <ellipse cx="68" cy="86" rx="16" ry="3.2" fill="#3b1a0b" />
      <circle cx="46" cy="52" r="1" fill="#fff" />
      <circle cx="56" cy="47" r="1" fill="#fff" />
      <circle cx="66" cy="50" r="1" fill="#fff" />
      <circle cx="52" cy="58" r=".8" fill="#fff" />
      <path d="M78 46c4-2 8 0 8 4" stroke="#4d8a2c" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="80" cy="54" r="4" fill="#d8364a" />
    </>
  );
}

function Dip({ color = '#f4ecd8' }: ArtProps) {
  return (
    <>
      <Shadow rx={28} cy={98} />
      <path d="M30 56h60l-6 34c-1 6-6 9-12 9H48c-6 0-11-3-12-9z" fill="#fdfbf7" />
      <path d="M30 56h60l-1 6H31z" fill="#e8e3da" />
      <ellipse cx="60" cy="56" rx="30" ry="9" fill="#efe9df" />
      <ellipse cx="60" cy="56" rx="26" ry="7" fill={color} />
      <path
        d="M48 54c6-3 14-3 22 0"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M38 64l3 22" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
    </>
  );
}

const ART: Record<ItemArtSpec['type'], ComponentType<ArtProps>> = {
  bottle: Bottle,
  cup: Cup,
  fries: Fries,
  wings: Wings,
  bread: Bread,
  sticks: Sticks,
  cake: Cake,
  fondant: Fondant,
  dip: Dip,
};

function ItemArtImpl({ art, size = 72, label }: { art: ItemArtSpec | undefined; size?: number; label?: string }) {
  const Component = art ? ART[art.type] : Dip;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label} className="item-art">
      <Component {...art} />
    </svg>
  );
}

export const ItemArt = memo(ItemArtImpl);
export default ItemArt;
