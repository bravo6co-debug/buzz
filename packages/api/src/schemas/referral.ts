import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     ReferralLinkResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             referralLink:
 *               type: string
 *               example: "https://buzz.namgu.kr/signup?ref=ABC12345"
 *             referralCode:
 *               type: string
 *               example: "ABC12345"
 *             shareMessage:
 *               type: string
 *               example: "부산 남구 맛집을 발견하고 마일리지도 받으세요! 내 추천 링크로 가입하면 3,000원 보너스!"
 *     
 *     ReferralStatsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             totalReferred:
 *               type: number
 *               example: 15
 *             totalEarned:
 *               type: number
 *               example: 7500
 *             thisMonthReferred:
 *               type: number
 *               example: 3
 *             thisMonthEarned:
 *               type: number
 *               example: 1500
 *             recentReferrals:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   refereeName:
 *                     type: string
 *                   refereeEmail:
 *                     type: string
 *                   rewardAmount:
 *                     type: number
 *                   signupBonus:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *               example:
 *                 - id: 1
 *                   refereeName: "김철수"
 *                   refereeEmail: "kim@example.com"
 *                   rewardAmount: 500
 *                   signupBonus: 3000
 *                   createdAt: "2024-01-15T10:30:00Z"
 */

export const shareTemplateSchema = z.object({
  platform: z.enum(['kakao', 'facebook', 'twitter', 'instagram', 'copy']),
  customMessage: z.string().max(500).optional()
});

export type ShareTemplateRequest = z.infer<typeof shareTemplateSchema>;