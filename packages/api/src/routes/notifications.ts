import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { users } from '@buzz/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

// Firebase Admin SDK 설정 (실제 구현시 필요)
// import * as admin from 'firebase-admin';

// FCM 토큰 등록 스키마
const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['web', 'ios', 'android']).optional(),
  deviceId: z.string().optional()
});

// 알림 전송 스키마
const sendNotificationSchema = z.object({
  userId: z.number().int().positive().optional(),
  tokens: z.array(z.string()).optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(['referral_conversion', 'milestone_achieved', 'daily_quest', 'campaign_update', 'level_up', 'badge_earned']),
  data: z.record(z.string()).optional(),
  url: z.string().optional()
});

// 푸시 알림 템플릿
const notificationTemplates = {
  referral_conversion: {
    title: '🎉 새로운 추천 완료!',
    body: '회원님의 추천으로 새로운 사용자가 가입했습니다. 보상을 확인해보세요!',
    icon: '/icons/referral-icon.png',
    url: '/referrals'
  },
  milestone_achieved: {
    title: '🏆 마일스톤 달성!',
    body: '축하합니다! 새로운 성취를 달성하셨습니다.',
    icon: '/icons/trophy-icon.png',
    url: '/referrals#achievements'
  },
  daily_quest: {
    title: '📋 일일 퀘스트',
    body: '오늘의 퀘스트를 완료하고 보상을 받으세요!',
    icon: '/icons/quest-icon.png',
    url: '/referrals#quests'
  },
  campaign_update: {
    title: '🎯 캠페인 업데이트',
    body: '캠페인에 새로운 소식이 있습니다.',
    icon: '/icons/campaign-icon.png',
    url: '/referrals#campaigns'
  },
  level_up: {
    title: '⬆️ 레벨 업!',
    body: '축하합니다! 레벨이 올랐습니다. 새로운 혜택을 확인해보세요!',
    icon: '/icons/levelup-icon.png',
    url: '/referrals#profile'
  },
  badge_earned: {
    title: '🏅 새 뱃지 획득!',
    body: '새로운 뱃지를 획득하셨습니다. 컬렉션을 확인해보세요!',
    icon: '/icons/badge-icon.png',
    url: '/referrals#badges'
  }
};

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     summary: FCM 토큰 등록
 *     description: 디바이스의 FCM 토큰을 등록합니다
 *     tags: [Notifications]
 *     security:
 *       - session: []
 */
