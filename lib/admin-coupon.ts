import * as z from 'zod';

/**
 * Server-side validation schema for admin coupon create/update payloads.
 */
export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .max(32, 'Code must be at most 32 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, - and _')
      .transform((v) => v.toUpperCase()),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.coerce.number().positive('Value must be greater than 0'),
    minimumOrder: z.coerce.number().min(0).optional().nullable(),
    maximumDiscount: z.coerce.number().min(0).optional().nullable(),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    perCustomerLimit: z.coerce.number().int().min(1).optional().nullable(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    active: z.boolean().default(true),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: 'Expiry must be after start date',
    path: ['endAt'],
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue'],
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

/** Converts nullable optional numbers to `undefined` so Mongo unsets them cleanly. */
export function toCouponDocument(input: CouponInput) {
  return {
    code: input.code,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minimumOrder: input.minimumOrder ?? undefined,
    maximumDiscount: input.maximumDiscount ?? undefined,
    usageLimit: input.usageLimit ?? undefined,
    perCustomerLimit: input.perCustomerLimit ?? undefined,
    startAt: input.startAt,
    endAt: input.endAt,
    active: input.active,
  };
}
