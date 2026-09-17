import { useCallback, useEffect, useState } from 'react';

import Onboarding from './components/Onboarding.jsx';
import Home from './components/Home.jsx';
import Catalog from './components/Catalog.jsx';
import Cart from './components/Cart.jsx';
import Profile from './components/Profile.jsx';
import ProductSheet from './components/ProductSheet.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';

import api from './lib/api.js';
import { closeApp, notifySuccess } from './lib/telegram.js';

const CART_KEY = 'pz_cart';
const ONBOARD_KEY = 'pz_onboarded';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* localStorage yopiq */
  }
}

function isOnboarded() {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [onboarded, setOnboarded] = useState(isOnboarded);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');

  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [extraOffer, setExtraOffer] = useState({ name: 'Coca-Cola 0.5L', price: 5000 });

  const [cart, setCart] = useState(loadCart);
  const [withExtra, setWithExtra] = useState(false);
  const [sheetProduct, setSheetProduct] = useState(null);
  const [toast, setToast] = useState('');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => saveCart(cart), [cart]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [me, catalog] = await Promise.all([api.getMe(), api.getProducts()]);
        if (!alive) return;

        setUser(me);
        setProducts(catalog.products);
        setCategories(catalog.categories);
        if (catalog.extraOffer) setExtraOffer(catalog.extraOffer);
      } catch (error) {
        if (alive) setFatal(error.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      setOrders(await api.getMyOrders());
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'profile') loadOrders();
  }, [tab, loadOrders]);

  function addToCart(product, qty = 1) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(50, item.qty + qty) } : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.newPrice,
          imageUrl: product.imageUrl,
          qty,
        },
      ];
    });

    setToast(`${product.name} savatchaga qo‘shildi`);
  }

  function changeQty(id, qty) {
    setCart((current) =>
      qty <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, qty: Math.min(50, qty) } : item)),
    );
  }

  function reorder(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const restored = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      restored.push({
        id: product.id,
        name: product.name,
        price: product.newPrice,
        imageUrl: product.imageUrl,
        qty: item.qty,
      });
    }

    if (restored.length === 0) {
      setToast('Bu mahsulotlar hozir mavjud emas');
      return;
    }

    setCart(restored);
    setTab('cart');
  }

  async function submitOrder(payload) {
    setSubmitting(true);

    try {
      await api.createOrder(payload);

      notifySuccess();
      setCart([]);
      setWithExtra(false);
      setSuccess(true);

      setTimeout(closeApp, 2600);
    } catch (error) {
      setToast(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!onboarded) {
    return (
      <Onboarding
        onFinish={() => {
          try {
            localStorage.setItem(ONBOARD_KEY, '1');
          } catch {
            /* localStorage yopiq */
          }
          setOnboarded(true);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <p className="muted">Yuklanmoqda...</p>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        <div className="emoji">{'\u{1F614}'}</div>
        <h3>Xatolik yuz berdi</h3>
        <p>{fatal}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Qayta urinish
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="success">
        <div className="check">{'✅'}</div>
        <h2>Buyurtma qabul qilindi!</h2>
        <p>Kuryerimiz tez orada siz bilan bog&#8216;lanadi. Yoqimli ishtaha! {'\u{1F355}'}</p>
      </div>
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      {tab === 'home' && (
        <Home
          user={user}
          products={products}
          onGoCatalog={() => setTab('catalog')}
          onOpenProduct={setSheetProduct}
          onAdd={addToCart}
        />
      )}

      {tab === 'catalog' && (
        <Catalog
          products={products}
          categories={categories}
          onOpenProduct={setSheetProduct}
          onAdd={addToCart}
        />
      )}

      {tab === 'cart' && (
        <Cart
          cart={cart}
          user={user}
          extraOffer={extraOffer}
          withExtra={withExtra}
          onToggleExtra={() => setWithExtra((value) => !value)}
          onChangeQty={changeQty}
          onGoCatalog={() => setTab('catalog')}
          onSubmit={submitOrder}
          submitting={submitting}
        />
      )}

      {tab === 'profile' && (
        <Profile
          user={user}
          orders={orders}
          loading={ordersLoading}
          onReorder={reorder}
          onGoCatalog={() => setTab('catalog')}
        />
      )}

      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
          onAdd={addToCart}
        />
      )}

      <BottomNav tab={tab} onChange={setTab} cartCount={cartCount} />

      {toast && <Toast message={toast} onHide={() => setToast('')} />}
    </>
  );
}
