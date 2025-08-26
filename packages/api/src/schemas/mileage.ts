import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     MileageUseRequest:
 *       type: object
 *       required:
 *         - userId
 *         - amount
 *         - businessId
 *       properties:
 *         userId:
 *           type: number
 *           description: 사용자 ID
 *         amount:
 *           type: number
 *           minimum: 100
 *           description: 사용할 마일리지 (최소 100원)
 *         businessId:
 *           type: number
 *           description: 매장 ID
 *         description:
 *           type: string
 *           maxLength: 200
 *           description: 사용 내역 설명 (선택)
 *       example:
 *         userId: 123
 *         amount: 2000
 *         businessId: 456
 *         description: "치킨 주문 시 마일리지 사용"
 *     
 *     MileageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             balance:
 *               type: number
 *               example: 5500
 *             transactions:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   transactionType:
 *                     type: string
 *                     enum: [earn, use, admin_adjust]
 *                   amount:
 *                     type: number
 *                   description:
 *                     type: string
 *                   referenceType:
 *                     type: string
 *                   businessName:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *               example:
 *                 - id: 1
 *                   transactionType: "use"
 *                   amount: -2000
 *                   description: "치킨집에서 마일리지 사용"
 *                   referenceType: "mileage_use"
 *                   businessName: "맛있는 치킨집"
 *                   createdAt: "2024-01-15T10:30:00Z"
 *                 - id: 2
 *                   transactionType: "earn"
 *                   amount: 500
 *                   description: "리퍼럴 추천 보상"
 *                   referenceType: "referral"
 *                   businessName: null
 *                   createdAt: "2024-01-10T14:20:00Z"
 *     
 *     QRDataResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             qrData:
 *               type: string
 *               example: "MILEAGE:123:1641234567890:abc123def456"
 *             balance:
 *               type: number
 *               example: 5500
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T11:00:00Z"
 *             qrImage:
 *               type: string
 *               description: Base64 encoded QR code image
 */

export const mileageUseSchema = z.object({
  userId: z.number().positive('User ID must be positive'),
  amount: z.number().min(100, 'Minimum mileage use is 100 points').max(50000, 'Maximum mileage use is 50,000 points'),
  businessId: z.number().positive('Business ID must be positive'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional()
});

export const adminAdjustSchema = z.object({
  userId: z.number().positive('User ID must be positive'),
  amount: z.number().refine(val => val !== 0, 'Amount cannot be zero'),
  description: z.string().min(1, 'Description is required').max(200, 'Description cannot exceed 200 characters'),
  reason: z.enum(['bonus', 'penalty', 'correction', 'event', 'refund'])
});

export type MileageUseRequest = z.infer<typeof mileageUseSchema>;
export type AdminAdjustRequest = z.infer<typeof adminAdjustSchema>;