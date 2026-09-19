/**
 * Tashqi paketsiz oddiy urinishlar cheklovichi.
 * Ariza yuborish endpoint'ini spamdan himoya qiladi.
 *
 * Eslatma: xotirada saqlanadi, ya'ni bir nechta instansiyada har biri o'zicha
 * sanaydi. Bitta Render/Railway instansiyasi uchun yetarli.
 */
const buckets = new Map();

function sweep(now, windowMs) {
  for (const [key, entry] of buckets) {
    if (now - entry.start > windowMs) buckets.delete(key);
  }
}

export function rateLimit({ windowMs = 60 * 1000, max = 20, message, keyBy } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyBy ? keyBy(req) : req.ip || req.socket?.remoteAddress || 'unknown';

    if (buckets.size > 5000) sweep(now, windowMs);

    let entry = buckets.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      buckets.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const waitSeconds = Math.ceil((windowMs - (now - entry.start)) / 1000);

      return res.status(429).json({
        ok: false,
        message: message || `Juda ko‘p urinish. ${waitSeconds} soniyadan keyin qayta urinib ko‘ring.`,
      });
    }

    next();
  };
}

export default rateLimit;
