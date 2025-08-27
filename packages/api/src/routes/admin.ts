import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@buzz/database';
import { users, businesses, businessSettlements, systemSettings, mileageTransactions, coupons, referrals } from '@buzz/database/schema';
import { eq, desc, and, count, sum, gte, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { paginationSchema, idParamSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: 관리자 대시보드 조회
 *     description: 관리자 대시보드에 표시할 전체 통계 정보를 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 대시보드 조회 성공
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
 *                     userStats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                         activeUsers:
 *                           type: number
 *                         newUsersThisMonth:
 *                           type: number
 *                         businessUsers:
 *                           type: number
 *                     businessStats:
 *                       type: object
 *                       properties:
 *                         totalBusinesses:
 *                           type: number
 *                         approvedBusinesses:
 *                           type: number
 *                         pendingApproval:
 *                           type: number
 *                     referralStats:
 *                       type: object
 *                       properties:
 *                         totalReferrals:
 *                           type: number
 *                         thisMonthReferrals:
 *                           type: number
 *                         totalRewards:
 *                           type: number
 *                     mileageStats:
 *                       type: object
 *                       properties:
 *                         totalIssued:
 *                           type: number
 *                         totalUsed:
 *                           type: number
 *                         currentBalance:
 *                           type: number
 *                     settlementStats:
 *                       type: object
 *                       properties:
 *                         pendingSettlements:
 *                           type: number
 *                         pendingAmount:
 *                           type: number
 *                         thisMonthPaid:
 *                           type: number
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/dashboard', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get current month start date
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // User stats
    const [userStats] = await db
      .select({
        totalUsers: count(users.id),
        activeUsers: sql<number>`COUNT(CASE WHEN is_active = true THEN 1 END)`,
        newUsersThisMonth: sql<number>`COUNT(CASE WHEN created_at >= ${startOfMonth} THEN 1 END)`,
        businessUsers: sql<number>`COUNT(CASE WHEN role = 'business' THEN 1 END)`
      })
      .from(users);

    // Business stats
    const [businessStats] = await db
      .select({
        totalBusinesses: count(businesses.id),
        approvedBusinesses: sql<number>`COUNT(CASE WHEN is_approved = true THEN 1 END)`,
        pendingApproval: sql<number>`COUNT(CASE WHEN is_approved = false THEN 1 END)`
      })
      .from(businesses);

    // Referral stats
    const [referralStats] = await db
      .select({
        totalReferrals: count(referrals.id),
        thisMonthReferrals: sql<number>`COUNT(CASE WHEN created_at >= ${startOfMonth} THEN 1 END)`,
        totalRewards: sum(referrals.rewardAmount)
      })
      .from(referrals);

    // Mileage stats
    const [mileageStats] = await db
      .select({
        totalIssued: sql<number>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)`,
        totalUsed: sql<number>`COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)`
      })
      .from(mileageTransactions);

    // Current mileage balance
    const [currentBalance] = await db
      .select({
        total: sum(users.mileageBalance)
      })
      .from(users);

    // Settlement stats
    const [settlementStats] = await db
      .select({
        pendingSettlements: sql<number>`COUNT(CASE WHEN status = 'requested' THEN 1 END)`,
        pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN status = 'requested' THEN amount ELSE 0 END), 0)`,
        thisMonthPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' AND processed_at >= ${startOfMonth} THEN amount ELSE 0 END), 0)`
      })
      .from(businessSettlements);

    res.json(createSuccessResponse({
      userStats: {
        totalUsers: Number(userStats.totalUsers),
        activeUsers: Number(userStats.activeUsers),
        newUsersThisMonth: Number(userStats.newUsersThisMonth),
        businessUsers: Number(userStats.businessUsers)
      },
      businessStats: {
        totalBusinesses: Number(businessStats.totalBusinesses),
        approvedBusinesses: Number(businessStats.approvedBusinesses),
        pendingApproval: Number(businessStats.pendingApproval)
      },
      referralStats: {
        totalReferrals: Number(referralStats.totalReferrals),
        thisMonthReferrals: Number(referralStats.thisMonthReferrals),
        totalRewards: Number(referralStats.totalRewards || 0)
      },
      mileageStats: {
        totalIssued: Number(mileageStats.totalIssued),
        totalUsed: Number(mileageStats.totalUsed),
        currentBalance: Number(currentBalance.total || 0)
      },
      settlementStats: {
        pendingSettlements: Number(settlementStats.pendingSettlements),
        pendingAmount: Number(settlementStats.pendingAmount),
        thisMonthPaid: Number(settlementStats.thisMonthPaid)
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 사용자 목록 조회 (관리자용)
 *     description: 관리자가 전체 사용자 목록을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, business, admin]
 *         description: 사용자 역할 필터
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 활성 상태 필터
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 이름 또는 이메일 검색
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
 *         description: 사용자 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/users', requireRole(['admin']), validateQuery(paginationSchema.extend({
  role: z.enum(['user', 'business', 'admin']).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, role, isActive, search } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (role) {
      whereConditions.push(eq(users.role, role));
    }
    
    if (typeof isActive === 'boolean') {
      whereConditions.push(eq(users.isActive, isActive));
    }

    if (search) {
      whereConditions.push(
        sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`
      );
    }

    // Get users
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        mileageBalance: users.mileageBalance,
        isActive: users.isActive,
        createdAt: users.createdAt
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json(createSuccessResponse({
      users: userList,
      pagination: {
        currentPage: page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasMore: userList.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/businesses:
 *   get:
 *     summary: 매장 목록 조회 (관리자용)
 *     description: 관리자가 전체 매장 목록을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: boolean
 *         description: 승인 상태 필터
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 카테고리 필터
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 매장명 또는 주소 검색
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
 *         description: 매장 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/businesses', requireRole(['admin']), validateQuery(paginationSchema.extend({
  isApproved: z.boolean().optional(),
  category: z.string().optional(),
  search: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, isApproved, category, search } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (typeof isApproved === 'boolean') {
      whereConditions.push(eq(businesses.isApproved, isApproved));
    }
    
    if (category) {
      whereConditions.push(eq(businesses.category, category));
    }

    if (search) {
      whereConditions.push(
        sql`(${businesses.businessName} ILIKE ${`%${search}%`} OR ${businesses.address} ILIKE ${`%${search}%`})`
      );
    }

    // Get businesses with owner info
    const businessList = await db
      .select({
        id: businesses.id,
        businessName: businesses.businessName,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        category: businesses.category,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount,
        isApproved: businesses.isApproved,
        createdAt: businesses.createdAt,
        ownerName: users.name,
        ownerEmail: users.email
      })
      .from(businesses)
      .innerJoin(users, eq(businesses.userId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(businesses.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(businesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json(createSuccessResponse({
      businesses: businessList,
      pagination: {
        currentPage: page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasMore: businessList.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/businesses/{id}/approve:
 *   post:
 *     summary: 매장 승인
 *     description: 매장 등록 신청을 승인합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 매장 승인 성공
 *       404:
 *         description: 매장을 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/businesses/:id/approve', requireRole(['admin']), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [updatedBusiness] = await db
      .update(businesses)
      .set({ isApproved: true })
      .where(eq(businesses.id, id))
      .returning();

    if (!updatedBusiness) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    res.json(createSuccessResponse({
      business: updatedBusiness
    }, 'Business approved successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/settlements:
 *   get:
 *     summary: 전체 정산 내역 조회 (관리자용)
 *     description: 관리자가 전체 정산 내역을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, approved, paid, rejected]
 *         description: 정산 상태 필터
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: integer
 *         description: 특정 매장의 정산만 조회
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
 *         description: 정산 내역 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/settlements', requireRole(['admin']), validateQuery(paginationSchema.extend({
  status: z.enum(['requested', 'approved', 'paid', 'rejected']).optional(),
  businessId: z.string().transform(Number).optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, businessId } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (status) {
      whereConditions.push(eq(businessSettlements.status, status));
    }
    
    if (businessId) {
      whereConditions.push(eq(businessSettlements.businessId, businessId));
    }

    // Get settlements with business info
    const settlements = await db
      .select({
        id: businessSettlements.id,
        businessId: businessSettlements.businessId,
        settlementType: businessSettlements.settlementType,
        amount: businessSettlements.amount,
        status: businessSettlements.status,
        requestedAt: businessSettlements.requestedAt,
        processedAt: businessSettlements.processedAt,
        businessName: businesses.businessName,
        ownerName: users.name
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .innerJoin(users, eq(businesses.userId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(businessSettlements.requestedAt))
      .limit(limit)
      .offset(offset);

    // Get summary stats
    const [summaryStats] = await db
      .select({
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN status = 'requested' THEN amount ELSE 0 END), 0)`,
        totalApproved: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`
      })
      .from(businessSettlements)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json(createSuccessResponse({
      settlements,
      summary: {
        totalPending: Number(summaryStats.totalPending),
        totalApproved: Number(summaryStats.totalApproved),
        totalPaid: Number(summaryStats.totalPaid)
      },
      pagination: {
        currentPage: page,
        limit,
        hasMore: settlements.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/settlements/{id}/process:
 *   post:
 *     summary: 정산 처리
 *     description: 정산 상태를 변경합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, paid, rejected]
 *               note:
 *                 type: string
 *                 description: 처리 메모 (선택)
 *     responses:
 *       200:
 *         description: 정산 처리 성공
 *       404:
 *         description: 정산을 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/settlements/:id/process', requireRole(['admin']), validateParams(idParamSchema), validateBody(z.object({
  status: z.enum(['approved', 'paid', 'rejected']),
  note: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const [updatedSettlement] = await db
      .update(businessSettlements)
      .set({
        status,
        processedAt: new Date()
      })
      .where(eq(businessSettlements.id, id))
      .returning();

    if (!updatedSettlement) {
      return res.status(404).json(createErrorResponse('Settlement not found'));
    }

    res.json(createSuccessResponse({
      settlement: updatedSettlement,
      note
    }, `Settlement ${status} successfully`));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: 시스템 설정 조회
 *     description: 전체 시스템 설정값을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 설정 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/settings', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await db.select().from(systemSettings).orderBy(systemSettings.settingKey);

    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description
      };
      return acc;
    }, {} as Record<string, { value: string; description: string | null }>);

    res.json(createSuccessResponse({
      settings: settingsObj,
      raw: settings
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: 시스템 설정 업데이트
 *     description: 시스템 설정값을 업데이트합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *             example:
 *               settings:
 *                 referral_reward: "1000"
 *                 signup_bonus_default: "1500"
 *                 basic_coupon_amount: "5000"
 *     responses:
 *       200:
 *         description: 설정 업데이트 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.put('/settings', requireRole(['admin']), validateBody(z.object({
  settings: z.record(z.string())
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;

    // Update settings one by one
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      const [updatedSetting] = await db
        .update(systemSettings)
        .set({
          settingValue: value,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.settingKey, key))
        .returning();

      return { key, updated: !!updatedSetting };
    });

    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter(r => r.updated).length;

    res.json(createSuccessResponse({
      updatedSettings: updatedCount,
      results
    }, `Updated ${updatedCount} settings successfully`));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/referrals:
 *   get:
 *     summary: 리퍼럴 관리 대시보드 (관리자용)
 *     description: 관리자가 리퍼럴 시스템의 전체 현황을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, all]
 *           default: month
 *         description: 조회 기간
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
 *         description: 리퍼럴 관리 대시보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalReferrals:
 *                           type: number
 *                         totalRewards:
 *                           type: number
 *                         totalBonuses:
 *                           type: number
 *                         periodReferrals:
 *                           type: number
 *                         periodRewards:
 *                           type: number
 *                         conversionRate:
 *                           type: number
 *                     topReferrers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: number
 *                           userName:
 *                             type: string
 *                           referralCount:
 *                             type: number
 *                           totalEarned:
 *                             type: number
 *                           lastReferralAt:
 *                             type: string
 *                     recentReferrals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           referrerName:
 *                             type: string
 *                           refereeName:
 *                             type: string
 *                           referralCode:
 *                             type: string
 *                           rewardAmount:
 *                             type: number
 *                           signupBonus:
 *                             type: number
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/referrals', requireRole(['admin']), validateQuery(paginationSchema.extend({
  period: z.enum(['today', 'week', 'month', 'all']).default('month')
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, period } = req.query as any;
    const offset = (page - 1) * limit;

    // Calculate date range based on period
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        dateFilter = gte(referrals.createdAt, startOfDay);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = gte(referrals.createdAt, startOfWeek);
        break;
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        dateFilter = gte(referrals.createdAt, startOfMonth);
        break;
      default:
        dateFilter = undefined;
    }

    // Get summary statistics
    const [totalStats] = await db
      .select({
        totalReferrals: count(referrals.id),
        totalRewards: sum(referrals.rewardAmount),
        totalBonuses: sum(referrals.signupBonus)
      })
      .from(referrals);

    // Get period-specific stats
    const [periodStats] = await db
      .select({
        periodReferrals: count(referrals.id),
        periodRewards: sum(referrals.rewardAmount)
      })
      .from(referrals)
      .where(dateFilter);

    // Calculate conversion rate (successful referrals vs total users)
    const [userCount] = await db.select({ count: count(users.id) }).from(users);
    const conversionRate = Number(totalStats.totalReferrals) / Number(userCount.count) * 100;

    // Get top referrers
    const topReferrers = await db
      .select({
        userId: referrals.referrerId,
        userName: users.name,
        referralCount: count(referrals.id),
        totalEarned: sum(referrals.rewardAmount),
        lastReferralAt: sql<Date>`MAX(${referrals.createdAt})`
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .groupBy(referrals.referrerId, users.name)
      .orderBy(desc(count(referrals.id)))
      .limit(10);

    // Get recent referrals
    const recentReferrals = await db
      .select({
        id: referrals.id,
        referrerName: sql<string>`referrer.name`,
        refereeName: sql<string>`referee.name`,
        referralCode: referrals.referralCode,
        rewardAmount: referrals.rewardAmount,
        signupBonus: referrals.signupBonus,
        status: referrals.status,
        createdAt: referrals.createdAt
      })
      .from(referrals)
      .innerJoin(sql`${users} as referrer`, sql`referrals.referrer_id = referrer.id`)
      .innerJoin(sql`${users} as referee`, sql`referrals.referee_id = referee.id`)
      .orderBy(desc(referrals.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(createSuccessResponse({
      summary: {
        totalReferrals: Number(totalStats.totalReferrals),
        totalRewards: Number(totalStats.totalRewards || 0),
        totalBonuses: Number(totalStats.totalBonuses || 0),
        periodReferrals: Number(periodStats.periodReferrals),
        periodRewards: Number(periodStats.periodRewards || 0),
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      topReferrers: topReferrers.map(referrer => ({
        ...referrer,
        referralCount: Number(referrer.referralCount),
        totalEarned: Number(referrer.totalEarned || 0)
      })),
      recentReferrals,
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
 * /api/admin/referrals/settings:
 *   get:
 *     summary: 리퍼럴 보상 정책 조회
 *     description: 현재 리퍼럴 보상 정책 설정을 조회합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 리퍼럴 정책 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/referrals/settings', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await db
      .select()
      .from(systemSettings)
      .where(sql`setting_key LIKE 'referral_%' OR setting_key LIKE 'signup_%'`)
      .orderBy(systemSettings.settingKey);

    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description
      };
      return acc;
    }, {} as Record<string, { value: string; description: string | null }>);

    res.json(createSuccessResponse({
      settings: settingsObj
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/referrals/settings:
 *   put:
 *     summary: 리퍼럴 보상 정책 업데이트
 *     description: 리퍼럴 보상 정책을 업데이트합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referralReward:
 *                 type: number
 *                 description: 추천인 보상 (마일리지)
 *                 example: 500
 *               signupBonusDefault:
 *                 type: number
 *                 description: 일반 가입 보너스
 *                 example: 1000
 *               signupBonusReferral:
 *                 type: number
 *                 description: 리퍼럴 가입 보너스
 *                 example: 3000
 *               referralEnabled:
 *                 type: boolean
 *                 description: 리퍼럴 시스템 활성화 여부
 *                 example: true
 *     responses:
 *       200:
 *         description: 리퍼럴 정책 업데이트 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.put('/referrals/settings', requireRole(['admin']), validateBody(z.object({
  referralReward: z.number().min(0).optional(),
  signupBonusDefault: z.number().min(0).optional(),
  signupBonusReferral: z.number().min(0).optional(),
  referralEnabled: z.boolean().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = req.body;
    const updatePromises = [];

    // Map frontend keys to database setting keys
    const settingMappings = {
      referralReward: 'referral_reward',
      signupBonusDefault: 'signup_bonus_default',
      signupBonusReferral: 'signup_bonus_referral',
      referralEnabled: 'referral_enabled'
    };

    for (const [key, dbKey] of Object.entries(settingMappings)) {
      if (updates[key] !== undefined) {
        updatePromises.push(
          db.update(systemSettings)
            .set({
              settingValue: String(updates[key]),
              updatedAt: new Date()
            })
            .where(eq(systemSettings.settingKey, dbKey))
            .returning()
        );
      }
    }

    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter(r => r.length > 0).length;

    res.json(createSuccessResponse({
      updatedSettings: updatedCount,
      updates
    }, `Updated ${updatedCount} referral settings successfully`));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/referrals/{id}/adjust:
 *   post:
 *     summary: 리퍼럴 보상 수동 조정
 *     description: 특정 리퍼럴의 보상을 수동으로 조정합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [cancel, adjust_reward, adjust_bonus]
 *               newRewardAmount:
 *                 type: number
 *                 description: 새로운 추천인 보상 금액 (adjust_reward일 때 필수)
 *               newBonusAmount:
 *                 type: number
 *                 description: 새로운 가입 보너스 금액 (adjust_bonus일 때 필수)
 *               reason:
 *                 type: string
 *                 description: 조정 사유
 *     responses:
 *       200:
 *         description: 리퍼럴 조정 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       404:
 *         description: 리퍼럴을 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/referrals/:id/adjust', requireRole(['admin']), validateParams(idParamSchema), validateBody(z.object({
  action: z.enum(['cancel', 'adjust_reward', 'adjust_bonus']),
  newRewardAmount: z.number().min(0).optional(),
  newBonusAmount: z.number().min(0).optional(),
  reason: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, newRewardAmount, newBonusAmount, reason } = req.body;

    // Get referral details
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.id, id))
      .limit(1);

    if (!referral) {
      return res.status(404).json(createErrorResponse('Referral not found'));
    }

    if (referral.status === 'cancelled') {
      return res.status(400).json(createErrorResponse('Referral already cancelled'));
    }

    const result = await db.transaction(async (tx) => {
      let adjustmentDescription = '';

      switch (action) {
        case 'cancel':
          // Cancel referral and reverse rewards
          await tx.update(referrals)
            .set({ status: 'cancelled' })
            .where(eq(referrals.id, id));

          // Reverse referrer reward
          if (referral.rewardAmount > 0) {
            await tx.update(users)
              .set(sql`mileage_balance = mileage_balance - ${referral.rewardAmount}`)
              .where(eq(users.id, referral.referrerId));

            await tx.insert(mileageTransactions).values({
              userId: referral.referrerId,
              transactionType: 'deduct',
              amount: referral.rewardAmount,
              description: `리퍼럴 취소 - 보상 회수 (관리자: ${reason || '사유 없음'})`,
              referenceType: 'referral_cancel',
              referenceId: referral.id
            });
          }

          // Reverse referee bonus
          if (referral.signupBonus > 0) {
            await tx.update(users)
              .set(sql`mileage_balance = mileage_balance - ${referral.signupBonus}`)
              .where(eq(users.id, referral.refereeId));

            await tx.insert(mileageTransactions).values({
              userId: referral.refereeId,
              transactionType: 'deduct',
              amount: referral.signupBonus,
              description: `리퍼럴 취소 - 가입 보너스 회수 (관리자: ${reason || '사유 없음'})`,
              referenceType: 'referral_cancel',
              referenceId: referral.id
            });
          }
          
          adjustmentDescription = 'Referral cancelled and rewards reversed';
          break;

        case 'adjust_reward':
          if (newRewardAmount === undefined) {
            throw new Error('newRewardAmount is required for adjust_reward action');
          }

          const rewardDifference = newRewardAmount - referral.rewardAmount;
          
          await tx.update(referrals)
            .set({ rewardAmount: newRewardAmount })
            .where(eq(referrals.id, id));

          if (rewardDifference !== 0) {
            await tx.update(users)
              .set(sql`mileage_balance = mileage_balance + ${rewardDifference}`)
              .where(eq(users.id, referral.referrerId));

            await tx.insert(mileageTransactions).values({
              userId: referral.referrerId,
              transactionType: rewardDifference > 0 ? 'earn' : 'deduct',
              amount: Math.abs(rewardDifference),
              description: `리퍼럴 보상 조정 (관리자: ${reason || '사유 없음'})`,
              referenceType: 'admin_adjustment',
              referenceId: referral.id
            });
          }
          
          adjustmentDescription = `Reward adjusted from ${referral.rewardAmount} to ${newRewardAmount}`;
          break;

        case 'adjust_bonus':
          if (newBonusAmount === undefined) {
            throw new Error('newBonusAmount is required for adjust_bonus action');
          }

          const bonusDifference = newBonusAmount - referral.signupBonus;
          
          await tx.update(referrals)
            .set({ signupBonus: newBonusAmount })
            .where(eq(referrals.id, id));

          if (bonusDifference !== 0) {
            await tx.update(users)
              .set(sql`mileage_balance = mileage_balance + ${bonusDifference}`)
              .where(eq(users.id, referral.refereeId));

            await tx.insert(mileageTransactions).values({
              userId: referral.refereeId,
              transactionType: bonusDifference > 0 ? 'earn' : 'deduct',
              amount: Math.abs(bonusDifference),
              description: `가입 보너스 조정 (관리자: ${reason || '사유 없음'})`,
              referenceType: 'admin_adjustment',
              referenceId: referral.id
            });
          }
          
          adjustmentDescription = `Bonus adjusted from ${referral.signupBonus} to ${newBonusAmount}`;
          break;
      }

      return { adjustmentDescription };
    });

    res.json(createSuccessResponse({
      referralId: id,
      action,
      description: result.adjustmentDescription,
      reason
    }, 'Referral adjustment completed successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/referrals/fraud-detection:
 *   get:
 *     summary: 리퍼럴 부정사용 감지
 *     description: 의심스러운 리퍼럴 패턴을 감지하고 보고합니다.
 *     tags: [Admin]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 분석 기간 (일)
 *     responses:
 *       200:
 *         description: 부정사용 감지 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suspiciousPatterns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           userId:
 *                             type: number
 *                           userName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           riskLevel:
 *                             type: string
 *                           evidence:
 *                             type: object
 *                     riskSummary:
 *                       type: object
 *                       properties:
 *                         totalSuspicious:
 *                           type: number
 *                         highRisk:
 *                           type: number
 *                         mediumRisk:
 *                           type: number
 *                         lowRisk:
 *                           type: number
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/referrals/fraud-detection', requireRole(['admin']), validateQuery(z.object({
  days: z.string().transform(Number).default(30)
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days } = req.query as any;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const suspiciousPatterns = [];

    // Pattern 1: Users with too many referrals in short time
    const rapidReferrers = await db
      .select({
        userId: referrals.referrerId,
        userName: users.name,
        referralCount: count(referrals.id),
        firstReferral: sql<Date>`MIN(${referrals.createdAt})`,
        lastReferral: sql<Date>`MAX(${referrals.createdAt})`
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .where(gte(referrals.createdAt, sinceDate))
      .groupBy(referrals.referrerId, users.name)
      .having(sql`COUNT(${referrals.id}) > 10`); // More than 10 referrals

    for (const referrer of rapidReferrers) {
      const timeSpan = referrer.lastReferral.getTime() - referrer.firstReferral.getTime();
      const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
      
      if (daysSpan < 7 && referrer.referralCount > 5) { // 5+ referrals in less than a week
        suspiciousPatterns.push({
          type: 'rapid_referrals',
          userId: referrer.userId,
          userName: referrer.userName,
          description: `${referrer.referralCount} referrals in ${Math.round(daysSpan)} days`,
          riskLevel: referrer.referralCount > 15 ? 'high' : 'medium',
          evidence: {
            referralCount: Number(referrer.referralCount),
            timeSpan: daysSpan,
            firstReferral: referrer.firstReferral,
            lastReferral: referrer.lastReferral
          }
        });
      }
    }

    // Pattern 2: Check for same IP/device patterns (would need additional data)
    // This is a simplified version - in production, you'd track IP addresses and device fingerprints
    
    // Pattern 3: Users who referred accounts that never became active
    const inactiveReferrals = await db
      .select({
        referrerId: referrals.referrerId,
        referrerName: sql<string>`referrer.name`,
        inactiveCount: count(referrals.id),
        totalReferrals: sql<number>`(SELECT COUNT(*) FROM referrals WHERE referrer_id = referrals.referrer_id)`
      })
      .from(referrals)
      .innerJoin(sql`${users} as referrer`, sql`referrals.referrer_id = referrer.id`)
      .innerJoin(sql`${users} as referee`, sql`referrals.referee_id = referee.id`)
      .where(and(
        gte(referrals.createdAt, sinceDate),
        eq(sql`referee.is_active`, false)
      ))
      .groupBy(referrals.referrerId, sql`referrer.name`)
      .having(sql`COUNT(referrals.id) > 3`);

    for (const pattern of inactiveReferrals) {
      const inactiveRatio = Number(pattern.inactiveCount) / Number(pattern.totalReferrals);
      
      if (inactiveRatio > 0.7) { // More than 70% inactive
        suspiciousPatterns.push({
          type: 'inactive_referrals',
          userId: pattern.referrerId,
          userName: pattern.referrerName,
          description: `${pattern.inactiveCount} of ${pattern.totalReferrals} referrals are inactive accounts`,
          riskLevel: inactiveRatio > 0.9 ? 'high' : 'medium',
          evidence: {
            inactiveCount: Number(pattern.inactiveCount),
            totalReferrals: Number(pattern.totalReferrals),
            inactiveRatio: Math.round(inactiveRatio * 100)
          }
        });
      }
    }

    // Risk summary
    const riskSummary = {
      totalSuspicious: suspiciousPatterns.length,
      highRisk: suspiciousPatterns.filter(p => p.riskLevel === 'high').length,
      mediumRisk: suspiciousPatterns.filter(p => p.riskLevel === 'medium').length,
      lowRisk: suspiciousPatterns.filter(p => p.riskLevel === 'low').length
    };

    res.json(createSuccessResponse({
      suspiciousPatterns,
      riskSummary,
      analyzedPeriod: days,
      generatedAt: new Date()
    }));

  } catch (error) {
    next(error);
  }
});

export default router;