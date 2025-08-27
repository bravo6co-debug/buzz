import { Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { deviceFingerprints, signupAttempts, ipBlacklist } from '@buzz/database/schema/deviceFingerprints';
import { eq, and, gte, lte, sql, or, desc } from 'drizzle-orm';
import crypto from 'crypto';
import UAParser from 'ua-parser-js';

// 안티프로드 설정
const ANTIFRAUD_CONFIG = {
  // IP 기반 제한
  maxSignupsPerIp24h: 5, // 24시간 내 동일 IP에서 최대 가입 수
  maxSignupsPerIp1h: 3, // 1시간 내 동일 IP에서 최대 가입 수
  
  // 디바이스 기반 제한
  maxSignupsPerDevice30d: 3, // 30일 내 동일 디바이스에서 최대 가입 수
  
  // 리스크 점수 임계값
  riskScoreThreshold: 70, // 70점 이상이면 차단
  
  // VPN/Proxy 처리
  blockVpn: true,
  blockProxy: true,
  blockTor: true,
  blockDatacenter: true,
  
  // 신뢰할 수 있는 IP (화이트리스트)
  trustedIps: process.env.TRUSTED_IPS?.split(',') || [],
};

// IP 주소 추출 (프록시 고려)
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.socket.remoteAddress || '';
  
  // IPv6 매핑된 IPv4 주소 처리 (::ffff:192.168.1.1 -> 192.168.1.1)
  return ip.replace(/^::ffff:/, '');
}

// 디바이스 핑거프린트 생성
function generateFingerprint(req: Request): string {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  const acceptLang = req.headers['accept-language'] || '';
  const acceptEnc = req.headers['accept-encoding'] || '';
  const dnt = req.headers['dnt'] || '';
  
  // 클라이언트에서 전송한 추가 핑거프린트 데이터
  const clientFingerprint = req.body.fingerprint || req.headers['x-device-fingerprint'] || '';
  
  const fingerprintString = `${ua}|${accept}|${acceptLang}|${acceptEnc}|${dnt}|${clientFingerprint}`;
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

// User-Agent 파싱
function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    browserName: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    osName: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    deviceType: result.device.type || 'desktop',
    deviceVendor: result.device.vendor || 'Unknown',
  };
}

// VPN/Proxy 감지 (간단한 구현, 실제로는 외부 API 사용 권장)
async function detectVpnProxy(ip: string): Promise<{
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  riskScore: number;
}> {
  // 기본값
  let result = {
    isVpn: false,
    isProxy: false,
    isTor: false,
    isDatacenter: false,
    riskScore: 0,
  };
  
  // Tor 출구 노드 IP 범위 체크 (예시)
  const torExitNodes = ['198.96.155.3', '5.2.79.179']; // 실제로는 더 많은 목록 필요
  if (torExitNodes.includes(ip)) {
    result.isTor = true;
    result.riskScore += 50;
  }
  
  // 데이터센터 IP 범위 체크 (AWS, Google Cloud, Azure 등)
  // 실제로는 IP 범위 데이터베이스 필요
  const datacenterRanges = [
    '18.0.0.0/8', // AWS
    '35.0.0.0/8', // Google Cloud
    '52.0.0.0/8', // Azure
  ];
  
  // 간단한 체크 (실제로는 CIDR 매칭 필요)
  if (ip.startsWith('18.') || ip.startsWith('35.') || ip.startsWith('52.')) {
    result.isDatacenter = true;
    result.riskScore += 30;
  }
  
  // 실제 운영 환경에서는 외부 API 사용 권장
  // 예: ipqualityscore.com, ipinfo.io, vpnapi.io 등
  
  return result;
}

