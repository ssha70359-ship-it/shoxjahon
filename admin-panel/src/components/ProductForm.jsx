import { useState } from 'react';

import { imgUrl } from '../lib/img.js';

const EMPTY = {
  name: '',
  description: '',
  imageUrl: '',
  oldPrice: '',
  newPrice: '',
  category: '',
  isActive: true,
};

export default function ProductForm({ product, onClose, onSave }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name || '',
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          oldPrice: product.oldPrice ?? '',
          newPrice: product.newPrice ?? '',
          category: product.category || '',
          isActive: product.isActive,
        }
      : EMPTY,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.newPrice || !form.category.trim()) {
      setError('Nomi, yangi narxi va kategoriyasi majburiy');
      return;
    }

    setBusy(true);
    setError('');

    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
        newPrice: Number(form.newPrice),
        category: form.category.trim(),
        isActive: form.isActive,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <h3>{product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>

        {error && <div className="error">{error}</div>}

        <div className="form-row">
          <label>Nomi *</label>
          <input
            className="input"
            value={form.name}
            autoFocus
            onChange={(event) => set('name', event.target.value)}
            placeholder="Margarita"
          />
        </div>

        <div className="form-row">
          <label>Tarkibi (vergul bilan ajrating)</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Pomidor sousi, Mozzarella pishlog'i, Rayhon"
          />
        </div>

        <div className="form-row">
          <label>Rasm URL</label>
          <input
            className="input"
            value={form.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            placeholder="https://..."
          />
        </div>

        {form.imageUrl && (
          <div className="form-row">
            <img
              src={imgUrl(form.imageUrl)}
              alt="Ko'rinish"
              style={{ width: 90, height: 90, borderRadius: 12, objectFit: 'cover' }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="form-grid">
          <div className="form-row">
            <label>Eski narx (so&#8216;m)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.oldPrice}
              onChange={(event) => set('oldPrice', event.target.value)}
              placeholder="45000"
            />
          </div>

          <div className="form-row">
            <label>Yangi narx (so&#8216;m) *</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.newPrice}
              onChange={(event) => set('newPrice', event.target.value)}
              placeholder="39000"
            />
          </div>
        </div>

        <div className="form-row">
          <label>Kategoriya *</label>
          <input
            className="input"
            value={form.category}
            onChange={(event) => set('category', event.target.value)}
            placeholder="Klassik"
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
          />
          Mini App&#8217;da ko&#8216;rinsin
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
