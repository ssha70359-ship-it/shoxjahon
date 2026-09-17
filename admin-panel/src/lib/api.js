const BASE = import.meta.env.VITE_API_URL || '';
const KEY = 'pz_admin_password';

export function getPassword() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setPassword(password) {
  try {
    localStorage.setItem(KEY, password);
  } catch {
    /* localStorage yopiq */
  }
}

export function clearPassword() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* localStorage yopiq */
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': getPassword(),
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
    const error = new Error(payload?.message || 'Server bilan bog‘lanib bo‘lmadi');
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  login: (password) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'x-admin-password': password },
    }),

  stats: () => request('/stats').then((r) => r.data),

  orders: (status) => request(`/orders${status ? `?status=${status}` : ''}`).then((r) => r.data),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  products: () => request('/products').then((r) => r.data),
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
};

export default api;
