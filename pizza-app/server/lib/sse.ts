// Server-Sent Events: buyurtma holati va Davra o'zgarishlari Mini App'ga
// shu kanal orqali darhol yetib boradi (sahifani yangilash shart emas).

import type { Request, Response } from 'express';

const HEARTBEAT_MS = 25_000;

export class SseHub {
  private readonly clients = new Map<number, Set<Response>>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor() {
    this.heartbeat = setInterval(() => this.forEach((res) => res.write(': ping\n\n')), HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  connect(req: Request, res: Response, userId: number): void {
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // nginx / proxy bufferlamasin
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    let set = this.clients.get(userId);
    if (!set) {
      set = new Set();
      this.clients.set(userId, set);
    }
    set.add(res);
    SseHub.send(res, 'hello', { userId });

    req.on('close', () => {
      set.delete(res);
      if (set.size === 0) this.clients.delete(userId);
    });
  }

  publish(userIds: Iterable<number>, event: string, data: unknown): void {
    for (const id of new Set(userIds)) {
      for (const res of this.clients.get(id) ?? []) SseHub.send(res, event, data);
    }
  }

  broadcast(event: string, data: unknown): void {
    this.forEach((res) => SseHub.send(res, event, data));
  }

  size(): number {
    let total = 0;
    for (const set of this.clients.values()) total += set.size;
    return total;
  }

  close(): void {
    clearInterval(this.heartbeat);
    this.forEach((res) => res.end());
    this.clients.clear();
  }

  private forEach(fn: (res: Response) => void): void {
    for (const set of this.clients.values()) for (const res of set) fn(res);
  }

  private static send(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
