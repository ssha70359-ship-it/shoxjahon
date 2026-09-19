/** Foydalanuvchi xatosi - error.middleware uni 400 qilib qaytaradi */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

/** Topilmadi - error.middleware uni 404 qilib qaytaradi */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

/** Ko'rinmas belgilar va ortiqcha bo'shliqlarni tozalaydi */
export function cleanText(value, { field, min = 1, max = 500 } = {}) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < min) throw new ValidationError(`"${field}" maydoni to‘ldirilmagan`);
  if (text.length > max) throw new ValidationError(`"${field}" juda uzun (${max} belgidan oshmasin)`);

  return text;
}

/**
 * O'zbekiston raqamini bir xil ko'rinishga keltiradi: +998901234567
 * Kiritish shakli muhim emas: "90 123 45 67", "998901234567", "+998 (90) 123-45-67"
 */
export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  const national = digits.startsWith('998') ? digits.slice(3) : digits;

  if (national.length !== 9) {
    throw new ValidationError('Telefon raqam noto‘g‘ri. Namuna: +998 90 123 45 67');
  }

  return `+998${national}`;
}

/** Musbat butun son (ID, sahifa raqami va h.k.) */
export function toPositiveInt(value, { field = 'id' } = {}) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ValidationError(`"${field}" noto‘g‘ri`);
  }

  return number;
}

export default { ValidationError, NotFoundError, cleanText, normalizePhone, toPositiveInt };
