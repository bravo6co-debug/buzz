import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@buzz/database';
import { users, mileageTransactions, coupons, referrals, businesses } from '@buzz/database/schema';
import { eq, desc, and, count, sum, gte, or, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validation.js';
import { paginationSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     description: 현재 로그인한 사용자의 프로필 정보를 조회합니다.
 *     tags: [User]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         role:
 *                           type: string
 *                         mileageBalance:
 *                           type: number
 *                         referralCode:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: 인증 필요
 */
router.get('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      mileageBalance: users.mileageBalance,
      referralCode: users.referralCode,
      isActive: users.isActive,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    res.json(createSuccessResponse({
      user
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/dashboard:
 *   get:
 *     summary: 사용자 대시보드 정보 조회
 *     description: 홈페이지에 표시할 사용자 대시보드 정보를 조회합니다.
 *     tags: [User]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 대시보드 정보 조회 성공
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
 *                     mileageBalance:
 *                       type: number
 *                       example: 5500
 *                     availableCoupons:
 *                       type: number
 *                       example: 3
 *                     totalReferred:
 *                       type: number
 *                       example: 12
 *                     thisMonthEarned:
 *                       type: number
 *                       example: 2500
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           transactionType:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           description:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: 인증 필요
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get user basic info
    const [user] = await db.select({
      mileageBalance: users.mileageBalance
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Get available coupons count
    const currentDate = new Date();
    const [couponCount] = await db
      .select({ count: count() })
      .from(coupons)
      .where(
        and(
          eq(coupons.userId, userId),
          eq(coupons.isUsed, false),
          or(
            sql`${coupons.expiresAt} IS NULL`,
            gte(coupons.expiresAt!, currentDate)
          )!
        )
      );

    // Get total referrals count
    const [referralCount] = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Get this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyEarnings] = await db
      .select({ total: sum(mileageTransactions.amount) })
      .from(mileageTransactions)
      .where(
        and(
          eq(mileageTransactions.userId, userId),
          eq(mileageTransactions.transactionType, 'earn'),
          gte(mileageTransactions.createdAt, startOfMonth)
        )
      );

    // Get recent transactions (last 5)
    const recentTransactions = await db
      .select({
        id: mileageTransactions.id,
        transactionType: mileageTransactions.transactionType,
        amount: mileageTransactions.amount,
        description: mileageTransactions.description,
        createdAt: mileageTransactions.createdAt
      })
      .from(mileageTransactions)
      .where(eq(mileageTransactions.userId, userId))
      .orderBy(desc(mileageTransactions.createdAt))
      .limit(5);

    res.json(createSuccessResponse({
      mileageBalance: user.mileageBalance,
      availableCoupons: Number(couponCount.count),
      totalReferred: Number(referralCount.count),
      thisMonthEarned: Number(monthlyEarnings.total || 0),
      recentTransactions
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/mileage:
 *   get:
 *     summary: 사용자 마일리지 정보 조회
 *     description: 사용자의 마일리지 잔액과 최근 거래내역을 조회합니다.
 *     tags: [User]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 마일리지 정보 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/mileage', requireAuth, validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    // Get current balance
    const [user] = await db.select({
      balance: users.mileageBalance
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Get transactions
    const transactions = await db
      .select({
        id: mileageTransactions.id,
        transactionType: mileageTransactions.transactionType,
        amount: mileageTransactions.amount,
        description: mileageTransactions.description,
        referenceType: mileageTransactions.referenceType,
        createdAt: mileageTransactions.createdAt
      })
      .from(mileageTransactions)
      .where(eq(mileageTransactions.userId, userId))
      .orderBy(desc(mileageTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(createSuccessResponse({
      balance: user.balance,
      transactions,
      pagination: {
        currentPage: page,
        limit,
        hasMore: transactions.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/coupons:
 *   get:
 *     summary: 사용자 쿠폰 목록 조회
 *     description: 사용자가 보유한 쿠폰 목록을 조회합니다.
 *     tags: [User]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, used, expired]
 *           default: available
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 쿠폰 목록 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/coupons', requireAuth, validateQuery(paginationSchema.extend({
  status: z.enum(['available', 'used', 'expired']).optional().default('available')
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit, status } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions based on status
    const whereConditions = [eq(coupons.userId, userId)];
    const currentDate = new Date();

    if (status === 'used') {
      whereConditions.push(eq(coupons.isUsed, true));
    } else if (status === 'expired') {
      whereConditions.push(eq(coupons.isUsed, false));
      whereConditions.push(sql`${coupons.expiresAt} < ${currentDate}`);
    } else if (status === 'available') {
      whereConditions.push(eq(coupons.isUsed, false));
      whereConditions.push(
        or(
          sql`${coupons.expiresAt} IS NULL`,
          gte(coupons.expiresAt!, currentDate)
        )!
      );
    }

    // Get coupons
    const userCoupons = await db
      .select()
      .from(coupons)
      .where(and(...whereConditions))
      .orderBy(desc(coupons.createdAt))
      .limit(limit)
      .offset(offset);

    // Get used business name for used coupons
    const couponsWithBusinessInfo = await Promise.all(
      userCoupons.map(async (coupon) => {
        if (coupon.isUsed && coupon.usedBusinessId) {
          const [business] = await db
            .select({ businessName: businesses.businessName })
            .from(businesses)
            .where(eq(businesses.id, coupon.usedBusinessId))
            .limit(1);
          
          return {
            ...coupon,
            usedBusinessName: business?.businessName || null
          };
        }
        return {
          ...coupon,
          usedBusinessName: null
        };
      })
    );

    res.json(createSuccessResponse({
      coupons: couponsWithBusinessInfo,
      pagination: {
        currentPage: page,
        limit,
        hasMore: userCoupons.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user/referrals:
 *   get:
 *     summary: 사용자 리퍼럴 정보 조회
 *     description: 사용자의 리퍼럴 성과와 추천 내역을 조회합니다.
 *     tags: [User]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 리퍼럴 정보 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/referrals', requireAuth, validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
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
      .where(
        and(
          eq(referrals.referrerId, userId),
          gte(referrals.createdAt, startOfMonth)
        )
      );

    // Get recent referrals
    const recentReferrals = await db
      .select({
        id: referrals.id,
        refereeName: users.name,
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

    // Mask referee names for privacy
    const maskedReferrals = recentReferrals.map(referral => ({
      ...referral,
      refereeName: referral.refereeName.charAt(0) + '***'
    }));

    res.json(createSuccessResponse({
      totalReferred: Number(totalStats.totalReferred || 0),
      totalEarned: Number(totalStats.totalEarned || 0),
      thisMonthReferred: Number(thisMonthStats.thisMonthReferred || 0),
      thisMonthEarned: Number(thisMonthStats.thisMonthEarned || 0),
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

export default router;