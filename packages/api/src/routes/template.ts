import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { 
  userTemplates, 
  templateAnalytics, 
  referralCampaigns,
  userAchievements 
} from '@buzz/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

// Schema definitions
const createTemplateSchema = z.object({
  campaignId: z.number().int().positive(),
  platform: z.enum(['kakao', 'naver', 'instagram', 'facebook', 'twitter']),
  templateName: z.string().min(1).max(100),
  templateText: z.string().min(10).max(1000),
  hashtags: z.array(z.string()).optional(),
  callToAction: z.string().max(200).optional(),
  isAiGenerated: z.boolean().optional()
});

const updateTemplateSchema = createTemplateSchema.partial().omit({ campaignId: true });

const templateIdSchema = z.object({
  templateId: z.string().transform(Number)
});

const aiGenerateSchema = z.object({
  campaignId: z.number().int().positive(),
  platform: z.enum(['kakao', 'naver', 'instagram', 'facebook', 'twitter']),
  tone: z.enum(['casual', 'formal', 'exciting', 'urgent']).optional(),
  targetAudience: z.string().optional(),
  includeEmoji: z.boolean().optional(),
  keywords: z.array(z.string()).optional()
});

/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: 템플릿 생성
 *     description: 새로운 마케팅 템플릿을 생성합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.post('/templates',
  requireAuth,
  validateBody(createTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const data = req.body;

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(referralCampaigns)
        .where(and(
          eq(referralCampaigns.id, data.campaignId),
          eq(referralCampaigns.userId, userId)
        )!)
        .limit(1);

      if (!campaign) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // Check if template already exists for this platform
      const existing = await db
        .select()
        .from(userTemplates)
        .where(and(
          eq(userTemplates.userId, userId),
          eq(userTemplates.campaignId, data.campaignId),
          eq(userTemplates.platform, data.platform)
        )!)
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json(createErrorResponse('해당 플랫폼의 템플릿이 이미 존재합니다'));
      }

      // Create template
      const [template] = await db.insert(userTemplates).values({
        userId,
        campaignId: data.campaignId,
        platform: data.platform,
        templateName: data.templateName,
        templateText: data.templateText,
        hashtags: data.hashtags ? JSON.stringify(data.hashtags) : null,
        callToAction: data.callToAction,
        isAiGenerated: data.isAiGenerated || false,
        performanceScore: '0.00'
      }).returning();

      // Award XP for creating template
      await db.update(userAchievements)
        .set({
          totalXp: sql`${userAchievements.totalXp} + 20`,
          updatedAt: new Date()
        })
        .where(eq(userAchievements.userId, userId));

      res.status(201).json(createSuccessResponse({
        template,
        message: '템플릿이 성공적으로 생성되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: 템플릿 목록 조회
 *     description: 사용자의 템플릿 목록을 조회합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.get('/templates',
  requireAuth,
  validateQuery(z.object({
    campaignId: z.string().transform(Number).optional(),
    platform: z.enum(['kakao', 'naver', 'instagram', 'facebook', 'twitter']).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId, platform } = req.query as any;

      let conditions = eq(userTemplates.userId, userId);
      
      if (campaignId) {
        conditions = and(conditions, eq(userTemplates.campaignId, campaignId))!;
      }
      
      if (platform) {
        conditions = and(conditions, eq(userTemplates.platform, platform))!;
      }

      const templates = await db
        .select({
          template: userTemplates,
          campaign: referralCampaigns,
          analytics: {
            totalViews: sql<number>`
              COALESCE(SUM(${templateAnalytics.views}), 0)
            `,
            totalClicks: sql<number>`
              COALESCE(SUM(${templateAnalytics.clicks}), 0)
            `,
            totalConversions: sql<number>`
              COALESCE(SUM(${templateAnalytics.conversions}), 0)
            `
          }
        })
        .from(userTemplates)
        .leftJoin(referralCampaigns, eq(userTemplates.campaignId, referralCampaigns.id))
        .leftJoin(templateAnalytics, eq(userTemplates.id, templateAnalytics.templateId))
        .where(conditions)
        .groupBy(userTemplates.id, referralCampaigns.id)
        .orderBy(desc(userTemplates.performanceScore));

      res.json(createSuccessResponse({
        templates,
        total: templates.length
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates/{templateId}:
 *   get:
 *     summary: 템플릿 상세 조회
 *     description: 특정 템플릿의 상세 정보를 조회합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.get('/templates/:templateId',
  requireAuth,
  validateParams(templateIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { templateId } = req.params;

      const [template] = await db
        .select({
          template: userTemplates,
          campaign: referralCampaigns,
          weeklyStats: sql<any>`
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'date', ${templateAnalytics.date},
                'views', ${templateAnalytics.views},
                'clicks', ${templateAnalytics.clicks},
                'conversions', ${templateAnalytics.conversions}
              ) ORDER BY ${templateAnalytics.date} DESC
            ) FILTER (WHERE ${templateAnalytics.date} >= NOW() - INTERVAL '7 days')
          `
        })
        .from(userTemplates)
        .leftJoin(referralCampaigns, eq(userTemplates.campaignId, referralCampaigns.id))
        .leftJoin(templateAnalytics, eq(userTemplates.id, templateAnalytics.templateId))
        .where(and(
          eq(userTemplates.id, Number(templateId)),
          eq(userTemplates.userId, userId)
        )!)
        .groupBy(userTemplates.id, referralCampaigns.id);

      if (!template) {
        return res.status(404).json(createErrorResponse('템플릿을 찾을 수 없습니다'));
      }

      res.json(createSuccessResponse(template));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates/{templateId}:
 *   put:
 *     summary: 템플릿 수정
 *     description: 템플릿 정보를 수정합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.put('/templates/:templateId',
  requireAuth,
  validateParams(templateIdSchema),
  validateBody(updateTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { templateId } = req.params;
      const updates = req.body;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(userTemplates)
        .where(and(
          eq(userTemplates.id, Number(templateId)),
          eq(userTemplates.userId, userId)
        )!)
        .limit(1);

      if (!existing) {
        return res.status(404).json(createErrorResponse('템플릿을 찾을 수 없습니다'));
      }

      // Update template
      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      if (updates.hashtags) {
        updateData.hashtags = JSON.stringify(updates.hashtags);
      }

      const [updated] = await db
        .update(userTemplates)
        .set(updateData)
        .where(eq(userTemplates.id, Number(templateId)))
        .returning();

      res.json(createSuccessResponse({
        template: updated,
        message: '템플릿이 수정되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates/{templateId}:
 *   delete:
 *     summary: 템플릿 삭제
 *     description: 템플릿을 삭제합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.delete('/templates/:templateId',
  requireAuth,
  validateParams(templateIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { templateId } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(userTemplates)
        .where(and(
          eq(userTemplates.id, Number(templateId)),
          eq(userTemplates.userId, userId)
        )!)
        .limit(1);

      if (!existing) {
        return res.status(404).json(createErrorResponse('템플릿을 찾을 수 없습니다'));
      }

      // Delete template and related analytics
      await db.delete(templateAnalytics)
        .where(eq(templateAnalytics.templateId, Number(templateId)));

      await db.delete(userTemplates)
        .where(eq(userTemplates.id, Number(templateId)));

      res.json(createSuccessResponse({
        message: '템플릿이 삭제되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates/ai/generate:
 *   post:
 *     summary: AI 템플릿 생성
 *     description: AI를 사용하여 마케팅 템플릿을 자동 생성합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.post('/templates/ai/generate',
  requireAuth,
  validateBody(aiGenerateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { campaignId, platform, tone, targetAudience, includeEmoji, keywords } = req.body;

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(referralCampaigns)
        .where(and(
          eq(referralCampaigns.id, campaignId),
          eq(referralCampaigns.userId, userId)
        )!)
        .limit(1);

      if (!campaign) {
        return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
      }

      // AI template generation logic (simplified version)
      const templates = generateAITemplates(campaign, platform, {
        tone: tone || 'casual',
        targetAudience,
        includeEmoji: includeEmoji || true,
        keywords: keywords || []
      });

      // Award XP for using AI
      await db.update(userAchievements)
        .set({
          totalXp: sql`${userAchievements.totalXp} + 10`,
          updatedAt: new Date()
        })
        .where(eq(userAchievements.userId, userId));

      res.json(createSuccessResponse({
        templates,
        message: 'AI 템플릿이 생성되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/templates/{templateId}/duplicate:
 *   post:
 *     summary: 템플릿 복제
 *     description: 기존 템플릿을 복제하여 새로운 템플릿을 생성합니다
 *     tags: [Templates]
 *     security:
 *       - session: []
 */
router.post('/templates/:templateId/duplicate',
  requireAuth,
  validateParams(templateIdSchema),
  validateBody(z.object({
    newPlatform: z.enum(['kakao', 'naver', 'instagram', 'facebook', 'twitter']),
    newName: z.string().min(1).max(100).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { templateId } = req.params;
      const { newPlatform, newName } = req.body;

      // Get original template
      const [original] = await db
        .select()
        .from(userTemplates)
        .where(and(
          eq(userTemplates.id, Number(templateId)),
          eq(userTemplates.userId, userId)
        )!)
        .limit(1);

      if (!original) {
        return res.status(404).json(createErrorResponse('원본 템플릿을 찾을 수 없습니다'));
      }

      // Check if template already exists for new platform
      const existing = await db
        .select()
        .from(userTemplates)
        .where(and(
          eq(userTemplates.userId, userId),
          eq(userTemplates.campaignId, original.campaignId!),
          eq(userTemplates.platform, newPlatform)
        )!)
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json(createErrorResponse('해당 플랫폼의 템플릿이 이미 존재합니다'));
      }

      // Create duplicate
      const [duplicate] = await db.insert(userTemplates).values({
        ...original,
        id: undefined,
        platform: newPlatform,
        templateName: newName || `${original.templateName} (복사본)`,
        performanceScore: '0.00',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.json(createSuccessResponse({
        template: duplicate,
        message: '템플릿이 복제되었습니다'
      }));

    } catch (error) {
      next(error);
    }
  }
);

// Helper function for AI template generation
function generateAITemplates(
  campaign: any,
  platform: string,
  options: any
): any[] {
  const templates = [];
  const emoji = options.includeEmoji ? getRandomEmojis(platform) : '';
  
  // Generate different variations based on tone
  const toneTemplates = {
    casual: [
      `${emoji} 친구들아! ${campaign.name} 알아? 지금 가입하면 특별 혜택이 있대! 내 추천 링크로 가입하면 우리 둘 다 보너스를 받을 수 있어~ #${campaign.name} #추천이벤트`,
      `${emoji} 요즘 핫한 ${campaign.name}! 나도 써보니까 진짜 좋더라고~ 같이 해보자! 추천 링크 남길게 ㅎㅎ #꿀팁 #${campaign.name}`
    ],
    formal: [
      `${campaign.name}을 소개합니다. 저희 서비스는 ${campaign.description || '특별한 가치를 제공합니다'}. 지금 가입하시면 추천인과 함께 혜택을 받으실 수 있습니다. #${campaign.name}`,
      `안녕하세요. ${campaign.name} 추천 드립니다. 실제 사용해본 결과 매우 만족스러운 서비스입니다. 아래 링크로 가입하시면 특별 혜택이 제공됩니다.`
    ],
    exciting: [
      `${emoji}🔥 대박! ${campaign.name} 이거 진짜 미쳤다! 지금 가입하면 엄청난 혜택이!! 놓치면 후회해요 진짜!! 빨리 들어와!! #핫딜 #${campaign.name} #지금바로`,
      `${emoji}⚡️ 긴급! ${campaign.name} 특별 이벤트! 선착순 마감 임박! 내 추천으로 가입하면 보너스 2배!! 서둘러!! #한정수량 #${campaign.name}`
    ],
    urgent: [
      `⏰ ${campaign.name} 마감 D-1! 이 기회를 놓치지 마세요. 추천 링크로 가입 시 즉시 혜택 지급. 서두르세요! #마감임박 #${campaign.name}`,
      `🚨 긴급공지: ${campaign.name} 특별 프로모션 곧 종료! 지금이 마지막 기회입니다. 추천 링크로 지금 바로 참여하세요. #라스트찬스`
    ]
  };

  const selectedTemplates = toneTemplates[options.tone] || toneTemplates.casual;
  
  selectedTemplates.forEach((text, index) => {
    // Add keywords if provided
    if (options.keywords && options.keywords.length > 0) {
      text += ' ' + options.keywords.map(k => `#${k}`).join(' ');
    }

    templates.push({
      templateText: text,
      hashtags: extractHashtags(text),
      callToAction: '지금 바로 가입하기 👉',
      tone: options.tone,
      variation: index + 1
    });
  });

  return templates;
}

function getRandomEmojis(platform: string): string {
  const emojiSets = {
    kakao: ['😊', '💛', '✨', '🎉', '👍'],
    naver: ['💚', '🌟', '🎯', '📢', '✔️'],
    instagram: ['❤️', '🔥', '💯', '🚀', '⭐'],
    facebook: ['👍', '❤️', '😍', '🎉', '🙌'],
    twitter: ['🐦', '💙', '🔥', '🚀', '✨']
  };

  const emojis = emojiSets[platform] || emojiSets.instagram;
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

export default router;