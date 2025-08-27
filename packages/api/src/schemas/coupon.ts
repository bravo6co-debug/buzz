import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     CouponVerifyRequest:
 *       type: object
 *       required:
 *         - qrData
 *       properties:
 *         qrData:
 *           type: string
 *           description: QR 코드에서 읽은 데이터
 *           example: "COUPON:123:1641234567890:abc123def456"
 *     
 *     CouponUseRequest:
 *       type: object
 *       required:
 *         - couponId
 *         - businessId
 *       properties:
 *         couponId:
 *           type: number
 *           description: 쿠폰 ID
 *         businessId:
 *           type: number
 *           description: 매장 ID
 *         orderAmount:
 *           type: number
 *           description: 주문 금액 (이벤트 쿠폰의 경우 할인 계산용)
 *       example:
 *         couponId: 123
 *         businessId: 456
 *         orderAmount: 15000
 *     
 *     CouponResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             coupons:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   couponType:
 *                     type: string
 *                     enum: [basic, event, mileage_qr]
 *                   discountType:
 *                     type: string
 *                     enum: [amount, percentage]
 *                   discountValue:
 *                     type: number
 *                   isUsed:
 *                     type: boolean
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *                   qrData:
 *                     type: string
 *                   qrImage:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *     
 *     CouponVerifyResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             valid:
 *               type: boolean
 *             coupon:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 couponType:
 *                   type: string
 *                 discountType:
 *                   type: string
 *                 discountValue:
 *                   type: number
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *             reason:
 *               type: string
 *               description: 유효하지 않은 경우 이유
 */

export const couponVerifySchema = z.object({
  qrData: z.string().min(1, 'QR data is required')
});

export const couponUseSchema = z.object({
  couponId: z.number().positive('Coupon ID must be positive'),
  businessId: z.number().positive('Business ID must be positive'),
  orderAmount: z.number().positive('Order amount must be positive').optional()
});

export const couponCreateSchema = z.object({
  userId: z.number().positive('User ID must be positive'),
  couponType: z.enum(['basic', 'event'], 'Invalid coupon type'),
  discountType: z.enum(['amount', 'percentage'], 'Invalid discount type'),
  discountValue: z.number().positive('Discount value must be positive'),
  expiresAt: z.string().datetime('Invalid expiration date').optional()
});

export type CouponVerifyRequest = z.infer<typeof couponVerifySchema>;
export type CouponUseRequest = z.infer<typeof couponUseSchema>;
export type CouponCreateRequest = z.infer<typeof couponCreateSchema>;