import { useState } from 'react';
import { money, num, PAYMENT_LABEL } from '../lib/format.js';
import { haptic, requestPhone } from '../lib/telegram.js';
import PaymentOptions, { resolveMethod } from './PaymentOptions.jsx';
import Thumb from './Thumb.jsx';

export default function Cart({
  cart,
  user,
  shop,
  payments = [],
  extraOffer,
  withExtra,
  onToggleExtra,
  onChangeQty,
  onGoCatalog,
  onSubmit,
  submitting,
}) {
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState('');
  const [comment, setComment] = useState('');
  const [coords, setCoords] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = itemsTotal + (withExtra ? extraOffer.price : 0);

  // Serverda yoqilgan usullar. Hech biri kelmasa ham naqd doim bor.
  const options = payments.filter((option) => option.enabled);
  const methodOptions = options.length ? options : [{ id: 'NAQD', title: 'Naqd', subtitle: 'Kuryerga', card: false }];
  const paymentMethod = resolveMethod(methodOptions, selectedMethod, total);
  const isCard = paymentMethod !== 'NAQD';

  async function fillPhoneFromTelegram() {
    haptic();
    const tgPhone = await requestPhone();

    if (tgPhone) setPhone(tgPhone);
    else setError('Raqamni Telegram orqali olib bo\u2018lmadi. Qo\u2018lda kiriting.');
  }

  function detectLocation() {
    haptic();
    setGeoBusy(true);

    if (!navigator.geolocation) {
      setGeoBusy(false);
      setError('Brauzer joylashuvni aniqlay olmadi. Manzilni qo‘lda yozing.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation(
          (current) =>
            current || `Joylashuv: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        );
        setGeoBusy(false);
      },
      () => {
        setGeoBusy(false);
        setError('Joylashuvga ruxsat berilmadi. Manzilni qo‘lda yozing.');
      },
      { timeout: 10000 },
    );
  }

  function submit() {
    setError('');

    if (!phone.trim() || phone.trim().length < 7) {
      setError('Telefon raqamingizni to‘liq kiriting');
      return;
    }

    if (!location.trim() || location.trim().length < 3) {
      setError('Yetkazib berish manzilini kiriting');
      return;
    }

    haptic('medium');

    onSubmit({
      items: cart.map((item) => ({ id: item.id, qty: item.qty })),
      phone: phone.trim(),
      location: location.trim(),
      comment: comment.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      withExtra,
      paymentMethod,
    });
  }

  if (cart.length === 0) {
    return (
      <div className="screen">
        <div className="header">
          <h1>Savatcha</h1>
        </div>
        <div className="empty">
          <div className="emoji">{'\u{1F6D2}'}</div>
          <h3>Savatchangiz bo&#8216;sh</h3>
          <p>Katalogdan o&#8216;zingizga yoqqan mahsulotni tanlang</p>
          <button className="btn" onClick={onGoCatalog}>
            Katalogga o&#8216;tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Savatcha</h1>
      </div>

      <div className="container">
        {cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <Thumb src={item.imageUrl} alt={item.name} category={item.category} />
            <div className="info">
              <b>{item.name}</b>
              <span>{money(item.price * item.qty)}</span>
            </div>
            <div className="qty-mini">
              <button onClick={() => { haptic(); onChangeQty(item.id, item.qty - 1); }}>&minus;</button>
              <span>{item.qty}</span>
              <button onClick={() => { haptic(); onChangeQty(item.id, item.qty + 1); }}>+</button>
            </div>
          </div>
        ))}

        <div className="upsell">
          <p>
            Bunga qo&#8216;shimcha ravishda <b>{extraOffer.name}</b> ni atigi{' '}
            <b>{num(extraOffer.price)} so&#8216;m</b>ga qo&#8216;shasizmi?
          </p>
          <button
            className={`switch ${withExtra ? 'on' : ''}`}
            aria-label="Qo'shimcha taklif"
            onClick={() => {
              haptic();
              onToggleExtra();
            }}
          >
            <i />
          </button>
        </div>

        <div className="section-title">Yetkazib berish ma&#8216;lumotlari</div>

        <div className="field">
          <label>Ismingiz</label>
          <input value={user?.firstName || ''} readOnly />
        </div>

        <div className="field">
          <label>Telefon raqam *</label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <button className="geo-btn" style={{ marginTop: 8 }} onClick={fillPhoneFromTelegram}>
            {'\u{1F4F1} Telegramdagi raqamimni olish'}
          </button>
        </div>

        <div className="field">
          <label>Manzil *</label>
          <textarea
            rows={2}
            placeholder="Ko'cha, uy, kvartira..."
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <div className="field">
          <button className="geo-btn" onClick={detectLocation} disabled={geoBusy}>
            {geoBusy ? 'Aniqlanmoqda...' : '\u{1F4CD} Joylashuvni avtomatik aniqlash'}
          </button>
        </div>

        <div className="field">
          <label>Izoh (ixtiyoriy)</label>
          <textarea
            rows={2}
            placeholder="Masalan: eshik qo'ng'irog'i ishlamaydi"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <div className="section-title">To‘lov usuli</div>

        <PaymentOptions
          options={methodOptions}
          value={paymentMethod}
          total={total}
          onChange={setSelectedMethod}
        />

        <div className="summary">
          <div className="summary-row">
            <span>Mahsulotlar</span>
            <span>{money(itemsTotal)}</span>
          </div>
          {withExtra && (
            <div className="summary-row">
              <span>{extraOffer.name}</span>
              <span>{money(extraOffer.price)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Yetkazib berish</span>
            <span className="muted">{shop ? 'Yandex · alohida' : 'Alohida'}</span>
          </div>
          <div className="summary-row total">
            <span>Jami</span>
            <b>{money(total)}</b>
          </div>
          {shop && <p className="summary-note">{'\u{1F4A1}'} {shop.priceNote}.</p>}
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="checkout-spacer" />
      </div>

      <div className="checkout-bar">
        <button className="btn" onClick={submit} disabled={submitting}>
          {submitting ? (
            'Kuting…'
          ) : (
            <>
              <span>{isCard ? `${PAYMENT_LABEL[paymentMethod]} orqali to‘lash` : 'Buyurtma berish'}</span>
              <span className="btn-sum">{money(total)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
