import { money, date, STATUS_LABEL } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';

export default function Profile({ user, orders, loading, onReorder, onGoCatalog }) {
  const name = user?.firstName || 'Mijoz';

  return (
    <div className="screen">
      <div className="profile-top">
        <div className="avatar">{name.charAt(0).toUpperCase()}</div>
        <h2>
          {name} {user?.lastName || ''}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {user?.phone || (user?.username ? `@${user.username}` : 'Telefon kiritilmagan')}
        </p>
      </div>

      <div className="container">
        <div className="section-title">{'\u{1F4DC}'} Mening buyurtmalarim</div>

        {loading && <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />}

        {!loading && orders.length === 0 && (
          <div className="empty">
            <div className="emoji">{'\u{1F4E6}'}</div>
            <h3>Hali buyurtma yo&#8216;q</h3>
            <p>Birinchi buyurtmangizni hoziroq bering</p>
            <button className="btn" onClick={onGoCatalog}>
              Katalogga o&#8216;tish
            </button>
          </div>
        )}

        {!loading &&
          orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div className="order-card" key={order.id}>
                <div className="order-head">
                  <b>Buyurtma &#8470;{order.id}</b>
                  <span className={`status ${order.status}`}>{STATUS_LABEL[order.status]}</span>
                </div>

                <div className="order-items">
                  {items.map((item, index) => (
                    <div key={`${order.id}-${index}`}>
                      {item.name} &times; {item.qty}
                    </div>
                  ))}
                  <div style={{ marginTop: 4 }}>{date(order.createdAt)}</div>
                </div>

                <div className="order-foot">
                  <b>{money(order.total)}</b>
                  <button
                    onClick={() => {
                      haptic();
                      onReorder(order);
                    }}
                  >
                    Yana shundan buyurtma qilish
                  </button>
                </div>
              </div>
            );
          })}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
