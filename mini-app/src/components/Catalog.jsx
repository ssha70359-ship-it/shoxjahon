import { useMemo, useState } from 'react';
import ProductCard from './ProductCard.jsx';
import { haptic } from '../lib/telegram.js';

export default function Catalog({ products, categories, onOpenProduct, onAdd }) {
  const [active, setActive] = useState('Hammasi');

  const filtered = useMemo(
    () => (active === 'Hammasi' ? products : products.filter((p) => p.category === active)),
    [products, active],
  );

  const tabs = ['Hammasi', ...categories];

  return (
    <div className="screen">
      <div className="header">
        <h1>Katalog</h1>
      </div>

      <div className="chips">
        {tabs.map((category) => (
          <button
            key={category}
            className={`chip ${active === category ? 'active' : ''}`}
            onClick={() => {
              haptic();
              setActive(category);
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="emoji">{'\u{1F50D}'}</div>
          <h3>Bu kategoriyada mahsulot yo&#8216;q</h3>
          <p>Boshqa kategoriyani tanlab ko&#8216;ring</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={onOpenProduct} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}
