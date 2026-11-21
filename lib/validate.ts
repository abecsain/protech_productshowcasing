import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
});

export const loginSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(50).trim(),
  password: z.string().min(6).max(200),
});

export const productSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(200, 'Description must be under 200 characters').trim().optional().default(''),
  price: z.number().min(0).max(10_000_000),
  category_id: z.number().int().positive(),
  featured: z.boolean().optional().default(false),
});

export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
});

export const priceToggleSchema = z.object({
  price_visible: z.boolean(),
  auto_off_hours: z.number().min(0).max(8760).optional(), // max 1 year in hours
});

export const settingsSchema = z.object({
  whatsapp_number: z.string().regex(/^\d{10,15}$/, 'Invalid WhatsApp number').optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const productQuerySchema = paginationSchema.extend({
  search: z.string().max(200).trim().optional(),
  category: z.coerce.number().int().positive().optional(),
  featured: z.coerce.boolean().optional(),
});

export const userQuerySchema = paginationSchema.extend({
  search: z.string().max(200).trim().optional(),
});

// Helper: parse + return zod error response
export function zodError(error: z.ZodError) {
  return Response.json(
    { error: 'Validation error', details: error.flatten().fieldErrors },
    { status: 400 }
  );
}
