import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import Stats from './Stats.jsx';
import { money, date, STATUS_LABEL, STATUSES, PAYMENT_STATUS_LABEL } from '../lib/format.js';

const REFRESH_MS = 15000;

export default function Orders({ onUnauthorized }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, statsData] = await Promise.all([api.orders(filter), api.stats()]);
      setOrders(list);
      setStats(statsData);
      setError('');
    } catch (err) {
      if (err.status === 401) return onUnauthorized();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Real vaqtga yaqin yangilanish
  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function changeStatus(id, status) {
    setOrders((current) => current.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await api.updateOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  async function remove(id) {
    if (!window.confirm(`№${id} buyurtma o'chirilsinmi?`)) return;
    try {
      await api.deleteOrder(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Stats data={stats} />

      <div className="page-head">
        <h2>Buyurtmalar</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="live">
            <i /> Avtomatik yangilanadi
          </span>
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">Barchasi</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={load}>
            Yangilash
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="spinner" />
      ) : orders.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="emoji">{'\u{1F4E6}'}</div>
            Hozircha buyurtma yo&#8216;q
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Mijoz</th>
                <th>Telefon</th>
                <th>Mahsulotlar</th>
                <th>Jami</th>
                <th>To&#8216;lov</th>
                <th>Manzil</th>
                <th>Sana</th>
                <th>Holat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const items = Array.isArray(order.items) ? order.items : [];

                return (
                  <tr key={order.id}>
                    <td className="cell-strong">{order.id}</td>

                    <td>
                      <div className="cell-strong">
                        {order.user?.firstName} {order.user?.lastName || ''}
                      </div>
                      {order.user?.username && (
                        <div className="cell-muted">@{order.user.username}</div>
                      )}
                    </td>

                    <td>{order.phone || order.user?.phone || '—'}</td>

                    <td className="items-cell">
                      {items.map((item, index) => (
                        <div key={index}>
                          {item.name} &times; {item.qty}
                        </div>
                      ))}
                    </td>

                    <td className="cell-strong" style={{ whiteSpace: 'nowrap' }}>
                      {money(order.total)}
                    </td>

                    <td>
                      <div className={`badge payment-${order.paymentStatus}`}>
                        {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
                      </div>
                    </td>

                    <td style={{ maxWidth: 220 }}>
                      {order.location}
                      {order.lat && order.lng && (
                        <div>
                          <a
                            className="cell-muted"
                            href={`https://maps.google.com/?q=${order.lat},${order.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Xaritada ochish
                          </a>
                        </div>
                      )}
                      {order.comment && <div className="cell-muted">{order.comment}</div>}
                    </td>

                    <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                      {date(order.createdAt)}
                    </td>

                    <td>
                      <div className={`badge ${order.status}`} style={{ marginBottom: 6 }}>
                        {STATUS_LABEL[order.status]}
                      </div>
                      <select
                        className="status-select"
                        value={order.status}
                        onChange={(event) => changeStatus(order.id, event.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button className="btn btn-xs btn-danger" onClick={() => remove(order.id)}>
                        O&#8216;chirish
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
