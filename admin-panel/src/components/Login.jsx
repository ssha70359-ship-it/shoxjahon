import { useState } from 'react';
import api, { setPassword } from '../lib/api.js';

export default function Login({ onSuccess }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await api.login(value);
      setPassword(value);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={submit}>
        <div className="logo">{'\u{1F355}'}</div>
        <h1>Admin Panel</h1>
        <p>Davom etish uchun parolni kiriting</p>

        {error && <div className="error">{error}</div>}

        <div className="form-row">
          <input
            className="input"
            type="password"
            placeholder="Parol"
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
          />
        </div>

        <button className="btn btn-block" type="submit" disabled={busy || !value}>
          {busy ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
