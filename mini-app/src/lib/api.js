import { getInitData } from './telegram.js';

const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE}/api/client${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': getInitData(),
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    });
  } catch {
    // So'rov umuman bormadi: internet yo'q yoki server (kompyuter) o'chiq
    throw new Error('Internet yoki server bilan aloqa yo‘q. Birozdan so‘ng qayta urinib ko‘ring.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    if (payload?.message) throw new Error(payload.message);

    // JSON emas - server emas, oradagi tunnel/proxy javob berdi
    throw new Error(
      response.status >= 500
        ? `Server vaqtincha javob bermayapti (xato ${response.status}). Qayta urinib ko‘ring.`
        : `Server bilan bog‘lanib bo‘lmadi (xato ${response.status}).`,
    );
  }

  return payload.data;
}

export const api = {
  getMe: () => request('/me'),
  getProducts: () => request('/products'),
  getMyOrders: () => request('/orders'),
  createOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  payOrder: (id, method) =>
    request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify({ method }) }),
  geocode: (lat, lng) => request(`/geocode?lat=${lat}&lng=${lng}`),
  savePhone: (phone) => request('/phone', { method: 'POST', body: JSON.stringify({ phone }) }),
};

export default api;