// 리스크 점수 계산
async function calculateRiskScore(
  ip: string,
  fingerprint: string,
  userAgent: string
): Promise<number> {
  let score = 0;
  
  // 1. IP 기반 체크
  const ipCheck = await detectVpnProxy(ip);
  score += ipCheck.riskScore;
  
  // 2. User-Agent 이상 패턴
  if (!userAgent || userAgent.length < 10) {
    score += 20; // User-Agent가 없거나 너무 짧음
  }
  
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('spider')) {
    score += 30; // 봇으로 의심
  }
  
  // 3. 이전 가입 시도 기록
  const recentAttempts = await db.select()
    .from(signupAttempts)
    .where(
      and(
        eq(signupAttempts.ipAddress, ip),
        gte(signupAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      )
    );
  
  if (recentAttempts.length > 3) {
    score += 20; // 24시간 내 여러 번 시도
  }
  
  if (recentAttempts.length > 5) {
    score += 30; // 과도한 시도
  }
  
  // 4. 디바이스 핑거프린트 체크
  const [existingDevice] = await db.select()
    .from(deviceFingerprints)
    .where(eq(deviceFingerprints.fingerprintHash, fingerprint))
    .limit(1);
  
  if (existingDevice) {
    if (existingDevice.signupAttempts > 5) {
      score += 20; // 동일 디바이스에서 여러 번 시도
    }
    
    if (existingDevice.isBlocked) {
      score += 50; // 이미 차단된 디바이스
    }
  }
  
  return Math.min(score, 100); // 최대 100점
}

