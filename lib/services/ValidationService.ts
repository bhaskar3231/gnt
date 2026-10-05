/**
 * Validation Service
 * Input validation using Zod
 */

import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  type: z.enum(['GIFT', 'TREAT', 'CHILDREN', 'GENERAL']),
  categoryIds: z.array(z.string()),
  price: z.number().min(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('DRAFT'),
});

export const CreateOrderSchema = z.object({
  customerId: z.string(),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  items: z.array(
    z.object({
      productVariantId: z.string(),
      quantity: z.number().min(1),
      price: z.number().min(0),
    })
  ),
  total: z.number().min(0),
});

export const CreateReviewSchema = z.object({
  productId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().min(1),
  comment: z.string().min(1),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0),
  minimumOrder: z.number().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('India'),
  type: z.enum(['SHIPPING', 'BILLING']),
});

export class ValidationService {
  static validateProduct(data: unknown) {
    return CreateProductSchema.parse(data);
  }

  static validateOrder(data: unknown) {
    return CreateOrderSchema.parse(data);
  }

  static validateReview(data: unknown) {
    return CreateReviewSchema.parse(data);
  }

  static validateCoupon(data: unknown) {
    return CreateCouponSchema.parse(data);
  }

  static validateAddress(data: unknown) {
    return AddressSchema.parse(data);
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }
}