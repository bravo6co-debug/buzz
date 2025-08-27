import { Request, Response, NextFunction } from 'express';

export interface DeepLinkData {
  action?: string;
  referralCode?: string;
  campaignId?: string;
  templateId?: string;
  businessId?: string;
  couponId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// 딥링크 URL 생성
export function generateDeepLink(action: string, data: DeepLinkData = {}): string {
  const baseUrl = process.env.DEEP_LINK_BASE_URL || 'buzz://';
  const webFallback = process.env.WEB_FALLBACK_URL || 'https://buzz.namgu.kr';
  
  const params = new URLSearchParams();
  
  // 기본 액션 설정
  params.set('action', action);
  
  // 추가 파라미터 설정
  Object.entries(data).forEach(([key, value]) => {
    if (value) {
      params.set(key, value.toString());
    }
  });
  
  // 웹 폴백 URL 포함
  params.set('fallback', webFallback);
  
  return `${baseUrl}${action}?${params.toString()}`;
}

// 유니버셜 링크용 웹 URL 생성
export function generateUniversalLink(action: string, data: DeepLinkData = {}): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://buzz.namgu.kr';
  const params = new URLSearchParams();
  
  // 딥링크 데이터를 웹 파라미터로 변환
  params.set('dl_action', action);
  Object.entries(data).forEach(([key, value]) => {
    if (value) {
      params.set(`dl_${key}`, value.toString());
    }
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// 스마트 배너용 메타 태그 생성
export function generateSmartBannerMeta(action: string, data: DeepLinkData = {}): string {
  const deepLink = generateDeepLink(action, data);
  const universalLink = generateUniversalLink(action, data);
  
  return `
    <!-- iOS Smart App Banner -->
    <meta name="apple-itunes-app" content="app-id=${process.env.IOS_APP_ID || '123456789'}, app-argument=${encodeURIComponent(deepLink)}">
    
    <!-- Android Intent -->
    <meta name="google-play-app" content="app-id=${process.env.ANDROID_PACKAGE || 'kr.namgu.buzz'}">
    
    <!-- Universal Links -->
    <link rel="alternate" href="android-app://${process.env.ANDROID_PACKAGE || 'kr.namgu.buzz'}${universalLink.replace(process.env.FRONTEND_URL || 'https://buzz.namgu.kr', '')}">
  `;
}

// 딥링크 처리 미들웨어
export function handleDeepLink(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const isIOSApp = /iPhone|iPad|iPod/.test(userAgent);
  const isAndroidApp = /Android/.test(userAgent);
  const isMobile = isIOSApp || isAndroidApp;
  
  // 딥링크 파라미터 추출
  const deepLinkData: DeepLinkData = {
    action: req.query.dl_action as string,
    referralCode: req.query.dl_referralCode as string || req.query.ref as string,
    campaignId: req.query.dl_campaignId as string,
    templateId: req.query.dl_templateId as string,
    businessId: req.query.dl_businessId as string,
    couponId: req.query.dl_couponId as string,
    utm_source: req.query.utm_source as string,
    utm_medium: req.query.utm_medium as string,
    utm_campaign: req.query.utm_campaign as string,
    utm_term: req.query.utm_term as string,
    utm_content: req.query.utm_content as string
  };
  
  // 유효한 딥링크 액션이 있고 모바일인 경우
  if (deepLinkData.action && isMobile) {
    const nativeDeepLink = generateDeepLink(deepLinkData.action, deepLinkData);
    const storeUrl = isIOSApp 
      ? `https://apps.apple.com/app/id${process.env.IOS_APP_ID || '123456789'}`
      : `https://play.google.com/store/apps/details?id=${process.env.ANDROID_PACKAGE || 'kr.namgu.buzz'}`;
    
    // 딥링크 시도 후 스토어로 폴백하는 HTML 반환
    const deepLinkHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Buzz App으로 이동 중...</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${generateSmartBannerMeta(deepLinkData.action, deepLinkData)}
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 16px;
            opacity: 0.8;
            margin-bottom: 30px;
          }
          .button {
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            margin: 10px;
          }
          .button:hover {
            background: white;
            color: #667eea;
          }
          .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="logo">🚀</div>
        <div class="title">Buzz 앱으로 이동 중...</div>
        <div class="subtitle">잠시만 기다려주세요</div>
        <div class="spinner"></div>
        
        <div id="fallback" style="display: none;">
          <p>앱을 열 수 없나요?</p>
          <a href="${storeUrl}" class="button">앱 다운로드</a>
          <a href="${process.env.FRONTEND_URL || 'https://buzz.namgu.kr'}" class="button">웹에서 계속</a>
        </div>

        <script>
          // 딥링크 시도
          const deepLink = "${nativeDeepLink}";
          const storeUrl = "${storeUrl}";
          const webUrl = "${process.env.FRONTEND_URL || 'https://buzz.namgu.kr'}";
          
          let hasOpened = false;
          let timeout = null;
          
          function tryDeepLink() {
            // 앱이 설치되어 있다면 딥링크로 열림
            window.location.href = deepLink;
            hasOpened = true;
            
            // 3초 후 폴백 옵션 표시
            timeout = setTimeout(() => {
              if (!document.hidden && !hasOpened) {
                document.getElementById('fallback').style.display = 'block';
              }
            }, 3000);
          }
          
          // 페이지 숨김/보임 감지 (앱이 열린 경우)
          document.addEventListener('visibilitychange', () => {
            if (document.hidden && timeout) {
              clearTimeout(timeout);
            }
          });
          
          // 페이지 포커스 변화 감지
          window.addEventListener('blur', () => {
            if (timeout) {
              clearTimeout(timeout);
            }
          });
          
          // 딥링크 시도
          tryDeepLink();
          
          // iOS Safari의 경우 사용자 제스처 필요할 수 있음
          if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            document.addEventListener('click', tryDeepLink, { once: true });
          }
        </script>
      </body>
      </html>
    `;
    
    return res.send(deepLinkHTML);
  }
  
  // 딥링크 데이터를 req 객체에 추가
  req.deepLink = deepLinkData;
  next();
}

// 앱 설치 유도 배너 미들웨어
export function addAppBanner(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const isMobile = /iPhone|iPad|iPod|Android/.test(userAgent);
  const isInApp = /FBAN|FBAV|Instagram|Line|KakaoTalk|wv/.test(userAgent);
  
  // 모바일이면서 인앱 브라우저가 아닌 경우 앱 설치 배너 추가
  if (isMobile && !isInApp) {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (typeof data === 'string' && data.includes('<head>')) {
        const bannerHTML = `
          <div id="app-banner" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14px;
            z-index: 10000;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; max-width: 400px; margin: 0 auto;">
              <div style="display: flex; align-items: center;">
                <div style="font-size: 24px; margin-right: 10px;">🚀</div>
                <div>
                  <div style="font-weight: bold;">Buzz 앱</div>
                  <div style="font-size: 12px; opacity: 0.8;">더 편리한 모바일 경험</div>
                </div>
              </div>
              <div>
                <button onclick="openApp()" style="
                  background: rgba(255,255,255,0.2);
                  border: 1px solid white;
                  color: white;
                  padding: 5px 15px;
                  border-radius: 15px;
                  font-size: 12px;
                  margin-right: 5px;
                ">열기</button>
                <button onclick="closeBanner()" style="
                  background: none;
                  border: none;
                  color: white;
                  font-size: 18px;
                  cursor: pointer;
                ">×</button>
              </div>
            </div>
          </div>
          
          <script>
            function showAppBanner() {
              const banner = document.getElementById('app-banner');
              if (banner) {
                banner.style.transform = 'translateY(0)';
                document.body.style.paddingTop = '60px';
              }
            }
            
            function closeBanner() {
              const banner = document.getElementById('app-banner');
              if (banner) {
                banner.style.transform = 'translateY(-100%)';
                document.body.style.paddingTop = '0';
                localStorage.setItem('appBannerClosed', 'true');
              }
            }
            
            function openApp() {
              const deepLink = "${generateDeepLink('home')}";
              const storeUrl = /iPhone|iPad|iPod/.test(navigator.userAgent)
                ? "https://apps.apple.com/app/id${process.env.IOS_APP_ID || '123456789'}"
                : "https://play.google.com/store/apps/details?id=${process.env.ANDROID_PACKAGE || 'kr.namgu.buzz'}";
              
              window.location.href = deepLink;
              
              setTimeout(() => {
                window.location.href = storeUrl;
              }, 2000);
            }
            
            // 배너가 닫혔던 적이 없으면 3초 후 표시
            if (!localStorage.getItem('appBannerClosed')) {
              setTimeout(showAppBanner, 3000);
            }
          </script>
        `;
        
        data = data.replace('<body>', `<body>${bannerHTML}`);
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
}

// 딥링크 라우터용 헬퍼
export class DeepLinkBuilder {
  private action: string;
  private data: DeepLinkData = {};
  
  constructor(action: string) {
    this.action = action;
  }
  
  withReferral(code: string): this {
    this.data.referralCode = code;
    return this;
  }
  
  withCampaign(campaignId: string): this {
    this.data.campaignId = campaignId;
    return this;
  }
  
  withTemplate(templateId: string): this {
    this.data.templateId = templateId;
    return this;
  }
  
  withBusiness(businessId: string): this {
    this.data.businessId = businessId;
    return this;
  }
  
  withCoupon(couponId: string): this {
    this.data.couponId = couponId;
    return this;
  }
  
  withUTM(source: string, medium: string, campaign?: string, term?: string, content?: string): this {
    this.data.utm_source = source;
    this.data.utm_medium = medium;
    if (campaign) this.data.utm_campaign = campaign;
    if (term) this.data.utm_term = term;
    if (content) this.data.utm_content = content;
    return this;
  }
  
  build(): string {
    return generateDeepLink(this.action, this.data);
  }
  
  buildUniversal(): string {
    return generateUniversalLink(this.action, this.data);
  }
}

// 타입 확장
declare global {
  namespace Express {
    interface Request {
      deepLink?: DeepLinkData;
    }
  }
}

export default {
  generateDeepLink,
  generateUniversalLink,
  generateSmartBannerMeta,
  handleDeepLink,
  addAppBanner,
  DeepLinkBuilder
};