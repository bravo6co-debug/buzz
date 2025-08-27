import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@buzz/database';
import { users, coupons, qrTokens, mileageTransactions, businessSettlements, systemSettings } from '@buzz/database/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireBusinessOwner } from '../middleware/auth.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { QRService } from '../services/qrService.js';

const router = Router();

/**
 * @swagger
 * /api/qr/mileage:
 *   get:
 *     summary: 마일리지 사용 QR 코드 생성
 *     description: 매장에서 마일리지 사용을 위한 QR 코드를 생성합니다. 10분간 유효합니다.
 *     tags: [QR]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: QR 코드 생성 성공
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
 *                     qrData:
 *                       type: string
 *                       example: "MILEAGE:123:1641234567890:abc123def456"
 *                     qrImage:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     balance:
 *                       type: number
 *                       example: 5500
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     userName:
 *                       type: string
 *       401:
 *         description: 인증 필요
 */
router.get('/mileage', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get user info
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      balance: users.mileageBalance
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Check if user has sufficient balance
    if (user.balance <= 0) {
      return res.status(400).json(createErrorResponse('Insufficient mileage balance'));
    }

    try {
      // Generate secure JWT-based QR token
      const tokenData = await QRService.generateToken(
        userId,
        'mileage',
        undefined, // no reference ID for mileage
        { balance: user.balance, userName: user.name }
      );

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(tokenData.qrData, {
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json(createSuccessResponse({
        qrData: tokenData.qrData,
        qrImage,
        balance: user.balance,
        expiresAt: tokenData.expiresAt.toISOString(),
        userName: user.name,
        tokenId: tokenData.tokenId
      }));

    } catch (qrError) {
      console.error('QR generation error:', qrError);
      return res.status(500).json(createErrorResponse('Failed to generate QR code'));
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/coupon/{couponId}:
 *   get:
 *     summary: 쿠폰 QR 코드 생성
 *     description: 특정 쿠폰의 QR 코드를 생성합니다.
 *     tags: [QR]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 쿠폰 ID
 *     responses:
 *       200:
 *         description: QR 코드 생성 성공
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
 *                     qrData:
 *                       type: string
 *                       example: "COUPON:123:1641234567890:abc123def456"
 *                     qrImage:
 *                       type: string
 *                     coupon:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         couponType:
 *                           type: string
 *                         discountType:
 *                           type: string
 *                         discountValue:
 *                           type: number
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: 쿠폰이 이미 사용되었거나 만료됨
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 쿠폰을 찾을 수 없음
 */
router.get('/coupon/:couponId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const couponId = parseInt(req.params.couponId);

    if (isNaN(couponId)) {
      return res.status(400).json(createErrorResponse('Invalid coupon ID'));
    }

    // Get coupon info
    const [coupon] = await db.select()
      .from(coupons)
      .where(eq(coupons.id, couponId))
      .limit(1);

    if (!coupon) {
      return res.status(404).json(createErrorResponse('Coupon not found'));
    }

    // Check ownership
    if (coupon.userId !== userId) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    // Check if already used
    if (coupon.isUsed) {
      return res.status(400).json(createErrorResponse('Coupon already used'));
    }

    // Check expiration
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json(createErrorResponse('Coupon has expired'));
    }

    try {
      // Generate secure JWT-based QR token
      const tokenData = await QRService.generateToken(
        userId,
        'coupon',
        couponId,
        {
          couponType: coupon.couponType,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          expiresAt: coupon.expiresAt
        }
      );

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(tokenData.qrData, {
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json(createSuccessResponse({
        qrData: tokenData.qrData,
        qrImage,
        tokenId: tokenData.tokenId,
        expiresAt: tokenData.expiresAt.toISOString(),
        coupon: {
          id: coupon.id,
          couponType: coupon.couponType,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          expiresAt: coupon.expiresAt
        }
      }));

    } catch (qrError) {
      console.error('QR generation error:', qrError);
      return res.status(500).json(createErrorResponse('Failed to generate QR code'));
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/generate:
 *   post:
 *     summary: 범용 QR 코드 생성
 *     description: 주어진 데이터로 QR 코드를 생성합니다.
 *     tags: [QR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: QR 코드에 인코딩할 데이터
 *               size:
 *                 type: number
 *                 default: 256
 *                 description: QR 코드 크기 (픽셀)
 *     responses:
 *       200:
 *         description: QR 코드 생성 성공
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
 *                     qrImage:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     inputData:
 *                       type: string
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: QR 코드 생성 실패
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, size = 256 } = req.body;

    if (!data || typeof data !== 'string') {
      return res.status(400).json(createErrorResponse('Data is required'));
    }

    if (data.length > 1000) {
      return res.status(400).json(createErrorResponse('Data too long (max 1000 characters)'));
    }

    const qrSize = Math.min(Math.max(size, 64), 512); // Between 64 and 512 pixels

    try {
      const qrImage = await QRCode.toDataURL(data, {
        type: 'image/png',
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json(createSuccessResponse({
        qrImage,
        inputData: data,
        size: qrSize
      }));

    } catch (qrError) {
      console.error('QR generation error:', qrError);
      return res.status(500).json(createErrorResponse('Failed to generate QR code'));
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/verify:
 *   post:
 *     summary: QR 코드 검증 (사업자용)
 *     description: 고객이 제시한 QR 코드의 유효성을 검증합니다.
 *     tags: [QR]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrData
 *             properties:
 *               qrData:
 *                 type: string
 *                 description: 스캔한 QR 코드 데이터
 *     responses:
 *       200:
 *         description: QR 코드 검증 결과
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
 *                     valid:
 *                       type: boolean
 *                     type:
 *                       type: string
 *                       enum: [coupon, mileage]
 *                     user:
 *                       type: object
 *                     coupon:
 *                       type: object
 *                       description: 쿠폰 타입일 때만 포함
 *                     balance:
 *                       type: number
 *                       description: 마일리지 타입일 때만 포함
 *                     reason:
 *                       type: string
 *                       description: 검증 실패 시 사유
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/verify', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json(createErrorResponse('QR data is required'));
    }

    // Verify token using QR service
    const verification = await QRService.verifyToken(qrData);
    
    if (!verification.valid) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: verification.reason
      }));
    }

    const { payload, dbToken } = verification;
    
    // Log verification attempt
    await QRService.logAction(
      payload.tokenId,
      payload.userId,
      'verified',
      payload.type,
      { businessUserId: req.session.userId }
    );

    // Get user info
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      mileageBalance: users.mileageBalance,
      isActive: users.isActive
    }).from(users).where(eq(users.id, payload.userId)).limit(1);

    if (!user || !user.isActive) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'User account is inactive'
      }));
    }

    const responseData: any = {
      valid: true,
      type: payload.type,
      tokenId: payload.tokenId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    if (payload.type === 'coupon' && payload.referenceId) {
      // Get coupon details
      const [coupon] = await db.select()
        .from(coupons)
        .where(eq(coupons.id, payload.referenceId))
        .limit(1);
      
      if (!coupon || coupon.isUsed) {
        return res.json(createSuccessResponse({
          valid: false,
          reason: coupon ? 'Coupon already used' : 'Coupon not found'
        }));
      }

      responseData.coupon = {
        id: coupon.id,
        couponType: coupon.couponType,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt
      };
    } else if (payload.type === 'mileage') {
      responseData.balance = user.mileageBalance;
    }

    res.json(createSuccessResponse(responseData));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/use/mileage:
 *   post:
 *     summary: 마일리지 QR 사용 (사업자용)
 *     description: 검증된 마일리지 QR를 사용 처리합니다.
 *     tags: [QR]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - amount
 *               - businessId
 *             properties:
 *               tokenId:
 *                 type: number
 *               amount:
 *                 type: number
 *                 description: 사용할 마일리지 금액
 *               businessId:
 *                 type: number
 *               description:
 *                 type: string
 *                 default: "매장에서 사용"
 *     responses:
 *       200:
 *         description: 마일리지 사용 성공
 *       400:
 *         description: 잘못된 요청 또는 잔액 부족
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/use/mileage', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenId, amount, businessId, description = '매장에서 사용' } = req.body;
    const businessUserId = req.session.userId!;

    if (!tokenId || !amount || amount <= 0 || !businessId) {
      return res.status(400).json(createErrorResponse('Invalid request parameters'));
    }

    // Get token info
    const [dbToken] = await db.select()
      .from(qrTokens)
      .where(eq(qrTokens.id, tokenId))
      .limit(1);

    if (!dbToken || dbToken.tokenType !== 'mileage' || dbToken.isUsed) {
      return res.status(400).json(createErrorResponse('Invalid or already used token'));
    }

    // Get user info
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, dbToken.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    if (user.mileageBalance < amount) {
      return res.status(400).json(createErrorResponse('Insufficient mileage balance'));
    }

    // Process transaction
    const result = await db.transaction(async (tx) => {
      // Update user balance
      await tx.update(users)
        .set({ mileageBalance: user.mileageBalance - amount })
        .where(eq(users.id, dbToken.userId));

      // Create mileage transaction record
      const [transaction] = await tx.insert(mileageTransactions).values({
        userId: dbToken.userId,
        transactionType: 'use',
        amount: -amount,
        description,
        referenceType: 'qr_usage',
        referenceId: businessId
      }).returning();

      return { transaction };
    });

    // Mark token as used
    await QRService.useToken(tokenId, businessUserId, businessId, amount);

    res.json(createSuccessResponse({
      message: 'Mileage used successfully',
      transaction: result.transaction,
      newBalance: user.mileageBalance - amount
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/use/coupon:
 *   post:
 *     summary: 쿠폰 QR 사용 (사업자용)
 *     description: 검증된 쿠폰 QR를 사용 처리합니다.
 *     tags: [QR]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - businessId
 *             properties:
 *               tokenId:
 *                 type: number
 *               businessId:
 *                 type: number
 *               orderAmount:
 *                 type: number
 *                 description: 주문 금액 (퍼센트 할인 계산용)
 *     responses:
 *       200:
 *         description: 쿠폰 사용 성공
 *       400:
 *         description: 잘못된 요청 또는 이미 사용된 쿠폰
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/use/coupon', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenId, businessId, orderAmount } = req.body;
    const businessUserId = req.session.userId!;

    if (!tokenId || !businessId) {
      return res.status(400).json(createErrorResponse('Token ID and Business ID are required'));
    }

    // Get token info
    const [dbToken] = await db.select()
      .from(qrTokens)
      .where(eq(qrTokens.id, tokenId))
      .limit(1);

    if (!dbToken || dbToken.tokenType !== 'coupon' || dbToken.isUsed) {
      return res.status(400).json(createErrorResponse('Invalid or already used token'));
    }

    if (!dbToken.referenceId) {
      return res.status(400).json(createErrorResponse('Invalid coupon token'));
    }

    // Get coupon info
    const [coupon] = await db.select()
      .from(coupons)
      .where(eq(coupons.id, dbToken.referenceId))
      .limit(1);

    if (!coupon || coupon.isUsed) {
      return res.status(400).json(createErrorResponse('Coupon not found or already used'));
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
        .where(eq(coupons.id, coupon.id));

      // Create settlement record
      const settlementAmount = discountAmount - governmentSupport;
      const [settlement] = await tx.insert(businessSettlements).values({
        businessId,
        settlementType: coupon.couponType === 'event' ? 'event_coupon' : 'basic_coupon',
        amount: settlementAmount,
        referenceType: 'coupon',
        referenceId: coupon.id,
        status: 'requested'
      }).returning();

      return { settlement, discountAmount, governmentSupport };
    });

    // Mark token as used
    await QRService.useToken(
      tokenId,
      businessUserId,
      businessId,
      undefined, // amount is null for coupons
      result.discountAmount,
      result.governmentSupport
    );

    res.json(createSuccessResponse({
      message: 'Coupon used successfully',
      couponId: coupon.id,
      discountAmount: result.discountAmount,
      governmentSupport: result.governmentSupport,
      settlementId: result.settlement.id
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/qr/cleanup:
 *   post:
 *     summary: 만료된 QR 토큰 정리
 *     description: 만료된 미사용 QR 토큰을 정리합니다. (관리자용)
 *     tags: [QR]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 정리 완료
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
 *                     cleaned:
 *                       type: number
 *                       description: 정리된 토큰 수
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/cleanup', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cleanedCount = await QRService.cleanupExpiredTokens();
    
    res.json(createSuccessResponse({
      cleaned: cleanedCount,
      message: `${cleanedCount} expired tokens cleaned up`
    }));
  } catch (error) {
    next(error);
  }
});

export default router;