router.post('/register-token',
  requireAuth,
  validateBody(registerTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;
      const { token, platform = 'web', deviceId } = req.body;

      // 사용자 정보 업데이트 (FCM 토큰 저장)
      // 실제 구현에서는 별도의 device_tokens 테이블을 만드는 것이 좋습니다
      await db.update(users)
        .set({
          fcmToken: token, // 임시로 users 테이블에 저장
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`FCM token registered for user ${userId}:`, token.substring(0, 20) + '...');

      res.json(createSuccessResponse({
        message: 'FCM 토큰이 등록되었습니다',
        platform,
        registered: true
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/unregister-token:
 *   post:
 *     summary: FCM 토큰 해제
 *     description: 디바이스의 FCM 토큰을 해제합니다
 *     tags: [Notifications]
 *     security:
 *       - session: []
 */
router.post('/unregister-token',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId!;

      // FCM 토큰 제거
      await db.update(users)
        .set({
          fcmToken: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`FCM token unregistered for user ${userId}`);

      res.json(createSuccessResponse({
        message: 'FCM 토큰이 해제되었습니다',
        unregistered: true
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: 푸시 알림 전송
 *     description: 사용자에게 푸시 알림을 전송합니다 (관리자 전용)
 *     tags: [Notifications]
 *     security:
 *       - session: []
 */
router.post('/send',
  requireAuth,
  validateBody(sendNotificationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 관리자 권한 확인 (실제 구현에서 추가 필요)
      const { userId, tokens, title, body, type, data, url } = req.body;

      let targetTokens: string[] = [];

      if (tokens) {
        targetTokens = tokens;
      } else if (userId) {
        // 특정 사용자의 토큰 가져오기
        const [user] = await db
          .select({ fcmToken: users.fcmToken })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user?.fcmToken) {
          targetTokens = [user.fcmToken];
        }
      }

      if (targetTokens.length === 0) {
        return res.status(400).json(createErrorResponse('전송할 토큰이 없습니다'));
      }

      // 알림 전송
      const results = await sendPushNotification(targetTokens, {
        title,
        body,
        type,
        data,
        url
      });

      res.json(createSuccessResponse({
        message: '푸시 알림이 전송되었습니다',
        sentCount: results.successCount,
        failureCount: results.failureCount,
        results
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/send-to-user/{userId}:
 *   post:
 *     summary: 특정 사용자에게 알림 전송
 *     description: 특정 사용자에게 알림을 전송합니다
 *     tags: [Notifications]
 */
router.post('/send-to-user/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const { type, customTitle, customBody, data } = req.body;

      // 템플릿에서 알림 정보 가져오기
      const template = notificationTemplates[type];
      if (!template) {
        return res.status(400).json(createErrorResponse('유효하지 않은 알림 타입입니다'));
      }

      const title = customTitle || template.title;
      const body = customBody || template.body;

      const result = await sendNotificationToUser(targetUserId, {
        title,
        body,
        type,
        data: {
          ...data,
          click_action: template.url
        }
      });

      res.json(createSuccessResponse({
        message: '알림이 전송되었습니다',
        success: result.success,
        error: result.error
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/templates:
 *   get:
 *     summary: 알림 템플릿 목록
 *     description: 사용 가능한 알림 템플릿 목록을 조회합니다
 *     tags: [Notifications]
 */
router.get('/templates', (req: Request, res: Response) => {
  res.json(createSuccessResponse({
    templates: notificationTemplates
  }));
});

// 푸시 알림 전송 함수
async function sendPushNotification(tokens: string[], payload: {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  url?: string;
}): Promise<{ successCount: number; failureCount: number; results: any[] }> {
  
  // Firebase Admin SDK를 사용한 실제 구현 예시
  // 현재는 모의 구현
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const token of tokens) {
    try {
      // 실제 FCM 메시지 구성
      const message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: {
          type: payload.type,
          click_action: payload.url || '/',
          ...payload.data
        },
        webpush: {
          headers: {
            TTL: '86400' // 24시간
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            requireInteraction: true,
            vibrate: [200, 100, 200]
          },
          fcm_options: {
            link: payload.url || '/'
          }
        }
      };

      // 실제 구현에서는 admin.messaging().send(message) 사용
      console.log('Sending FCM message:', message);
      
      // 모의 성공 응답
      results.push({
        token: token.substring(0, 20) + '...',
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`
      });
      
      successCount++;

    } catch (error) {
      console.error('Failed to send FCM message:', error);
      
      results.push({
        token: token.substring(0, 20) + '...',
        success: false,
        error: error.message
      });
      
      failureCount++;
    }
  }

  return { successCount, failureCount, results };
}

// 특정 사용자에게 알림 전송
export async function sendNotificationToUser(userId: number, payload: {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 사용자의 FCM 토큰 가져오기
    const [user] = await db
      .select({ fcmToken: users.fcmToken })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.fcmToken) {
      return { success: false, error: 'FCM 토큰을 찾을 수 없습니다' };
    }

    const result = await sendPushNotification([user.fcmToken], payload);
    
    return { 
      success: result.successCount > 0,
      error: result.failureCount > 0 ? '일부 전송 실패' : undefined
    };

  } catch (error) {
    console.error('Failed to send notification to user:', error);
    return { success: false, error: error.message };
  }
}

// 리퍼럴 전환 알림
export async function notifyReferralConversion(referrerId: number, refereeId: number): Promise<void> {
  try {
    const [referee] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, refereeId))
      .limit(1);

    await sendNotificationToUser(referrerId, {
      title: '🎉 새로운 추천 완료!',
      body: `${referee?.name || '새로운 사용자'}님이 회원님의 추천으로 가입했습니다!`,
      type: 'referral_conversion',
      data: {
        refereeId: refereeId.toString(),
        click_action: '/referrals'
      }
    });
  } catch (error) {
    console.error('Failed to send referral conversion notification:', error);
  }
}

// 레벨업 알림
export async function notifyLevelUp(userId: number, newLevel: number): Promise<void> {
  try {
    await sendNotificationToUser(userId, {
      title: '⬆️ 레벨 업!',
      body: `축하합니다! 레벨 ${newLevel}에 도달했습니다!`,
      type: 'level_up',
      data: {
        newLevel: newLevel.toString(),
        click_action: '/referrals#profile'
      }
    });
  } catch (error) {
    console.error('Failed to send level up notification:', error);
  }
}

// 뱃지 획득 알림
export async function notifyBadgeEarned(userId: number, badgeName: string): Promise<void> {
  try {
    await sendNotificationToUser(userId, {
      title: '🏅 새 뱃지 획득!',
      body: `"${badgeName}" 뱃지를 획득하셨습니다!`,
      type: 'badge_earned',
      data: {
        badgeName,
        click_action: '/referrals#badges'
      }
    });
  } catch (error) {
    console.error('Failed to send badge earned notification:', error);
  }
}

// 일일 퀘스트 알림
export async function notifyDailyQuest(userId: number): Promise<void> {
  try {
    await sendNotificationToUser(userId, {
      title: '📋 일일 퀘스트',
      body: '오늘의 퀘스트를 완료하고 보상을 받으세요!',
      type: 'daily_quest',
      data: {
        click_action: '/referrals#quests'
      }
    });
  } catch (error) {
    console.error('Failed to send daily quest notification:', error);
  }
}

export default router;