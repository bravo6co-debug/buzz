import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '@buzz/database';
import { users, coupons, businesses, businessSettlements, systemSettings } from '@buzz/database/schema';
import { eq, and, desc, isNull, gte, or } from 'drizzle-orm';
import { requireAuth, requireRole, requireBusinessOwner } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { couponVerifySchema, couponUseSchema, couponCreateSchema } from '../schemas/coupon.js';
import { paginationSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: 사용자 쿠폰 목록 조회
 *     description: 현재 사용자의 보유 쿠폰 목록을 조회합니다.
 *     tags: [Coupon]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [basic, event, mileage_qr]
 *         description: 쿠폰 타입 필터
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, used, expired]
 *         description: 쿠폰 상태 필터
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponResponse'
 *       401:
 *         description: 인증 필요
 */
router.get('/', requireAuth, validateQuery(paginationSchema.extend({
  type: z.enum(['basic', 'event', 'mileage_qr']).optional(),
  status: z.enum(['available', 'used', 'expired']).optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit, type, status } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(coupons.userId, userId)];
    
    if (type) {
      whereConditions.push(eq(coupons.couponType, type));
    }

    // Status filter
    const currentDate = new Date();
    if (status === 'used') {
      whereConditions.push(eq(coupons.isUsed, true));
    } else if (status === 'expired') {
      whereConditions.push(eq(coupons.isUsed, false));
      whereConditions.push(gte(currentDate, coupons.expiresAt!));
    } else if (status === 'available') {
      whereConditions.push(eq(coupons.isUsed, false));
      whereConditions.push(
        and(
          isNull(coupons.expiresAt),
          gte(coupons.expiresAt!, currentDate)
        )
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

    // Generate QR codes for unused coupons
    const couponsWithQR = await Promise.all(
      userCoupons.map(async (coupon) => {
        let qrData = null;
        let qrImage = null;

        if (!coupon.isUsed) {
          const timestamp = Date.now();
          const nonce = uuidv4().substring(0, 16);
          qrData = `COUPON:${coupon.id}:${timestamp}:${nonce}`;

          try {
            qrImage = await QRCode.toDataURL(qrData, {
              type: 'image/png',
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          } catch (error) {
            console.error('QR generation error for coupon', coupon.id, error);
          }
        }

        return {
          ...coupon,
          qrData,
          qrImage
        };
      })
    );

    res.json(createSuccessResponse({
      coupons: couponsWithQR,
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
 * /api/coupons/verify:
 *   post:
 *     summary: 쿠폰 QR 코드 검증 (사업자용)
 *     description: 고객이 제시한 쿠폰 QR 코드의 유효성을 검증합니다.
 *     tags: [Coupon]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponVerifyRequest'
 *     responses:
 *       200:
 *         description: 쿠폰 검증 결과
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponVerifyResponse'
 *       400:
 *         description: 잘못된 QR 데이터
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/verify', requireBusinessOwner, validateBody(couponVerifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrData } = req.body;

    // Parse QR data: COUPON:couponId:timestamp:nonce
    const qrParts = qrData.split(':');
    if (qrParts.length !== 4 || qrParts[0] !== 'COUPON') {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'Invalid QR format'
      }));
    }

    const couponId = parseInt(qrParts[1]);
    const timestamp = parseInt(qrParts[2]);

    if (isNaN(couponId) || isNaN(timestamp)) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'Invalid QR data format'
      }));
    }

    // Check QR age (should be recent, within 30 minutes)
    const currentTime = Date.now();
    const qrAge = currentTime - timestamp;
    if (qrAge > 30 * 60 * 1000) { // 30 minutes
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'QR code is too old'
      }));
    }

    // Get coupon with user info
    const [couponData] = await db
      .select({
        coupon: coupons,
        userName: users.name,
        userId: users.id
      })
      .from(coupons)
      .innerJoin(users, eq(coupons.userId, users.id))
      .where(eq(coupons.id, couponId))
      .limit(1);

    if (!couponData) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'Coupon not found'
      }));
    }

    const { coupon, userName, userId } = couponData;

    // Check if already used
    if (coupon.isUsed) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'Coupon already used',
        usedAt: coupon.usedAt
      }));
    }

    // Check expiration
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'Coupon has expired',
        expiresAt: coupon.expiresAt
      }));
    }

    // Check user account status
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.isActive) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'User account is inactive'
      }));
    }

    res.json(createSuccessResponse({
      valid: true,
      coupon: {
        id: coupon.id,
        couponType: coupon.couponType,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt
      },
      user: {
        id: userId,
        name: userName
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/coupons/use:
 *   post:
 *     summary: 쿠폰 사용 처리 (사업자용)
 *     description: 검증된 쿠폰을 사용 처리하고 정산 정보를 생성합니다.
 *     tags: [Coupon]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponUseRequest'
 *     responses:
 *       200:
 *         description: 쿠폰 사용 성공
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
 *                     couponId:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     settlementId:
 *                       type: number
 *                     governmentSupport:
 *                       type: number
 *                       description: 정부 지원 금액 (이벤트 쿠폰의 경우)
 *       400:
 *         description: 이미 사용된 쿠폰 또는 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/use', requireBusinessOwner, validateBody(couponUseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { couponId, businessId, orderAmount } = req.body;
    const businessUserId = req.session.userId!;

    // Verify business ownership or admin role
    if (req.session.userRole !== 'admin') {
      const [business] = await db.select().from(businesses).where(and(
        eq(businesses.id, businessId),
        eq(businesses.userId, businessUserId)
      )).limit(1);

      if (!business) {
        return res.status(403).json(createErrorResponse('Access denied: Business not found or not owned by user'));
      }

      if (!business.isApproved) {
        return res.status(403).json(createErrorResponse('Business not approved for coupon transactions'));
      }
    }

    // Get coupon and business info
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);

    if (!coupon) {
      return res.status(404).json(createErrorResponse('Coupon not found'));
    }

    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Check if already used
    if (coupon.isUsed) {
      return res.status(400).json(createErrorResponse('Coupon already used'));
    }

    // Check expiration
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json(createErrorResponse('Coupon has expired'));
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'amount') {
      discountAmount = coupon.discountValue!;
    } else if (coupon.discountType === 'percentage' && orderAmount) {
      discountAmount = Math.floor(orderAmount * (coupon.discountValue! / 100));
    }

    // Calculate government support for event coupons
    let governmentSupport = 0;
    if (coupon.couponType === 'event') {
      // Get government support ratio from system settings
      const [supportRatioSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'event_coupon_government_ratio'))
        .limit(1);
      
      const supportRatio = supportRatioSetting ? parseInt(supportRatioSetting.settingValue) : 50;
      governmentSupport = Math.floor(discountAmount * (supportRatio / 100));
    }

    // Process transaction
    const result = await db.transaction(async (tx) => {
      // Mark coupon as used
      await tx.update(coupons)
        .set({
          isUsed: true,
          usedAt: new Date(),
          usedBusinessId: businessId
        })
        .where(eq(coupons.id, couponId));

      // Create settlement record
      const settlementAmount = discountAmount - governmentSupport; // Business pays the difference
      const [settlement] = await tx.insert(businessSettlements).values({
        businessId,
        settlementType: coupon.couponType === 'event' ? 'event_coupon' : 'basic_coupon',
        amount: settlementAmount,
        referenceType: 'coupon',
        referenceId: couponId,
        status: 'requested'
      }).returning();

      return { settlement, discountAmount, governmentSupport };
    });

    res.json(createSuccessResponse({
      couponId,
      discountAmount: result.discountAmount,
      settlementId: result.settlement.id,
      governmentSupport: result.governmentSupport,
      businessName: business.businessName
    }, 'Coupon used successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/coupons/issue:
 *   post:
 *     summary: 쿠폰 발급 (관리자용)
 *     description: 관리자가 사용자에게 쿠폰을 발급합니다.
 *     tags: [Coupon]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - couponType
 *               - discountType
 *               - discountValue
 *             properties:
 *               userId:
 *                 type: number
 *                 description: 쿠폰을 받을 사용자 ID
 *               couponType:
 *                 type: string
 *                 enum: [basic, event]
 *               discountType:
 *                 type: string
 *                 enum: [amount, percentage]
 *               discountValue:
 *                 type: number
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: 만료일 (선택, 기본값 30일)
 *     responses:
 *       201:
 *         description: 쿠폰 발급 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/issue', requireRole(['admin']), validateBody(couponCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, couponType, discountType, discountValue, expiresAt } = req.body;

    // Verify user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Set default expiration (30 days from now)
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30);

    const [newCoupon] = await db.insert(coupons).values({
      userId,
      couponType,
      discountType,
      discountValue,
      isUsed: false,
      expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiration
    }).returning();

    res.status(201).json(createSuccessResponse({
      coupon: newCoupon
    }, 'Coupon issued successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/coupons/issue-welcome:
 *   post:
 *     summary: 신규 가입자 환영 쿠폰 자동 발급
 *     description: 새로 가입한 사용자에게 환영 쿠폰을 자동으로 발급합니다. (내부 API)
 *     tags: [Coupon]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: number
 *               isReferralSignup:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: 환영 쿠폰 발급 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/issue-welcome', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, isReferralSignup = false } = req.body;

    // Get system settings for coupon values
    const settings = await db.select().from(systemSettings).where(
      or(
        eq(systemSettings.settingKey, 'basic_coupon_amount'),
        eq(systemSettings.settingKey, 'basic_coupon_percentage'),
        eq(systemSettings.settingKey, 'event_coupon_percentage')
      )
    );

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.settingKey] = setting.settingValue;
      return acc;
    }, {} as Record<string, string>);

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30); // 30 days

    const couponsToIssue = [];

    // Basic amount coupon (3,000원)
    couponsToIssue.push({
      userId,
      couponType: 'basic' as const,
      discountType: 'amount' as const,
      discountValue: parseInt(settingsMap.basic_coupon_amount || '3000'),
      isUsed: false,
      expiresAt: expiration
    });

    // Basic percentage coupon (10%)
    couponsToIssue.push({
      userId,
      couponType: 'basic' as const,
      discountType: 'percentage' as const,
      discountValue: parseInt(settingsMap.basic_coupon_percentage || '10'),
      isUsed: false,
      expiresAt: expiration
    });

    // Event coupon for referral signups (30%)
    if (isReferralSignup) {
      couponsToIssue.push({
        userId,
        couponType: 'event' as const,
        discountType: 'percentage' as const,
        discountValue: parseInt(settingsMap.event_coupon_percentage || '30'),
        isUsed: false,
        expiresAt: expiration
      });
    }

    // Insert all coupons
    const issuedCoupons = await db.insert(coupons).values(couponsToIssue).returning();

    res.status(201).json(createSuccessResponse({
      coupons: issuedCoupons,
      count: issuedCoupons.length
    }, 'Welcome coupons issued successfully'));

  } catch (error) {
    next(error);
  }
});

export default router;