/** Vaqt muhri bilan oddiy log. Productionda Render/Railway loglarida ko'rinadi. */
function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export const logger = {
  info: (...args) => console.log(`[${stamp()}]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] ⚠️ `, ...args),
  error: (...args) => console.error(`[${stamp()}] ❌`, ...args),

  /** To'lov oqimini alohida belgilab boradi - nizo bo'lsa tarixni tiklash oson */
  payment: (...args) => console.log(`[${stamp()}] \u{1F4B3}`, ...args),
};

export default logger;
