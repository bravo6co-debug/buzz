import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { 
  userAchievements,
  dailyQuests,
  users,
  referrals
} from '@buzz/database/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { notifyLevelUp, notifyBadgeEarned } from './notifications.js';

const router = Router();

// Constants
const XP_LEVELS = [
  { level: 1, requiredXp: 0, title: '신입 마케터' },
  { level: 2, requiredXp: 100, title: '주니어 마케터' },
  { level: 3, requiredXp: 250, title: '마케터' },
  { level: 4, requiredXp: 500, title: '시니어 마케터' },
  { level: 5, requiredXp: 1000, title: '팀장' },
  { level: 6, requiredXp: 2000, title: '매니저' },
  { level: 7, requiredXp: 3500, title: '디렉터' },
  { level: 8, requiredXp: 5000, title: '마스터' },
  { level: 9, requiredXp: 7500, title: '그랜드마스터' },
  { level: 10, requiredXp: 10000, title: '레전드' }
];

const BADGES = {
  FIRST_STEP: { id: 'first_step', name: '첫 걸음', description: '첫 캠페인 생성', icon: '🥉', xp: 10 },
  INFLUENCER: { id: 'influencer', name: '인플루언서', description: '100명 추천 달성', icon: '🥈', xp: 50 },
  LEGEND: { id: 'legend', name: '레전드', description: '1000명 추천 달성', icon: '🥇', xp: 200 },
  DIAMOND: { id: 'diamond', name: '다이아몬드', description: '월 수익 100만원 달성', icon: '💎', xp: 500 },
  STREAK_KING: { id: 'streak_king', name: '연속 출석왕', description: '30일 연속 접속', icon: '🔥', xp: 100 },
  SPEED_RUNNER: { id: 'speed_runner', name: '스피드런너', description: '24시간 내 10명 전환', icon: '⚡', xp: 75 },
  SNIPER: { id: 'sniper', name: '저격수', description: '전환율 50% 이상', icon: '🎯', xp: 150 },
  ROCKET: { id: 'rocket', name: '로켓', description: '하루 조회수 10,000회', icon: '🚀', xp: 100 }
};

// Schema definitions
const awardXpSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().max(200)
});

