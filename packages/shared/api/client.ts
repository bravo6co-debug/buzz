/**
 * Unified API Client for Buzz Platform
 * Replaces duplicate API implementations across apps
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getLogger } from '../logger';
import type { ApiResponse, User, Business, MileageTransaction, Coupon, Review, Campaign } from '../types';

const logger = getLogger();

// API Configuration
const API_BASE_URL = (typeof window !== 'undefined' && (window as any).__VITE_API_URL__) || 
                     process.env.API_URL || 
                     'http://localhost:8083/api';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const createApiInstance = (baseURL: string = API_BASE_URL): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: API_TIMEOUT,
    withCredentials: true, // Important for session cookies
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Log API requests in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
      }
      return config;
    },
    (error) => {
      logger.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Log successful responses in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error: AxiosError<ApiResponse>) => {
      // Handle common error cases
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 401:
            // Unauthorized - redirect to login
            logger.warn('Unauthorized access, redirecting to login');
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            break;
          case 403:
            logger.warn('Forbidden access');
            break;
          case 404:
            logger.warn('Resource not found');
            break;
          case 500:
            logger.error('Server error', data);
            break;
          default:
            logger.error(`API Error ${status}:`, data);
        }
      } else if (error.request) {
        logger.error('No response from server:', error.message);
      } else {
        logger.error('API configuration error:', error.message);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

// Default API instance
const api = createApiInstance();

/**
 * Unified API Client Class
 */
