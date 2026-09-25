// Oddiy xotiradagi cheklovchi: bitta foydalanuvchi bir daqiqada
// belgilangan sondan ko'p so'rov yubora olmaydi.

export function rateLimit({ windowMs = 60_000, max = 20, key = (req) => req.user?.id ?? req.ip } = {}) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const border = Date.now() - windowMs;
    for (const [id, times] of hits) {
      const fresh = times.filter((t) => t > border);
      if (fresh.length) hits.set(id, fresh);
      else hits.delete(id);
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const id = key(req);
    const time = Date.now();
    const times = (hits.get(id) || []).filter((t) => t > time - windowMs);

    if (times.length >= max) {
      return res.status(429).json({ ok: false, error: 'too_many_requests' });
    }

    times.push(time);
    hits.set(id, times);
    next();
  };
}
