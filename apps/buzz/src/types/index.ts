// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'business' | 'admin';
  mileage_balance: number;
  referral_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Referral Types
export interface Referral {
  id: number;
  referrer_id: number;
  referee_id: number;
  referral_code: string;
  reward_amount: number;
  signup_bonus: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ReferralStats {
  totalReferred: number;
  totalEarned: number;
  recentReferrals: Referral[];
}

// Coupon Types
export interface Coupon {
  id: number;
  user_id: number;
  coupon_type: 'basic' | 'event' | 'mileage_qr';
  discount_type: 'amount' | 'percentage';
  discount_value: number;
  is_used: boolean;
  used_at?: string;
  used_business_id?: number;
  expires_at: string;
  created_at: string;
}

// Mileage Types
export interface MileageTransaction {
  id: number;
  user_id: number;
  transaction_type: 'earn' | 'use' | 'admin_adjust';
  amount: number;
  description?: string;
  reference_type: 'referral' | 'signup' | 'mileage_use' | 'admin';
  reference_id?: number;
  created_at: string;
}

export interface MileageInfo {
  balance: number;
  transactions: MileageTransaction[];
}

// Business Types
export interface Business {
  id: number;
  user_id: number;
  business_name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  images?: string[];
  business_hours?: BusinessHours;
  rating: number;
  review_count: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface BusinessReview {
  id: number;
  business_id: number;
  user_id: number;
  rating: number;
  review_text?: string;
  images?: string[];
  created_at: string;
  user_name?: string;
}

// Regional Content Types
export interface RegionalContent {
  id: number;
  title: string;
  content: string;
  images?: string[];
  content_type: 'tour_course' | 'photo_spot' | 'seasonal_special' | 'food_tour';
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Event Types
export interface Event {
  id: number;
  title: string;
  description?: string;
  event_type: 'signup_bonus' | 'referral_bonus' | 'special_coupon';
  bonus_amount?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Types
export interface UserDashboard {
  user: User;
  mileage_balance: number;
  available_coupons: number;
  recent_transactions: MileageTransaction[];
}

// QR Code Types
export interface QRCodeData {
  type: 'coupon' | 'mileage';
  id: number;
  user_id: number;
  expires_at?: string;
  data: any;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone?: string;
  referralCode?: string;
}

export interface ReferralLinkResponse {
  referralLink: string;
  referralCode: string;
}

// Share Content Types
export interface ShareContent {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

// Navigation Types
export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType;
}