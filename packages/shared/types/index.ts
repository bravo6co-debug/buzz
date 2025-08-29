/**
 * Shared type definitions for Buzz Platform
 * All types use camelCase for consistency
 */

// User types
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'business' | 'admin';
  mileageBalance: number; // Changed from mileage_balance to camelCase
  referralCode?: string;
  fcmToken?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Business types
export interface Business {
  id: number;
  userId: number;
  businessName: string;
  businessPhone: string;
  address: string;
  category: string;
  description?: string;
  imageUrl?: string;
  rating: number;
  totalReviews: number;
  isApproved: boolean;
  approvedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Mileage transaction types
export interface MileageTransaction {
  id: number;
  userId: number;
  businessId?: number;
  transactionType: 'earn' | 'spend' | 'bonus' | 'referral' | 'event';
  amount: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: Date | string;
}

// Coupon types
export interface Coupon {
  id: number;
  userId: number;
  businessId?: number;
  couponType: 'welcome' | 'event' | 'birthday' | 'referral' | 'custom';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  isUsed: boolean;
  usedAt?: Date | string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

// Referral types
export interface Referral {
  id: number;
  referrerId: number;
  refereeId: number;
  referralCode: string;
  rewardAmount: number;
  signupBonus: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date | string;
}

// Review types
export interface Review {
  id: number;
  userId: number;
  businessId: number;
  rating: number;
  comment?: string;
  imageUrls?: string[];
  isRead: boolean;
  ownerReply?: string;
  ownerRepliedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Settlement types
export interface Settlement {
  id: number;
  businessId: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  totalAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date | string;
  createdAt: Date | string;
}

// QR Token types
export interface QRToken {
  id: number;
  tokenId: string;
  userId: number;
  tokenType: 'mileage' | 'coupon' | 'event';
  tokenData: any;
  isUsed: boolean;
  usedAt?: Date | string;
  usedBy?: number;
  expiresAt: Date | string;
  createdAt: Date | string;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  isRead: boolean;
  readAt?: Date | string;
  createdAt: Date | string;
}

// Campaign types (for marketer referral)
export interface Campaign {
  id: number;
  marketerId: number;
  name: string;
  description?: string;
  referralCode: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  targetUrl: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
  totalRewards: number;
  isActive: boolean;
  expiresAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  name: string;
  phone?: string;
  referralCode?: string;
  fingerprint?: string;
  deviceInfo?: {
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
  };
}

export interface AuthResponse {
  user: User;
  token?: string;
  referralBonus?: number;
  signupBonus?: number;
}

// Session types
export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'business' | 'admin';
}

// Statistics types
export interface DashboardStats {
  totalUsers: number;
  totalBusinesses: number;
  totalTransactions: number;
  totalMileageIssued: number;
  totalMileageUsed: number;
  activeUsers30d: number;
  newUsersToday: number;
  pendingSettlements: number;
}

export interface BusinessStats {
  totalCustomers: number;
  totalTransactions: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  todayTransactions: number;
  todayRevenue: number;
  monthlyGrowth: number;
}

// Enums for consistency
export enum UserRole {
  USER = 'user',
  BUSINESS = 'business',
  ADMIN = 'admin'
}

export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  EVENT = 'event'
}

export enum CouponType {
  WELCOME = 'welcome',
  EVENT = 'event',
  BIRTHDAY = 'birthday',
  REFERRAL = 'referral',
  CUSTOM = 'custom'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed'
}

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResponse<T> = Promise<ApiResponse<T>>;

// Re-export commonly used types
export type UserId = number;
export type BusinessId = number;
export type Amount = number;
export type Timestamp = Date | string;