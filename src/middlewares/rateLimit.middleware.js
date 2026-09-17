/**
 * Oddiy urinishlar cheklovichi (rate limit).
 * Admin panel internetga ochiq bo'lganda parolni birma-bir terib topishga
 * urinishlarni to'xtatadi. Tashqi paket kerak emas.
 */
const buckets = new Map();

/** Eskirgan yozuvlarni tozalab turadi (xotira to'lib ketmasligi uchun) */
function sweep(now, windowMs) {
  for (const [key, entry] of buckets) {
    if (now - entry.start > windowMs) buckets.delete(key);
  }
}

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 8, message } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';

    if (buckets.size > 1000) sweep(now, windowMs);

    let entry = buckets.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      buckets.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const waitMinutes = Math.ceil((windowMs - (now - entry.start)) / 60000);

      return res.status(429).json({
        ok: false,
        message:
          message || `Juda ko‘p urinish. ${waitMinutes} daqiqadan keyin qayta urinib ko‘ring.`,
      });
    }

    next();
  };
}

/** Muvaffaqiyatli kirishdan keyin hisobni nolga qaytaradi */
export function resetRateLimit(req) {
  buckets.delete(req.ip || req.socket?.remoteAddress || 'unknown');
}

export default rateLimit;
