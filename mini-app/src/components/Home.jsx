import Stories from './Stories.jsx';
import ProductCard from './ProductCard.jsx';
import { haptic } from '../lib/telegram.js';

export default function Home({ user, products, onGoCatalog, onOpenProduct, onAdd }) {
  const name = user?.firstName || 'Mijoz';
  const popular = products.slice(0, 4);

  return (
    <div className="screen">
      <div className="header">
        <div>
          <p className="muted" style={{ margin: '0 0 2px' }}>
            Xush kelibsiz {'\u{1F44B}'}
          </p>
          <h1>Salom, {name}!</h1>
        </div>
        <div className="avatar">{name.charAt(0).toUpperCase()}</div>
      </div>

      <Stories />

      <div className="hero">
        <h2>Yangi buyurtma berish</h2>
        <p>Issiqqina pizza 30 daqiqada eshigingiz oldida</p>
        <button
          className="btn"
          onClick={() => {
            haptic('medium');
            onGoCatalog();
          }}
        >
          Katalogni ochish
        </button>
        <div className="hero-emoji">{'\u{1F355}'}</div>
      </div>

      <div className="info-row">
        <div className="info-card">
          <b>30 daq</b>
          <span>O&#8216;rtacha yetkazish</span>
        </div>
        <div className="info-card">
          <b>10 000+</b>
          <span>Mamnun mijoz</span>
        </div>
        <div className="info-card">
          <b>4.9 ★</b>
          <span>Reyting</span>
        </div>
      </div>

      {popular.length > 0 && (
        <>
          <div className="container">
            <div className="section-title" style={{ margin: '4px 0 12px' }}>
              Mashhur pizzalar
            </div>
          </div>
          <div className="grid">
            {popular.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={onOpenProduct}
                onAdd={onAdd}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
