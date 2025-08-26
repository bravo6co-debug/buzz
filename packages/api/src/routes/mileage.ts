import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '@buzz/database';
import { users, mileageTransactions, businesses, businessSettlements } from '@buzz/database/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAuth, requireRole, requireBusinessOwner } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { mileageUseSchema, adminAdjustSchema } from '../schemas/mileage.js';
import { paginationSchema, idParamSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * /api/mileage/balance:
 *   get:
 *     summary: 마일리지 잔액 조회
 *     description: 현재 사용자의 마일리지 잔액을 조회합니다.
 *     tags: [Mileage]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 마일리지 잔액 조회 성공
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
 *                     balance:
 *                       type: number
 *                       example: 5500
 *                     totalEarned:
 *                       type: number
 *                       example: 12000
 *                     totalUsed:
 *                       type: number
 *                       example: 6500
 *       401:
 *         description: 인증 필요
 */
router.get('/balance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get current balance from user table
    const [user] = await db.select({ balance: users.mileageBalance }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Get summary statistics
    const [stats] = await db
      .select({
        totalEarned: sql<number>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)`,
        totalUsed: sql<number>`COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)`
      })
      .from(mileageTransactions)
      .where(eq(mileageTransactions.userId, userId));

    res.json(createSuccessResponse({
      balance: user.balance,
      totalEarned: Number(stats?.totalEarned || 0),
      totalUsed: Number(stats?.totalUsed || 0)
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/mileage/transactions:
 *   get:
 *     summary: 마일리지 거래 내역 조회
 *     description: 사용자의 마일리지 거래 내역을 페이지네이션으로 조회합니다.
 *     tags: [Mileage]
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
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [earn, use, admin_adjust]
 *         description: 거래 유형 필터
 *     responses:
 *       200:
 *         description: 거래 내역 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MileageResponse'
 *       401:
 *         description: 인증 필요
 */
router.get('/transactions', requireAuth, validateQuery(paginationSchema.extend({
  type: z.enum(['earn', 'use', 'admin_adjust']).optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const { page, limit, type } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where condition
    const whereConditions = [eq(mileageTransactions.userId, userId)];
    if (type) {
      whereConditions.push(eq(mileageTransactions.transactionType, type));
    }

    // Get transactions with business info
    const transactions = await db
      .select({
        id: mileageTransactions.id,
        transactionType: mileageTransactions.transactionType,
        amount: mileageTransactions.amount,
        description: mileageTransactions.description,
        referenceType: mileageTransactions.referenceType,
        referenceId: mileageTransactions.referenceId,
        createdAt: mileageTransactions.createdAt,
        businessName: businesses.businessName
      })
      .from(mileageTransactions)
      .leftJoin(businesses, eq(mileageTransactions.referenceId, businesses.id))
      .where(and(...whereConditions))
      .orderBy(desc(mileageTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get current balance
    const [user] = await db.select({ balance: users.mileageBalance }).from(users).where(eq(users.id, userId)).limit(1);

    res.json(createSuccessResponse({
      balance: user?.balance || 0,
      transactions: transactions.map(t => ({
        ...t,
        businessName: t.businessName || null
      })),
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
 * /api/mileage/qr:
 *   get:
 *     summary: 마일리지 사용 QR 코드 생성
 *     description: 매장에서 마일리지 사용을 위한 QR 코드를 생성합니다. QR 코드는 10분간 유효합니다.
 *     tags: [Mileage]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: QR 코드 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRDataResponse'
 *       401:
 *         description: 인증 필요
 */
router.get('/qr', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;

    // Get user info and balance
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      balance: users.mileageBalance
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Generate QR data with expiration time (10 minutes)
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 10 * 60 * 1000); // 10 minutes from now
    const nonce = uuidv4().substring(0, 16);

    // QR data format: MILEAGE:userId:timestamp:nonce
    const qrData = `MILEAGE:${userId}:${timestamp}:${nonce}`;

    try {
      // Generate QR code image as base64
      const qrImage = await QRCode.toDataURL(qrData, {
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json(createSuccessResponse({
        qrData,
        balance: user.balance,
        expiresAt: expiresAt.toISOString(),
        qrImage,
        userName: user.name
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
 * /api/mileage/use:
 *   post:
 *     summary: 마일리지 사용 (사업자용)
 *     description: 매장에서 고객의 마일리지를 사용 처리합니다. QR 스캔 후 호출하는 API입니다.
 *     tags: [Mileage]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MileageUseRequest'
 *     responses:
 *       200:
 *         description: 마일리지 사용 성공
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
 *                     transactionId:
 *                       type: number
 *                       example: 123
 *                     usedAmount:
 *                       type: number
 *                       example: 2000
 *                     remainingBalance:
 *                       type: number
 *                       example: 3500
 *                     settlementId:
 *                       type: number
 *                       example: 456
 *                 message:
 *                   type: string
 *                   example: "Mileage used successfully"
 *       400:
 *         description: 잘못된 요청 또는 잔액 부족
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/use', requireBusinessOwner, validateBody(mileageUseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, businessId, description } = req.body;
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
        return res.status(403).json(createErrorResponse('Business not approved for mileage transactions'));
      }
    }

    // Get user and business info
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    if (!business) {
      return res.status(404).json(createErrorResponse('Business not found'));
    }

    // Check sufficient balance
    if (user.mileageBalance < amount) {
      return res.status(400).json(createErrorResponse('Insufficient mileage balance', {
        currentBalance: user.mileageBalance,
        requestedAmount: amount
      }));
    }

    // Process transaction
    const result = await db.transaction(async (tx) => {
      // Create mileage transaction record
      const [transaction] = await tx.insert(mileageTransactions).values({
        userId,
        transactionType: 'use',
        amount: -amount, // Negative for usage
        description: description || `${business.businessName}에서 마일리지 사용`,
        referenceType: 'mileage_use',
        referenceId: businessId
      }).returning();

      // Update user's mileage balance
      const newBalance = user.mileageBalance - amount;
      await tx.update(users)
        .set({ mileageBalance: newBalance })
        .where(eq(users.id, userId));

      // Create settlement record for business
      const [settlement] = await tx.insert(businessSettlements).values({
        businessId,
        settlementType: 'mileage_use',
        amount,
        referenceType: 'mileage_transaction',
        referenceId: transaction.id,
        status: 'requested'
      }).returning();

      return {
        transaction,
        settlement,
        newBalance
      };
    });

    res.json(createSuccessResponse({
      transactionId: result.transaction.id,
      usedAmount: amount,
      remainingBalance: result.newBalance,
      settlementId: result.settlement.id,
      businessName: business.businessName
    }, 'Mileage used successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/mileage/verify-qr:
 *   post:
 *     summary: QR 코드 검증 (사업자용)
 *     description: 고객이 제시한 마일리지 QR 코드의 유효성을 검증합니다.
 *     tags: [Mileage]
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
 *                 example: "MILEAGE:123:1641234567890:abc123def456"
 *     responses:
 *       200:
 *         description: QR 검증 성공
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         name:
 *                           type: string
 *                         balance:
 *                           type: number
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 QR 데이터
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 사업자 권한 필요
 */
router.post('/verify-qr', requireBusinessOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json(createErrorResponse('Invalid QR data'));
    }

    // Parse QR data: MILEAGE:userId:timestamp:nonce
    const qrParts = qrData.split(':');
    if (qrParts.length !== 4 || qrParts[0] !== 'MILEAGE') {
      return res.status(400).json(createErrorResponse('Invalid QR format'));
    }

    const userId = parseInt(qrParts[1]);
    const timestamp = parseInt(qrParts[2]);
    const nonce = qrParts[3];

    if (isNaN(userId) || isNaN(timestamp)) {
      return res.status(400).json(createErrorResponse('Invalid QR data format'));
    }

    // Check QR expiration (10 minutes)
    const currentTime = Date.now();
    const expirationTime = timestamp + (10 * 60 * 1000);

    if (currentTime > expirationTime) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'QR code has expired',
        expiresAt: new Date(expirationTime).toISOString()
      }));
    }

    // Get user info
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      balance: users.mileageBalance,
      isActive: users.isActive
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'User not found'
      }));
    }

    if (!user.isActive) {
      return res.json(createSuccessResponse({
        valid: false,
        reason: 'User account is inactive'
      }));
    }

    res.json(createSuccessResponse({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        balance: user.balance
      },
      expiresAt: new Date(expirationTime).toISOString()
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/mileage/admin/adjust:
 *   post:
 *     summary: 관리자 마일리지 조정
 *     description: 관리자가 사용자의 마일리지를 수동으로 조정합니다.
 *     tags: [Mileage]
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
 *               - amount
 *               - description
 *               - reason
 *             properties:
 *               userId:
 *                 type: number
 *               amount:
 *                 type: number
 *                 description: 양수는 지급, 음수는 차감
 *               description:
 *                 type: string
 *                 maxLength: 200
 *               reason:
 *                 type: string
 *                 enum: [bonus, penalty, correction, event, refund]
 *     responses:
 *       200:
 *         description: 마일리지 조정 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/admin/adjust', requireRole(['admin']), validateBody(adminAdjustSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, description, reason } = req.body;

    // Get target user
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Check if adjustment would result in negative balance
    if (amount < 0 && user.mileageBalance + amount < 0) {
      return res.status(400).json(createErrorResponse('Adjustment would result in negative balance', {
        currentBalance: user.mileageBalance,
        adjustmentAmount: amount,
        resultingBalance: user.mileageBalance + amount
      }));
    }

    // Process adjustment
    const result = await db.transaction(async (tx) => {
      // Create transaction record
      const [transaction] = await tx.insert(mileageTransactions).values({
        userId,
        transactionType: 'admin_adjust',
        amount,
        description: `[관리자 조정] ${description}`,
        referenceType: 'admin',
        referenceId: req.session.userId
      }).returning();

      // Update user balance
      const newBalance = user.mileageBalance + amount;
      await tx.update(users)
        .set({ mileageBalance: newBalance })
        .where(eq(users.id, userId));

      return { transaction, newBalance };
    });

    res.json(createSuccessResponse({
      transactionId: result.transaction.id,
      previousBalance: user.mileageBalance,
      adjustmentAmount: amount,
      newBalance: result.newBalance,
      reason
    }, 'Mileage adjustment completed'));

  } catch (error) {
    next(error);
  }
});

export default router;