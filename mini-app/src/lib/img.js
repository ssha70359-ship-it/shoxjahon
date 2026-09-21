const BASE = import.meta.env.VITE_API_URL || '';

/**
 * Mahsulot rasmining to'liq manzili.
 * Bazada nisbiy yo'l saqlanadi (`/products/simit.jpg`) — u backenddan keladi.
 * Tashqi (http...) manzillar o'zgarishsiz qaytariladi.
 */
export function imgUrl(src) {
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  return `${BASE}${src.startsWith('/') ? '' : '/'}${src}`;
}

export default imgUrl;
