/** Joriy vaqt (ms). Testlarda boshqarish uchun servislarga tashqaridan beriladi. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
