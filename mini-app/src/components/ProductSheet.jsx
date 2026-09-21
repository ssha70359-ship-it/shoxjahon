import { useEffect, useState } from 'react';
import { categoryEmoji } from '../lib/emoji.js';
import { ingredients, money, num } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';

export default function ProductSheet({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setQty(1);
    setBroken(false);
  }, [product]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!product) return null;

  const parts = ingredients(product.description);
  const hasDiscount = product.oldPrice && product.oldPrice > product.newPrice;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-scroll">
          {broken || !product.imageUrl ? (
            <div className="sheet-img" style={{ display: 'grid', placeItems: 'center', fontSize: 80 }}>
              {categoryEmoji(product.category)}
            </div>
          ) : (
            <img
              className="sheet-img"
              src={product.imageUrl}
              alt={product.name}
              onError={() => setBroken(true)}
            />
          )}

          <h2>{product.name}</h2>

          <div className="prices">
            {hasDiscount && <span className="price-old">{num(product.oldPrice)}</span>}
            <span className="price-new">{money(product.newPrice)}</span>
          </div>

          {parts.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 4 }}>
                Tarkibi
              </div>
              <ul className="ingredients">
                {parts.map((part) => (
                  <li key={part}>
                    <i className="bullet" />
                    {part}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="qty">
            <button onClick={() => { haptic(); setQty((v) => Math.max(1, v - 1)); }}>&minus;</button>
            <span>{qty}</span>
            <button onClick={() => { haptic(); setQty((v) => Math.min(20, v + 1)); }}>+</button>
          </div>
        </div>

        <div className="sheet-cta">
          <button
            className="btn"
            onClick={() => {
              haptic('medium');
              onAdd(product, qty);
              onClose();
            }}
          >
            Savatchaga qo&#8216;shish &mdash; {money(product.newPrice * qty)}
          </button>
        </div>
      </div>
    </>
  );
}
