/** Kategoriya bo'yicha emoji — rasm yuklanmaganda o'rniga ko'rsatiladi */
const BY_CATEGORY = {
  Bulochka: '\u{1F96F}',
  Kruassan: '\u{1F950}',
  Shirinlik: '\u{1F370}',
  Pechenye: '\u{1F36A}',
};

const DEFAULT_EMOJI = '\u{1F968}';

export function categoryEmoji(category) {
  return BY_CATEGORY[category] || DEFAULT_EMOJI;
}

export default categoryEmoji;
