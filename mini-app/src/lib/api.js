import { getInitData } from './telegram.js';

const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}/api/client${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
      'ngrok-skip-browser-warning': 'true',
      ...options.headers,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || 'Server bilan bog‘lanib bo‘lmadi');
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
  savePhone: (phone) => request('/phone', { method: 'POST', body: JSON.stringify({ phone }) }),
};

export default api;
