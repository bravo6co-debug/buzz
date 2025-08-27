export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    ORDERS: '/users/orders',
  },
  BUSINESSES: {
    BASE: '/businesses',
    PRODUCTS: '/businesses/:id/products',
    ORDERS: '/businesses/:id/orders',
    NEARBY: '/businesses/nearby',
  },
  PRODUCTS: {
    BASE: '/products',
    BY_BUSINESS: '/products/business/:businessId',
    CATEGORIES: '/products/categories',
  },
  ORDERS: {
    BASE: '/orders',
    CREATE: '/orders',
    STATUS: '/orders/:id/status',
  },
  REVIEWS: {
    BASE: '/reviews',
    BY_BUSINESS: '/reviews/business/:businessId',
  },
} as const;

export const ORDER_STATUS_LABELS = {
  PENDING: '주문 대기',
  CONFIRMED: '주문 확인',
  PREPARING: '조리 중',
  READY: '조리 완료',
  COMPLETED: '주문 완료',
  CANCELLED: '주문 취소',
} as const;

export const PRODUCT_CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '치킨',
  '피자',
  '햄버거',
  '카페',
  '디저트',
] as const;

export const APP_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_RADIUS: 10, // km
} as const;