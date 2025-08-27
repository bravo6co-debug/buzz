// Shared types from @buzz/shared package
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  profile_image?: string;
  role: 'user' | 'business' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface Business {
  id: string;
  business_name: string;
  business_number: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  hours?: string;
  images?: string[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Coupon {
  id: string;
  business_id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: Date;
  valid_until: Date;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  start_date: Date;
  end_date: Date;
  location?: string;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  campaign_id: string;
  status: 'pending' | 'completed' | 'expired';
  reward_amount: number;
  created_at: Date;
  completed_at?: Date;
}

export interface MileageTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent' | 'expired';
  amount: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  created_at: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}