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
import PaymentStatus from './components/PaymentStatus.jsx';
import {
  hideBackButton,
  notifyError,
  notifySuccess,
  openInvoice,
  showBackButton,
} from './lib/telegram.js';

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
  const [extraOffer, setExtraOffer] = useState({ name: 'Trubochka', price: 7000 });
  const [shop, setShop] = useState(null);

  const [cart, setCart] = useState(loadCart);
  const [withExtra, setWithExtra] = useState(false);
  const [sheetProduct, setSheetProduct] = useState(null);
  const [toast, setToast] = useState('');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // To'lov oqimi: { state, order, message, busy } | null
  const [payment, setPayment] = useState(null);
  const [payments, setPayments] = useState([]);

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
        if (catalog.shop) setShop(catalog.shop);
        if (Array.isArray(catalog.payments)) setPayments(catalog.payments);
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

  /**
   * Telegram "orqaga" tugmasi.
   *
   * Tugmasiz orqaga bosish butun Mini App'ni yopadi. Shuning uchun ichkarida
   * turgan har bir holat uchun o'z qaytish yo'lini beramiz:
   * mahsulot oynasi -> katalog, ichki bo'lim -> bosh sahifa.
   * Bosh sahifada tugma yashiriladi, shunda orqaga bosish ilovani yopadi.
   */
  useEffect(() => {
    let back = null;

    if (payment && payment.state !== 'processing') {
      back = () => {
        setPayment(null);
        setTab('home');
      };
    } else if (sheetProduct) {
      back = () => setSheetProduct(null);
    } else if (tab !== 'home') {
      back = () => setTab('home');
    }

    if (!back) {
      hideBackButton();
      return undefined;
    }

    const cleanup = showBackButton(back);

    return () => {
      cleanup();
      hideBackButton();
    };
  }, [payment, sheetProduct, tab]);

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

  /** Hisob-fakturani Mini App ichida ochadi va natijani ekranga chiqaradi */
  async function payWithInvoice(order, invoiceUrl) {
    setPayment({ state: 'processing', order });

    const status = await openInvoice(invoiceUrl);

    if (status === 'paid') notifySuccess();
    else if (status !== 'pending') notifyError();

    setPayment({
      state: status === 'unsupported' ? 'failed' : status,
      order,
      message:
        status === 'unsupported'
          ? 'Karta orqali to‘lov faqat Telegram ichida ishlaydi.'
          : undefined,
    });

    if (status === 'paid' || status === 'pending') loadOrders();
  }

  async function submitOrder(payload) {
    setSubmitting(true);

    try {
      const order = await api.createOrder(payload);

      setCart([]);
      setWithExtra(false);

      if (order.paymentMethod === 'NAQD') {
        notifySuccess();
        setPayment({ state: 'cash', order });
        loadOrders();
      } else if (order.invoiceUrl) {
        await payWithInvoice(order, order.invoiceUrl);
      } else {
        // Buyurtma saqlandi, lekin hisob-faktura ochilmadi - qayta urinish ekrani
        notifyError();
        setPayment({ state: 'failed', order, message: order.invoiceError });
      }
    } catch (error) {
      setToast(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** To'lanmagan buyurtmani qayta to'lash yoki usulini almashtirish */
  async function retryPayment(order, method) {
    setPayment((current) => (current ? { ...current, busy: true } : current));

    try {
      const updated = await api.payOrder(order.id, method);

      if (method === 'NAQD') {
        notifySuccess();
        setPayment({ state: 'cash', order: updated });
        loadOrders();
      } else {
        await payWithInvoice(updated, updated.invoiceUrl);
      }
    } catch (error) {
      notifyError();
      setPayment({ state: 'failed', order, message: error.message });
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

  if (payment) {
    return (
      <PaymentStatus
        payment={payment}
        methods={payments.filter((option) => option.enabled)}
        onRetry={(method) => retryPayment(payment.order, method)}
        onHome={() => {
          setPayment(null);
          setTab('home');
        }}
        onOrders={() => {
          setPayment(null);
          setTab('profile');
        }}
      />
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
          shop={shop}
          payments={payments}
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
          shop={shop}
          onReorder={reorder}
          onPay={(order) => setPayment({ state: 'cancelled', order, message: 'Bu buyurtma hali to‘lanmagan.' })}
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
