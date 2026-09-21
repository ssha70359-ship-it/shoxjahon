import { money, date, STATUS_LABEL } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';

export default function Profile({ user, orders, loading, shop, onReorder, onGoCatalog }) {
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

        {shop && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              {'\u{1F4CD}'} Filiallarimiz
            </div>

            {shop.branches.map((branch) => (
              <div className="order-card" key={branch.id}>
                <div className="order-head">
                  <b>{branch.name}</b>
                </div>
                <div className="order-items">{branch.address}</div>
              </div>
            ))}

            <div className="section-title" style={{ marginTop: 24 }}>
              {'\u{2139}'} Biz haqimizda
            </div>

            <div className="order-card">
              <div className="order-items">
                <div>{'\u{1F551}'} {shop.hours.text}</div>
                <div style={{ marginTop: 6 }}>
                  {'\u{1F4DE}'}{' '}
                  <a href={shop.phoneHref} style={{ color: 'inherit' }}>
                    {shop.phone}
                  </a>
                </div>
                <div style={{ marginTop: 6 }}>
                  {'\u{1F4F7}'}{' '}
                  <a
                    href={shop.instagram}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'inherit' }}
                  >
                    Instagram
                  </a>
                </div>
                <div style={{ marginTop: 6 }}>{'\u{1F69A}'} {shop.delivery.text}</div>
              </div>
            </div>
          </>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
