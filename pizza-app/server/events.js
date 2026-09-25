// Server-Sent Events: buyurtma holati va Davra o'zgarishlari Mini App'ga
// shu kanal orqali darhol yetib boradi (sahifani yangilash shart emas).

const HEARTBEAT_MS = 25_000;

export function createEventHub() {
  const clients = new Map(); // userId -> Set<res>

  function send(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const heartbeat = setInterval(() => {
    for (const set of clients.values()) {
      for (const res of set) res.write(': ping\n\n');
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return {
    /** Express handler: GET /api/stream */
    handler(req, res) {
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // nginx / proxy bufferlamasin
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      res.write('retry: 3000\n\n');

      const userId = req.user.id;
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(res);

      send(res, 'hello', { userId });

      req.on('close', () => {
        const set = clients.get(userId);
        if (!set) return;
        set.delete(res);
        if (set.size === 0) clients.delete(userId);
      });
    },

    publish(userIds, event, data) {
      for (const id of new Set(userIds)) {
        const set = clients.get(id);
        if (!set) continue;
        for (const res of set) send(res, event, data);
      }
    },

    broadcast(event, data) {
      for (const set of clients.values()) {
        for (const res of set) send(res, event, data);
      }
    },

    size() {
      let total = 0;
      for (const set of clients.values()) total += set.size;
      return total;
    },

    close() {
      clearInterval(heartbeat);
      for (const set of clients.values()) {
        for (const res of set) res.end();
      }
      clients.clear();
    },
  };
}
