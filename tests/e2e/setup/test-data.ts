export const testData = {
  users: {
    customer: {
      email: 'test.customer@buzz.test',
      password: 'TestPass123!',
      name: '김테스트',
      phone: '010-1234-5678',
    },
    business: {
      email: 'test.business@buzz.test',
      password: 'TestPass123!',
      name: '사업자테스트',
      phone: '010-8765-4321',
      businessName: '테스트 카페',
      businessPhone: '02-1234-5678',
      address: '서울시 강남구 테스트로 123',
      category: 'cafe',
      description: '테스트용 카페입니다',
    },
    admin: {
      email: 'admin@buzz.test',
      password: 'AdminPass123!',
      name: '관리자',
    }
  },

  referral: {
    codes: {
      valid: 'TEST123A',
      invalid: 'INVALID1',
      expired: 'EXPIRED1'
    },
    rewards: {
      referrer: 500,
      referee: 3000,
      eventBonus: 1000
    }
  },

  mileage: {
    amounts: {
      small: 100,
      medium: 500,
      large: 1000
    },
    transactions: {
      earn: 'earn',
      spend: 'spend',
      bonus: 'bonus',
      referral: 'referral',
      event: 'event'
    }
  },

  business: {
    categories: [
      'restaurant',
      'cafe',
      'bakery',
      'convenience',
      'retail',
      'service'
    ],
    statuses: [
      'pending',
      'approved',
      'rejected',
      'suspended'
    ]
  },

  qr: {
    tokenTypes: [
      'mileage',
      'coupon',
      'event'
    ],
    expiryTime: 300000, // 5 minutes in milliseconds
  },

  api: {
    endpoints: {
      auth: {
        login: '/api/auth/login',
        signup: '/api/auth/signup',
        logout: '/api/auth/logout',
        refresh: '/api/auth/refresh'
      },
      users: '/api/users',
      businesses: '/api/businesses',
      mileage: '/api/mileage',
      referrals: '/api/referrals',
      qr: '/api/qr',
      reviews: '/api/reviews',
      settlements: '/api/settlements'
    },
    timeouts: {
      short: 5000,
      medium: 10000,
      long: 30000
    }
  },

  ui: {
    selectors: {
      // Common selectors
      submitButton: '[type="submit"]',
      cancelButton: '[data-testid="cancel-button"]',
      loadingSpinner: '[data-testid="loading-spinner"]',
      errorMessage: '[data-testid="error-message"]',
      successMessage: '[data-testid="success-message"]',
      
      // Auth selectors
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      nameInput: 'input[name="name"]',
      phoneInput: 'input[name="phone"]',
      referralCodeInput: 'input[name="referralCode"]',
      
      // Navigation
      homeLink: '[data-testid="home-link"]',
      profileLink: '[data-testid="profile-link"]',
      businessLink: '[data-testid="business-link"]',
      adminLink: '[data-testid="admin-link"]',
      
      // QR Code
      qrCodeModal: '[data-testid="qr-modal"]',
      qrCodeImage: '[data-testid="qr-code-image"]',
      scanButton: '[data-testid="scan-button"]',
      
      // Mileage
      mileageBalance: '[data-testid="mileage-balance"]',
      earnMileageButton: '[data-testid="earn-mileage"]',
      spendMileageButton: '[data-testid="spend-mileage"]',
      
      // Referral
      referralCodeDisplay: '[data-testid="referral-code"]',
      referralLinkButton: '[data-testid="referral-link"]',
      shareButton: '[data-testid="share-button"]'
    },
    
    messages: {
      success: {
        login: '로그인이 완료되었습니다',
        signup: '회원가입이 완료되었습니다',
        mileageEarn: '마일리지가 적립되었습니다',
        referralSuccess: '추천이 완료되었습니다'
      },
      error: {
        invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
        emailExists: '이미 사용중인 이메일입니다',
        selfReferral: '자기 자신을 추천할 수 없습니다',
        referralLimit: '24시간 내 추천 한도를 초과했습니다',
        insufficientMileage: '마일리지가 부족합니다'
      }
    }
  },

  // Test environment configuration
  env: {
    baseUrls: {
      buzz: 'http://localhost:8106',
      buzzBiz: 'http://localhost:8105',
      buzzAdmin: 'http://localhost:8104',
      api: 'http://localhost:8083'
    },
    testTimeout: 30000,
    slowTimeout: 60000,
    waitForTimeout: 5000
  }
};

// Helper function to generate unique test data
export const generateTestUser = (prefix: string = 'test') => ({
  email: `${prefix}.${Date.now()}@buzz.test`,
  password: 'TestPass123!',
  name: `${prefix}사용자${Date.now().toString().slice(-4)}`,
  phone: `010-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
});

export const generateBusinessData = (prefix: string = 'test') => ({
  ...generateTestUser(prefix),
  businessName: `${prefix} 비즈니스 ${Date.now().toString().slice(-4)}`,
  businessPhone: `02-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  address: `서울시 테스트구 ${prefix}로 ${Math.floor(Math.random() * 999) + 1}`,
  category: 'cafe',
  description: `${prefix} 테스트용 비즈니스입니다`
});

export const generateReferralCode = (name: string): string => {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 4) || 'USER';
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + random;
};