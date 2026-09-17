import { useState } from 'react';

/** Rasm yuklanmasa o'rniga emoji ko'rsatadi */
export default function Thumb({ src, alt, className = '', size = 62, radius = 14 }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: 'var(--muted)',
          display: 'grid',
          placeItems: 'center',
          fontSize: size * 0.45,
          flex: '0 0 auto',
        }}
      >
        {'\u{1F355}'}
      </div>
    );
  }

  return <img className={className} src={src} alt={alt} onError={() => setBroken(true)} />;
}
