import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '@buzz/database';
import { qrTokens, qrUsageLogs } from '@buzz/database/schema';
import { eq, and, gte } from 'drizzle-orm';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
})();
const QR_TOKEN_EXPIRY_MINUTES = 10; // 10 minutes expiry

export interface QRTokenPayload {
  tokenId: number;
  userId: number;
  type: 'coupon' | 'mileage';
  referenceId?: number;
  exp: number;
  iat: number;
  jti: string; // JWT ID for uniqueness
}

export interface QRTokenData {
  token: string;
  tokenId: number;
  expiresAt: Date;
  qrData: string;
}

export class QRService {
  /**
   * Generate a secure JWT-based QR token
   */
  static async generateToken(
    userId: number,
    type: 'coupon' | 'mileage',
    referenceId?: number,
    metadata?: any
  ): Promise<QRTokenData> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    
    // Generate unique JWT ID
    const jti = crypto.randomUUID();
    
    // Create temporary token to get hash
    const tempPayload = {
      userId,
      type,
      referenceId,
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000),
      jti
    };
    
    const tempToken = jwt.sign(tempPayload, JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');
    
    // Store token in database
    const [dbToken] = await db.insert(qrTokens).values({
      userId,
      tokenType: type,
      referenceId,
      tokenHash,
      expiresAt,
      metadata: metadata || null,
      isUsed: false
    }).returning();
    
    // Create final payload with token ID
    const payload: QRTokenPayload = {
      tokenId: dbToken.id,
      userId,
      type,
      referenceId,
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000),
      jti
    };
    
    const token = jwt.sign(payload, JWT_SECRET);
    const qrData = `BUZZ:${type.toUpperCase()}:${token}`;
    
    // Log generation
    await this.logAction(dbToken.id, userId, 'generated', type, {
      expiresAt: expiresAt.toISOString(),
      metadata
    });
    
    return {
      token,
      tokenId: dbToken.id,
      expiresAt,
      qrData
    };
  }
  
  /**
   * Verify and decode QR token
   */
  static async verifyToken(qrData: string): Promise<{
    valid: boolean;
    payload?: QRTokenPayload;
    reason?: string;
    dbToken?: any;
  }> {
    try {
      // Parse QR data: BUZZ:TYPE:JWT_TOKEN
      const parts = qrData.split(':');
      if (parts.length !== 3 || parts[0] !== 'BUZZ') {
        return { valid: false, reason: 'Invalid QR format' };
      }
      
      const [, type, token] = parts;
      
      if (!['COUPON', 'MILEAGE'].includes(type)) {
        return { valid: false, reason: 'Invalid QR type' };
      }
      
      // Verify JWT
      let payload: QRTokenPayload;
      try {
        payload = jwt.verify(token, JWT_SECRET) as QRTokenPayload;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return { valid: false, reason: 'QR code has expired' };
        }
        return { valid: false, reason: 'Invalid QR token' };
      }
      
      // Check token in database
      const [dbToken] = await db
        .select()
        .from(qrTokens)
        .where(eq(qrTokens.id, payload.tokenId))
        .limit(1);
      
      if (!dbToken) {
        return { valid: false, reason: 'Token not found' };
      }
      
      // Check if already used
      if (dbToken.isUsed) {
        return { valid: false, reason: 'QR code already used', dbToken };
      }
      
      // Check expiration
      if (dbToken.expiresAt < new Date()) {
        return { valid: false, reason: 'QR code has expired', dbToken };
      }
      
      // Verify token hash matches
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      if (dbToken.tokenHash !== tokenHash) {
        return { valid: false, reason: 'Token hash mismatch' };
      }
      
      return { valid: true, payload, dbToken };
      
    } catch (error) {
      console.error('QR token verification error:', error);
      return { valid: false, reason: 'Verification failed' };
    }
  }
  
  /**
   * Mark token as used
   */
  static async useToken(
    tokenId: number,
    businessUserId: number,
    businessId?: number,
    amount?: number,
    discountAmount?: number,
    governmentSupport?: number
  ): Promise<boolean> {
    try {
      const [dbToken] = await db
        .select()
        .from(qrTokens)
        .where(eq(qrTokens.id, tokenId))
        .limit(1);
      
      if (!dbToken || dbToken.isUsed) {
        return false;
      }
      
      // Mark as used
      await db
        .update(qrTokens)
        .set({
          isUsed: true,
          usedAt: new Date(),
          usedBusinessId: businessUserId
        })
        .where(eq(qrTokens.id, tokenId));
      
      // Log usage
      await this.logAction(
        tokenId,
        dbToken.userId,
        'used',
        dbToken.tokenType as 'coupon' | 'mileage',
        {
          businessUserId,
          businessId,
          amount,
          discountAmount,
          governmentSupport
        },
        businessUserId,
        businessId,
        amount,
        discountAmount,
        governmentSupport
      );
      
      return true;
    } catch (error) {
      console.error('Token usage error:', error);
      return false;
    }
  }
  
  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      
      // Get expired tokens first for logging
      const expiredTokens = await db
        .select()
        .from(qrTokens)
        .where(and(
          eq(qrTokens.isUsed, false),
          gte(now, qrTokens.expiresAt)
        ));
      
      // Log expiration for each token
      for (const token of expiredTokens) {
        await this.logAction(
          token.id,
          token.userId,
          'expired',
          token.tokenType as 'coupon' | 'mileage'
        );
      }
      
      // Delete expired unused tokens (keep used ones for audit)
      const result = await db
        .delete(qrTokens)
        .where(and(
          eq(qrTokens.isUsed, false),
          gte(now, qrTokens.expiresAt)
        ));
      
      return expiredTokens.length;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
  
  /**
   * Log QR token actions
   */
  static async logAction(
    tokenId: number,
    userId: number,
    action: 'generated' | 'scanned' | 'verified' | 'used' | 'expired',
    tokenType: 'coupon' | 'mileage',
    metadata?: any,
    businessUserId?: number,
    businessId?: number,
    amount?: number,
    discountAmount?: number,
    governmentSupport?: number
  ): Promise<void> {
    try {
      await db.insert(qrUsageLogs).values({
        tokenId,
        userId,
        businessUserId,
        businessId,
        action,
        tokenType,
        amount,
        discountAmount,
        governmentSupport,
        metadata: metadata || null
      });
    } catch (error) {
      console.error('Logging error:', error);
      // Don't throw, as logging failure shouldn't break the main operation
    }
  }
  
  /**
   * Get token statistics
   */
  static async getTokenStats(userId?: number): Promise<{
    totalGenerated: number;
    totalUsed: number;
    totalExpired: number;
    activeTokens: number;
  }> {
    // This would require more complex queries - simplified for now
    return {
      totalGenerated: 0,
      totalUsed: 0,
      totalExpired: 0,
      activeTokens: 0
    };
  }
}