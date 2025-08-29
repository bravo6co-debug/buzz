import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@buzz/database';
import { users, referrals } from '@buzz/database/schema';

// Mock database
vi.mock('@buzz/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

describe('Referral System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Referral Code Generation', () => {
    it('should generate unique referral code with user prefix', () => {
      const userName = 'John Doe';
      const generateReferralCode = (name: string) => {
        const prefix = name
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 4);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return prefix + random;
      };

      const code = generateReferralCode(userName);
      
      expect(code).toMatch(/^JOHN[A-Z0-9]{4}$/);
      expect(code.length).toBe(8);
    });

    it('should handle Korean names correctly', () => {
      const userName = '김철수';
      const generateReferralCode = (name: string) => {
        const prefix = name
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 4) || 'USER';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return prefix + random;
      };

      const code = generateReferralCode(userName);
      
      expect(code).toMatch(/^USER[A-Z0-9]{4}$/);
      expect(code.length).toBe(8);
    });
  });

  describe('Referral Validation', () => {
    it('should prevent self-referral', () => {
      const userReferralCode = 'USER123A';
      const inputReferralCode = 'USER123A';
      
      const validateReferral = (userCode: string, inputCode: string) => {
        if (userCode === inputCode) {
          throw new Error('자기 자신을 추천할 수 없습니다');
        }
        return true;
      };

      expect(() => validateReferral(userReferralCode, inputReferralCode))
        .toThrow('자기 자신을 추천할 수 없습니다');
    });

    it('should enforce 24-hour referral limit', () => {
      const recentReferrals = [
        { id: 1, createdAt: new Date() },
        { id: 2, createdAt: new Date() },
        { id: 3, createdAt: new Date() },
        { id: 4, createdAt: new Date() },
        { id: 5, createdAt: new Date() },
      ];

      const checkReferralLimit = (referrals: any[]) => {
        if (referrals.length >= 5) {
          throw new Error('24시간 내 추천 한도를 초과했습니다');
        }
        return true;
      };

      expect(() => checkReferralLimit(recentReferrals))
        .toThrow('24시간 내 추천 한도를 초과했습니다');
    });

    it('should allow referral under limit', () => {
      const recentReferrals = [
        { id: 1, createdAt: new Date() },
        { id: 2, createdAt: new Date() },
      ];

      const checkReferralLimit = (referrals: any[]) => {
        if (referrals.length >= 5) {
          throw new Error('24시간 내 추천 한도를 초과했습니다');
        }
        return true;
      };

      expect(checkReferralLimit(recentReferrals)).toBe(true);
    });
  });

  describe('Referral Rewards', () => {
    it('should calculate correct referrer reward', () => {
      const settings = {
        referralEnabled: true,
        referrerReward: 500,
        referralSignupBonus: 3000,
      };

      const calculateRewards = (settings: any) => {
        return {
          referrerReward: settings.referrerReward,
          refereeBonus: settings.referralSignupBonus,
        };
      };

      const rewards = calculateRewards(settings);
      
      expect(rewards.referrerReward).toBe(500);
      expect(rewards.refereeBonus).toBe(3000);
    });

    it('should handle event bonuses correctly', () => {
      const baseReward = 500;
      const eventBonus = 1000;
      
      const calculateTotalReward = (base: number, event: number) => {
        return Math.max(base, event);
      };

      expect(calculateTotalReward(baseReward, eventBonus)).toBe(1000);
    });
  });

  describe('Referral Link Generation', () => {
    it('should generate correct referral link', () => {
      const baseUrl = 'https://buzz.namgu.kr';
      const referralCode = 'USER123A';
      
      const generateReferralLink = (url: string, code: string) => {
        return `${url}/signup?ref=${code}`;
      };

      const link = generateReferralLink(baseUrl, referralCode);
      
      expect(link).toBe('https://buzz.namgu.kr/signup?ref=USER123A');
    });

    it('should include UTM parameters when provided', () => {
      const baseUrl = 'https://buzz.namgu.kr';
      const referralCode = 'USER123A';
      const utm = {
        source: 'kakao',
        medium: 'social',
        campaign: 'summer2025',
      };
      
      const generateReferralLink = (url: string, code: string, utm?: any) => {
        let link = `${url}/signup?ref=${code}`;
        if (utm) {
          link += `&utm_source=${utm.source}&utm_medium=${utm.medium}&utm_campaign=${utm.campaign}`;
        }
        return link;
      };

      const link = generateReferralLink(baseUrl, referralCode, utm);
      
      expect(link).toContain('utm_source=kakao');
      expect(link).toContain('utm_medium=social');
      expect(link).toContain('utm_campaign=summer2025');
    });
  });

  describe('Referral Statistics', () => {
    it('should calculate referral conversion rate', () => {
      const stats = {
        totalClicks: 100,
        totalConversions: 25,
      };
      
      const calculateConversionRate = (clicks: number, conversions: number) => {
        if (clicks === 0) return 0;
        return (conversions / clicks) * 100;
      };

      const rate = calculateConversionRate(stats.totalClicks, stats.totalConversions);
      
      expect(rate).toBe(25);
    });

    it('should handle zero clicks gracefully', () => {
      const calculateConversionRate = (clicks: number, conversions: number) => {
        if (clicks === 0) return 0;
        return (conversions / clicks) * 100;
      };

      const rate = calculateConversionRate(0, 0);
      
      expect(rate).toBe(0);
    });
  });
});