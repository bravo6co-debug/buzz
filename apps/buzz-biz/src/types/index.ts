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
    closed?: boolean;
  };
}

// User & Auth Types
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
  expires_at?: string;
  created_at: string;
}

// Mileage Types
export interface MileageTransaction {
  id: number;
  user_id: number;
  transaction_type: 'earn' | 'use' | 'admin_adjust';
  amount: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
}

// Settlement Types
export interface BusinessSettlement {
  id: number;
  business_id: number;
  settlement_type: 'mileage_use' | 'event_coupon';
  amount: number;
  reference_type: string;
  reference_id: number;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  requested_at: string;
  processed_at?: string;
}

// QR Scan Types
export interface QRScanResult {
  type: 'coupon' | 'mileage';
  data: any;
  timestamp: number;
  expires: number;
}

export interface CouponScanResult {
  coupon: Coupon;
  user: User;
  valid: boolean;
  message?: string;
}

export interface MileageScanResult {
  user: User;
  balance: number;
  valid: boolean;
  message?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics Types
export interface BusinessStats {
  today: {
    customer_count: number;
    coupon_usage: number;
    mileage_usage: number;
    total_sales: number;
  };
  week: {
    customer_count: number;
    coupon_usage: number;
    mileage_usage: number;
    total_sales: number;
  };
  month: {
    customer_count: number;
    coupon_usage: number;
    mileage_usage: number;
    total_sales: number;
    settlement_amount: number;
  };
  coupon_breakdown: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
}

// Form Types
export interface MileageUsageForm {
  user_id: number;
  amount: number;
  description?: string;
}

export interface SettlementRequestForm {
  settlement_type: 'mileage_use' | 'event_coupon';
  period_start: string;
  period_end: string;
  description?: string;
}

export interface BusinessProfileForm {
  business_name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  business_hours?: BusinessHours;
}

// UI State Types
export interface AppState {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  error: string | null;
}

export interface QRScanState {
  isScanning: boolean;
  result: string | null;
  error: string | null;
}