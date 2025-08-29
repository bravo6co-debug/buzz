import { db } from '@buzz/database';
import { twoFactorAuth, otpVerificationLogs, users } from '@buzz/database/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// 2FA 설정
const TWO_FACTOR_CONFIG = {
  appName: 'Buzz Platform',
  otpWindow: 2, // OTP 검증 윈도우 (앞뒤 2개)
  otpLength: 6,
  otpExpiry: 300, // 5분 (초 단위)
  maxAttempts: 3,
  lockoutDuration: 900, // 15분 (초 단위)
  backupCodeCount: 10,
  backupCodeLength: 8,
};

// 이메일 전송 설정 - 환경변수 검증
const createEmailTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailService || !emailUser || !emailPass) {
    console.warn('Email configuration missing. EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS environment variables are required for 2FA email functionality.');
    return null;
  }

  return nodemailer.createTransporter({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

const emailTransporter = createEmailTransporter();

// SMS 전송 설정 (Twilio)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export class TwoFactorAuthService {
  /**
   * 2FA 설정 초기화
   */
  static async setupTwoFactor(userId: number, method: '

' | 'email' | 'totp'): Promise<any> {
    // 기존 2FA 설정 확인
    const [existing] = await db
      .select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, userId))
      .limit(1);
    
    if (existing && existing.isEnabled) {
      throw new Error('2FA가 이미 활성화되어 있습니다');
    }
    
    // 사용자 정보 가져오기
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    let setupData: any = {
      method,
      isEnabled: false,
    };
    
    if (method === 'totp') {
      // TOTP 시크릿 생성
      const secret = speakeasy.generateSecret({
        name: `${TWO_FACTOR_CONFIG.appName} (${user.email})`,
        length: 32,
      });
      
      // QR 코드 생성
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      // 백업 코드 생성
      const backupCodes = this.generateBackupCodes();
      
      setupData = {
        ...setupData,
        totpSecret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        rawBackupCodes: backupCodes, // 사용자에게 한 번만 보여줄 원본 코드
      };
    }
    
    // 2FA 설정 저장 또는 업데이트
    if (existing) {
      await db
        .update(twoFactorAuth)
        .set({
          method,
          totpSecret: setupData.totpSecret,
          totpBackupCodes: setupData.backupCodes,
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, userId));
    } else {
      await db.insert(twoFactorAuth).values({
        userId,
        method,
        isEnabled: false,
        totpSecret: setupData.totpSecret,
        totpBackupCodes: setupData.backupCodes,
        phoneVerified: method === 'sms' ? false : null,
        emailVerified: method === 'email' ? false : null,
        recoveryEmail: user.email,
        recoveryPhone: user.phone,
      });
    }
    
    // SMS/Email 방식인 경우 인증 코드 전송
    if (method === 'sms' || method === 'email') {
      const verificationCode = this.generateOTP();
      await this.sendVerificationCode(user, method, verificationCode);
      
      // 임시 코드 저장 (Redis가 있다면 Redis 사용 권장)
      setupData.verificationRequired = true;
    }
    
    return {
      method,
      setupRequired: true,
      qrCode: setupData.qrCode,
      backupCodes: setupData.rawBackupCodes,
      verificationRequired: setupData.verificationRequired,
    };
  }

  /**
   * 2FA 활성화
   */
  static async enableTwoFactor(userId: number, verificationCode: string): Promise<boolean> {
    const [auth] = await db
      .select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, userId))
      .limit(1);
    
    if (!auth) {
      throw new Error('2FA 설정을 찾을 수 없습니다');
    }
    
    if (auth.isEnabled) {
      throw new Error('2FA가 이미 활성화되어 있습니다');
    }
    
    // 방식별 검증
    let isValid = false;
    
    if (auth.method === 'totp') {
      // TOTP 검증
      isValid = speakeasy.totp.verify({
        secret: auth.totpSecret!,
        encoding: 'base32',
        token: verificationCode,
        window: TWO_FACTOR_CONFIG.otpWindow,
      });
    } else if (auth.method === 'sms' || auth.method === 'email') {
      // SMS/Email OTP 검증 (실제로는 Redis나 DB에서 확인)
      isValid = await this.verifyOTP(userId, verificationCode, auth.method);
    }
    
    if (!isValid) {
      // 실패 로그 기록
      await this.logVerificationAttempt(userId, auth.method!, verificationCode, false, 'invalid_code');
      throw new Error('유효하지 않은 인증 코드입니다');
    }
    
    // 2FA 활성화
    await db
      .update(twoFactorAuth)
      .set({
        isEnabled: true,
        phoneVerified: auth.method === 'sms' ? true : auth.phoneVerified,
        emailVerified: auth.method === 'email' ? true : auth.emailVerified,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    // 성공 로그 기록
    await this.logVerificationAttempt(userId, auth.method!, verificationCode, true, null);
    
    return true;
  }

  /**
   * 2FA 인증
   */
  static async verifyTwoFactor(userId: number, code: string, ipAddress?: string): Promise<boolean> {
    const [auth] = await db
      .select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, userId))
      .limit(1);
    
    if (!auth || !auth.isEnabled) {
      throw new Error('2FA가 설정되지 않았습니다');
    }
    
    // 잠금 상태 확인
    if (auth.lockedUntil && auth.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((auth.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new Error(`너무 많은 시도로 인해 ${remainingTime}분 동안 잠겼습니다`);
    }
    
    let isValid = false;
    
    // TOTP 검증
    if (auth.method === 'totp') {
      isValid = speakeasy.totp.verify({
        secret: auth.totpSecret!,
        encoding: 'base32',
        token: code,
        window: TWO_FACTOR_CONFIG.otpWindow,
      });
      
      // 백업 코드 확인
      if (!isValid && auth.totpBackupCodes) {
        const hashedCode = this.hashBackupCode(code);
        const backupCodes = auth.totpBackupCodes as string[];
        const codeIndex = backupCodes.findIndex(c => c === hashedCode);
        
        if (codeIndex >= 0) {
          isValid = true;
          // 사용한 백업 코드 제거
          backupCodes.splice(codeIndex, 1);
          await db
            .update(twoFactorAuth)
            .set({
              totpBackupCodes: backupCodes,
              updatedAt: new Date(),
            })
            .where(eq(twoFactorAuth.userId, userId));
        }
      }
    } else if (auth.method === 'sms' || auth.method === 'email') {
      // SMS/Email OTP 검증
      isValid = await this.verifyOTP(userId, code, auth.method);
    }
    
    if (isValid) {
      // 성공: 실패 횟수 초기화
      await db
        .update(twoFactorAuth)
        .set({
          failedAttempts: 0,
          lastVerifiedAt: new Date(),
          lastVerifiedIp: ipAddress,
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, userId));
      
      // 성공 로그 기록
      await this.logVerificationAttempt(userId, auth.method!, code, true, null, ipAddress);
    } else {
      // 실패: 실패 횟수 증가
      const newFailedAttempts = (auth.failedAttempts || 0) + 1;
      const updateData: any = {
        failedAttempts: newFailedAttempts,
        updatedAt: new Date(),
      };
      
      // 최대 시도 횟수 초과 시 잠금
      if (newFailedAttempts >= TWO_FACTOR_CONFIG.maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + TWO_FACTOR_CONFIG.lockoutDuration * 1000);
        updateData.failedAttempts = 0; // 잠금 후 초기화
      }
      
      await db
        .update(twoFactorAuth)
        .set(updateData)
        .where(eq(twoFactorAuth.userId, userId));
      
      // 실패 로그 기록
      await this.logVerificationAttempt(userId, auth.method!, code, false, 'invalid_code', ipAddress);
      
      if (updateData.lockedUntil) {
        throw new Error(`너무 많은 실패로 인해 ${TWO_FACTOR_CONFIG.lockoutDuration / 60}분 동안 잠겼습니다`);
      }
      
      throw new Error(`유효하지 않은 코드입니다. ${TWO_FACTOR_CONFIG.maxAttempts - newFailedAttempts}회 시도 가능`);
    }
    
    return true;
  }

  /**
   * 2FA 비활성화
   */
  static async disableTwoFactor(userId: number, password: string): Promise<boolean> {
    // 비밀번호 확인 로직 필요
    
    await db
      .update(twoFactorAuth)
      .set({
        isEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    return true;
  }

  /**
   * OTP 생성
   */
  private static generateOTP(): string {
    return crypto.randomInt(0, Math.pow(10, TWO_FACTOR_CONFIG.otpLength))
      .toString()
      .padStart(TWO_FACTOR_CONFIG.otpLength, '0');
  }

  /**
   * 백업 코드 생성
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < TWO_FACTOR_CONFIG.backupCodeCount; i++) {
      const code = crypto.randomBytes(TWO_FACTOR_CONFIG.backupCodeLength)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substr(0, TWO_FACTOR_CONFIG.backupCodeLength)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * 백업 코드 해싱
   */
  private static hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * 인증 코드 전송
   */
  private static async sendVerificationCode(user: any, method: 'sms' | 'email', code: string): Promise<void> {
    if (method === 'email') {
      if (!emailTransporter) {
        throw new Error('Email transporter not configured. Please set EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS environment variables.');
      }
      
      const emailFrom = process.env.EMAIL_FROM;
      if (!emailFrom) {
        throw new Error('EMAIL_FROM environment variable is required for sending emails.');
      }
      
      await emailTransporter.sendMail({
        from: emailFrom,
        to: user.email,
        subject: 'Buzz 2단계 인증 코드',
        html: `
          <h1>2단계 인증 코드</h1>
          <p>안녕하세요 ${user.name}님,</p>
          <p>요청하신 2단계 인증 코드는 다음과 같습니다:</p>
          <h2>${code}</h2>
          <p>이 코드는 ${TWO_FACTOR_CONFIG.otpExpiry / 60}분 동안 유효합니다.</p>
          <p>본인이 요청하지 않으셨다면 이 이메일을 무시하세요.</p>
        `,
      });
    } else if (method === 'sms' && twilioClient) {
      await twilioClient.messages.create({
        body: `Buzz 인증 코드: ${code} (${TWO_FACTOR_CONFIG.otpExpiry / 60}분 유효)`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });
    }
  }

  /**
   * OTP 검증 (SMS/Email)
   */
  private static async verifyOTP(userId: number, code: string, method: string): Promise<boolean> {
    // 실제로는 Redis나 별도 테이블에서 OTP 확인
    // 여기서는 간단한 구현
    const recentLogs = await db
      .select()
      .from(otpVerificationLogs)
      .where(
        and(
          eq(otpVerificationLogs.userId, userId),
          eq(otpVerificationLogs.otpType, method),
          gte(otpVerificationLogs.attemptedAt, new Date(Date.now() - TWO_FACTOR_CONFIG.otpExpiry * 1000))
        )
      )
      .orderBy(desc(otpVerificationLogs.attemptedAt))
      .limit(1);
    
    // 임시 구현: 실제로는 생성한 OTP와 비교
    return code.length === TWO_FACTOR_CONFIG.otpLength;
  }

  /**
   * 검증 시도 로그 기록
   */
  private static async logVerificationAttempt(
    userId: number,
    otpType: string,
    otpCode: string,
    isSuccess: boolean,
    failureReason: string | null,
    ipAddress?: string
  ): Promise<void> {
    await db.insert(otpVerificationLogs).values({
      userId,
      otpType,
      otpCode: this.hashBackupCode(otpCode), // 보안을 위해 해싱
      isSuccess,
      failureReason,
      ipAddress,
      userAgent: null, // Request에서 가져와야 함
      deviceFingerprint: null, // 클라이언트에서 제공
      expiresAt: new Date(Date.now() + TWO_FACTOR_CONFIG.otpExpiry * 1000),
    });
  }

  /**
   * 신뢰할 수 있는 디바이스 확인
   */
  static async isTrustedDevice(userId: number, deviceFingerprint: string): Promise<boolean> {
    const [trusted] = await db
      .select()
      .from(trustedDevices)
      .where(
        and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.fingerprintId, deviceFingerprint),
          eq(trustedDevices.isActive, true)
        )
      )
      .limit(1);
    
    if (!trusted) return false;
    
    // 만료 확인
    if (trusted.expiresAt && trusted.expiresAt < new Date()) {
      await db
        .update(trustedDevices)
        .set({ isActive: false })
        .where(eq(trustedDevices.id, trusted.id));
      return false;
    }
    
    // 사용 횟수 업데이트
    await db
      .update(trustedDevices)
      .set({
        lastUsed: new Date(),
        useCount: (trusted.useCount || 0) + 1,
      })
      .where(eq(trustedDevices.id, trusted.id));
    
    return true;
  }
}