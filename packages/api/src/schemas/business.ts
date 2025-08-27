import { z } from 'zod';
import { phoneSchema } from './common.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     BusinessListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             businesses:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   businessName:
 *                     type: string
 *                   description:
 *                     type: string
 *                   address:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   category:
 *                     type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                   rating:
 *                     type: number
 *                     format: decimal
 *                   reviewCount:
 *                     type: number
 *                   isApproved:
 *                     type: boolean
 *     
 *     BusinessDetailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             business:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 businessName:
 *                   type: string
 *                 description:
 *                   type: string
 *                 address:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 category:
 *                   type: string
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                 businessHours:
 *                   type: object
 *                 rating:
 *                   type: number
 *                 reviewCount:
 *                   type: number
 *             reviews:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   rating:
 *                     type: number
 *                   reviewText:
 *                     type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                   userName:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *             availableCoupons:
 *               type: array
 *               items:
 *                 type: string
 *     
 *     BusinessUpdateRequest:
 *       type: object
 *       properties:
 *         businessName:
 *           type: string
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 1000
 *         address:
 *           type: string
 *         phone:
 *           type: string
 *         category:
 *           type: string
 *           maxLength: 50
 *         businessHours:
 *           type: object
 *           description: 영업시간 정보 (JSON 객체)
 *       example:
 *         businessName: "맛있는 한식당"
 *         description: "전통 한식을 현대적으로 해석한 맛집"
 *         address: "부산시 남구 대연동 123-45"
 *         phone: "051-123-4567"
 *         category: "한식"
 *         businessHours:
 *           monday: "09:00-22:00"
 *           tuesday: "09:00-22:00"
 *           wednesday: "09:00-22:00"
 *           thursday: "09:00-22:00"
 *           friday: "09:00-22:00"
 *           saturday: "10:00-21:00"
 *           sunday: "10:00-21:00"
 *     
 *     ReviewCreateRequest:
 *       type: object
 *       required:
 *         - rating
 *         - reviewText
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         reviewText:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 5
 *       example:
 *         rating: 5
 *         reviewText: "정말 맛있었습니다! 분위기도 좋고 서비스도 친절해요."
 *         images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 */

export const businessQuerySchema = z.object({
  category: z.string().optional(),
  featured: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['rating', 'reviewCount', 'createdAt']).optional().default('rating'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const businessUpdateSchema = z.object({
  businessName: z.string().max(200, 'Business name cannot exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  address: z.string().optional(),
  phone: phoneSchema.optional(),
  category: z.string().max(50, 'Category cannot exceed 50 characters').optional(),
  businessHours: z.record(z.string()).optional()
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000, 'Review cannot exceed 1000 characters'),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional().default([])
});

export type BusinessQueryRequest = z.infer<typeof businessQuerySchema>;
export type BusinessUpdateRequest = z.infer<typeof businessUpdateSchema>;
export type ReviewCreateRequest = z.infer<typeof reviewCreateSchema>;