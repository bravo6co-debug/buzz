import { db } from './client';
import { users, mileageTransactions, systemSettings } from './schema';
import { eq, sum, sql } from 'drizzle-orm';
import type { UserRole, TransactionType } from './types';

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const userPart = userId.toString().padStart(4, '0');
  return `REF${userPart}${timestamp}`;
}

/**
 * Get system setting value by key
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const setting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, key))
    .limit(1);
    
  return setting.length > 0 ? setting[0].settingValue : null;
}

/**
 * Update system setting value
 */
export async function updateSystemSetting(key: string, value: string): Promise<void> {
  await db
    .update(systemSettings)
    .set({ 
      settingValue: value,
      updatedAt: sql`NOW()`
    })
    .where(eq(systemSettings.settingKey, key));
}

/**
 * Get user's current mileage balance
 */
export async function getUserMileageBalance(userId: number): Promise<number> {
  const result = await db
    .select({
      balance: sum(mileageTransactions.amount)
    })
    .from(mileageTransactions)
    .where(eq(mileageTransactions.userId, userId));

  return result[0]?.balance ? Number(result[0].balance) : 0;
}

/**
 * Update user's mileage balance in users table
 */
export async function syncUserMileageBalance(userId: number): Promise<void> {
  const balance = await getUserMileageBalance(userId);
  
  await db
    .update(users)
    .set({ 
      mileageBalance: balance,
      updatedAt: sql`NOW()`
    })
    .where(eq(users.id, userId));
}

/**
 * Check if user has sufficient mileage
 */
export async function hassufficientMileage(userId: number, amount: number): Promise<boolean> {
  const balance = await getUserMileageBalance(userId);
  return balance >= amount;
}

/**
 * Create a mileage transaction
 */
export async function createMileageTransaction(
  userId: number,
  transactionType: TransactionType,
  amount: number,
  description?: string,
  referenceType?: string,
  referenceId?: number
): Promise<void> {
  // Insert transaction
  await db.insert(mileageTransactions).values({
    userId,
    transactionType,
    amount,
    description,
    referenceType,
    referenceId
  });

  // Update user's mileage balance
  await syncUserMileageBalance(userId);
}

/**
 * Get default values for common settings
 */
export async function getDefaultSettings() {
  const settings = await db
    .select()
    .from(systemSettings);

  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.settingKey] = setting.settingValue;
    return acc;
  }, {} as Record<string, string>);

  return {
    referralReward: parseInt(settingsMap.referral_reward || '500'),
    signupBonusDefault: parseInt(settingsMap.signup_bonus_default || '1000'),
    signupBonusReferral: parseInt(settingsMap.signup_bonus_referral || '3000'),
    basicCouponAmount: parseInt(settingsMap.basic_coupon_amount || '3000'),
    basicCouponPercentage: parseInt(settingsMap.basic_coupon_percentage || '10'),
    eventCouponPercentage: parseInt(settingsMap.event_coupon_percentage || '30'),
    eventCouponGovernmentRatio: parseInt(settingsMap.event_coupon_government_ratio || '50'),
  };
}

/**
 * Validate user role permissions
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = { user: 1, business: 2, admin: 3 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Generate QR data for mileage usage
 */
export function generateMileageQRData(userId: number, amount?: number): string {
  const data = {
    type: 'mileage',
    userId,
    amount,
    timestamp: Date.now(),
    // Add expiration time (15 minutes from now)
    expires: Date.now() + (15 * 60 * 1000)
  };
  
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Generate QR data for coupons
 */
export function generateCouponQRData(couponId: number, userId: number): string {
  const data = {
    type: 'coupon',
    couponId,
    userId,
    timestamp: Date.now(),
    // Add expiration time (24 hours from now)
    expires: Date.now() + (24 * 60 * 60 * 1000)
  };
  
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Validate QR data and check expiration
 */
export function validateQRData(qrData: string): { isValid: boolean; data?: any; error?: string } {
  try {
    const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
    
    if (!decoded.expires || Date.now() > decoded.expires) {
      return { isValid: false, error: 'QR code has expired' };
    }
    
    return { isValid: true, data: decoded };
  } catch (error) {
    return { isValid: false, error: 'Invalid QR code format' };
  }
}