// 안티프로드 미들웨어
export async function antifraudMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = generateFingerprint(req);
    
    // 화이트리스트 체크
    if (ANTIFRAUD_CONFIG.trustedIps.includes(ip)) {
      return next();
    }
    
    // 블랙리스트 체크
    const [blacklistedIp] = await db.select()
      .from(ipBlacklist)
      .where(
        and(
          eq(ipBlacklist.ipAddress, ip),
          eq(ipBlacklist.isActive, true),
          or(
            eq(ipBlacklist.expiresAt, null),
            gte(ipBlacklist.expiresAt, new Date())
          )
        )
      )
      .limit(1);
    
    if (blacklistedIp) {
      // 차단 카운트 증가
      await db.update(ipBlacklist)
        .set({
          blockCount: blacklistedIp.blockCount + 1,
          lastBlockedAt: new Date(),
        })
        .where(eq(ipBlacklist.id, blacklistedIp.id));
      
      return res.status(403).json({
        success: false,
        error: '접근이 차단되었습니다. 고객센터에 문의하세요.',
        errorCode: 'IP_BLACKLISTED',
      });
    }
    
    // VPN/Proxy 체크
    const vpnCheck = await detectVpnProxy(ip);
    
    if (ANTIFRAUD_CONFIG.blockVpn && vpnCheck.isVpn) {
      return res.status(403).json({
        success: false,
        error: 'VPN을 비활성화하고 다시 시도해주세요.',
        errorCode: 'VPN_DETECTED',
      });
    }
    
    if (ANTIFRAUD_CONFIG.blockProxy && vpnCheck.isProxy) {
      return res.status(403).json({
        success: false,
        error: 'Proxy를 비활성화하고 다시 시도해주세요.',
        errorCode: 'PROXY_DETECTED',
      });
    }
    
    if (ANTIFRAUD_CONFIG.blockTor && vpnCheck.isTor) {
      return res.status(403).json({
        success: false,
        error: 'Tor 브라우저는 사용할 수 없습니다.',
        errorCode: 'TOR_DETECTED',
      });
    }
    
    // IP별 가입 제한 체크 (24시간)
    const recentSignups24h = await db.select()
      .from(signupAttempts)
      .where(
        and(
          eq(signupAttempts.ipAddress, ip),
          eq(signupAttempts.status, 'success'),
          gte(signupAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      );
    
    if (recentSignups24h.length >= ANTIFRAUD_CONFIG.maxSignupsPerIp24h) {
      return res.status(429).json({
        success: false,
        error: '일일 가입 한도를 초과했습니다. 내일 다시 시도해주세요.',
        errorCode: 'DAILY_LIMIT_EXCEEDED',
      });
    }
    
    // IP별 가입 제한 체크 (1시간)
    const recentSignups1h = await db.select()
      .from(signupAttempts)
      .where(
        and(
          eq(signupAttempts.ipAddress, ip),
          eq(signupAttempts.status, 'success'),
          gte(signupAttempts.attemptedAt, new Date(Date.now() - 60 * 60 * 1000))
        )
      );
    
    if (recentSignups1h.length >= ANTIFRAUD_CONFIG.maxSignupsPerIp1h) {
      return res.status(429).json({
        success: false,
        error: '잠시 후 다시 시도해주세요.',
        errorCode: 'HOURLY_LIMIT_EXCEEDED',
      });
    }
    
    // 리스크 점수 계산
    const riskScore = await calculateRiskScore(ip, fingerprint, userAgent);
    
    if (riskScore >= ANTIFRAUD_CONFIG.riskScoreThreshold) {
      // 의심스러운 활동 로깅
      await db.insert(signupAttempts).values({
        email: req.body.email || 'unknown',
        phone: req.body.phone,
        ipAddress: ip,
        status: 'blocked',
        blockedReason: 'high_risk_score',
        userAgent,
        headers: JSON.stringify(req.headers),
        sessionId: req.sessionID,
        riskScore,
        riskFactors: JSON.stringify({
          vpnCheck,
          recentAttempts: recentSignups24h.length,
        }),
      });
      
      return res.status(403).json({
        success: false,
        error: '보안상의 이유로 가입이 제한되었습니다.',
        errorCode: 'HIGH_RISK_DETECTED',
      });
    }
    
    // 디바이스 핑거프린트 저장 또는 업데이트
    const uaData = parseUserAgent(userAgent);
    const [existingFingerprint] = await db.select()
      .from(deviceFingerprints)
      .where(eq(deviceFingerprints.fingerprintHash, fingerprint))
      .limit(1);
    
    if (existingFingerprint) {
      await db.update(deviceFingerprints)
        .set({
          signupAttempts: existingFingerprint.signupAttempts + 1,
          lastSignupAttempt: new Date(),
          riskScore,
          updatedAt: new Date(),
        })
        .where(eq(deviceFingerprints.id, existingFingerprint.id));
      
      req.fingerprintId = existingFingerprint.id;
    } else {
      const [newFingerprint] = await db.insert(deviceFingerprints)
        .values({
          fingerprintHash: fingerprint,
          ipAddress: ip,
          userAgent,
          ...uaData,
          ...vpnCheck,
          riskScore,
          signupAttempts: 1,
          lastSignupAttempt: new Date(),
          fingerprintData: JSON.stringify({
            headers: req.headers,
          }),
        })
        .returning();
      
      req.fingerprintId = newFingerprint.id;
    }
    
    // Request 객체에 안티프로드 정보 추가
    req.antifraud = {
      ip,
      fingerprint,
      riskScore,
      vpnCheck,
    };
    
    next();
  } catch (error) {
    console.error('Antifraud middleware error:', error);
    // 에러 발생시에도 계속 진행 (보안 기능이 서비스를 막지 않도록)
    next();
  }
}

// Rate limiting 미들웨어 (express-rate-limit 사용 권장)
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15분
    max = 5, // 최대 5회 시도
    message = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  } = options;
  
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    const record = attempts.get(ip);
    
    if (record && record.resetTime > now) {
      if (record.count >= max) {
        return res.status(429).json({
          success: false,
          error: message,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
      }
      record.count++;
    } else {
      attempts.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
    }
    
    // 메모리 정리 (오래된 기록 삭제)
    for (const [key, value] of attempts) {
      if (value.resetTime < now) {
        attempts.delete(key);
      }
    }
    
    next();
  };
}

// 타입 확장
declare global {
  namespace Express {
    interface Request {
      antifraud?: {
        ip: string;
        fingerprint: string;
        riskScore: number;
        vpnCheck: {
          isVpn: boolean;
          isProxy: boolean;
          isTor: boolean;
          isDatacenter: boolean;
        };
      };
      fingerprintId?: number;
    }
  }
}

export default {
  antifraudMiddleware,
  createRateLimiter,
  getClientIp,
  generateFingerprint,
  detectVpnProxy,
  calculateRiskScore,
};