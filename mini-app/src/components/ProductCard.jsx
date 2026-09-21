import { useState } from 'react';
import { categoryEmoji } from '../lib/emoji.js';
import { imgUrl } from '../lib/img.js';
import { num } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';

export default function ProductCard({ product, onOpen, onAdd }) {
  const [broken, setBroken] = useState(false);
  const hasDiscount = product.oldPrice && product.oldPrice > product.newPrice;
  const percent = hasDiscount
    ? Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="card" onClick={() => onOpen(product)}>
      {broken || !product.imageUrl ? (
        <div className="card-img-fallback">{categoryEmoji(product.category)}</div>
      ) : (
        <img
          className="card-img"
          src={imgUrl(product.imageUrl)}
          alt={product.name}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}

      {hasDiscount && <span className="badge-sale">-{percent}%</span>}

      <div className="card-body">
        <p className="card-name">{product.name}</p>
        <div className="card-cat">{product.category}</div>
        <div className="prices">
          {hasDiscount && <span className="price-old">{num(product.oldPrice)}</span>}
          <span className="price-new">{num(product.newPrice)} so&#8216;m</span>
        </div>
      </div>

      <button
        className="card-add"
        aria-label="Savatchaga qo'shish"
        onClick={(event) => {
          event.stopPropagation();
          haptic();
          onAdd(product, 1);
        }}
      >
        +
      </button>
    </div>
  );
}
