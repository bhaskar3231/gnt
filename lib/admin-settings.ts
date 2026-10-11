import * as z from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), 'Must be an https:// URL');

/**
 * Shared validation schema for the admin Site Settings form and API.
 * `brandName` is the store name shown across the storefront.
 */
export const siteSettingsSchema = z.object({
  brandName: z.string().trim().min(1, 'Store name is required').max(100),
  logo: optionalUrl,
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email'),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === '' || /^[+\d][\d\s()-]{5,}$/.test(v), 'Invalid phone number'),
  address: z.string().trim().max(500),
  socialLinks: z.object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    twitter: optionalUrl,
    youtube: optionalUrl,
  }),
  announcementBar: z.object({
    text: z.string().trim().max(300),
    isActive: z.boolean(),
    bgColor: z
      .string()
      .trim()
      .refine((v) => v === '' || /^#[0-9a-fA-F]{6}$/.test(v), 'Must be a hex color like #1f2937'),
  }),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
