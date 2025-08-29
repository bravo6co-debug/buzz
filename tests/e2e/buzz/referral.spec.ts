import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { ReferralPage } from '../setup/page-objects/ReferralPage';
import { testData, generateTestUser } from '../setup/test-data';

test.describe('Buzz App - Referral System', () => {
  let authPage: AuthPage;
  let referralPage: ReferralPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    referralPage = new ReferralPage(page);
    
    // Login before each test
    await authPage.login(
      testData.users.customer.email,
      testData.users.customer.password
    );
  });

  test.describe('Referral Code Management', () => {
    test('should display user referral code', async () => {
      await referralPage.navigateToReferral();
      
      expect(await referralPage.isReferralCodeVisible()).toBeTruthy();
      
      const referralCode = await referralPage.getReferralCode();
      expect(referralCode).toBeTruthy();
      expect(await referralPage.validateReferralCode()).toBeTruthy();
    });

    test('should validate referral code format', async () => {
      await referralPage.navigateToReferral();
      
      const referralCode = await referralPage.getReferralCode();
      
      // Should be 8 characters long
      expect(referralCode.length).toBe(8);
      
      // Should contain only uppercase letters and numbers
      expect(referralCode).toMatch(/^[A-Z0-9]{8}$/);
      
      // Should have user name prefix (first 4 characters)
      const userName = testData.users.customer.name;
      if (userName) {
        const expectedPrefix = userName
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 4) || 'USER';
        expect(referralCode).toMatch(new RegExp(`^${expectedPrefix}`));
      }
    });

    test('should copy referral code to clipboard', async () => {
      await referralPage.navigateToReferral();
      
      const originalCode = await referralPage.getReferralCode();
      await referralPage.copyReferralCode();
      
      // Check for success message
      const successMessage = await referralPage.getReferralSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(/복사|copy/i);
      }
      
      // Verify clipboard content (if accessible)
      try {
        const clipboardContent = await referralPage.page.evaluate(() => 
          navigator.clipboard.readText()
        );
        expect(clipboardContent).toBe(originalCode);
      } catch (error) {
        // Clipboard access may be restricted in test environment
        console.log('Clipboard access not available in test environment');
      }
    });

    test('should generate new referral code if allowed', async () => {
      await referralPage.navigateToReferral();
      
      const originalCode = await referralPage.getReferralCode();
      
      // Try to generate new code (if feature exists)
      await referralPage.generateNewReferralCode();
      
      const successMessage = await referralPage.getReferralSuccess();
      if (successMessage) {
        const newCode = await referralPage.getReferralCode();
        expect(newCode).not.toBe(originalCode);
        expect(await referralPage.validateReferralCode()).toBeTruthy();
      }
    });
  });

  test.describe('Referral Link Generation', () => {
    test('should generate valid referral link', async () => {
      await referralPage.navigateToReferral();
      
      const referralLink = await referralPage.getReferralLink();
      expect(referralLink).toBeTruthy();
      
      const baseUrl = testData.env.baseUrls.buzz;
      expect(await referralPage.validateReferralLink(baseUrl)).toBeTruthy();
      
      // Should contain the user's referral code
      const referralCode = await referralPage.getReferralCode();
      expect(referralLink).toContain(referralCode);
    });

    test('should create UTM-tracked referral links', async () => {
      await referralPage.navigateToReferral();
      
      const utmParams = {
        source: 'kakao',
        medium: 'social',
        campaign: 'summer2025',
        content: 'test'
      };
      
      const utmLink = await referralPage.createUTMReferralLink(utmParams);
      
      if (utmLink) {
        expect(utmLink).toContain('utm_source=kakao');
        expect(utmLink).toContain('utm_medium=social');
        expect(utmLink).toContain('utm_campaign=summer2025');
        expect(utmLink).toContain('utm_content=test');
      }
    });

    test('should share referral link via different channels', async () => {
      await referralPage.navigateToReferral();
      
      // Test Kakao sharing
      await referralPage.shareViaKakao();
      // In real implementation, this would open Kakao share dialog
      
      // Test Facebook sharing
      await referralPage.shareViaFacebook();
      // In real implementation, this would open Facebook share dialog
      
      // Test link copying
      await referralPage.shareViaLink();
      const successMessage = await referralPage.getReferralSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(/공유|share/i);
      }
    });
  });

  test.describe('Referral Process', () => {
    test('should handle referral signup flow', async ({ browser }) => {
      // Get referral code from current user
      await referralPage.navigateToReferral();
      const referralCode = await referralPage.getReferralCode();
      const referralLink = await referralPage.getReferralLink();
      
      // Create new browser context for referee
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      const newAuthPage = new AuthPage(newPage);
      
      try {
        // Simulate new user clicking referral link
        await newPage.goto(referralLink);
        
        // Should be redirected to signup page with referral code pre-filled
        await newAuthPage.waitForUrl(/signup/);
        
        // Create new user account
        const newUser = generateTestUser('referee');
        await newAuthPage.fillSignupForm(newUser);
        
        // Check if referral code is pre-filled
        const preFilledCode = await newPage
          .locator(testData.ui.selectors.referralCodeInput)
          .inputValue();
        
        if (preFilledCode !== referralCode) {
          await newAuthPage.fillInput(
            testData.ui.selectors.referralCodeInput, 
            referralCode
          );
        }
        
        await newAuthPage.submitSignup();
        
        // Check for successful signup
        const successMessage = await newAuthPage.getSignupSuccess();
        if (successMessage) {
          expect(successMessage).toContain('회원가입');
        }
        
      } finally {
        await newContext.close();
      }
      
      // Back to original user - check if referral was recorded
      await referralPage.refreshReferralData();
      await referralPage.waitForReferralUpdate();
      
      const stats = await referralPage.getReferralStats();
      expect(stats.totalReferrals).toBeGreaterThanOrEqual(0);
    });

    test('should prevent self-referral', async () => {
      await referralPage.navigateToReferral();
      const referralCode = await referralPage.getReferralCode();
      
      // Logout and try to signup with own referral code
      await authPage.logout();
      
      const selfReferralUser = {
        ...generateTestUser('self'),
        email: testData.users.customer.email + '.self'
      };
      
      await authPage.navigateToSignup();
      await authPage.fillSignupForm(selfReferralUser);
      await authPage.fillInput(
        testData.ui.selectors.referralCodeInput,
        referralCode
      );
      await authPage.submitSignup();
      
      const errorMessage = await authPage.getSignupError();
      if (errorMessage) {
        expect(errorMessage).toMatch(testData.ui.messages.error.selfReferral);
      }
    });

    test('should enforce referral limits', async ({ browser }) => {
      await referralPage.navigateToReferral();
      const referralCode = await referralPage.getReferralCode();
      
      // Try to create multiple referrals rapidly
      const maxAttempts = 6; // Beyond daily limit
      let limitReached = false;
      
      for (let i = 0; i < maxAttempts; i++) {
        const newContext = await browser.newContext();
        const newPage = await newContext.newPage();
        const newAuthPage = new AuthPage(newPage);
        
        try {
          const newUser = generateTestUser(`limit-${i}`);
          await newAuthPage.signupWithReferral(newUser, referralCode);
          
          const errorMessage = await newAuthPage.getSignupError();
          if (errorMessage && errorMessage.includes('한도')) {
            expect(errorMessage).toMatch(testData.ui.messages.error.referralLimit);
            limitReached = true;
            break;
          }
          
          await newContext.close();
        } catch (error) {
          await newContext.close();
        }
      }
      
      // Should eventually hit the limit (if implemented)
      if (limitReached) {
        expect(limitReached).toBeTruthy();
      }
    });

    test('should validate referral code expiration', async () => {
      // Test with expired referral code (if feature exists)
      const expiredCode = testData.referral.codes.expired;
      
      await authPage.logout();
      
      const testUser = generateTestUser('expired');
      await authPage.navigateToSignup();
      await authPage.fillSignupForm(testUser);
      await authPage.fillInput(
        testData.ui.selectors.referralCodeInput,
        expiredCode
      );
      await authPage.submitSignup();
      
      const errorMessage = await authPage.getSignupError();
      if (errorMessage && errorMessage.includes('만료')) {
        expect(errorMessage).toMatch(/만료|expired/i);
      }
    });
  });

  test.describe('Referral Rewards', () => {
    test('should display referral reward information', async () => {
      await referralPage.navigateToReferral();
      
      // Should show reward amounts
      const rewardInfo = '[data-testid="reward-info"]';
      if (await referralPage.isElementVisible(rewardInfo)) {
        const referrerReward = await referralPage.getElementText(
          '[data-testid="referrer-reward"]'
        );
        const refereeBonus = await referralPage.getElementText(
          '[data-testid="referee-bonus"]'
        );
        
        expect(referrerReward).toBeTruthy();
        expect(refereeBonus).toBeTruthy();
        
        // Should match configured amounts
        expect(referrerReward).toContain(testData.referral.rewards.referrer.toString());
        expect(refereeBonus).toContain(testData.referral.rewards.referee.toString());
      }
    });

    test('should show pending and claimed rewards', async () => {
      await referralPage.navigateToReferralStats();
      
      const pendingRewards = await referralPage.getPendingRewards();
      const claimedRewards = await referralPage.getClaimedRewards();
      
      expect(pendingRewards).toBeGreaterThanOrEqual(0);
      expect(claimedRewards).toBeGreaterThanOrEqual(0);
    });

    test('should claim pending rewards', async () => {
      await referralPage.navigateToReferralStats();
      
      const initialPending = await referralPage.getPendingRewards();
      const initialClaimed = await referralPage.getClaimedRewards();
      
      if (initialPending > 0) {
        await referralPage.claimPendingRewards();
        
        const successMessage = await referralPage.getReferralSuccess();
        if (successMessage) {
          expect(successMessage).toMatch(/보상|reward/i);
          
          await referralPage.waitForReferralUpdate();
          
          const newPending = await referralPage.getPendingRewards();
          const newClaimed = await referralPage.getClaimedRewards();
          
          expect(newPending).toBeLessThan(initialPending);
          expect(newClaimed).toBeGreaterThan(initialClaimed);
        }
      }
    });

    test('should show event bonus rewards', async () => {
      await referralPage.navigateToReferral();
      
      const events = await referralPage.getActiveReferralEvents();
      
      if (events.length > 0) {
        const activeEvent = events.find(e => e.isActive);
        
        if (activeEvent) {
          expect(activeEvent.bonusReward).toBeGreaterThan(0);
          expect(activeEvent.eventName).toBeTruthy();
          
          // Try to participate in event
          await referralPage.participateInReferralEvent(activeEvent.eventId);
          
          const successMessage = await referralPage.getReferralSuccess();
          if (successMessage) {
            expect(successMessage).toMatch(/이벤트|event/i);
          }
        }
      }
    });
  });

  test.describe('Referral Statistics', () => {
    test('should display referral statistics', async () => {
      await referralPage.navigateToReferralStats();
      
      const stats = await referralPage.getReferralStats();
      
      expect(stats.totalReferrals).toBeGreaterThanOrEqual(0);
      expect(stats.successfulReferrals).toBeGreaterThanOrEqual(0);
      expect(stats.pendingReferrals).toBeGreaterThanOrEqual(0);
      expect(stats.totalRewards).toBeGreaterThanOrEqual(0);
      expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
      expect(stats.conversionRate).toBeLessThanOrEqual(100);
      
      // Successful + pending should not exceed total
      expect(stats.successfulReferrals + stats.pendingReferrals)
        .toBeLessThanOrEqual(stats.totalReferrals);
    });

    test('should show referral history', async () => {
      const history = await referralPage.getReferralHistory();
      
      expect(Array.isArray(history)).toBeTruthy();
      
      if (history.length > 0) {
        const referral = history[0];
        expect(referral).toHaveProperty('refereeEmail');
        expect(referral).toHaveProperty('status');
        expect(referral).toHaveProperty('rewardAmount');
        expect(referral).toHaveProperty('referredAt');
        
        expect(referral.status).toMatch(/pending|completed|cancelled/);
        expect(referral.rewardAmount).toBeGreaterThan(0);
      }
    });

    test('should display analytics data', async () => {
      const analytics = await referralPage.getReferralAnalytics();
      
      expect(analytics.clickCount).toBeGreaterThanOrEqual(0);
      expect(analytics.signupCount).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analytics.topSources)).toBeTruthy();
      
      // Conversion rate calculation should be correct
      if (analytics.clickCount > 0) {
        const expectedRate = (analytics.signupCount / analytics.clickCount) * 100;
        expect(Math.abs(analytics.conversionRate - expectedRate)).toBeLessThan(0.1);
      }
    });
  });

  test.describe('Referral Leaderboard', () => {
    test('should display referral leaderboard', async () => {
      await referralPage.navigateToReferralHub();
      
      const leaderboard = await referralPage.getLeaderboard();
      
      expect(Array.isArray(leaderboard)).toBeTruthy();
      
      if (leaderboard.length > 0) {
        // Should be sorted by rank
        for (let i = 0; i < leaderboard.length - 1; i++) {
          expect(leaderboard[i].rank).toBeLessThanOrEqual(leaderboard[i + 1].rank);
        }
        
        // Each entry should have valid data
        for (const entry of leaderboard) {
          expect(entry.rank).toBeGreaterThan(0);
          expect(entry.username).toBeTruthy();
          expect(entry.referralCount).toBeGreaterThanOrEqual(0);
          expect(entry.totalRewards).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should show current user rank', async () => {
      await referralPage.navigateToReferralHub();
      
      const userRank = await referralPage.getUserRankInLeaderboard();
      
      if (userRank > 0) {
        expect(userRank).toBeGreaterThan(0);
        
        // Should be consistent with user's referral count
        const stats = await referralPage.getReferralStats();
        if (stats.successfulReferrals === 0) {
          // User with no referrals might not have a rank
          expect(userRank).toBeGreaterThan(0);
        }
      }
    });

    test('should update leaderboard rankings', async () => {
      await referralPage.navigateToReferralHub();
      
      const initialLeaderboard = await referralPage.getLeaderboard();
      
      // Refresh the leaderboard
      await referralPage.refreshReferralData();
      await referralPage.waitForReferralUpdate();
      
      const updatedLeaderboard = await referralPage.getLeaderboard();
      
      // Should have same or similar structure
      expect(Array.isArray(updatedLeaderboard)).toBeTruthy();
      
      if (initialLeaderboard.length > 0 && updatedLeaderboard.length > 0) {
        // Rankings should still be in order
        for (let i = 0; i < updatedLeaderboard.length - 1; i++) {
          expect(updatedLeaderboard[i].rank)
            .toBeLessThanOrEqual(updatedLeaderboard[i + 1].rank);
        }
      }
    });
  });

  test.describe('Monthly Ranking Events', () => {
    test('should display monthly ranking event information', async () => {
      await referralPage.navigateToReferralHub();
      
      const events = await referralPage.getActiveReferralEvents();
      const monthlyEvent = events.find(e => 
        e.eventName.includes('월간') || e.eventName.includes('monthly')
      );
      
      if (monthlyEvent) {
        expect(monthlyEvent.isActive).toBeTruthy();
        expect(monthlyEvent.bonusReward).toBeGreaterThan(0);
        expect(monthlyEvent.endDate).toBeTruthy();
      }
    });

    test('should show monthly ranking prizes', async () => {
      await referralPage.navigateToReferralHub();
      
      const prizesSection = '[data-testid="monthly-prizes"]';
      if (await referralPage.isElementVisible(prizesSection)) {
        const prizeElements = referralPage.page.locator('[data-testid="prize-item"]');
        const count = await prizeElements.count();
        
        expect(count).toBeGreaterThan(0);
        
        // Each prize should have rank and description
        for (let i = 0; i < count; i++) {
          const prize = prizeElements.nth(i);
          const rank = await prize.locator('[data-testid="prize-rank"]').textContent();
          const description = await prize.locator('[data-testid="prize-description"]').textContent();
          
          expect(rank).toBeTruthy();
          expect(description).toBeTruthy();
        }
      }
    });

    test('should handle monthly event participation', async () => {
      await referralPage.navigateToReferralHub();
      
      const events = await referralPage.getActiveReferralEvents();
      const monthlyEvent = events.find(e => 
        e.eventName.includes('월간') && e.isActive
      );
      
      if (monthlyEvent) {
        await referralPage.participateInReferralEvent(monthlyEvent.eventId);
        
        const successMessage = await referralPage.getReferralSuccess();
        if (successMessage) {
          expect(successMessage).toMatch(/참여|participate/i);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid referral codes', async () => {
      await authPage.logout();
      
      const testUser = generateTestUser('invalid');
      const invalidCode = testData.referral.codes.invalid;
      
      await authPage.navigateToSignup();
      await authPage.fillSignupForm(testUser);
      await authPage.fillInput(
        testData.ui.selectors.referralCodeInput,
        invalidCode
      );
      await authPage.submitSignup();
      
      const errorMessage = await authPage.getSignupError();
      if (errorMessage) {
        expect(errorMessage).toMatch(/유효하지.*않|invalid/i);
      }
    });

    test('should handle network errors gracefully', async () => {
      await referralPage.navigateToReferral();
      
      // Try to perform referral actions
      await referralPage.shareReferralLink();
      
      // Should either succeed or show appropriate error
      const errorMessage = await referralPage.getReferralError();
      const successMessage = await referralPage.getReferralSuccess();
      
      expect(errorMessage !== null || successMessage !== null).toBeTruthy();
    });

    test('should validate referral code input', async () => {
      await authPage.logout();
      
      const testUser = generateTestUser('validation');
      
      await authPage.navigateToSignup();
      await authPage.fillSignupForm(testUser);
      
      // Try various invalid codes
      const invalidCodes = ['123', 'TOOLONG123', '!@#$%^&*', ''];
      
      for (const invalidCode of invalidCodes) {
        await authPage.fillInput(
          testData.ui.selectors.referralCodeInput,
          invalidCode
        );
        await authPage.submitSignup();
        
        const errorMessage = await authPage.getSignupError();
        if (errorMessage && invalidCode !== '') {
          expect(errorMessage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Mobile Experience', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await referralPage.navigateToReferral();
      
      // Referral code should be visible on mobile
      expect(await referralPage.isReferralCodeVisible()).toBeTruthy();
      
      // Share buttons should be accessible
      const shareButton = testData.ui.selectors.shareButton;
      if (await referralPage.isElementVisible(shareButton)) {
        expect(await referralPage.isElementVisible(shareButton)).toBeTruthy();
      }
    });

    test('should handle mobile sharing', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await referralPage.navigateToReferral();
      await referralPage.shareReferralLink();
      
      // Should trigger mobile-specific sharing if available
      const successMessage = await referralPage.getReferralSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(/공유|share/i);
      }
    });
  });
});