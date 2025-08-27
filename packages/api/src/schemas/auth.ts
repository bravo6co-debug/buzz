import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     SignupRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일
 *         password:
 *           type: string
 *           minLength: 8
 *           description: 비밀번호 (최소 8자, 영문 대/소문자, 숫자 포함)
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: 사용자 이름
 *         phone:
 *           type: string
 *           description: 전화번호 (선택)
 *         referralCode:
 *           type: string
 *           description: 리퍼럴 코드 (선택)
 *       example:
 *         email: "user@example.com"
 *         password: "SecurePass123"
 *         name: "홍길동"
 *         phone: "010-1234-5678"
 *         referralCode: "REF12345"
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  phone: phoneSchema.optional(),
  referralCode: z.string().optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일
 *         password:
 *           type: string
 *           description: 비밀번호
 *       example:
 *         email: "user@example.com"
 *         password: "SecurePass123"
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

/**
 * @swagger
 * components:
 *   schemas:
 *     BusinessSignupRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *         - businessName
 *         - businessPhone
 *         - address
 *         - category
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 사업자 이메일
 *         password:
 *           type: string
 *           minLength: 8
 *           description: 비밀번호
 *         name:
 *           type: string
 *           description: 사업자 이름
 *         businessName:
 *           type: string
 *           description: 매장명
 *         businessPhone:
 *           type: string
 *           description: 매장 전화번호
 *         address:
 *           type: string
 *           description: 매장 주소
 *         category:
 *           type: string
 *           description: 매장 카테고리
 *         description:
 *           type: string
 *           description: 매장 설명 (선택)
 *       example:
 *         email: "business@example.com"
 *         password: "SecurePass123"
 *         name: "김사장"
 *         businessName: "맛있는 음식점"
 *         businessPhone: "051-123-4567"
 *         address: "부산시 남구 대연동 123-45"
 *         category: "한식"
 *         description: "전통 한식을 제공하는 맛집입니다."
 */
export const businessSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(200, 'Business name cannot exceed 200 characters'),
  businessPhone: phoneSchema,
  address: z.string().min(10, 'Address must be at least 10 characters'),
  category: z.string().min(1, 'Category is required').max(50, 'Category cannot exceed 50 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [user, business, admin]
 *                 mileageBalance:
 *                   type: number
 *             referralBonus:
 *               type: number
 *               description: 리퍼럴 가입 보너스 (가입 시에만 포함)
 */
export type SignupRequest = z.infer<typeof signupSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type BusinessSignupRequest = z.infer<typeof businessSignupSchema>;