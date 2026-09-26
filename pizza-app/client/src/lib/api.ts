// Backend API mijozi. Javob turlari shared/types.ts dagi DTO lar bilan bir xil.

import type {
  ApiFailure,
  BootstrapDto,
  CartLine,
  GroupDto,
  GroupShareDto,
  Lang,
  LineConfig,
  OrderDto,
  UserDto,
} from '@shared/types';

import { initData } from './telegram';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

// Brauzerda sinash: ?dev=2 — ikkinchi soxta foydalanuvchi (Davrani ikki oynada sinash uchun)
function devUser(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('dev');
    if (fromUrl) sessionStorage.setItem('pz_dev', fromUrl);
    return sessionStorage.getItem('pz_dev') ?? '';
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'x-telegram-init-data': initData() };
  const dev = devUser();
  if (dev) headers['x-dev-user'] = dev;
  if (body !== undefined) headers['content-type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0);
  }

  const payload = (await response.json().catch(() => null)) as (T & { ok: true }) | ApiFailure | null;
  if (!response.ok || !payload || payload.ok !== true) {
    throw new ApiError((payload as ApiFailure | null)?.error ?? 'server_error', response.status);
  }
  return payload;
}

export interface CreateOrderPayload {
  mode: 'delivery' | 'pickup';
  phone: string;
  payment: 'cash' | 'card' | 'online';
  comment: string;
  useReward: boolean;
  groupCode?: string;
  items?: CartLine[];
  address?: { text: string; entrance: string; floor: string; apartment: string; lat?: number; lng?: number };
}

export const api = {
  bootstrap: () => request<BootstrapDto>('GET', '/bootstrap'),
  updateMe: (patch: { language: Lang }) => request<{ user: UserDto }>('PATCH', '/me', patch),

  reverseGeocode: (lat: number, lng: number) =>
    request<{ text: string | null }>('GET', `/geocode/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`),

  orders: () => request<{ orders: OrderDto[] }>('GET', '/orders'),
  order: (id: number) => request<{ order: OrderDto }>('GET', `/orders/${id}`),
  createOrder: (payload: CreateOrderPayload) =>
    request<{ order: OrderDto; invoiceUrl: string | null }>('POST', '/orders', payload),
  cancelOrder: (id: number) => request<{ order: OrderDto }>('POST', `/orders/${id}/cancel`),
  invoice: (id: number) => request<{ invoiceUrl: string }>('POST', `/orders/${id}/invoice`),
  payCash: (id: number) => request<{ order: OrderDto }>('POST', `/orders/${id}/cash`),

  createGroup: () => request<{ group: GroupDto }>('POST', '/groups'),
  group: (code: string) => request<{ group: GroupDto }>('GET', `/groups/${code}`),
  joinGroup: (code: string) => request<{ group: GroupDto }>('POST', `/groups/${code}/join`),
  leaveGroup: (code: string) => request<object>('POST', `/groups/${code}/leave`),
  addGroupItem: (code: string, config: LineConfig, qty = 1) =>
    request<{ group: GroupDto }>('POST', `/groups/${code}/items`, { config, qty }),
  updateGroupItem: (code: string, id: number, qty: number) =>
    request<{ group: GroupDto }>('PATCH', `/groups/${code}/items/${id}`, { qty }),
  shareGroup: (code: string) => request<GroupShareDto>('POST', `/groups/${code}/share`),

  streamUrl(): string {
    const params = new URLSearchParams();
    const data = initData();
    if (data) params.set('auth', data);
    const dev = devUser();
    if (dev) params.set('dev', dev);
    return `${BASE}/api/stream?${params}`;
  },
};

export default api;