/**
 * @swagger
 * /api/gamification/profile:
 *   get:
 *     summary: 게임화 프로필 조회
 *     description: 사용자의 레벨, XP, 뱃지 등 게임화 정보를 조회합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.get('/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;

      // Get or create user achievements
      let [achievements] = await db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId))
        .limit(1);

      if (!achievements) {
        // Create initial achievements record
        [achievements] = await db.insert(userAchievements).values({
          userId,
          level: 1,
          totalXp: 0,
          totalReferrals: 0,
          totalRevenue: 0,
          bestConversionRate: '0.00',
          streakDays: 0,
          badges: JSON.stringify([])
        }).returning();
      }

      // Calculate current level based on XP
      const currentLevel = calculateLevel(achievements.totalXp || 0);
      const nextLevel = XP_LEVELS[currentLevel.level] || XP_LEVELS[XP_LEVELS.length - 1];
      
      // Parse badges
      let badges = [];
      try {
        badges = typeof achievements.badges === 'string' 
          ? JSON.parse(achievements.badges) 
          : achievements.badges || [];
      } catch {
        badges = [];
      }

      // Check and award new badges
      const newBadges = await checkAndAwardBadges(userId, achievements, badges);
      
      if (newBadges.length > 0) {
        badges = [...badges, ...newBadges];
        await db.update(userAchievements)
          .set({
            badges: JSON.stringify(badges),
            totalXp: sql`${userAchievements.totalXp} + ${newBadges.reduce((sum, b) => sum + b.xp, 0)}`,
            updatedAt: new Date()
          })
          .where(eq(userAchievements.userId, userId));
      }

      res.json(createSuccessResponse({
        level: currentLevel.level,
        title: currentLevel.title,
        totalXp: achievements.totalXp || 0,
        xpToNextLevel: nextLevel.requiredXp - (achievements.totalXp || 0),
        badges: badges.map(b => ({
          ...BADGES[b],
          earnedAt: new Date()
        })),
        stats: {
          totalReferrals: achievements.totalReferrals || 0,
          totalRevenue: achievements.totalRevenue || 0,
          bestConversionRate: achievements.bestConversionRate || '0.00',
          streakDays: achievements.streakDays || 0,
          globalRank: achievements.globalRank,
          monthlyRank: achievements.monthlyRank
        }
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/gamification/daily-quests:
 *   get:
 *     summary: 일일 퀘스트 조회
 *     description: 오늘의 일일 퀘스트 진행 상황을 조회합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.get('/daily-quests',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get or create today's quests
      let [quests] = await db
        .select()
        .from(dailyQuests)
        .where(and(
          eq(dailyQuests.userId, userId),
          gte(dailyQuests.questDate, today)
        )!)
        .limit(1);

      if (!quests) {
        // Create new daily quests
        [quests] = await db.insert(dailyQuests).values({
          userId,
          shareCount: 0,
          shareTarget: 3,
          convertCount: 0,
          convertTarget: 1,
          createCount: 0,
          createTarget: 1,
          rewardClaimed: false,
          rewardAmount: 100,
          questDate: today
        }).returning();
      }

      const questList = [
        {
          id: 'share',
          title: '템플릿 공유하기',
          description: `템플릿을 ${quests.shareTarget}번 공유하세요`,
          progress: quests.shareCount || 0,
          target: quests.shareTarget || 3,
          reward: 30,
          completed: (quests.shareCount || 0) >= (quests.shareTarget || 3)
        },
        {
          id: 'convert',
          title: '신규 가입자 유치',
          description: `신규 가입자 ${quests.convertTarget}명을 달성하세요`,
          progress: quests.convertCount || 0,
          target: quests.convertTarget || 1,
          reward: 50,
          completed: (quests.convertCount || 0) >= (quests.convertTarget || 1)
        },
        {
          id: 'create',
          title: '새 템플릿 만들기',
          description: `새로운 템플릿을 ${quests.createTarget}개 만드세요`,
          progress: quests.createCount || 0,
          target: quests.createTarget || 1,
          reward: 20,
          completed: (quests.createCount || 0) >= (quests.createTarget || 1)
        }
      ];

      const allCompleted = questList.every(q => q.completed);
      const totalReward = questList.reduce((sum, q) => sum + q.reward, 0);

      res.json(createSuccessResponse({
        quests: questList,
        allCompleted,
        totalReward,
        rewardClaimed: quests.rewardClaimed || false
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/gamification/daily-quests/claim:
 *   post:
 *     summary: 일일 퀘스트 보상 수령
 *     description: 완료한 일일 퀘스트의 보상을 수령합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.post('/daily-quests/claim',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's quests
      const [quests] = await db
        .select()
        .from(dailyQuests)
        .where(and(
          eq(dailyQuests.userId, userId),
          gte(dailyQuests.questDate, today)
        )!)
        .limit(1);

      if (!quests) {
        return res.status(404).json(createErrorResponse('오늘의 퀘스트를 찾을 수 없습니다'));
      }

      if (quests.rewardClaimed) {
        return res.status(400).json(createErrorResponse('이미 보상을 수령했습니다'));
      }

      // Check if all quests are completed
      const allCompleted = 
        (quests.shareCount || 0) >= (quests.shareTarget || 3) &&
        (quests.convertCount || 0) >= (quests.convertTarget || 1) &&
        (quests.createCount || 0) >= (quests.createTarget || 1);

      if (!allCompleted) {
        return res.status(400).json(createErrorResponse('모든 퀘스트를 완료해야 보상을 받을 수 있습니다'));
      }

      // Claim reward
      await db.update(dailyQuests)
        .set({
          rewardClaimed: true,
          updatedAt: new Date()
        })
        .where(eq(dailyQuests.id, quests.id));

      // Award XP and mileage
      const totalReward = 100; // Total mileage reward
      const xpReward = 50; // XP for completing all daily quests

      await db.update(userAchievements)
        .set({
          totalXp: sql`${userAchievements.totalXp} + ${xpReward}`,
          updatedAt: new Date()
        })
        .where(eq(userAchievements.userId, userId));

      // TODO: Add mileage to user account

      res.json(createSuccessResponse({
        message: '일일 퀘스트 보상을 수령했습니다!',
        rewards: {
          mileage: totalReward,
          xp: xpReward
        }
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     summary: 리더보드 조회
 *     description: 전체, 월간, 전환율 리더보드를 조회합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.get('/leaderboard',
  requireAuth,
  validateQuery(z.object({
    type: z.enum(['global', 'monthly', 'conversion']).default('global'),
    limit: z.string().transform(Number).default('10')
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { type, limit } = req.query as any;

      let leaderboard;
      let userRank;

      switch (type) {
        case 'monthly':
          // Monthly leaderboard based on this month's referrals
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          leaderboard = await db
            .select({
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              monthlyReferrals: sql<number>`
                COUNT(DISTINCT ${referrals.id}) FILTER (
                  WHERE ${referrals.createdAt} >= ${startOfMonth}
                )
              `,
              level: userAchievements.level,
              badges: userAchievements.badges
            })
            .from(users)
            .leftJoin(referrals, eq(referrals.referrerId, users.id))
            .leftJoin(userAchievements, eq(userAchievements.userId, users.id))
            .groupBy(users.id, userAchievements.level, userAchievements.badges)
            .orderBy(desc(sql`COUNT(DISTINCT ${referrals.id}) FILTER (
              WHERE ${referrals.createdAt} >= ${startOfMonth}
            )`))
            .limit(limit);
          break;

        case 'conversion':
          // Conversion rate leaderboard
          leaderboard = await db
            .select({
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              conversionRate: userAchievements.bestConversionRate,
              level: userAchievements.level,
              badges: userAchievements.badges
            })
            .from(users)
            .innerJoin(userAchievements, eq(userAchievements.userId, users.id))
            .orderBy(desc(userAchievements.bestConversionRate))
            .limit(limit);
          break;

        default: // global
          // Global leaderboard based on total referrals
          leaderboard = await db
            .select({
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              totalReferrals: userAchievements.totalReferrals,
              level: userAchievements.level,
              badges: userAchievements.badges
            })
            .from(users)
            .innerJoin(userAchievements, eq(userAchievements.userId, users.id))
            .orderBy(desc(userAchievements.totalReferrals))
            .limit(limit);
          break;
      }

      // Get current user's rank
      const [currentUserStats] = await db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId))
        .limit(1);

      // Parse badges for leaderboard entries
      const formattedLeaderboard = leaderboard.map((entry, index) => {
        let badges = [];
        try {
          badges = typeof entry.badges === 'string' 
            ? JSON.parse(entry.badges) 
            : entry.badges || [];
        } catch {
          badges = [];
        }

        return {
          rank: index + 1,
          ...entry,
          badges: badges.map(b => BADGES[b]).filter(Boolean),
          isCurrentUser: entry.userId === userId
        };
      });

      res.json(createSuccessResponse({
        type,
        leaderboard: formattedLeaderboard,
        userRank: currentUserStats ? {
          global: currentUserStats.globalRank,
          monthly: currentUserStats.monthlyRank
        } : null
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/gamification/badges:
 *   get:
 *     summary: 뱃지 목록 조회
 *     description: 획득 가능한 모든 뱃지와 획득 상태를 조회합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.get('/badges',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;

      // Get user's current badges
      const [achievements] = await db
        .select({ badges: userAchievements.badges })
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId))
        .limit(1);

      let userBadges = [];
      if (achievements) {
        try {
          userBadges = typeof achievements.badges === 'string' 
            ? JSON.parse(achievements.badges) 
            : achievements.badges || [];
        } catch {
          userBadges = [];
        }
      }

      // Format all badges with earned status
      const allBadges = Object.entries(BADGES).map(([key, badge]) => ({
        ...badge,
        earned: userBadges.includes(key),
        progress: getBadgeProgress(userId, key) // TODO: Implement progress tracking
      }));

      res.json(createSuccessResponse({
        badges: allBadges,
        totalBadges: Object.keys(BADGES).length,
        earnedBadges: userBadges.length
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/gamification/xp:
 *   post:
 *     summary: XP 획득
 *     description: 특정 액션에 대한 XP를 획득합니다
 *     tags: [Gamification]
 *     security:
 *       - session: []
 */
