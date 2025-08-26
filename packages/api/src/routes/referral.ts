import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { users, referrals } from '@buzz/database/schema';
import { eq, desc, gte, and, count, sum } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { shareTemplateSchema } from '../schemas/referral.js';
import { paginationSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/referrals/link:
 *   post:
 *     summary: 리퍼럴 링크 생성
 *     description: 사용자의 고유 리퍼럴 링크를 생성합니다. SNS 공유용 메시지도 함께 제공됩니다.
 *     tags: [Referral]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 리퍼럴 링크 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralLinkResponse'
 *       401:
 *         description: 인증 필요
 */
router.post('/link', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get user's referral code
    const [user] = await db.select({
      referralCode: users.referralCode,
      name: users.name
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.referralCode) {
      return res.status(404).json(createErrorResponse('User referral code not found'));
    }

    // Generate referral link
    const baseUrl = process.env.FRONTEND_URL || 'https://buzz.namgu.kr';
    const referralLink = `${baseUrl}/signup?ref=${user.referralCode}`;

    // Generate share message
    const shareMessage = `🍴 부산 남구 맛집을 발견하고 마일리지도 받으세요!

내 추천 링크로 가입하면:
✅ 3,000원 마일리지 보너스
✅ 다양한 할인 쿠폰
✅ 지역 맛집 정보

지금 가입하기 👉 ${referralLink}

#부산맛집 #남구맛집 #마일리지 #할인쿠폰`;

    res.json(createSuccessResponse({
      referralLink,
      referralCode: user.referralCode,
      shareMessage,
      userName: user.name
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/stats:
 *   get:
 *     summary: 리퍼럴 성과 조회
 *     description: 사용자의 리퍼럴 통계 및 최근 추천 내역을 조회합니다.
 *     tags: [Referral]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 리퍼럴 성과 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralStatsResponse'
 *       401:
 *         description: 인증 필요
 */
router.get('/stats', requireAuth, validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    // Get total referral stats
    const [totalStats] = await db
      .select({
        totalReferred: count(referrals.id),
        totalEarned: sum(referrals.rewardAmount)
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [thisMonthStats] = await db
      .select({
        thisMonthReferred: count(referrals.id),
        thisMonthEarned: sum(referrals.rewardAmount)
      })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        gte(referrals.createdAt, startOfMonth)
      ));

    // Get recent referrals with referee info
    const recentReferrals = await db
      .select({
        id: referrals.id,
        refereeName: users.name,
        refereeEmail: users.email,
        rewardAmount: referrals.rewardAmount,
        signupBonus: referrals.signupBonus,
        status: referrals.status,
        createdAt: referrals.createdAt
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.refereeId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt))
      .limit(limit)
      .offset(offset);

    // Mask email addresses for privacy (show only first part)
    const maskedReferrals = recentReferrals.map(referral => ({
      ...referral,
      refereeEmail: referral.refereeEmail.replace(/(.{2}).*@/, '$1***@')
    }));

    res.json(createSuccessResponse({
      totalReferred: totalStats.totalReferred || 0,
      totalEarned: totalStats.totalEarned || 0,
      thisMonthReferred: thisMonthStats.thisMonthReferred || 0,
      thisMonthEarned: thisMonthStats.thisMonthEarned || 0,
      recentReferrals: maskedReferrals,
      pagination: {
        currentPage: page,
        limit,
        hasMore: recentReferrals.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/share-template:
 *   post:
 *     summary: SNS 플랫폼별 공유 템플릿 생성
 *     description: 각 SNS 플랫폼에 최적화된 공유 메시지를 생성합니다.
 *     tags: [Referral]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [kakao, facebook, twitter, instagram, copy]
 *                 description: 공유할 SNS 플랫폼
 *               customMessage:
 *                 type: string
 *                 maxLength: 500
 *                 description: 사용자 정의 메시지 (선택)
 *           example:
 *             platform: "kakao"
 *             customMessage: "친구들아, 이 앱 진짜 좋더라!"
 *     responses:
 *       200:
 *         description: 공유 템플릿 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                       example: "kakao"
 *                     shareUrl:
 *                       type: string
 *                       example: "https://buzz.namgu.kr/signup?ref=ABC12345"
 *                     message:
 *                       type: string
 *                       example: "친구야! 부산 남구 맛집 앱 한번 써봐~"
 *                     hashtags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["부산맛집", "남구맛집", "마일리지"]
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 */
router.post('/share-template', requireAuth, validateBody(shareTemplateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { platform, customMessage } = req.body;

    // Get user's referral code
    const [user] = await db.select({
      referralCode: users.referralCode,
      name: users.name
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.referralCode) {
      return res.status(404).json(createErrorResponse('User referral code not found'));
    }

    // Generate referral link
    const baseUrl = process.env.FRONTEND_URL || 'https://buzz.namgu.kr';
    const shareUrl = `${baseUrl}/signup?ref=${user.referralCode}`;

    // Platform-specific templates
    const templates = {
      kakao: {
        message: customMessage || `친구야! 부산 남구 맛집 앱 한번 써봐~
        
가입만 해도 3,000원 마일리지 주고, 맛집 할인쿠폰도 팡팡! 
나도 추천 보상 받을 수 있어서 WIN-WIN 😊

${shareUrl}`,
        hashtags: ['부산맛집', '남구맛집', '마일리지', '할인쿠폰'],
        title: '부산 남구 맛집 발견! Buzz와 함께해요',
        description: '지역 맛집 탐방하고 마일리지까지 받자!'
      },
      facebook: {
        message: customMessage || `🍴 부산 남구의 숨은 맛집들을 발견했어요!

Buzz 앱으로 지역 맛집 정보도 보고, 마일리지 적립해서 실제 할인도 받을 수 있답니다.

✨ 내 추천링크로 가입하면:
- 즉시 3,000원 마일리지 지급
- 다양한 할인 쿠폰 제공
- 지역 관광정보까지!

함께 부산 남구 맛집 투어해요 🥢

${shareUrl}`,
        hashtags: ['부산맛집', '남구맛집', '지역경제', '맛집투어', '할인혜택'],
        title: '부산 남구 맛집 앱 - Buzz',
        description: '지역경제 활성화에 참여하고 혜택도 받자!'
      },
      twitter: {
        message: customMessage || `🍴 부산 #남구맛집 발견하고 마일리지까지!

내 추천링크로 가입하면 3,000원 보너스 💰
${shareUrl}

#부산맛집 #지역경제 #마일리지 #할인쿠폰`,
        hashtags: ['부산맛집', '남구맛집', '지역경제', '마일리지'],
        title: '부산 남구 맛집 앱 Buzz',
        description: '가입하고 마일리지 받자!'
      },
      instagram: {
        message: customMessage || `🍴✨ 부산 남구 맛집 투어 with Buzz

친구들아~ 이 앱 진짜 괜찮더라!
가입만 해도 마일리지 3,000원 주고
진짜 맛집 정보도 많아서 좋았어 💕

스토리 링크 눌러서 가입해봐~
(링크는 프로필에도 있어!)

.
.
.
#부산맛집 #남구맛집 #맛스타그램 #부산여행 
#지역맛집 #할인혜택 #마일리지앱 #buzz`,
        hashtags: ['부산맛집', '남구맛집', '맛스타그램', '부산여행', '지역맛집', '할인혜택'],
        title: '부산 남구 맛집 앱',
        description: '맛집 투어하고 마일리지까지!'
      },
      copy: {
        message: customMessage || `🍴 부산 남구 맛집을 발견하고 마일리지도 받으세요!

내 추천 링크로 가입하면:
✅ 3,000원 마일리지 보너스
✅ 다양한 할인 쿠폰
✅ 지역 맛집 & 관광 정보

지금 가입하기 👉 ${shareUrl}

#부산맛집 #남구맛집 #마일리지 #할인쿠폰`,
        hashtags: ['부산맛집', '남구맛집', '마일리지', '할인쿠폰'],
        title: '부산 남구 맛집 앱 - Buzz',
        description: '지역경제 활성화 바이럴 마케팅 플랫폼'
      }
    };

    const template = templates[platform];

    res.json(createSuccessResponse({
      platform,
      shareUrl,
      message: template.message,
      hashtags: template.hashtags,
      title: template.title,
      description: template.description,
      userName: user.name,
      referralCode: user.referralCode
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/leaderboard:
 *   get:
 *     summary: 리퍼럴 리더보드 조회
 *     description: 이번 달 리퍼럴 성과 상위 사용자들을 조회합니다. (개인정보는 마스킹 처리)
 *     tags: [Referral]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: 조회할 사용자 수
 *     responses:
 *       200:
 *         description: 리더보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: "2024-01"
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                           userName:
 *                             type: string
 *                           referralCount:
 *                             type: number
 *                           totalEarned:
 *                             type: number
 *                       example:
 *                         - rank: 1
 *                           userName: "김***"
 *                           referralCount: 25
 *                           totalEarned: 12500
 *                         - rank: 2
 *                           userName: "이***"
 *                           referralCount: 18
 *                           totalEarned: 9000
 */
router.get('/leaderboard', validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query as any;
    const safeLimit = Math.min(limit, 50); // Maximum 50 users

    // Get this month's date range
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get leaderboard data
    const leaderboard = await db
      .select({
        userId: referrals.referrerId,
        userName: users.name,
        referralCount: count(referrals.id),
        totalEarned: sum(referrals.rewardAmount)
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .where(gte(referrals.createdAt, startOfMonth))
      .groupBy(referrals.referrerId, users.name)
      .orderBy(desc(count(referrals.id)))
      .limit(safeLimit);

    // Mask usernames for privacy and add ranking
    const maskedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userName: entry.userName.charAt(0) + '***', // Show only first character
      referralCount: entry.referralCount,
      totalEarned: entry.totalEarned || 0
    }));

    const currentMonth = startOfMonth.toISOString().substring(0, 7); // YYYY-MM format

    res.json(createSuccessResponse({
      period: currentMonth,
      leaderboard: maskedLeaderboard,
      total: leaderboard.length
    }));

  } catch (error) {
    next(error);
  }
});

export default router;