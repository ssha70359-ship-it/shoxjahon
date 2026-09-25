// Ilova xatolari. Har bir xatoda mijozga ko'rsatiladigan kod (i18n kaliti) va HTTP status bor.

import { DomainError } from '../../shared/pricing.js';

export { DomainError };

const STATUS_BY_CODE: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_group_member: 403,
  not_group_host: 403,
  order_not_found: 404,
  group_not_found: 404,
  item_not_found: 404,
  not_found: 404,
  too_many_requests: 429,
};

/** HTTP darajasidagi xato: aniq status bilan */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = STATUS_BY_CODE[code] ?? 400, detail?: string) {
    super(detail ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function statusForCode(code: string): number {
  return STATUS_BY_CODE[code] ?? 400;
}
