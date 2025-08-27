import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { 
  referralCampaigns, 
  userTemplates, 
  templateAnalytics,
  userAchievements,
  referrals,
  users 
} from '@buzz/database/schema';
import { eq, and, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Schema definitions
const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  targetConversions: z.number().int().positive().default(10),
  rewardMultiplier: z.number().min(0.5).max(3.0).default(1.0),
  expiresAt: z.string().datetime().optional(),
  utmSource: z.string().default('referral'),
  utmMedium: z.string().default('social'),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional()
});

const updateCampaignSchema = createCampaignSchema.partial();

const campaignIdSchema = z.object({
  campaignId: z.string().transform(Number)
});

/**
 * @swagger
 * /api/referrals/campaigns:
 *   post:
 *     summary: 캠페인 생성
 *     description: 새로운 리퍼럴 캠페인을 생성합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaign'
 *     responses:
 *       201:
 *         description: 캠페인 생성 성공
 */
router.post('/campaigns',
  requireAuth,
  validateBody(createCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const data = req.body;

      // Generate unique UTM campaign identifier
      const utmCampaign = `${data.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 8)}`;

      const [campaign] = await db.insert(referralCampaigns).values({
        userId,
        name: data.name,
        description: data.description,
        targetConversions: data.targetConversions,
        rewardMultiplier: data.rewardMultiplier?.toString(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
      }).returning();

      // Update user achievements - XP for creating campaign
      await db.update(userAchievements)
        .set({
          totalXp: sql`${userAchievements.totalXp} + 50`,
          updatedAt: new Date()
        })
        .where(eq(userAchievements.userId, userId));

      res.status(201).json(createSuccessResponse({
        campaign,
        message: '캠페인이 성공적으로 생성되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/referrals/campaigns:
 *   get:
 *     summary: 캠페인 목록 조회
 *     description: 사용자의 캠페인 목록을 조회합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, all]
 *     responses:
 *       200:
 *         description: 캠페인 목록 조회 성공
 */
router.get('/campaigns',
  requireAuth,
  validateQuery(z.object({
    status: z.enum(['active', 'expired', 'all']).default('all')
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { status } = req.query as any;

      let conditions = eq(referralCampaigns.userId, userId);
      const now = new Date();

      if (status === 'active') {
        conditions = and(
          conditions,
          eq(referralCampaigns.isActive, true),
          sql`${referralCampaigns.expiresAt} IS NULL OR ${referralCampaigns.expiresAt} > ${now}`
        )!;
      } else if (status === 'expired') {
        conditions = and(
          conditions,
          lte(referralCampaigns.expiresAt, now)
        )!;
      }

      // Get campaigns with stats
      const campaigns = await db
        .select({
          campaign: referralCampaigns,
          totalClicks: sql<number>`
            COALESCE(SUM(${templateAnalytics.clicks}), 0)
          `,
          totalConversions: sql<number>`
            COALESCE(SUM(${templateAnalytics.conversions}), 0)
          `,
          totalRevenue: sql<number>`
            COALESCE(SUM(${templateAnalytics.revenueGenerated}), 0)
          `
        })
        .from(referralCampaigns)
        .leftJoin(
          templateAnalytics,
          eq(referralCampaigns.id, templateAnalytics.campaignId)
        )
        .where(conditions)
        .groupBy(referralCampaigns.id)
        .orderBy(desc(referralCampaigns.createdAt));

      res.json(createSuccessResponse({
        campaigns,
        total: campaigns.length
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/referrals/campaigns/{campaignId}:
 *   get:
 *     summary: 캠페인 상세 조회
 *     description: 특정 캠페인의 상세 정보와 통계를 조회합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 캠페인 상세 조회 성공
 */
router.get('/campaigns/:campaignId',
  requireAuth,
  validateParams(campaignIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId } = req.params;

      // Get campaign with detailed stats
      const [campaign] = await db
        .select({
          campaign: referralCampaigns,
          totalViews: sql<number>`
            COALESCE(SUM(${templateAnalytics.views}), 0)
          `,
          totalClicks: sql<number>`
            COALESCE(SUM(${templateAnalytics.clicks}), 0)
          `,
          totalConversions: sql<number>`
            COALESCE(SUM(${templateAnalytics.conversions}), 0)
          `,
          totalRevenue: sql<number>`
            COALESCE(SUM(${templateAnalytics.revenueGenerated}), 0)
          `,
          conversionRate: sql<number>`
            CASE 
              WHEN COALESCE(SUM(${templateAnalytics.clicks}), 0) > 0 
              THEN (COALESCE(SUM(${templateAnalytics.conversions}), 0) * 100.0 / COALESCE(SUM(${templateAnalytics.clicks}), 0))
              ELSE 0 
            END
          `
        })
        .from(referralCampaigns)
        .leftJoin(
          templateAnalytics,
          eq(referralCampaigns.id, templateAnalytics.campaignId)
        )
        .where(and(
          eq(referralCampaigns.id, Number(campaignId)),
          eq(referralCampaigns.userId, userId)
        )!)
        .groupBy(referralCampaigns.id);

      if (!campaign) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // Get templates for this campaign
      const templates = await db
        .select()
        .from(userTemplates)
        .where(eq(userTemplates.campaignId, Number(campaignId)))
        .orderBy(desc(userTemplates.performanceScore));

      // Get recent conversions
      const recentConversions = await db
        .select({
          referral: referrals,
          userName: users.name
        })
        .from(referrals)
        .innerJoin(users, eq(referrals.refereeId, users.id))
        .where(and(
          eq(referrals.referrerId, userId),
          gte(referrals.createdAt, sql`NOW() - INTERVAL '30 days'`)
        )!)
        .orderBy(desc(referrals.createdAt))
        .limit(10);

      res.json(createSuccessResponse({
        campaign,
        templates,
        recentConversions,
        referralLink: `${process.env.FRONTEND_URL}/signup?ref=${req.session.userReferralCode}&utm_source=${campaign.campaign.utmSource}&utm_medium=${campaign.campaign.utmMedium}&utm_campaign=${campaign.campaign.utmCampaign}`
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/referrals/campaigns/{campaignId}:
 *   put:
 *     summary: 캠페인 수정
 *     description: 캠페인 정보를 수정합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 */
router.put('/campaigns/:campaignId',
  requireAuth,
  validateParams(campaignIdSchema),
  validateBody(updateCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId } = req.params;
      const updates = req.body;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(referralCampaigns)
        .where(and(
          eq(referralCampaigns.id, Number(campaignId)),
          eq(referralCampaigns.userId, userId)
        )!)
        .limit(1);

      if (!existing) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // Update campaign
      const [updated] = await db
        .update(referralCampaigns)
        .set({
          ...updates,
          rewardMultiplier: updates.rewardMultiplier?.toString(),
          expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : existing.expiresAt,
          updatedAt: new Date()
        })
        .where(eq(referralCampaigns.id, Number(campaignId)))
        .returning();

      res.json(createSuccessResponse({
        campaign: updated,
        message: '캠페인이 수정되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/referrals/campaigns/{campaignId}/toggle:
 *   post:
 *     summary: 캠페인 활성화/비활성화
 *     description: 캠페인 상태를 토글합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 */
router.post('/campaigns/:campaignId/toggle',
  requireAuth,
  validateParams(campaignIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId } = req.params;

      // Get current status
      const [campaign] = await db
        .select({ isActive: referralCampaigns.isActive })
        .from(referralCampaigns)
        .where(and(
          eq(referralCampaigns.id, Number(campaignId)),
          eq(referralCampaigns.userId, userId)
        )!)
        .limit(1);

      if (!campaign) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // Toggle status
      const [updated] = await db
        .update(referralCampaigns)
        .set({
          isActive: !campaign.isActive,
          updatedAt: new Date()
        })
        .where(eq(referralCampaigns.id, Number(campaignId)))
        .returning();

      res.json(createSuccessResponse({
        campaign: updated,
        message: `캠페인이 ${updated.isActive ? '활성화' : '비활성화'}되었습니다`
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/referrals/campaigns/{campaignId}/stats:
 *   get:
 *     summary: 캠페인 상세 통계
 *     description: 캠페인의 시간대별, 일별 상세 통계를 조회합니다
 *     tags: [Campaigns]
 *     security:
 *       - session: []
 */
router.get('/campaigns/:campaignId/stats',
  requireAuth,
  validateParams(campaignIdSchema),
  validateQuery(z.object({
    period: z.enum(['hour', 'day', 'week', 'month']).default('day')
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId } = req.params;
      const { period } = req.query as any;

      // Verify ownership
      const [campaign] = await db
        .select()
        .from(referralCampaigns)
        .where(and(
          eq(referralCampaigns.id, Number(campaignId)),
          eq(referralCampaigns.userId, userId)
        )!)
        .limit(1);

      if (!campaign) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // Get time-based analytics
      let dateFormat = '';
      let interval = '';

      switch (period) {
        case 'hour':
          dateFormat = 'YYYY-MM-DD HH24:00';
          interval = '24 hours';
          break;
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          interval = '7 days';
          break;
        case 'week':
          dateFormat = 'YYYY-WW';
          interval = '4 weeks';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          interval = '3 months';
          break;
      }

      const analytics = await db
        .select({
          period: sql<string>`TO_CHAR(${templateAnalytics.date}, ${dateFormat})`,
          views: sql<number>`SUM(${templateAnalytics.views})`,
          clicks: sql<number>`SUM(${templateAnalytics.clicks})`,
          conversions: sql<number>`SUM(${templateAnalytics.conversions})`,
          revenue: sql<number>`SUM(${templateAnalytics.revenueGenerated})`,
          ctr: sql<number>`
            CASE 
              WHEN SUM(${templateAnalytics.views}) > 0 
              THEN (SUM(${templateAnalytics.clicks}) * 100.0 / SUM(${templateAnalytics.views}))
              ELSE 0 
            END
          `,
          conversionRate: sql<number>`
            CASE 
              WHEN SUM(${templateAnalytics.clicks}) > 0 
              THEN (SUM(${templateAnalytics.conversions}) * 100.0 / SUM(${templateAnalytics.clicks}))
              ELSE 0 
            END
          `
        })
        .from(templateAnalytics)
        .where(and(
          eq(templateAnalytics.campaignId, Number(campaignId)),
          gte(templateAnalytics.date, sql`NOW() - INTERVAL ${interval}`)
        )!)
        .groupBy(sql`TO_CHAR(${templateAnalytics.date}, ${dateFormat})`)
        .orderBy(sql`TO_CHAR(${templateAnalytics.date}, ${dateFormat})`);

      res.json(createSuccessResponse({
        campaign,
        analytics,
        period
      }));

    } catch (error) {
      next(error);
    }
  }
);

export default router;