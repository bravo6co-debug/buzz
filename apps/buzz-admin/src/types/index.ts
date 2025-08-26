// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'business' | 'admin';
  mileageBalance: number;
  referralCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Business Types
export interface Business {
  id: number;
  userId: number;
  businessName: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  images: string[];
  businessHours?: BusinessHours;
  rating: number;
  reviewCount: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  monday?: { open: string; close: string; };
  tuesday?: { open: string; close: string; };
  wednesday?: { open: string; close: string; };
  thursday?: { open: string; close: string; };
  friday?: { open: string; close: string; };
  saturday?: { open: string; close: string; };
  sunday?: { open: string; close: string; };
}

// Referral Types
export interface Referral {
  id: number;
  referrerId: number;
  refereeId: number;
  referralCode: string;
  rewardAmount: number;
  signupBonus: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// Coupon Types
export interface Coupon {
  id: number;
  userId: number;
  couponType: 'basic' | 'event' | 'mileage_qr';
  discountType: 'amount' | 'percentage';
  discountValue: number;
  isUsed: boolean;
  usedAt?: string;
  usedBusinessId?: number;
  expiresAt: string;
  createdAt: string;
}

// Mileage Transaction Types
export interface MileageTransaction {
  id: number;
  userId: number;
  transactionType: 'earn' | 'use' | 'admin_adjust';
  amount: number;
  description?: string;
  referenceType: 'referral' | 'signup' | 'mileage_use' | 'admin';
  referenceId?: number;
  createdAt: string;
}

// Settlement Types
export interface BusinessSettlement {
  id: number;
  businessId: number;
  settlementType: 'mileage_use' | 'event_coupon';
  amount: number;
  referenceType: 'mileage_transaction' | 'coupon';
  referenceId?: number;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

// System Settings Types
export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedAt: string;
}

// Content Types
export interface RegionalContent {
  id: number;
  title: string;
  content: string;
  images: string[];
  contentType: 'tour_course' | 'photo_spot' | 'seasonal_special';
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export interface Event {
  id: number;
  title: string;
  description?: string;
  eventType: 'signup_bonus' | 'referral_bonus' | 'special_coupon';
  bonusAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

// Dashboard Stats Types
export interface DashboardStats {
  totalUsers: number;
  userGrowthRate: number;
  totalBusinesses: number;
  approvedBusinesses: number;
  pendingApprovals: number;
  totalMileageIssued: number;
  totalMileageUsed: number;
  mileageBalance: number;
  budgetUsed: number;
  budgetTotal: number;
  dailyReferrals: number;
  monthlyReferrals: number;
  referralConversionRate: number;
  recentTransactions: MileageTransaction[];
  recentSignups: User[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form Types
export interface PolicyForm {
  referralReward: number;
  signupBonusDefault: number;
  signupBonusReferral: number;
  basicCouponAmount: number;
  basicCouponPercentage: number;
  eventCouponPercentage: number;
  eventCouponGovernmentRatio: number;
}

export interface BusinessApprovalForm {
  businessId: number;
  action: 'approve' | 'reject';
  reason?: string;
}

export interface SettlementProcessForm {
  settlementId: number;
  action: 'approve' | 'reject';
  reason?: string;
}

export interface UserMileageAdjustForm {
  userId: number;
  amount: number;
  description: string;
  type: 'add' | 'subtract';
}

// Filter and Sort Types
export interface UserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BusinessFilters {
  category?: string;
  isApproved?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SettlementFilters {
  status?: string;
  settlementType?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export interface ReferralChart {
  daily: ChartData[];
  monthly: ChartData[];
}

export interface MileageChart {
  issued: ChartData[];
  used: ChartData[];
  balance: ChartData[];
}