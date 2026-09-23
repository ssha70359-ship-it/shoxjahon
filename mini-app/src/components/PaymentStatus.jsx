import { money, PAYMENT_LABEL } from '../lib/format.js';
import { availability } from './PaymentOptions.jsx';

const COPY = {
  paid: {
    tone: 'ok',
    icon: '✓',
    title: 'To‘lov qabul qilindi!',
    text: 'Buyurtmangiz tayyorlanmoqda. Kuryer tez orada bog‘lanadi.',
  },
  cash: {
    tone: 'ok',
    icon: '✓',
    title: 'Buyurtma qabul qilindi!',
    text: 'To‘lovni kuryerga naqd berasiz. Tez orada bog‘lanamiz.',
  },
  pending: {
    tone: 'wait',
    icon: '…',
    title: 'To‘lov tekshirilmoqda',
    text: 'Tasdiqlangach Telegram chatga xabar keladi. Ilovani yopishingiz mumkin.',
  },
  cancelled: {
    tone: 'warn',
    icon: '!',
    title: 'To‘lov bekor qilindi',
    text: 'Buyurtma saqlandi. Qulay usulni tanlab to‘lang.',
  },
  failed: {
    tone: 'warn',
    icon: '!',
    title: 'To‘lov o‘tmadi',
    text: 'Pul yechilmadi. Boshqa usul bilan urinib ko‘ring.',
  },
};

function Receipt({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const count = items.reduce((sum, item) => sum + (item.qty || 0), 0);

  return (
    <div className="receipt">
      <div className="receipt-row">
        <span>Buyurtma</span>
        <b>№{order.id}</b>
      </div>
      <div className="receipt-row">
        <span>Mahsulotlar</span>
        <b>{count} ta</b>
      </div>
      <div className="receipt-row">
        <span>To‘lov</span>
        <b>{PAYMENT_LABEL[order.paymentMethod] || 'Naqd'}</b>
      </div>
      <div className="receipt-row total">
        <span>Jami</span>
        <b>{money(order.total)}</b>
      </div>
    </div>
  );
}

export default function PaymentStatus({ payment, methods, onRetry, onHome, onOrders }) {
  const { state, order, message, busy } = payment;

  if (state === 'processing') {
    return (
      <div className="status-screen">
        <div className="spinner" />
        <p className="muted">To‘lov oynasi ochilmoqda…</p>
      </div>
    );
  }

  const copy = COPY[state] || COPY.failed;
  const done = copy.tone !== 'warn';
  // Kartadan voz kechgan odamga avval boshqa karta, naqd - oxirida
  const retry = done
    ? []
    : methods
        .filter((option) => availability(option, order.total).ok)
        .sort((a, b) => Number(b.card) - Number(a.card));

  return (
    <div className="status-screen">
      <div className={`status-icon ${copy.tone}`}>
        <span>{copy.icon}</span>
      </div>

      <h2>{copy.title}</h2>
      <p className="status-text">{message || copy.text}</p>

      <Receipt order={order} />

      {done ? (
        <div className="status-actions">
          <button className="btn" onClick={onOrders}>
            Buyurtmalarim
          </button>
          <button className="btn btn-ghost" onClick={onHome}>
            Bosh sahifa
          </button>
        </div>
      ) : (
        <div className="status-actions">
          {retry.map((option) => (
            <button
              key={option.id}
              className={`btn ${option.card ? `btn-${option.id.toLowerCase()}` : 'btn-ghost'}`}
              disabled={busy}
              onClick={() => onRetry(option.id)}
            >
              {option.card ? `${option.title} orqali to‘lash` : 'Naqd to‘layman'}
            </button>
          ))}

          <button className="link-btn" disabled={busy} onClick={onOrders}>
            Keyinroq to‘layman
          </button>
        </div>
      )}
    </div>
  );
}
