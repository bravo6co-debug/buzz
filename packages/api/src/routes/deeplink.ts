import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { users, referrals, businesses, referralCampaigns } from '@buzz/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { DeepLinkBuilder, generateDeepLink, generateUniversalLink } from '../middleware/deeplink.js';

const router = Router();

/**
 * @swagger
 * /api/deeplink/referral/{referralCode}:
 *   get:
 *     summary: 리퍼럴 딥링크 생성
 *     description: 리퍼럴 코드를 위한 딥링크를 생성합니다
 *     tags: [DeepLink]
 *     parameters:
 *       - in: path
 *         name: referralCode
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/referral/:referralCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { referralCode } = req.params;
    const { utm_source, utm_medium, utm_campaign } = req.query;

    // 리퍼럴 코드 유효성 검증
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('유효하지 않은 리퍼럴 코드입니다'));
    }

    // 딥링크 생성
    const deepLinkBuilder = new DeepLinkBuilder('signup')
      .withReferral(referralCode);

    // UTM 파라미터가 있으면 추가
    if (utm_source || utm_medium) {
      deepLinkBuilder.withUTM(
        utm_source as string || 'referral',
        utm_medium as string || 'social',
        utm_campaign as string,
        req.query.utm_term as string,
        req.query.utm_content as string
      );
    }

    const deepLink = deepLinkBuilder.build();
    const universalLink = deepLinkBuilder.buildUniversal();

    // 공유용 메타데이터
    const shareData = {
      title: `${user.name}님이 Buzz를 추천했어요!`,
      description: '지금 가입하면 3,000원 마일리지를 받을 수 있어요. 우리 동네 맛집과 할인 혜택을 놓치지 마세요!',
      image: `${process.env.FRONTEND_URL}/api/og/referral/${referralCode}`,
      url: universalLink
    };

    res.json(createSuccessResponse({
      referralCode,
      referrer: user.name,
      deepLink,
      universalLink,
      webUrl: `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`,
      shareData,
      qrCode: `${process.env.API_BASE_URL}/api/deeplink/qr?url=${encodeURIComponent(universalLink)}`
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/deeplink/business/{businessId}:
 *   get:
 *     summary: 사업체 딥링크 생성
 *     description: 사업체 페이지 딥링크를 생성합니다
 *     tags: [DeepLink]
 */
