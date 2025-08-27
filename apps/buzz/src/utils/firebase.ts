// Firebase 설정 및 푸시 알림 관리

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase 설정 (환경변수에서 가져오기)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 메시징 인스턴스
export const messaging = getMessaging(app);

// VAPID 키 (환경변수에서 가져오기)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// FCM 토큰 가져오기
export async function getFCMToken(): Promise<string | null> {
  try {
    // 서비스 워커 등록 확인
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
}

// 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // FCM 토큰 가져오기
      const token = await getFCMToken();
      
      if (token) {
        // 서버에 토큰 등록
        await registerTokenOnServer(token);
        return true;
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// 서버에 FCM 토큰 등록
async function registerTokenOnServer(token: string): Promise<void> {
  try {
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token }),
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('FCM token registered on server');
      localStorage.setItem('fcmToken', token);
    }
  } catch (error) {
    console.error('Failed to register token on server:', error);
  }
}

// 포그라운드 메시지 리스너 설정
export function setupForegroundMessageListener(): void {
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    
    const { title, body, icon, data } = payload.notification || {};
    
    // 커스텀 알림 표시
    showCustomNotification({
      title: title || 'Buzz 알림',
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      data: data || payload.data
    });
  });
}

// 커스텀 알림 표시
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  action?: () => void;
}

export function showCustomNotification(options: NotificationOptions): void {
  const { title, body, icon, data, action } = options;
  
  // 브라우저 내장 알림 사용 (포그라운드에서)
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data,
      requireInteraction: true
    });
    
    notification.onclick = () => {
      window.focus();
      if (action) {
        action();
      } else if (data?.url) {
        window.location.href = data.url;
      }
      notification.close();
    };
  } else {
    // 인앱 알림으로 대체
    showInAppNotification(options);
  }
}

// 인앱 알림 표시 (Notification API가 불가능한 경우)
export function showInAppNotification(options: NotificationOptions): void {
  const { title, body, icon, action } = options;
  
  // 알림 컨테이너 생성 또는 가져오기
  let container = document.getElementById('in-app-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'in-app-notifications';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  
  // 알림 요소 생성
  const notification = document.createElement('div');
  notification.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 10px;
    max-width: 350px;
    cursor: pointer;
    pointer-events: auto;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  notification.innerHTML = `
    ${icon ? `<img src="${icon}" alt="" style="width: 24px; height: 24px; flex-shrink: 0;">` : ''}
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9; line-height: 1.3;">${body}</div>
    </div>
    <button style="
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
    " onclick="this.parentElement.remove()">×</button>
  `;
  
  // 클릭 이벤트
  notification.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      if (action) {
        action();
      }
      notification.remove();
    }
  });
  
  container.appendChild(notification);
  
  // 애니메이션
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
  });
  
  // 자동 제거 (5초 후)
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// 푸시 알림 유형 정의
export interface PushNotificationData {
  type: 'referral_conversion' | 'milestone_achieved' | 'daily_quest' | 'campaign_update' | 'level_up' | 'badge_earned';
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, any>;
  url?: string;
}

// 알림 타입별 커스텀 처리
export function handleNotificationByType(notificationData: PushNotificationData): void {
  const { type, title, body, icon, data, url } = notificationData;
  
  let customIcon = icon;
  let customAction: (() => void) | undefined;
  
  switch (type) {
    case 'referral_conversion':
      customIcon = customIcon || '🎉';
      customAction = () => {
        window.location.href = '/referrals';
      };
      break;
      
    case 'milestone_achieved':
      customIcon = customIcon || '🏆';
      customAction = () => {
        window.location.href = '/referrals#achievements';
      };
      break;
      
    case 'daily_quest':
      customIcon = customIcon || '📋';
      customAction = () => {
        window.location.href = '/referrals#quests';
      };
      break;
      
    case 'campaign_update':
      customIcon = customIcon || '🎯';
      customAction = () => {
        window.location.href = '/referrals#campaigns';
      };
      break;
      
    case 'level_up':
      customIcon = customIcon || '⬆️';
      customAction = () => {
        window.location.href = '/referrals#profile';
      };
      break;
      
    case 'badge_earned':
      customIcon = customIcon || '🏅';
      customAction = () => {
        window.location.href = '/referrals#badges';
      };
      break;
  }
  
  showCustomNotification({
    title,
    body,
    icon: customIcon,
    data,
    action: customAction || (url ? () => { window.location.href = url; } : undefined)
  });
}

// 푸시 알림 설정 초기화
export async function initializePushNotifications(): Promise<boolean> {
  try {
    // 알림 권한 확인
    if (Notification.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return false;
      }
    } else if (Notification.permission !== 'granted') {
      return false;
    }
    
    // 포그라운드 메시지 리스너 설정
    setupForegroundMessageListener();
    
    // 기존 토큰이 있는지 확인하고 서버와 동기화
    const existingToken = localStorage.getItem('fcmToken');
    const currentToken = await getFCMToken();
    
    if (currentToken && existingToken !== currentToken) {
      await registerTokenOnServer(currentToken);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

// 푸시 알림 구독 해제
export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    const token = localStorage.getItem('fcmToken');
    
    if (token) {
      // 서버에서 토큰 제거
      await fetch('/api/notifications/unregister-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token }),
        credentials: 'include'
      });
      
      localStorage.removeItem('fcmToken');
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
  }
}

export default {
  getFCMToken,
  requestNotificationPermission,
  setupForegroundMessageListener,
  showCustomNotification,
  showInAppNotification,
  handleNotificationByType,
  initializePushNotifications,
  unsubscribeFromPushNotifications
};