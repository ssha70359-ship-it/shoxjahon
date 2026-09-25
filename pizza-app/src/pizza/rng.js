// Takrorlanadigan tasodifiy sonlar: bir xil kalit — har doim bir xil natija.
// Shu tufayli masalliqlar har ochilganda o'sha joyda turadi va yangi
// masalliq qo'shilganda eskilari "sakramaydi".

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seeded = (key) => mulberry32(hashString(key));

/** Silliq, biroz notekis doira (qo'lda yoyilgan xamir kabi) */
export function blobPath(cx, cy, radius, rand, { points = 18, wobble = 0.025 } = {}) {
  const coords = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const r = radius * (1 + (rand() - 0.5) * 2 * wobble);
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  // Catmull-Rom → kubik Bezier
  const n = coords.length;
  let d = `M${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = coords[(i - 1 + n) % n];
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];
    const p3 = coords[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

/**
 * Doira (yoki yarim doira) ichida bir-biriga juda yopishmagan nuqtalar.
 * side: 0 — butun, -1 — chap yarmi, 1 — o'ng yarmi
 */
export function scatter(rand, count, { radius, minDist, side = 0, margin = 0, cx = 100, cy = 100 }) {
  const points = [];
  const minSq = minDist * minDist;

  for (let i = 0; i < count; i += 1) {
    let best = null;
    let bestScore = -1;

    // Bir nechta nomzoddan eng bo'sh joydagisini olamiz — tekisroq taqsimot
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (side !== 0 && (x - cx) * side < margin) continue;

      let nearest = Infinity;
      for (const p of points) {
        const dsq = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (dsq < nearest) nearest = dsq;
      }

      if (nearest >= minSq) {
        best = { x, y };
        break;
      }
      if (nearest > bestScore) {
        bestScore = nearest;
        best = { x, y };
      }
    }

    if (best) points.push({ ...best, rot: rand() * 360, s: 0.85 + rand() * 0.3, k: rand() });
  }

  return points;
}
