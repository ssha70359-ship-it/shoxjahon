import { useState } from 'react';

import { categoryEmoji } from '../lib/emoji.js';
import { imgUrl } from '../lib/img.js';

/** Rasm yuklanmasa o'rniga emoji ko'rsatadi */
export default function Thumb({ src, alt, category, className = '', size = 62, radius = 14 }) {
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
        {categoryEmoji(category)}
      </div>
    );
  }

  return (
    <img className={className} src={imgUrl(src)} alt={alt} onError={() => setBroken(true)} />
  );
}
