import { z } from 'zod';

/**
 * QR Code validation schemas
 * Ensures proper input validation for QR operations
 */

// QR data validation
export const qrDataSchema = z.object({
  type: z.enum(['MILEAGE', 'COUPON', 'EVENT', 'CUSTOM']),
  userId: z.number().positive().optional(),
  businessId: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  couponId: z.number().positive().optional(),
  data: z.string().min(1).max(1000).optional(),
});

// QR scan validation
export const qrScanSchema = z.object({
  qrData: z.string()
    .min(1, 'QR data is required')
    .max(2000, 'QR data too long'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount exceeds maximum')
    .optional(),
  businessId: z.number()
    .positive('Invalid business ID')
    .optional(),
  metadata: z.object({
    deviceId: z.string().optional(),
    location: z.object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }).optional(),
    timestamp: z.string().datetime().optional(),
  }).optional(),
});

// QR generation validation
export const qrGenerateSchema = z.object({
  data: z.string()
    .min(1, 'Data is required')
    .max(1000, 'Data too long'),
  size: z.number()
    .min(100)
    .max(1000)
    .default(256),
  margin: z.number()
    .min(0)
    .max(10)
    .default(2),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H'])
    .default('M'),
});

// Mileage QR validation
export const mileageQrSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .multipleOf(100, 'Amount must be in multiples of 100')
    .max(100000, 'Amount exceeds maximum'),
  pin: z.string()
    .length(4, 'PIN must be 4 digits')
    .regex(/^\d{4}$/, 'PIN must be numeric')
    .optional(),
});

// Coupon QR validation
export const couponQrSchema = z.object({
  couponId: z.number()
    .positive('Invalid coupon ID'),
  verificationCode: z.string()
    .min(6)
    .max(20)
    .optional(),
});

// Token validation for secure QR codes
export const qrTokenSchema = z.object({
  token: z.string()
    .min(20, 'Invalid token')
    .max(500, 'Token too long'),
  signature: z.string()
    .min(40, 'Invalid signature')
    .max(200, 'Signature too long')
    .optional(),
});

// Batch QR generation
export const batchQrSchema = z.object({
  count: z.number()
    .positive()
    .max(100, 'Cannot generate more than 100 QR codes at once'),
  type: z.enum(['coupon', 'event', 'promotion']),
  metadata: z.record(z.any()).optional(),
});

// QR verification response
export const qrVerifyResponseSchema = z.object({
  valid: z.boolean(),
  expired: z.boolean().optional(),
  used: z.boolean().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type QRDataInput = z.infer<typeof qrDataSchema>;
export type QRScanInput = z.infer<typeof qrScanSchema>;
export type QRGenerateInput = z.infer<typeof qrGenerateSchema>;
export type MileageQRInput = z.infer<typeof mileageQrSchema>;
export type CouponQRInput = z.infer<typeof couponQrSchema>;
export type QRTokenInput = z.infer<typeof qrTokenSchema>;
export type BatchQRInput = z.infer<typeof batchQrSchema>;
export type QRVerifyResponse = z.infer<typeof qrVerifyResponseSchema>;