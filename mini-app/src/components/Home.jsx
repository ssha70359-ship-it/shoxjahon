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
        <p>Yangi pishgan bulochkalar 7 000 so&#8216;mdan</p>
        <button
          className="btn"
          onClick={() => {
            haptic('medium');
            onGoCatalog();
          }}
        >
          Katalogni ochish
        </button>
        <div className="hero-emoji">{'\u{1F968}'}</div>
      </div>

      <div className="info-row">
        <div className="info-card">
          <b>7:00–19:00</b>
          <span>Har kuni ochiq</span>
        </div>
        <div className="info-card">
          <b>est. 1996</b>
          <span>30 yillik tajriba</span>
        </div>
        <div className="info-card">
          <b>40K+</b>
          <span>Obunachi</span>
        </div>
      </div>

      {popular.length > 0 && (
        <>
          <div className="container">
            <div className="section-title" style={{ margin: '4px 0 12px' }}>
              Mashhur mahsulotlar
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
