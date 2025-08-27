import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { businessReviews, businesses, users } from '@buzz/database/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { requireAuth, requireBusinessOwner } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { z } from 'zod';
import { paginationSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

// Schema definitions
const reviewReplySchema = z.object({
  reply: z.string().min(1).max(1000, '답글은 1000자 이내로 작성해주세요')
});

const reviewIdSchema = z.object({
  reviewId: z.string().transform(Number)
});

/**
 * @swagger
 * /api/business/reviews:
 *   get:
 *     summary: 사업자 매장 리뷰 목록 조회
 *     description: 사업자가 자신의 매장에 작성된 리뷰를 조회합니다
 *     tags: [Business Reviews]
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
 *           default: 20
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, no_reply, unread]
 *         description: 필터 옵션 (전체, 미답변, 안읽음)
 *     responses:
 *       200:
 *         description: 리뷰 목록 조회 성공
 */
router.get('/business/reviews', 
  requireAuth, 
  requireBusinessOwner,
  validateQuery(paginationSchema.extend({
    filter: z.enum(['all', 'no_reply', 'unread']).optional().default('all')
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, filter } = req.query as any;
      const offset = (page - 1) * limit;
      const businessOwnerId = req.session.userId!;

      // Get business ID for this owner
      const [business] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.userId, businessOwnerId))
        .limit(1);

      if (!business) {
        return res.status(404).json(createErrorResponse('사업자 정보를 찾을 수 없습니다'));
      }

      // Build query conditions
      let conditions = eq(businessReviews.businessId, business.id);
      
      if (filter === 'no_reply') {
        conditions = and(conditions, isNull(businessReviews.ownerReply))!;
      } else if (filter === 'unread') {
        conditions = and(conditions, eq(businessReviews.isReadByOwner, false))!;
      }

      // Get reviews with user info
      const reviews = await db
        .select({
          id: businessReviews.id,
          rating: businessReviews.rating,
          reviewText: businessReviews.reviewText,
          images: businessReviews.images,
          ownerReply: businessReviews.ownerReply,
          ownerReplyAt: businessReviews.ownerReplyAt,
          isReadByOwner: businessReviews.isReadByOwner,
          createdAt: businessReviews.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(businessReviews)
        .innerJoin(users, eq(businessReviews.userId, users.id))
        .where(conditions)
        .orderBy(desc(businessReviews.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(businessReviews)
        .where(conditions);

      // Get unread count
      const [{ count: unreadCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(businessReviews)
        .where(and(
          eq(businessReviews.businessId, business.id),
          eq(businessReviews.isReadByOwner, false)
        )!);

      res.json(createSuccessResponse({
        reviews,
        pagination: {
          currentPage: page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: offset + reviews.length < totalCount
        },
        stats: {
          unreadCount,
          totalCount
        }
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/business/reviews/{reviewId}/reply:
 *   post:
 *     summary: 리뷰에 사장님 답글 작성
 *     description: 사업자가 리뷰에 답글을 작성합니다
 *     tags: [Business Reviews]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: 답글 작성 성공
 *       400:
 *         description: 이미 답글이 존재함
 *       404:
 *         description: 리뷰를 찾을 수 없음
 */
router.post('/business/reviews/:reviewId/reply',
  requireAuth,
  requireBusinessOwner,
  validateParams(reviewIdSchema),
  validateBody(reviewReplySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { reply } = req.body;
      const businessOwnerId = req.session.userId!;

      // Verify the review belongs to this business owner
      const [review] = await db
        .select({
          id: businessReviews.id,
          businessId: businessReviews.businessId,
          ownerReply: businessReviews.ownerReply
        })
        .from(businessReviews)
        .innerJoin(businesses, eq(businessReviews.businessId, businesses.id))
        .where(and(
          eq(businessReviews.id, Number(reviewId)),
          eq(businesses.userId, businessOwnerId)
        )!)
        .limit(1);

      if (!review) {
        return res.status(404).json(createErrorResponse('리뷰를 찾을 수 없습니다'));
      }

      if (review.ownerReply) {
        return res.status(400).json(createErrorResponse('이미 답글이 작성되었습니다. 수정 API를 사용해주세요.'));
      }

      // Add owner reply
      await db
        .update(businessReviews)
        .set({
          ownerReply: reply,
          ownerReplyAt: new Date(),
          isReadByOwner: true,
          isReadByUser: false, // 사용자가 답글을 확인해야 함
          updatedAt: new Date()
        })
        .where(eq(businessReviews.id, Number(reviewId)));

      res.json(createSuccessResponse({
        message: '답글이 성공적으로 작성되었습니다',
        reviewId: Number(reviewId),
        reply,
        repliedAt: new Date()
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/business/reviews/{reviewId}/reply:
 *   put:
 *     summary: 사장님 답글 수정
 *     description: 이미 작성한 답글을 수정합니다
 *     tags: [Business Reviews]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: 답글 수정 성공
 *       404:
 *         description: 답글을 찾을 수 없음
 */
router.put('/business/reviews/:reviewId/reply',
  requireAuth,
  requireBusinessOwner,
  validateParams(reviewIdSchema),
  validateBody(reviewReplySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { reply } = req.body;
      const businessOwnerId = req.session.userId!;

      // Verify the review belongs to this business owner and has a reply
      const [review] = await db
        .select({
          id: businessReviews.id,
          ownerReply: businessReviews.ownerReply
        })
        .from(businessReviews)
        .innerJoin(businesses, eq(businessReviews.businessId, businesses.id))
        .where(and(
          eq(businessReviews.id, Number(reviewId)),
          eq(businesses.userId, businessOwnerId)
        )!)
        .limit(1);

      if (!review) {
        return res.status(404).json(createErrorResponse('리뷰를 찾을 수 없습니다'));
      }

      if (!review.ownerReply) {
        return res.status(404).json(createErrorResponse('수정할 답글이 없습니다'));
      }

      // Update owner reply
      await db
        .update(businessReviews)
        .set({
          ownerReply: reply,
          ownerReplyAt: new Date(),
          isReadByUser: false, // 사용자가 수정된 답글을 확인해야 함
          updatedAt: new Date()
        })
        .where(eq(businessReviews.id, Number(reviewId)));

      res.json(createSuccessResponse({
        message: '답글이 성공적으로 수정되었습니다',
        reviewId: Number(reviewId),
        reply,
        updatedAt: new Date()
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/business/reviews/{reviewId}/reply:
 *   delete:
 *     summary: 사장님 답글 삭제
 *     description: 작성한 답글을 삭제합니다
 *     tags: [Business Reviews]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 답글 삭제 성공
 *       404:
 *         description: 답글을 찾을 수 없음
 */
router.delete('/business/reviews/:reviewId/reply',
  requireAuth,
  requireBusinessOwner,
  validateParams(reviewIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const businessOwnerId = req.session.userId!;

      // Verify the review belongs to this business owner
      const [review] = await db
        .select({
          id: businessReviews.id,
          ownerReply: businessReviews.ownerReply
        })
        .from(businessReviews)
        .innerJoin(businesses, eq(businessReviews.businessId, businesses.id))
        .where(and(
          eq(businessReviews.id, Number(reviewId)),
          eq(businesses.userId, businessOwnerId)
        )!)
        .limit(1);

      if (!review) {
        return res.status(404).json(createErrorResponse('리뷰를 찾을 수 없습니다'));
      }

      if (!review.ownerReply) {
        return res.status(404).json(createErrorResponse('삭제할 답글이 없습니다'));
      }

      // Delete owner reply
      await db
        .update(businessReviews)
        .set({
          ownerReply: null,
          ownerReplyAt: null,
          updatedAt: new Date()
        })
        .where(eq(businessReviews.id, Number(reviewId)));

      res.json(createSuccessResponse({
        message: '답글이 성공적으로 삭제되었습니다',
        reviewId: Number(reviewId)
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/business/reviews/{reviewId}/read:
 *   put:
 *     summary: 리뷰 읽음 처리
 *     description: 리뷰를 읽음 상태로 변경합니다
 *     tags: [Business Reviews]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 읽음 처리 성공
 */
router.put('/business/reviews/:reviewId/read',
  requireAuth,
  requireBusinessOwner,
  validateParams(reviewIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const businessOwnerId = req.session.userId!;

      // Verify the review belongs to this business owner
      const [review] = await db
        .select({ id: businessReviews.id })
        .from(businessReviews)
        .innerJoin(businesses, eq(businessReviews.businessId, businesses.id))
        .where(and(
          eq(businessReviews.id, Number(reviewId)),
          eq(businesses.userId, businessOwnerId)
        )!)
        .limit(1);

      if (!review) {
        return res.status(404).json(createErrorResponse('리뷰를 찾을 수 없습니다'));
      }

      // Mark as read
      await db
        .update(businessReviews)
        .set({
          isReadByOwner: true,
          updatedAt: new Date()
        })
        .where(eq(businessReviews.id, Number(reviewId)));

      res.json(createSuccessResponse({
        message: '리뷰를 읽음 처리했습니다',
        reviewId: Number(reviewId)
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/business/reviews/stats:
 *   get:
 *     summary: 리뷰 통계 조회
 *     description: 매장의 리뷰 관련 통계를 조회합니다
 *     tags: [Business Reviews]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 */
router.get('/business/reviews/stats',
  requireAuth,
  requireBusinessOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessOwnerId = req.session.userId!;

      // Get business ID
      const [business] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.userId, businessOwnerId))
        .limit(1);

      if (!business) {
        return res.status(404).json(createErrorResponse('사업자 정보를 찾을 수 없습니다'));
      }

      // Get various stats
      const stats = await db
        .select({
          totalReviews: sql<number>`count(*)`,
          averageRating: sql<number>`avg(${businessReviews.rating})`,
          repliedCount: sql<number>`count(case when ${businessReviews.ownerReply} is not null then 1 end)`,
          unreadCount: sql<number>`count(case when ${businessReviews.isReadByOwner} = false then 1 end)`,
          fiveStarCount: sql<number>`count(case when ${businessReviews.rating} = 5 then 1 end)`,
          fourStarCount: sql<number>`count(case when ${businessReviews.rating} = 4 then 1 end)`,
          threeStarCount: sql<number>`count(case when ${businessReviews.rating} = 3 then 1 end)`,
          twoStarCount: sql<number>`count(case when ${businessReviews.rating} = 2 then 1 end)`,
          oneStarCount: sql<number>`count(case when ${businessReviews.rating} = 1 then 1 end)`,
        })
        .from(businessReviews)
        .where(eq(businessReviews.businessId, business.id));

      const statsData = stats[0];
      const replyRate = statsData.totalReviews > 0 
        ? (statsData.repliedCount / statsData.totalReviews * 100).toFixed(1)
        : 0;

      res.json(createSuccessResponse({
        totalReviews: statsData.totalReviews || 0,
        averageRating: parseFloat(statsData.averageRating?.toFixed(1) || '0'),
        repliedCount: statsData.repliedCount || 0,
        unreadCount: statsData.unreadCount || 0,
        replyRate: `${replyRate}%`,
        ratingDistribution: {
          5: statsData.fiveStarCount || 0,
          4: statsData.fourStarCount || 0,
          3: statsData.threeStarCount || 0,
          2: statsData.twoStarCount || 0,
          1: statsData.oneStarCount || 0
        }
      }));

    } catch (error) {
      next(error);
    }
  }
);

export default router;