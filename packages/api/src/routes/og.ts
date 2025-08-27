import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { users, businesses, referralCampaigns } from '@buzz/database/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Open Graph 이미지 생성용 HTML 템플릿
function generateOGImageHTML(data: {
  title: string;
  subtitle?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  emoji?: string;
}): string {
  const {
    title,
    subtitle,
    description,
    backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor = 'white',
    emoji = '🚀'
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          width: 1200px;
          height: 630px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
          background: ${backgroundColor};
          color: ${textColor};
          overflow: hidden;
          position: relative;
        }
        
        .pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%);
          opacity: 0.3;
        }
        
        .content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 900px;
          padding: 60px;
        }
        
        .emoji {
          font-size: 120px;
          margin-bottom: 30px;
          text-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .title {
          font-size: 72px;
          font-weight: 700;
          margin-bottom: 20px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          line-height: 1.1;
        }
        
        .subtitle {
          font-size: 48px;
          font-weight: 600;
          margin-bottom: 30px;
          opacity: 0.9;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .description {
          font-size: 36px;
          font-weight: 400;
          line-height: 1.3;
          opacity: 0.8;
        }
        
        .logo {
          position: absolute;
          bottom: 40px;
          right: 50px;
          display: flex;
          align-items: center;
          font-size: 32px;
          font-weight: 600;
          opacity: 0.7;
        }
        
        .logo-icon {
          font-size: 40px;
          margin-right: 15px;
        }
        
        .decorations {
          position: absolute;
          top: 50px;
          left: 50px;
          font-size: 40px;
          opacity: 0.4;
        }
        
        .decorations2 {
          position: absolute;
          bottom: 50px;
          left: 50px;
          font-size: 40px;
          opacity: 0.4;
        }
      </style>
    </head>
    <body>
      <div class="pattern"></div>
      
      <div class="content">
        <div class="emoji">${emoji}</div>
        <div class="title">${title}</div>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        ${description ? `<div class="description">${description}</div>` : ''}
      </div>
      
      <div class="decorations">✨</div>
      <div class="decorations2">🎯</div>
      
      <div class="logo">
        <div class="logo-icon">🚀</div>
        <div>Buzz</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * @swagger
 * /api/og/referral/{referralCode}:
 *   get:
 *     summary: 리퍼럴 OG 이미지
 *     description: 리퍼럴용 Open Graph 이미지를 생성합니다
 *     tags: [OG Images]
 */
router.get('/referral/:referralCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { referralCode } = req.params;

    // 리퍼럴 사용자 정보 가져오기
    const [user] = await db
      .select({
        name: users.name,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!user) {
      return res.status(404).send('리퍼럴 코드를 찾을 수 없습니다');
    }

    const html = generateOGImageHTML({
      title: `${user.name}님이`,
      subtitle: 'Buzz를 추천했어요!',
      description: '지금 가입하면 3,000원 마일리지 즉시 지급',
      emoji: '🎁'
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    res.send(html);

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/og/business/{businessId}:
 *   get:
 *     summary: 사업체 OG 이미지
 *     description: 사업체용 Open Graph 이미지를 생성합니다
 *     tags: [OG Images]
 */
router.get('/business/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;

    // 사업체 정보 가져오기
    const [business] = await db
      .select({
        name: businesses.name,
        category: businesses.category,
        address: businesses.address,
        description: businesses.description
      })
      .from(businesses)
      .where(eq(businesses.id, Number(businessId)))
      .limit(1);

    if (!business) {
      return res.status(404).send('사업체를 찾을 수 없습니다');
    }

    const categoryEmojis = {
      '한식': '🍚',
      '중식': '🥟',
      '일식': '🍱',
      '양식': '🍝',
      '카페': '☕',
      '치킨': '🍗',
      '피자': '🍕',
      '버거': '🍔',
      '디저트': '🍰',
      '주점': '🍻',
      default: '🏪'
    };

    const emoji = categoryEmojis[business.category] || categoryEmojis.default;

    const html = generateOGImageHTML({
      title: business.name,
      subtitle: business.category,
      description: business.address,
      emoji,
      backgroundColor: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      textColor: '#333'
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=7200'); // 2시간 캐시
    res.send(html);

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/og/campaign/{campaignId}:
 *   get:
 *     summary: 캠페인 OG 이미지
 *     description: 캠페인용 Open Graph 이미지를 생성합니다
 *     tags: [OG Images]
 */
router.get('/campaign/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.params;

    // 캠페인 정보 가져오기
    const [campaign] = await db
      .select({
        name: referralCampaigns.name,
        description: referralCampaigns.description,
        rewardMultiplier: referralCampaigns.rewardMultiplier,
        targetConversions: referralCampaigns.targetConversions
      })
      .from(referralCampaigns)
      .where(eq(referralCampaigns.id, Number(campaignId)))
      .limit(1);

    if (!campaign) {
      return res.status(404).send('캠페인을 찾을 수 없습니다');
    }

    const multiplier = parseFloat(campaign.rewardMultiplier || '1.0');
    const bonusText = multiplier > 1 ? `${multiplier}배 보상!` : '특별 혜택!';

    const html = generateOGImageHTML({
      title: campaign.name,
      subtitle: bonusText,
      description: campaign.description || '놓치면 후회하는 특별한 기회',
      emoji: '🎯',
      backgroundColor: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30분 캐시
    res.send(html);

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/og/default:
 *   get:
 *     summary: 기본 OG 이미지
 *     description: 기본 Open Graph 이미지를 생성합니다
 *     tags: [OG Images]
 */
router.get('/default', (req: Request, res: Response) => {
  const { title = 'Buzz', subtitle, description = '우리 동네를 더 알차게' } = req.query;

  const html = generateOGImageHTML({
    title: title as string,
    subtitle: subtitle as string,
    description: description as string,
    emoji: '🚀'
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시
  res.send(html);
});

export default router;