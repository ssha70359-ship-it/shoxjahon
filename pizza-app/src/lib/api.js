import { initData } from './telegram.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Brauzerda sinash: ?dev=2 — ikkinchi soxta foydalanuvchi (Davrani ikki oynada sinash uchun)
function devUser() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('dev');
    if (fromUrl) sessionStorage.setItem('pz_dev', fromUrl);
    return sessionStorage.getItem('pz_dev') || '';
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request(method, path, body) {
  const headers = { 'x-telegram-init-data': initData() };
  const dev = devUser();
  if (dev) headers['x-dev-user'] = dev;
  if (body !== undefined) headers['content-type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // JSON emas — pastda umumiy xato
  }

  if (!response.ok || !payload?.ok) {
    throw new ApiError(payload?.error || 'server_error', response.status);
  }
  return payload;
}

export const api = {
  bootstrap: () => request('GET', '/bootstrap'),
  updateMe: (patch) => request('PATCH', '/me', patch),

  orders: () => request('GET', '/orders'),
  order: (id) => request('GET', `/orders/${id}`),
  createOrder: (payload) => request('POST', '/orders', payload),
  cancelOrder: (id) => request('POST', `/orders/${id}/cancel`),
  invoice: (id) => request('POST', `/orders/${id}/invoice`),
  payCash: (id) => request('POST', `/orders/${id}/cash`),

  createGroup: () => request('POST', '/groups'),
  group: (code) => request('GET', `/groups/${code}`),
  joinGroup: (code) => request('POST', `/groups/${code}/join`),
  leaveGroup: (code) => request('POST', `/groups/${code}/leave`),
  addGroupItem: (code, config, qty = 1) => request('POST', `/groups/${code}/items`, { config, qty }),
  updateGroupItem: (code, id, qty) => request('PATCH', `/groups/${code}/items/${id}`, { qty }),
  shareGroup: (code) => request('POST', `/groups/${code}/share`),

  streamUrl() {
    const params = new URLSearchParams();
    const data = initData();
    if (data) params.set('auth', data);
    const dev = devUser();
    if (dev) params.set('dev', dev);
    return `${BASE}/api/stream?${params}`;
  },
};

export default api;
