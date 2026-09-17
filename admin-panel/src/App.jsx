import { useCallback, useState } from 'react';
import Login from './components/Login.jsx';
import Orders from './components/Orders.jsx';
import Products from './components/Products.jsx';
import { clearPassword, getPassword } from './lib/api.js';

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getPassword()));
  const [page, setPage] = useState('orders');

  const logout = useCallback(() => {
    clearPassword();
    setAuthed(false);
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          {'\u{1F355}'} <span>Pizza Admin</span>
        </div>

        <nav className="tabs">
          <button className={page === 'orders' ? 'active' : ''} onClick={() => setPage('orders')}>
            Buyurtmalar
          </button>
          <button
            className={page === 'products' ? 'active' : ''}
            onClick={() => setPage('products')}
          >
            Mahsulotlar
          </button>
        </nav>

        <button className="btn btn-ghost btn-xs" onClick={logout}>
          Chiqish
        </button>
      </header>

      <main className="content">
        {page === 'orders' ? (
          <Orders onUnauthorized={logout} />
        ) : (
          <Products onUnauthorized={logout} />
        )}
      </main>
    </div>
  );
}