export class ApiClient {
  private instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = baseURL ? createApiInstance(baseURL) : api;
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as ApiResponse<T>;
      }
      throw error;
    }
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string) =>
      this.request<{ user: User }>({
        method: 'POST',
        url: '/auth/login',
        data: { email, password },
      }),

    signup: (data: any) =>
      this.request<{ user: User; referralBonus?: number }>({
        method: 'POST',
        url: '/auth/signup',
        data,
      }),

    logout: () =>
      this.request<void>({
        method: 'POST',
        url: '/auth/logout',
      }),

    getProfile: () =>
      this.request<User>({
        method: 'GET',
        url: '/auth/profile',
      }),

    updateProfile: (data: Partial<User>) =>
      this.request<User>({
        method: 'PUT',
        url: '/auth/profile',
        data,
      }),
  };

  // User endpoints
  users = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      this.request<User[]>({
        method: 'GET',
        url: '/users',
        params,
      }),

    getById: (id: number) =>
      this.request<User>({
        method: 'GET',
        url: `/users/${id}`,
      }),

    update: (id: number, data: Partial<User>) =>
      this.request<User>({
        method: 'PUT',
        url: `/users/${id}`,
        data,
      }),

    delete: (id: number) =>
      this.request<void>({
        method: 'DELETE',
        url: `/users/${id}`,
      }),
  };

  // Business endpoints
  businesses = {
    list: (params?: { page?: number; limit?: number; category?: string }) =>
      this.request<Business[]>({
        method: 'GET',
        url: '/businesses',
        params,
      }),

    getById: (id: number) =>
      this.request<Business>({
        method: 'GET',
        url: `/businesses/${id}`,
      }),

    create: (data: Partial<Business>) =>
      this.request<Business>({
        method: 'POST',
        url: '/businesses',
        data,
      }),

    update: (id: number, data: Partial<Business>) =>
      this.request<Business>({
        method: 'PUT',
        url: `/businesses/${id}`,
        data,
      }),

    approve: (id: number) =>
      this.request<Business>({
        method: 'POST',
        url: `/businesses/${id}/approve`,
      }),

    getStats: (id: number) =>
      this.request<any>({
        method: 'GET',
        url: `/businesses/${id}/stats`,
      }),
  };

  // Mileage endpoints
  mileage = {
    getBalance: () =>
      this.request<{ balance: number }>({
        method: 'GET',
        url: '/mileage/balance',
      }),

    getTransactions: (params?: { page?: number; limit?: number }) =>
      this.request<MileageTransaction[]>({
        method: 'GET',
        url: '/mileage/transactions',
        params,
      }),

    earn: (amount: number, description?: string) =>
      this.request<MileageTransaction>({
        method: 'POST',
        url: '/mileage/earn',
        data: { amount, description },
      }),

    spend: (amount: number, businessId: number, description?: string) =>
      this.request<MileageTransaction>({
        method: 'POST',
        url: '/mileage/spend',
        data: { amount, businessId, description },
      }),
  };

  // Coupon endpoints
  coupons = {
    getMyCoupons: () =>
      this.request<Coupon[]>({
        method: 'GET',
        url: '/coupons/my',
      }),

    getCoupon: (id: number) =>
      this.request<Coupon>({
        method: 'GET',
        url: `/coupons/${id}`,
      }),

    useCoupon: (id: number) =>
      this.request<Coupon>({
        method: 'POST',
        url: `/coupons/${id}/use`,
      }),

    createCoupon: (data: Partial<Coupon>) =>
      this.request<Coupon>({
        method: 'POST',
        url: '/coupons',
        data,
      }),
  };

  // QR endpoints
  qr = {
    generateMileage: () =>
      this.request<{ qrData: string; qrImage: string; expiresAt: string }>({
        method: 'GET',
        url: '/qr/mileage',
      }),

    generateCoupon: (couponId: number) =>
      this.request<{ qrData: string; qrImage: string; expiresAt: string }>({
        method: 'GET',
        url: `/qr/coupon/${couponId}`,
      }),

    scan: (qrData: string, amount?: number) =>
      this.request<any>({
        method: 'POST',
        url: '/qr/scan',
        data: { qrData, amount },
      }),

    verify: (token: string) =>
      this.request<any>({
        method: 'POST',
        url: '/qr/verify',
        data: { token },
      }),
  };

  // Referral endpoints
  referrals = {
    getLink: () =>
      this.request<{ referralLink: string; referralCode: string }>({
        method: 'POST',
        url: '/referrals/link',
      }),

    getStats: () =>
      this.request<any>({
        method: 'GET',
        url: '/referrals/stats',
      }),

    getLeaderboard: (limit: number = 10) =>
      this.request<any>({
        method: 'GET',
        url: '/referrals/leaderboard',
        params: { limit },
      }),

    getShareTemplate: (platform: string) =>
      this.request<any>({
        method: 'POST',
        url: '/referrals/share-template',
        data: { platform },
      }),
  };

  // Review endpoints
  reviews = {
    getBusinessReviews: (businessId: number) =>
      this.request<Review[]>({
        method: 'GET',
        url: `/reviews/business/${businessId}`,
      }),

    createReview: (data: Partial<Review>) =>
      this.request<Review>({
        method: 'POST',
        url: '/reviews',
        data,
      }),

    updateReview: (id: number, data: Partial<Review>) =>
      this.request<Review>({
        method: 'PUT',
        url: `/reviews/${id}`,
        data,
      }),

    deleteReview: (id: number) =>
      this.request<void>({
        method: 'DELETE',
        url: `/reviews/${id}`,
      }),

    replyToReview: (id: number, reply: string) =>
      this.request<Review>({
        method: 'POST',
        url: `/reviews/${id}/reply`,
        data: { reply },
      }),
  };

  // Campaign endpoints (for marketer)
  campaigns = {
    list: () =>
      this.request<Campaign[]>({
        method: 'GET',
        url: '/campaigns',
      }),

    create: (data: Partial<Campaign>) =>
      this.request<Campaign>({
        method: 'POST',
        url: '/campaigns',
        data,
      }),

    update: (id: number, data: Partial<Campaign>) =>
      this.request<Campaign>({
        method: 'PUT',
        url: `/campaigns/${id}`,
        data,
      }),

    getStats: (id: number) =>
      this.request<any>({
        method: 'GET',
        url: `/campaigns/${id}/stats`,
      }),

    trackClick: (code: string) =>
      this.request<void>({
        method: 'POST',
        url: '/campaigns/track/click',
        data: { code },
      }),
  };

  // Admin endpoints
  admin = {
    getDashboard: () =>
      this.request<any>({
        method: 'GET',
        url: '/admin/dashboard',
      }),

    getSystemSettings: () =>
      this.request<any>({
        method: 'GET',
        url: '/admin/settings',
      }),

    updateSystemSettings: (settings: any) =>
      this.request<any>({
        method: 'PUT',
        url: '/admin/settings',
        data: settings,
      }),

    getSettlements: (params?: any) =>
      this.request<any>({
        method: 'GET',
        url: '/settlements',
        params,
      }),

    processSettlement: (id: number) =>
      this.request<any>({
        method: 'POST',
        url: `/settlements/${id}/process`,
      }),
  };

  // Notification endpoints
  notifications = {
    list: () =>
      this.request<any[]>({
        method: 'GET',
        url: '/notifications',
      }),

    markAsRead: (id: number) =>
      this.request<void>({
        method: 'PUT',
        url: `/notifications/${id}/read`,
      }),

    markAllAsRead: () =>
      this.request<void>({
        method: 'PUT',
        url: '/notifications/read-all',
      }),

    updateFcmToken: (token: string) =>
      this.request<void>({
        method: 'POST',
        url: '/notifications/fcm-token',
        data: { token },
      }),
  };
}

// Export default instance
export const apiClient = new ApiClient();

// Export for backward compatibility
export default api;