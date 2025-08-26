// Database types generated from schema
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  referrals,
  coupons,
  mileageTransactions,
  businesses,
  businessReviews,
  businessSettlements,
  systemSettings,
  regionalContents,
  events
} from './schema';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Referral types
export type Referral = InferSelectModel<typeof referrals>;
export type NewReferral = InferInsertModel<typeof referrals>;

// Coupon types
export type Coupon = InferSelectModel<typeof coupons>;
export type NewCoupon = InferInsertModel<typeof coupons>;

// Mileage transaction types
export type MileageTransaction = InferSelectModel<typeof mileageTransactions>;
export type NewMileageTransaction = InferInsertModel<typeof mileageTransactions>;

// Business types
export type Business = InferSelectModel<typeof businesses>;
export type NewBusiness = InferInsertModel<typeof businesses>;

// Business review types
export type BusinessReview = InferSelectModel<typeof businessReviews>;
export type NewBusinessReview = InferInsertModel<typeof businessReviews>;

// Business settlement types
export type BusinessSettlement = InferSelectModel<typeof businessSettlements>;
export type NewBusinessSettlement = InferInsertModel<typeof businessSettlements>;

// System settings types
export type SystemSetting = InferSelectModel<typeof systemSettings>;
export type NewSystemSetting = InferInsertModel<typeof systemSettings>;

// Regional content types
export type RegionalContent = InferSelectModel<typeof regionalContents>;
export type NewRegionalContent = InferInsertModel<typeof regionalContents>;

// Event types
export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

// Utility types
export type UserRole = 'user' | 'business' | 'admin';
export type CouponType = 'basic' | 'event' | 'mileage_qr';
export type DiscountType = 'amount' | 'percentage';
export type TransactionType = 'earn' | 'use' | 'admin_adjust';
export type ReferenceType = 'referral' | 'signup' | 'mileage_use' | 'admin';
export type SettlementStatus = 'requested' | 'approved' | 'paid' | 'rejected';
export type ContentType = 'tour_course' | 'photo_spot' | 'seasonal_special';
export type EventType = 'signup_bonus' | 'referral_bonus' | 'special_coupon';