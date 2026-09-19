import logger from '../utils/logger.js';

/** Prisma xatolarini tushunarli javobga aylantiradi */
const PRISMA_ERRORS = {
  P2025: [404, 'Bunday yozuv topilmadi'],
  P2002: [409, 'Bunday yozuv allaqachon mavjud'],
  P2003: [400, 'Bog‘liq yozuv topilmadi'],
  P2014: [400, 'Yozuvlar orasidagi bog‘liqlik buzilmoqda'],
};

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, message: 'Bunday yo‘l topilmadi' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  // Bizning o'zimiz ko'targan foydalanuvchi xatosi (ValidationError va h.k.)
  if (error?.status && error.status < 500) {
    return res.status(error.status).json({ ok: false, message: error.message });
  }

  const known = PRISMA_ERRORS[error?.code];

  if (known) {
    const [status, message] = known;
    return res.status(status).json({ ok: false, message });
  }

  // Noto'g'ri JSON yuborilgan holat
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ ok: false, message: 'So‘rov formati noto‘g‘ri (JSON)' });
  }

  logger.error('Server xatosi:', error);

  // Ichki tafsilotlar mijozga chiqmaydi
  res.status(500).json({ ok: false, message: 'Ichki server xatosi' });
}

export default { notFoundHandler, errorHandler };