router.post('/xp',
  requireAuth,
  validateBody(awardXpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { amount, reason } = req.body;

      // Award XP
      const [updated] = await db.update(userAchievements)
        .set({
          totalXp: sql`${userAchievements.totalXp} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(userAchievements.userId, userId))
        .returning();

      if (!updated) {
        // Create initial record if not exists
        await db.insert(userAchievements).values({
          userId,
          totalXp: amount
        });
      }

      // Check for level up
      const oldLevel = calculateLevel((updated?.totalXp || 0) - amount);
      const newLevel = calculateLevel(updated?.totalXp || amount);

      const leveledUp = newLevel.level > oldLevel.level;

      // 레벨업 알림 전송
      if (leveledUp) {
        notifyLevelUp(userId, newLevel.level).catch(console.error);
      }

      res.json(createSuccessResponse({
        xpAwarded: amount,
        totalXp: updated?.totalXp || amount,
        currentLevel: newLevel.level,
        leveledUp,
        newTitle: leveledUp ? newLevel.title : null,
        reason
      }));

    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
function calculateLevel(xp: number): { level: number; title: string } {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].requiredXp) {
      return XP_LEVELS[i];
    }
  }
  return XP_LEVELS[0];
}

async function checkAndAwardBadges(
  userId: number, 
  achievements: any, 
  currentBadges: string[]
): Promise<any[]> {
  const newBadges = [];

  // Check for each badge condition
  if (!currentBadges.includes('FIRST_STEP')) {
    // Check if user has created first campaign
    // TODO: Implement campaign check
  }

  if (!currentBadges.includes('INFLUENCER') && (achievements.totalReferrals || 0) >= 100) {
    newBadges.push('INFLUENCER');
  }

  if (!currentBadges.includes('LEGEND') && (achievements.totalReferrals || 0) >= 1000) {
    newBadges.push('LEGEND');
  }

  if (!currentBadges.includes('DIAMOND') && (achievements.totalRevenue || 0) >= 1000000) {
    newBadges.push('DIAMOND');
  }

  if (!currentBadges.includes('STREAK_KING') && (achievements.streakDays || 0) >= 30) {
    newBadges.push('STREAK_KING');
  }

  // TODO: Implement other badge checks

  // 새 뱃지가 있으면 알림 전송
  for (const badgeId of newBadges) {
    const badge = BADGES[badgeId];
    if (badge) {
      notifyBadgeEarned(userId, badge.name).catch(console.error);
    }
  }

  return newBadges.map(badge => ({ 
    badge, 
    xp: BADGES[badge]?.xp || 0 
  }));
}

function getBadgeProgress(userId: number, badgeId: string): number {
  // TODO: Implement actual progress calculation
  return Math.floor(Math.random() * 100);
}

// Update daily quest progress (to be called from other routes)
export async function updateQuestProgress(
  userId: number, 
  questType: 'share' | 'convert' | 'create'
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [quest] = await db
    .select()
    .from(dailyQuests)
    .where(and(
      eq(dailyQuests.userId, userId),
      gte(dailyQuests.questDate, today)
    )!)
    .limit(1);

  if (quest && !quest.rewardClaimed) {
    const updateData: any = { updatedAt: new Date() };
    
    switch (questType) {
      case 'share':
        updateData.shareCount = sql`${dailyQuests.shareCount} + 1`;
        break;
      case 'convert':
        updateData.convertCount = sql`${dailyQuests.convertCount} + 1`;
        break;
      case 'create':
        updateData.createCount = sql`${dailyQuests.createCount} + 1`;
        break;
    }

    await db.update(dailyQuests)
      .set(updateData)
      .where(eq(dailyQuests.id, quest.id));
  }
}

export default router;