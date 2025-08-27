// 딥링크 처리 유틸리티

export interface DeepLinkParams {
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

// URL에서 딥링크 파라미터 추출
export function extractDeepLinkParams(): DeepLinkParams {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    action: urlParams.get('dl_action') || undefined,
    referralCode: urlParams.get('dl_referralCode') || urlParams.get('ref') || undefined,
    campaignId: urlParams.get('dl_campaignId') || undefined,
    templateId: urlParams.get('dl_templateId') || undefined,
    businessId: urlParams.get('dl_businessId') || undefined,
    couponId: urlParams.get('dl_couponId') || undefined,
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined
  };
}

// 딥링크 파라미터를 localStorage에 저장
export function storeDeepLinkParams(params: DeepLinkParams): void {
  // 유효한 파라미터만 저장
  const validParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
  );
  
  if (Object.keys(validParams).length > 0) {
    localStorage.setItem('pendingDeepLinkParams', JSON.stringify({
      ...validParams,
      timestamp: Date.now()
    }));
  }
}

// localStorage에서 딥링크 파라미터 가져오기
export function getStoredDeepLinkParams(): DeepLinkParams | null {
  try {
    const stored = localStorage.getItem('pendingDeepLinkParams');
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // 1시간 후 만료
    if (now - data.timestamp > oneHour) {
      localStorage.removeItem('pendingDeepLinkParams');
      return null;
    }
    
    return data;
  } catch {
    localStorage.removeItem('pendingDeepLinkParams');
    return null;
  }
}

// 저장된 딥링크 파라미터 제거
export function clearStoredDeepLinkParams(): void {
  localStorage.removeItem('pendingDeepLinkParams');
}

// 딥링크 액션 처리
export function handleDeepLinkAction(params: DeepLinkParams, navigate: (path: string) => void): boolean {
  if (!params.action) return false;
  
  switch (params.action) {
    case 'signup':
      // 회원가입 페이지로 이동 (리퍼럴 코드 포함)
      if (params.referralCode) {
        navigate(`/signup?ref=${params.referralCode}`);
        return true;
      }
      navigate('/signup');
      return true;
      
    case 'business':
      // 사업체 페이지로 이동
      if (params.businessId) {
        navigate(`/business/${params.businessId}`);
        return true;
      }
      break;
      
    case 'template':
      // 템플릿 페이지로 이동 (마케터 허브)
      if (params.campaignId && params.templateId) {
        navigate(`/referrals?campaign=${params.campaignId}&template=${params.templateId}`);
        return true;
      }
      navigate('/referrals');
      return true;
      
    case 'coupon':
      // 쿠폰 페이지로 이동
      if (params.couponId) {
        navigate(`/coupons/${params.couponId}`);
        return true;
      }
      navigate('/coupons');
      return true;
      
    case 'home':
    default:
      navigate('/');
      return true;
  }
  
  return false;
}

// 공유용 딥링크 생성
export async function generateShareLink(type: 'referral' | 'business' | 'campaign', id: string, customData?: Record<string, string>): Promise<string> {
  try {
    let endpoint = '';
    
    switch (type) {
      case 'referral':
        endpoint = `/api/deeplink/referral/${id}`;
        break;
      case 'business':
        endpoint = `/api/deeplink/business/${id}`;
        break;
      case 'campaign':
        // campaignId/templateId 형태로 전달
        endpoint = `/api/deeplink/campaign/${id}`;
        break;
    }
    
    const params = new URLSearchParams(customData || {});
    const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data.universalLink;
    }
  } catch (error) {
    console.error('Failed to generate share link:', error);
  }
  
  // 폴백: 기본 웹 URL
  return `${window.location.origin}/${type}/${id}`;
}

// 소셜 미디어 공유
export async function shareToSocial(platform: string, referralCode: string, customMessage?: string): Promise<void> {
  try {
    const response = await fetch('/api/deeplink/share-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform,
        referralCode,
        customMessage
      }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const { template, deepLink } = data.data;
      
      // 플랫폼별 공유 처리
      switch (platform) {
        case 'kakao':
          if (window.Kakao && window.Kakao.Share) {
            window.Kakao.Share.sendDefault({
              objectType: 'text',
              text: template.text,
              link: {
                mobileWebUrl: deepLink,
                webUrl: deepLink
              },
              buttons: [
                {
                  title: '지금 가입하기',
                  link: {
                    mobileWebUrl: deepLink,
                    webUrl: deepLink
                  }
                }
              ]
            });
          }
          break;
          
        case 'facebook':
          const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}&quote=${encodeURIComponent(template.text)}`;
          window.open(fbUrl, '_blank', 'width=600,height=400');
          break;
          
        case 'twitter':
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(template.text)}&url=${encodeURIComponent(deepLink)}${template.hashtags ? `&hashtags=${template.hashtags.join(',')}` : ''}`;
          window.open(twitterUrl, '_blank', 'width=600,height=400');
          break;
          
        case 'instagram':
          // Instagram은 직접 공유가 불가능하므로 클립보드 복사
          await navigator.clipboard.writeText(`${template.text}\n\n${deepLink}`);
          alert('Instagram용 텍스트가 클립보드에 복사되었습니다!');
          break;
          
        default:
          // 기본 웹 공유 API 사용
          if (navigator.share) {
            await navigator.share({
              title: 'Buzz 추천',
              text: template.text,
              url: deepLink
            });
          } else {
            await navigator.clipboard.writeText(`${template.text}\n\n${deepLink}`);
            alert('공유 링크가 클립보드에 복사되었습니다!');
          }
      }
      
      // 분석 데이터 전송
      trackShare(platform, referralCode);
    }
  } catch (error) {
    console.error('Share failed:', error);
    alert('공유에 실패했습니다. 다시 시도해주세요.');
  }
}

// 공유 추적
function trackShare(platform: string, referralCode: string): void {
  fetch('/api/deeplink/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'share',
      platform,
      referralCode,
      userAgent: navigator.userAgent
    }),
    credentials: 'include'
  }).catch(console.error);
}

// 앱 설치 여부 확인
export function checkAppInstallation(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000);
    
    // 앱이 설치되어 있으면 blur 이벤트가 발생
    const onBlur = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    window.addEventListener('blur', onBlur, { once: true });
    
    // 딥링크 시도
    window.location.href = 'buzz://home';
  });
}

// 모바일 여부 확인
export function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// 인앱 브라우저 여부 확인
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line|KakaoTalk|wv/i.test(ua);
}

// 플랫폼 감지
export function getPlatform(): 'ios' | 'android' | 'web' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

// 딥링크 초기화 (앱 시작시 호출)
export function initDeepLink(navigate: (path: string) => void): void {
  // URL에서 딥링크 파라미터 추출
  const currentParams = extractDeepLinkParams();
  
  // localStorage에서 저장된 파라미터 가져오기
  const storedParams = getStoredDeepLinkParams();
  
  // 현재 파라미터가 우선, 없으면 저장된 파라미터 사용
  const params = { ...storedParams, ...currentParams };
  
  // 유효한 파라미터가 있으면 처리
  if (Object.keys(params).length > 0) {
    // 처리 성공하면 저장된 파라미터 제거
    if (handleDeepLinkAction(params, navigate)) {
      clearStoredDeepLinkParams();
    } else {
      // 처리 실패시 나중을 위해 저장
      storeDeepLinkParams(params);
    }
  }
}

// Kakao SDK 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}