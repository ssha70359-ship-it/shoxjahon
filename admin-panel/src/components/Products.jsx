import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import ProductForm from './ProductForm.jsx';
import { num } from '../lib/format.js';

export default function Products({ onUnauthorized }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | product

  const load = useCallback(async () => {
    try {
      setProducts(await api.products());
      setError('');
    } catch (err) {
      if (err.status === 401) return onUnauthorized();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(data) {
    if (editing === 'new') await api.createProduct(data);
    else await api.updateProduct(editing.id, data);
    await load();
  }

  async function remove(product) {
    if (!window.confirm(`"${product.name}" o'chirilsinmi?`)) return;
    try {
      await api.deleteProduct(product.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Mahsulotlar</h2>
        <button className="btn" onClick={() => setEditing('new')}>
          + Yangi mahsulot
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="spinner" />
      ) : products.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="emoji">{'\u{1F355}'}</div>
            Mahsulot yo&#8216;q. &laquo;Yangi mahsulot&raquo; tugmasini bosing.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Rasm</th>
                <th>Nomi</th>
                <th>Tarkibi</th>
                <th>Kategoriya</th>
                <th>Narx</th>
                <th>Holat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="cell-strong">{product.id}</td>

                  <td>
                    {product.imageUrl ? (
                      <img
                        className="thumb"
                        src={product.imageUrl}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="thumb-empty">{'\u{1F355}'}</div>
                    )}
                  </td>

                  <td className="cell-strong">{product.name}</td>

                  <td className="cell-muted" style={{ maxWidth: 250 }}>
                    {product.description}
                  </td>

                  <td>
                    <span className="tag">{product.category}</span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    {product.oldPrice ? <span className="price-old">{num(product.oldPrice)}</span> : null}
                    <span className="price-new">{num(product.newPrice)}</span>
                  </td>

                  <td>
                    <span className={`badge ${product.isActive ? 'on' : 'off'}`}>
                      {product.isActive ? 'Aktiv' : 'Yashirin'}
                    </span>
                  </td>

                  <td>
                    <div className="row-actions">
                      <button className="btn btn-xs btn-ghost" onClick={() => setEditing(product)}>
                        Tahrirlash
                      </button>
                      <button className="btn btn-xs btn-danger" onClick={() => remove(product)}>
                        O&#8216;chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
