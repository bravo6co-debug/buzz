import { z } from 'zod';

// Common validation schemas
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
});

export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const phoneSchema = z.string().regex(/^[\d-+\s()]+$/, 'Invalid phone number format');

export const emailSchema = z.string().email('Invalid email format');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Response schemas
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.any().optional()
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional()
});

export const apiResponseSchema = z.union([successResponseSchema, errorResponseSchema]);

// Utility functions
export const createSuccessResponse = <T>(data?: T, message?: string) => ({
  success: true as const,
  ...(data !== undefined && { data }),
  ...(message && { message })
});

export const createErrorResponse = (error: string, details?: any) => ({
  success: false as const,
  error,
  ...(details && { details })
});