// Zod sxemalari: tashqaridan keladigan har qanday ma'lumot (API so'rovi,
// saqlangan savat) shu yerda tekshiriladi. Server ham, Mini App ham ishlatadi.

import { z } from 'zod';

import { ITEMS, PIZZAS, TOPPINGS } from './menu.js';

export const LIMITS = {
  maxQty: 20,
  maxLines: 30,
  maxExtras: 8,
} as const;

type NonEmpty = [string, ...string[]];
const oneOf = (ids: string[]) => z.enum(ids as NonEmpty);

export const langSchema = z.enum(['uz', 'ru']);
export const sizeSchema = z.enum(['S', 'M', 'L']);
export const crustSchema = z.enum(['classic', 'thin', 'cheese']);
export const sauceSchema = z.enum(['tomato', 'cream', 'bbq', 'pesto']);
export const modeSchema = z.enum(['delivery', 'pickup']);
export const paymentSchema = z.enum(['cash', 'card', 'online']);

// --- Savatcha qatori -------------------------------------------------------

export const pizzaPartSchema = z.object({
  pizzaId: oneOf(PIZZAS.map((pizza) => pizza.id)),
  sauce: sauceSchema.optional(),
  removed: z.array(z.string().max(32)).max(20).default([]),
  extras: z
    .array(oneOf(TOPPINGS.map((topping) => topping.id)))
    .max(LIMITS.maxExtras * 2)
    .default([]),
});

export const pizzaConfigSchema = z.object({
  kind: z.literal('pizza'),
  size: sizeSchema,
  crust: crustSchema.default('classic'),
  parts: z.array(pizzaPartSchema).min(1).max(2),
});

export const itemConfigSchema = z.object({
  kind: z.literal('item'),
  itemId: oneOf(ITEMS.map((item) => item.id)),
});

export const lineConfigSchema = z.discriminatedUnion('kind', [pizzaConfigSchema, itemConfigSchema]);

export const qtySchema = z.number().int().min(1).max(LIMITS.maxQty);

export const cartLineSchema = z.object({
  config: lineConfigSchema,
  qty: qtySchema,
});

export const cartSchema = z.array(cartLineSchema).min(1, 'empty_cart').max(LIMITS.maxLines);

export type RawLineConfig = z.input<typeof lineConfigSchema>;
export type ParsedLineConfig = z.output<typeof lineConfigSchema>;

// --- Buyurtma ----------------------------------------------------------------

// Boshqaruv belgilari (yangi qator, tab va h.k.) matnni buzmasin
// eslint-disable-next-line no-control-regex -- aynan boshqaruv belgilarini qidiramiz
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

const cleanText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((value) => value.replace(CONTROL_CHARS, ' ').trim().slice(0, max));

/** +998 90 123 45 67 → +998901234567. Noto'g'ri bo'lsa null */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export const phoneSchema = z
  .string()
  .max(32)
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'phone_required' });
      return z.NEVER;
    }
    return phone;
  });

export const addressSchema = z.object({
  text: cleanText(200).refine((value) => value.length >= 3, 'address_required'),
  entrance: cleanText(12).default(''),
  floor: cleanText(12).default(''),
  apartment: cleanText(12).default(''),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const groupCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'group_not_found');

export const createOrderSchema = z
  .object({
    mode: modeSchema,
    payment: paymentSchema,
    phone: phoneSchema,
    comment: cleanText(300).default(''),
    useReward: z.boolean().default(false),
    groupCode: groupCodeSchema.optional(),
    items: cartSchema.optional(),
    address: addressSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'delivery' && !value.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'address_required' });
    }
    if (!value.groupCode && !value.items) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'empty_cart' });
    }
  });

export type CreateOrderInput = z.output<typeof createOrderSchema>;

// --- Boshqa so'rovlar ------------------------------------------------------

export const updateMeSchema = z.object({ language: langSchema });

export const addGroupItemSchema = z.object({
  config: lineConfigSchema,
  qty: qtySchema.default(1),
});

export const updateGroupItemSchema = z.object({
  qty: z.number().int().min(0).max(LIMITS.maxQty),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const codeParamSchema = z.object({ code: groupCodeSchema });
export const itemParamSchema = z.object({ code: groupCodeSchema, id: z.coerce.number().int().positive() });
