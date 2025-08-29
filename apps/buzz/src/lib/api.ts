import axios from 'axios';
import { 
  ApiResponse, 
  PaginatedResponse, 
  User, 
  UserDashboard, 
  MileageInfo,
  Coupon,
  ReferralStats,
  ReferralLinkResponse,
  Business,
  BusinessReview,
  RegionalContent,
  Event,
  LoginForm,
  SignupForm
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For session-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authApi = {
  login: (data: LoginForm) => 
    api.post<ApiResponse<{ user: User; sessionId: string }>>('/api/auth/login', data),
  
  signup: (data: SignupForm) => 
    api.post<ApiResponse<{ user: User; sessionId: string }>>('/api/auth/signup', data),
  
  logout: () => 
    api.post<ApiResponse<null>>('/api/auth/logout'),
  
  me: () => 
    api.get<ApiResponse<User>>('/api/auth/me'),
};

// User API
export const userApi = {
  getDashboard: () => 
    api.get<ApiResponse<UserDashboard>>('/api/user/dashboard'),
  
  getProfile: () => 
    api.get<ApiResponse<User>>('/api/user/profile'),
  
  getMileage: () => 
    api.get<ApiResponse<MileageInfo>>('/api/mileage/balance'),
  
  getMileageTransactions: (params?: { page?: number; limit?: number; type?: 'earn' | 'use' | 'admin_adjust' }) =>
    api.get<ApiResponse<{
      balance: number;
      transactions: Array<{
        id: number;
        transactionType: string;
        amount: number;
        description: string;
        referenceType: string;
        referenceId: number | null;
        createdAt: string;
        businessName: string | null;
      }>;
      pagination: {
        currentPage: number;
        limit: number;
        hasMore: boolean;
      };
    }>>('/api/mileage/transactions', { params }),
  
  
  getReferrals: () => 
    api.get<ApiResponse<ReferralStats>>('/api/referrals/stats'),
  
  createReferralLink: () => 
    api.post<ApiResponse<ReferralLinkResponse>>('/api/referrals/link'),
  
  getMileageQR: () => 
    api.get<ApiResponse<{
      qrData: string;
      qrImage: string;
      balance: number;
      expiresAt: string;
      userName: string;
    }>>('/api/mileage/qr'),
  
  getCouponQR: (couponId: number) => 
    api.get<ApiResponse<{
      qrData: string;
      qrImage: string;
      tokenId: number;
      expiresAt: string;
      coupon: {
        id: number;
        couponType: string;
        discountType: string;
        discountValue: number;
        expiresAt: string | null;
      };
    }>>(`/api/qr/coupon/${couponId}`),
  
  getCoupons: (params?: {
    type?: 'basic' | 'event' | 'mileage_qr';
    status?: 'available' | 'used' | 'expired';
    page?: number;
    limit?: number;
  }) => 
    api.get<ApiResponse<{
      coupons: Array<Coupon & { qrData?: string; qrImage?: string }>;
      pagination: {
        currentPage: number;
        limit: number;
        hasMore: boolean;
      };
    }>>('/api/coupons', { params }),
};

// Business API
export const businessApi = {
  getFeatured: () => 
    api.get<ApiResponse<Business[]>>('/api/businesses/featured'),
  
  getAll: (params?: { category?: string; limit?: number }) => 
    api.get<PaginatedResponse<Business>>('/api/businesses', { params }),
  
  getById: (id: number) => 
    api.get<ApiResponse<{ business: Business; reviews: BusinessReview[]; availableCoupons: any[] }>>(`/api/businesses/${id}`),
  
  getReviews: (id: number) => 
    api.get<PaginatedResponse<BusinessReview>>(`/api/businesses/${id}/reviews`),
};

// Regional Content API
export const regionalApi = {
  getContent: (type?: string) => 
    api.get<ApiResponse<RegionalContent[]>>('/api/contents/regional', { 
      params: type ? { type } : undefined 
    }),
};

// Event API
export const eventApi = {
  getActive: () => 
    api.get<ApiResponse<Event[]>>('/api/events/active'),
};

// QR/Coupon API
export const qrApi = {
  verifyCoupon: (qrData: string) => 
    api.post<ApiResponse<{ valid: boolean; coupon: any; user: any }>>('/api/coupons/verify', { qrData }),
  
  useCoupon: (couponId: number, businessId: number) => 
    api.post<ApiResponse<null>>('/api/coupons/use', { couponId, businessId }),
};

// Mileage API
export const mileageApi = {
  getBalance: () => 
    api.get<ApiResponse<{
      balance: number;
      totalEarned: number;
      totalUsed: number;
    }>>('/api/mileage/balance'),
  
  getTransactions: (params?: { page?: number; limit?: number; type?: 'earn' | 'use' | 'admin_adjust' }) =>
    api.get<ApiResponse<{
      balance: number;
      transactions: Array<{
        id: number;
        transactionType: string;
        amount: number;
        description: string;
        referenceType: string;
        referenceId: number | null;
        createdAt: string;
        businessName: string | null;
      }>;
      pagination: {
        currentPage: number;
        limit: number;
        hasMore: boolean;
      };
    }>>('/api/mileage/transactions', { params }),
  
  generateQR: () => 
    api.get<ApiResponse<{
      qrData: string;
      qrImage: string;
      balance: number;
      expiresAt: string;
      userName: string;
    }>>('/api/mileage/qr'),
  
  verifyQR: (qrData: string) => 
    api.post<ApiResponse<{
      valid: boolean;
      user?: {
        id: number;
        name: string;
        balance: number;
      };
      reason?: string;
      expiresAt?: string;
    }>>('/api/mileage/verify-qr', { qrData }),
  
  use: (userId: number, amount: number, businessId: number, description?: string) => 
    api.post<ApiResponse<{
      transactionId: number;
      usedAmount: number;
      remainingBalance: number;
      settlementId: number;
      businessName: string;
    }>>('/api/mileage/use', { userId, amount, businessId, description }),
  
  adminAdjust: (userId: number, amount: number, description: string, reason: 'bonus' | 'penalty' | 'correction' | 'event' | 'refund') => 
    api.post<ApiResponse<{
      transactionId: number;
      previousBalance: number;
      adjustmentAmount: number;
      newBalance: number;
      reason: string;
    }>>('/api/mileage/admin/adjust', { userId, amount, description, reason }),
};

// Referral API
export const referralApi = {
  getStats: (params?: { page?: number; limit?: number }) => 
    api.get<ApiResponse<ReferralStats>>('/api/referrals/stats', { params }),
  
  createLink: () => 
    api.post<ApiResponse<ReferralLinkResponse>>('/api/referrals/link'),
  
  getShareTemplate: (platform: 'kakao' | 'facebook' | 'twitter' | 'instagram' | 'copy', customMessage?: string) => 
    api.post<ApiResponse<{
      platform: string;
      shareUrl: string;
      message: string;
      hashtags: string[];
      title: string;
      description: string;
    }>>('/api/referrals/share-template', { platform, customMessage }),
  
  getLeaderboard: (limit?: number) => 
    api.get<ApiResponse<{
      period: string;
      leaderboard: Array<{
        rank: number;
        userName: string;
        referralCount: number;
        totalEarned: number;
      }>;
      total: number;
    }>>('/api/referrals/leaderboard', { params: { limit } }),
};