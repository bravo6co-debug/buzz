import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@buzz/database';
import { businesses, businessReviews, users, businessSettlements, mileageTransactions, coupons } from '@buzz/database/schema';
import { eq, desc, and, avg, count, like, or, sql } from 'drizzle-orm';
import { requireAuth, requireRole, requireBusinessOwner, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { businessQuerySchema, businessUpdateSchema, reviewCreateSchema } from '../schemas/business.js';
import { paginationSchema, idParamSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/businesses:
 *   get:
 *     summary: 매장 목록 조회
 *     description: 매장 목록을 필터링과 정렬 옵션으로 조회합니다.
 *     tags: [Business]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 카테고리 필터
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: 인기 매장만 조회
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 매장명 또는 설명 검색
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, reviewCount, createdAt]
 *           default: rating
 *         description: 정렬 기준
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessListResponse'
 */
router.get('/', optionalAuth, validateQuery(paginationSchema.extend(businessQuerySchema.shape)), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, category, featured, search, sortBy, sortOrder } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(businesses.isApproved, true)];

    if (category) {
      whereConditions.push(eq(businesses.category, category));
    }

    if (featured) {
      // Featured businesses have rating >= 4.0 and reviewCount >= 5
      whereConditions.push(sql`${businesses.rating} >= 4.0 AND ${businesses.reviewCount} >= 5`);
    }

    if (search) {
      whereConditions.push(
        or(
          like(businesses.businessName, `%${search}%`),
          like(businesses.description, `%${search}%`)
        )!
      );
    }

    // Build order by clause
    let orderBy;
    switch (sortBy) {
      case 'reviewCount':
        orderBy = sortOrder === 'asc' ? businesses.reviewCount : desc(businesses.reviewCount);
        break;
      case 'createdAt':
        orderBy = sortOrder === 'asc' ? businesses.createdAt : desc(businesses.createdAt);
        break;
      case 'rating':
      default:
        orderBy = sortOrder === 'asc' ? businesses.rating : desc(businesses.rating);
        break;
    }

    // Get businesses with user info
    const businessList = await db
      .select({
        id: businesses.id,
        businessName: businesses.businessName,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        category: businesses.category,
        images: businesses.images,
        businessHours: businesses.businessHours,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount,
        isApproved: businesses.isApproved,
        createdAt: businesses.createdAt,
        ownerName: users.name
      })
      .from(businesses)
      .innerJoin(users, eq(businesses.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(businesses)
      .where(and(...whereConditions));

    res.json(createSuccessResponse({
      businesses: businessList.map(business => ({
        ...business,
        ownerName: business.ownerName.charAt(0) + '***' // Mask owner name for privacy
      })),
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
 * /api/businesses/featured:
 *   get:
 *     summary: 인기 매장 목록 조회
 *     description: 평점과 리뷰 수를 기반으로 한 인기 매장 목록을 조회합니다.
 *     tags: [Business]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 20
 *     responses:
 *       200:
 *         description: 인기 매장 목록 조회 성공
 */
router.get('/featured', validateQuery(z.object({
  limit: z.string().optional().default('10').transform(val => Math.min(Number(val), 20))
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query as any;

    const featuredBusinesses = await db
      .select({
        id: businesses.id,
        businessName: businesses.businessName,
        description: businesses.description,
        address: businesses.address,
        category: businesses.category,
        images: businesses.images,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.isApproved, true),
          sql`${businesses.rating} >= 4.0 AND ${businesses.reviewCount} >= 5`
        )
      )
      .orderBy(desc(businesses.rating), desc(businesses.reviewCount))
      .limit(limit);

    res.json(createSuccessResponse({
      businesses: featuredBusinesses
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/businesses/{id}:
 *   get:
 *     summary: 매장 상세 정보 조회
 *     description: 특정 매장의 상세 정보, 리뷰, 사용 가능한 쿠폰 종류를 조회합니다.
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매장 ID
 *     responses:
 *       200:
 *         description: 매장 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessDetailResponse'
 *       404:
 *         description: 매장을 찾을 수 없음
 */
router.get('/:id', optionalAuth, validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get business info
    const [business] = await db
      .select({
        id: businesses.id,
        businessName: businesses.businessName,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        category: businesses.category,
        images: businesses.images,
        businessHours: businesses.businessHours,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount,
        isApproved: businesses.isApproved,
        createdAt: businesses.createdAt
      })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);

    if (!business || !business.isApproved) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Get recent reviews (limit to 10)
    const reviews = await db
      .select({
        id: businessReviews.id,
        rating: businessReviews.rating,
        reviewText: businessReviews.reviewText,
        images: businessReviews.images,
        createdAt: businessReviews.createdAt,
        userName: users.name
      })
      .from(businessReviews)
      .innerJoin(users, eq(businessReviews.userId, users.id))
      .where(eq(businessReviews.businessId, id))
      .orderBy(desc(businessReviews.createdAt))
      .limit(10);

    // Mask user names for privacy
    const maskedReviews = reviews.map(review => ({
      ...review,
      userName: review.userName.charAt(0) + '***'
    }));

    // Get available coupon types (basic info)
    const availableCoupons = ['기본 할인쿠폰', '퍼센트 할인쿠폰'];
    
    // Add event coupon if there are active events
    const currentDate = new Date();
    const activeEventCoupons = await db
      .select({ count: count() })
      .from(coupons)
      .where(
        and(
          eq(coupons.couponType, 'event'),
          eq(coupons.isUsed, false),
          or(
            sql`${coupons.expiresAt} IS NULL`,
            sql`${coupons.expiresAt} > ${currentDate}`
          )!
        )
      );

    if (Number(activeEventCoupons[0]?.count) > 0) {
      availableCoupons.push('특별 이벤트 쿠폰');
    }

    res.json(createSuccessResponse({
      business,
      reviews: maskedReviews,
      availableCoupons
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/businesses/{id}/reviews:
 *   get:
 *     summary: 매장 리뷰 목록 조회
 *     description: 특정 매장의 리뷰 목록을 페이지네이션으로 조회합니다.
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *         description: 리뷰 목록 조회 성공
 *       404:
 *         description: 매장을 찾을 수 없음
 */
router.get('/:id/reviews', validateParams(idParamSchema), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    // Verify business exists and is approved
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(
      and(eq(businesses.id, id), eq(businesses.isApproved, true))
    ).limit(1);

    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Get reviews
    const reviews = await db
      .select({
        id: businessReviews.id,
        rating: businessReviews.rating,
        reviewText: businessReviews.reviewText,
        images: businessReviews.images,
        createdAt: businessReviews.createdAt,
        userName: users.name
      })
      .from(businessReviews)
      .innerJoin(users, eq(businessReviews.userId, users.id))
      .where(eq(businessReviews.businessId, id))
      .orderBy(desc(businessReviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(businessReviews)
      .where(eq(businessReviews.businessId, id));

    // Mask user names
    const maskedReviews = reviews.map(review => ({
      ...review,
      userName: review.userName.charAt(0) + '***'
    }));

    res.json(createSuccessResponse({
      reviews: maskedReviews,
      pagination: {
        currentPage: page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasMore: reviews.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/businesses/{id}/reviews:
 *   post:
 *     summary: 매장 리뷰 작성
 *     description: 특정 매장에 리뷰를 작성합니다.
 *     tags: [Business]
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
 *             $ref: '#/components/schemas/ReviewCreateRequest'
 *     responses:
 *       201:
 *         description: 리뷰 작성 성공
 *       400:
 *         description: 이미 리뷰를 작성했거나 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 매장을 찾을 수 없음
 */
router.post('/:id/reviews', requireAuth, validateParams(idParamSchema), validateBody(reviewCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rating, reviewText, images } = req.body;
    const userId = req.session.userId!;

    // Verify business exists and is approved
    const [business] = await db.select().from(businesses).where(
      and(eq(businesses.id, id), eq(businesses.isApproved, true))
    ).limit(1);

    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Check if user already reviewed this business
    const [existingReview] = await db
      .select({ id: businessReviews.id })
      .from(businessReviews)
      .where(and(eq(businessReviews.businessId, id), eq(businessReviews.userId, userId)))
      .limit(1);

    if (existingReview) {
      return res.status(400).json(createErrorResponse('You have already reviewed this business'));
    }

    // Create review and update business stats
    const result = await db.transaction(async (tx) => {
      // Create review
      const [newReview] = await tx.insert(businessReviews).values({
        businessId: id,
        userId,
        rating,
        reviewText,
        images: images || []
      }).returning();

      // Calculate new rating and review count
      const [stats] = await tx
        .select({
          avgRating: avg(businessReviews.rating),
          totalReviews: count(businessReviews.id)
        })
        .from(businessReviews)
        .where(eq(businessReviews.businessId, id));

      // Update business rating and review count
      await tx.update(businesses)
        .set({
          rating: Math.round(Number(stats.avgRating) * 10) / 10, // Round to 1 decimal
          reviewCount: Number(stats.totalReviews)
        })
        .where(eq(businesses.id, id));

      return newReview;
    });

    res.status(201).json(createSuccessResponse({
      review: result
    }, 'Review created successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/businesses/my/profile:
 *   get:
 *     summary: 내 매장 정보 조회 (사업자용)
 *     description: 현재 로그인한 사업자의 매장 정보를 조회합니다.
 *     tags: [Business]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 매장 정보 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 *       404:
 *         description: 매장 정보를 찾을 수 없음
 */
router.get('/my/profile', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json(createErrorResponse('Business profile not found'));
    }

    res.json(createSuccessResponse({
      business
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/businesses/my/profile:
 *   put:
 *     summary: 내 매장 정보 수정 (사업자용)
 *     description: 현재 로그인한 사업자의 매장 정보를 수정합니다.
 *     tags: [Business]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessUpdateRequest'
 *     responses:
 *       200:
 *         description: 매장 정보 수정 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 *       404:
 *         description: 매장 정보를 찾을 수 없음
 */
router.put('/my/profile', requireBusinessOwner, validateBody(businessUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const updateData = req.body;

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanedData).length === 0) {
      return res.status(400).json(createErrorResponse('No valid fields to update'));
    }

    const [updatedBusiness] = await db
      .update(businesses)
      .set({
        ...cleanedData,
        updatedAt: new Date()
      })
      .where(eq(businesses.userId, userId))
      .returning();

    if (!updatedBusiness) {
      return res.status(404).json(createErrorResponse('Business profile not found'));
    }

    res.json(createSuccessResponse({
      business: updatedBusiness
    }, 'Business profile updated successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/business/settlements:
 *   get:
 *     summary: 사업자 정산 내역 조회
 *     description: 현재 로그인한 사업자의 정산 내역을 조회합니다.
 *     tags: [Business Settlement]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [mileage_use, basic_coupon, event_coupon]
 *         description: 정산 타입 필터
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
 *         description: 사업자 권한 필요
 */
router.get('/settlements', requireBusinessOwner, validateQuery(paginationSchema.extend({
  status: z.enum(['requested', 'approved', 'paid', 'rejected']).optional(),
  type: z.enum(['mileage_use', 'basic_coupon', 'event_coupon']).optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit, status, type } = req.query as any;
    const offset = (page - 1) * limit;

    // Get business ID
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.userId, userId)).limit(1);
    
    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Build where conditions
    const whereConditions = [eq(businessSettlements.businessId, business.id)];
    
    if (status) {
      whereConditions.push(eq(businessSettlements.status, status));
    }
    
    if (type) {
      whereConditions.push(eq(businessSettlements.settlementType, type));
    }

    // Get settlements
    const settlements = await db
      .select()
      .from(businessSettlements)
      .where(and(...whereConditions))
      .orderBy(desc(businessSettlements.requestedAt))
      .limit(limit)
      .offset(offset);

    // Get total amounts by status
    const [stats] = await db
      .select({
        totalRequested: sql<number>`COALESCE(SUM(CASE WHEN status = 'requested' THEN amount ELSE 0 END), 0)`,
        totalApproved: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`
      })
      .from(businessSettlements)
      .where(eq(businessSettlements.businessId, business.id));

    res.json(createSuccessResponse({
      settlements,
      summary: {
        totalRequested: Number(stats.totalRequested),
        totalApproved: Number(stats.totalApproved),
        totalPaid: Number(stats.totalPaid)
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
 * /api/business/settlement-request:
 *   post:
 *     summary: 정산 요청
 *     description: 미처리된 정산 건들을 일괄 정산 요청합니다.
 *     tags: [Business Settlement]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 정산 요청 성공
 *       400:
 *         description: 정산 요청할 건이 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/settlement-request', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get business ID
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.userId, userId)).limit(1);
    
    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Update all requested settlements to approved status
    // (In real system, this would trigger an admin notification)
    const updatedSettlements = await db
      .update(businessSettlements)
      .set({ 
        status: 'approved',
        processedAt: new Date()
      })
      .where(
        and(
          eq(businessSettlements.businessId, business.id),
          eq(businessSettlements.status, 'requested')
        )
      )
      .returning();

    if (updatedSettlements.length === 0) {
      return res.status(400).json(createErrorResponse('No settlements to request'));
    }

    const totalAmount = updatedSettlements.reduce((sum, settlement) => sum + settlement.amount, 0);

    res.json(createSuccessResponse({
      requestedSettlements: updatedSettlements.length,
      totalAmount,
      message: 'Settlement request submitted for admin approval'
    }, 'Settlement request submitted successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/business/stats:
 *   get:
 *     summary: 사업자 통계 조회
 *     description: 매장의 쿠폰 사용, 마일리지 사용, 정산 통계를 조회합니다.
 *     tags: [Business Statistics]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
 *         description: 통계 기간
 *     responses:
 *       200:
 *         description: 통계 조회 성공
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
 *                       example: "month"
 *                     couponStats:
 *                       type: object
 *                       properties:
 *                         totalUsed:
 *                           type: number
 *                         basicCoupons:
 *                           type: number
 *                         eventCoupons:
 *                           type: number
 *                         totalDiscountAmount:
 *                           type: number
 *                     mileageStats:
 *                       type: object
 *                       properties:
 *                         totalTransactions:
 *                           type: number
 *                         totalAmount:
 *                           type: number
 *                         averageTransaction:
 *                           type: number
 *                     settlementStats:
 *                       type: object
 *                       properties:
 *                         totalRequested:
 *                           type: number
 *                         totalPaid:
 *                           type: number
 *                         pendingAmount:
 *                           type: number
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.get('/stats', requireBusinessOwner, validateQuery(z.object({
  period: z.enum(['today', 'week', 'month', 'year']).optional().default('month')
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { period } = req.query as any;

    // Get business ID
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.userId, userId)).limit(1);
    
    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get coupon usage stats
    const [couponStats] = await db
      .select({
        totalUsed: count(coupons.id),
        basicCoupons: sql<number>`COUNT(CASE WHEN coupon_type = 'basic' THEN 1 END)`,
        eventCoupons: sql<number>`COUNT(CASE WHEN coupon_type = 'event' THEN 1 END)`
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.usedBusinessId, business.id),
          eq(coupons.isUsed, true),
          gte(coupons.usedAt!, startDate)
        )
      );

    // Get mileage usage stats
    const [mileageStats] = await db
      .select({
        totalTransactions: count(mileageTransactions.id),
        totalAmount: sql<number>`COALESCE(SUM(ABS(amount)), 0)`
      })
      .from(mileageTransactions)
      .where(
        and(
          eq(mileageTransactions.referenceId, business.id),
          eq(mileageTransactions.transactionType, 'use'),
          gte(mileageTransactions.createdAt, startDate)
        )
      );

    // Get settlement stats
    const [settlementStats] = await db
      .select({
        totalRequested: sql<number>`COALESCE(SUM(CASE WHEN status IN ('requested', 'approved') THEN amount ELSE 0 END), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`,
        pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN status = 'requested' THEN amount ELSE 0 END), 0)`
      })
      .from(businessSettlements)
      .where(
        and(
          eq(businessSettlements.businessId, business.id),
          gte(businessSettlements.requestedAt, startDate)
        )
      );

    const averageTransaction = Number(mileageStats.totalTransactions) > 0 
      ? Number(mileageStats.totalAmount) / Number(mileageStats.totalTransactions)
      : 0;

    res.json(createSuccessResponse({
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      couponStats: {
        totalUsed: Number(couponStats.totalUsed),
        basicCoupons: Number(couponStats.basicCoupons),
        eventCoupons: Number(couponStats.eventCoupons)
      },
      mileageStats: {
        totalTransactions: Number(mileageStats.totalTransactions),
        totalAmount: Number(mileageStats.totalAmount),
        averageTransaction: Math.round(averageTransaction)
      },
      settlementStats: {
        totalRequested: Number(settlementStats.totalRequested),
        totalPaid: Number(settlementStats.totalPaid),
        pendingAmount: Number(settlementStats.pendingAmount)
      }
    }));

  } catch (error) {
    next(error);
  }
});

export default router;