router.get('/business/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;

    // 사업체 정보 확인
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, Number(businessId)))
      .limit(1);

    if (!business) {
      return res.status(404).json(createErrorResponse('사업체를 찾을 수 없습니다'));
    }

    const deepLink = new DeepLinkBuilder('business')
      .withBusiness(businessId)
      .build();

    const universalLink = new DeepLinkBuilder('business')
      .withBusiness(businessId)
      .buildUniversal();

    const shareData = {
      title: business.name,
      description: `${business.category} | ${business.address}`,
      image: business.imageUrl || `${process.env.FRONTEND_URL}/api/og/business/${businessId}`,
      url: universalLink
    };

    res.json(createSuccessResponse({
      businessId,
      business: {
        name: business.name,
        category: business.category,
        address: business.address
      },
      deepLink,
      universalLink,
      webUrl: `${process.env.FRONTEND_URL}/business/${businessId}`,
      shareData
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/deeplink/campaign/{campaignId}/template/{templateId}:
 *   get:
 *     summary: 캠페인 템플릿 딥링크 생성
 *     description: 마케터 캠페인 템플릿 딥링크를 생성합니다
 *     tags: [DeepLink]
 */
router.get('/campaign/:campaignId/template/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, templateId } = req.params;

    // 캠페인 정보 확인
    const [campaign] = await db
      .select({
        campaign: referralCampaigns,
        user: users
      })
      .from(referralCampaigns)
      .innerJoin(users, eq(referralCampaigns.userId, users.id))
      .where(eq(referralCampaigns.id, Number(campaignId)))
      .limit(1);

    if (!campaign) {
      return res.status(404).json(createErrorResponse('캠페인을 찾을 수 없습니다'));
    }

    const deepLink = new DeepLinkBuilder('template')
      .withCampaign(campaignId)
      .withTemplate(templateId)
      .withReferral(campaign.user.referralCode!)
      .withUTM(
        campaign.campaign.utmSource || 'campaign',
        campaign.campaign.utmMedium || 'social',
        campaign.campaign.utmCampaign,
        campaign.campaign.utmTerm,
        campaign.campaign.utmContent
      )
      .build();

    const universalLink = new DeepLinkBuilder('template')
      .withCampaign(campaignId)
      .withTemplate(templateId)
      .withReferral(campaign.user.referralCode!)
      .withUTM(
        campaign.campaign.utmSource || 'campaign',
        campaign.campaign.utmMedium || 'social',
        campaign.campaign.utmCampaign,
        campaign.campaign.utmTerm,
        campaign.campaign.utmContent
      )
      .buildUniversal();

    const shareData = {
      title: campaign.campaign.name,
      description: campaign.campaign.description || '특별한 혜택을 놓치지 마세요!',
      image: `${process.env.FRONTEND_URL}/api/og/campaign/${campaignId}`,
      url: universalLink
    };

    res.json(createSuccessResponse({
      campaignId,
      templateId,
      campaign: {
        name: campaign.campaign.name,
        description: campaign.campaign.description
      },
      referrer: campaign.user.name,
      deepLink,
      universalLink,
      webUrl: `${process.env.FRONTEND_URL}/signup?ref=${campaign.user.referralCode}&utm_source=${campaign.campaign.utmSource}&utm_medium=${campaign.campaign.utmMedium}&utm_campaign=${campaign.campaign.utmCampaign}`,
      shareData
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/deeplink/qr:
 *   get:
 *     summary: QR 코드 생성
 *     description: 딥링크용 QR 코드를 생성합니다
 *     tags: [DeepLink]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, size = '200' } = req.query;

    if (!url) {
      return res.status(400).json(createErrorResponse('URL이 필요합니다'));
    }

    // QR 코드 생성을 위한 외부 서비스 사용 (예: qr-server.com)
    const qrSize = Math.min(Math.max(parseInt(size as string), 100), 1000);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url as string)}`;

    // QR 코드 이미지로 리다이렉트
    res.redirect(qrUrl);

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/deeplink/share-template:
 *   post:
 *     summary: 공유 템플릿 생성
 *     description: 소셜 미디어 공유를 위한 템플릿을 생성합니다
 *     tags: [DeepLink]
 */
router.post('/share-template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, referralCode, campaignId, customMessage } = req.body;

    // 리퍼럴 사용자 정보 가져오기
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!user) {
      return res.status(404).json(createErrorResponse('유효하지 않은 리퍼럴 코드입니다'));
    }

    // 딥링크 생성
    const deepLink = new DeepLinkBuilder('signup')
      .withReferral(referralCode)
      .withUTM(platform, 'social')
      .buildUniversal();

    // 플랫폼별 공유 템플릿
    const templates = {
      kakao: {
        text: customMessage || `🎉 ${user.name}님이 Buzz를 추천했어요!\n지금 가입하면 3,000원 마일리지를 바로 받을 수 있어요. 우리 동네 맛집 할인 혜택도 놓치지 마세요!`,
        url: deepLink,
        hashtags: ['Buzz', '마일리지', '할인혜택', '동네맛집']
      },
      instagram: {
        text: `${customMessage || '🚀 Buzz와 함께 우리 동네를 더 알차게!'}\n\n• 가입시 3,000원 마일리지 즉시 지급\n• 동네 맛집 할인 혜택\n• 친구 추천시 추가 마일리지\n\n지금 바로 시작해보세요! 👇`,
        url: deepLink,
        hashtags: ['buzz', 'local', 'discount', 'food', 'mileage', '동네맛집', '할인혜택']
      },
      facebook: {
        text: customMessage || `${user.name}님이 Buzz를 추천합니다! 🎯\n\n우리 동네 숨은 맛집과 다양한 할인 혜택을 발견해보세요.\n가입하면 3,000원 마일리지를 바로 받을 수 있어요!`,
        url: deepLink
      },
      twitter: {
        text: `${customMessage || '🔥 Buzz 추천!'} 가입시 3,000원 마일리지 + 동네맛집 할인혜택 🍽️`,
        url: deepLink,
        hashtags: ['Buzz', '마일리지', '할인']
      }
    };

    const template = templates[platform] || templates.kakao;

    res.json(createSuccessResponse({
      platform,
      template,
      deepLink,
      referrer: user.name,
      analytics: {
        trackingId: `share_${platform}_${referralCode}_${Date.now()}`,
        utm_source: platform,
        utm_medium: 'social',
        utm_campaign: 'referral_share'
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/deeplink/analytics:
 *   post:
 *     summary: 딥링크 분석 데이터 수집
 *     description: 딥링크 클릭 및 전환 데이터를 수집합니다
 *     tags: [DeepLink]
 */
router.post('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      action, 
      referralCode, 
      campaignId, 
      platform,
      userAgent,
      ipAddress = req.ip,
      converted = false 
    } = req.body;

    // 분석 데이터 저장 로직
    // TODO: 별도의 analytics 테이블에 저장

    console.log('DeepLink Analytics:', {
      action,
      referralCode,
      campaignId,
      platform,
      userAgent,
      ipAddress,
      converted,
      timestamp: new Date()
    });

    res.json(createSuccessResponse({
      message: '분석 데이터가 수집되었습니다',
      trackingId: `analytics_${Date.now()}`
    }));

  } catch (error) {
    next(error);
  }
});

export default router;