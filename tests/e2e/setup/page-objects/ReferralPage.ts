import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { testData, generateReferralCode } from '../test-data';

export class ReferralPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigateToReferral() {
    await this.goto('/referral');
    await this.waitForLoadingToComplete();
  }

  async navigateToReferralHub() {
    await this.goto('/referral-hub');
    await this.waitForLoadingToComplete();
  }

  async navigateToReferralStats() {
    await this.goto('/referral/stats');
    await this.waitForLoadingToComplete();
  }

  // Referral code management
  async getReferralCode(): Promise<string> {
    const codeElement = testData.ui.selectors.referralCodeDisplay;
    if (await this.isElementVisible(codeElement)) {
      return await this.getElementText(codeElement);
    }
    return '';
  }

  async isReferralCodeVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.referralCodeDisplay);
  }

  async copyReferralCode() {
    const copyButton = '[data-testid="copy-referral-code"]';
    if (await this.isElementVisible(copyButton)) {
      await this.clickElement(copyButton);
      await this.waitForLoadingToComplete();
    }
  }

  async generateNewReferralCode() {
    const generateButton = '[data-testid="generate-new-code"]';
    if (await this.isElementVisible(generateButton)) {
      await this.clickElement(generateButton);
      await this.waitForLoadingToComplete();
    }
  }

  // Referral link management
  async getReferralLink(): Promise<string> {
    const linkElement = '[data-testid="referral-link"]';
    if (await this.isElementVisible(linkElement)) {
      return await this.getElementText(linkElement);
    }
    return '';
  }

  async shareReferralLink() {
    if (await this.isElementVisible(testData.ui.selectors.shareButton)) {
      await this.clickElement(testData.ui.selectors.shareButton);
      await this.waitForLoadingToComplete();
    }
  }

  async shareViaKakao() {
    const kakaoShareButton = '[data-testid="share-kakao"]';
    if (await this.isElementVisible(kakaoShareButton)) {
      await this.clickElement(kakaoShareButton);
      // Handle Kakao share dialog if it opens
    }
  }

  async shareViaFacebook() {
    const facebookShareButton = '[data-testid="share-facebook"]';
    if (await this.isElementVisible(facebookShareButton)) {
      await this.clickElement(facebookShareButton);
      // Handle Facebook share dialog if it opens
    }
  }

  async shareViaLink() {
    const linkShareButton = '[data-testid="share-link"]';
    if (await this.isElementVisible(linkShareButton)) {
      await this.clickElement(linkShareButton);
      await this.waitForLoadingToComplete();
    }
  }

  // Referral statistics
  async getReferralStats(): Promise<{
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewards: number;
    conversionRate: number;
  }> {
    await this.navigateToReferralStats();
    
    const defaultStats = {
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingReferrals: 0,
      totalRewards: 0,
      conversionRate: 0
    };

    try {
      const totalReferralsText = await this.getElementText('[data-testid="total-referrals"]');
      const successfulReferralsText = await this.getElementText('[data-testid="successful-referrals"]');
      const pendingReferralsText = await this.getElementText('[data-testid="pending-referrals"]');
      const totalRewardsText = await this.getElementText('[data-testid="total-rewards"]');
      const conversionRateText = await this.getElementText('[data-testid="conversion-rate"]');

      return {
        totalReferrals: parseInt(totalReferralsText.replace(/[^\d]/g, '')) || 0,
        successfulReferrals: parseInt(successfulReferralsText.replace(/[^\d]/g, '')) || 0,
        pendingReferrals: parseInt(pendingReferralsText.replace(/[^\d]/g, '')) || 0,
        totalRewards: parseInt(totalRewardsText.replace(/[^\d]/g, '')) || 0,
        conversionRate: parseFloat(conversionRateText.replace(/[^\d.]/g, '')) || 0
      };
    } catch (error) {
      return defaultStats;
    }
  }

  // Referral history
  async getReferralHistory(): Promise<Array<{
    refereeEmail: string;
    status: string;
    rewardAmount: number;
    referredAt: string;
    completedAt?: string;
  }>> {
    const historySection = '[data-testid="referral-history"]';
    if (!await this.isElementVisible(historySection)) {
      await this.navigateToReferralStats();
    }
    
    const historyRows = this.page.locator('[data-testid="referral-history-row"]');
    const count = await historyRows.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const row = historyRows.nth(i);
      
      const refereeEmail = await row.locator('[data-testid="referee-email"]').textContent() || '';
      const status = await row.locator('[data-testid="referral-status"]').textContent() || '';
      const rewardText = await row.locator('[data-testid="reward-amount"]').textContent() || '0';
      const rewardAmount = parseInt(rewardText.replace(/[^\d]/g, '')) || 0;
      const referredAt = await row.locator('[data-testid="referred-at"]').textContent() || '';
      const completedAtElement = row.locator('[data-testid="completed-at"]');
      const completedAt = await completedAtElement.textContent();
      
      history.push({
        refereeEmail,
        status,
        rewardAmount,
        referredAt,
        completedAt: completedAt || undefined
      });
    }
    
    return history;
  }

  // Referral leaderboard
  async getLeaderboard(): Promise<Array<{
    rank: number;
    username: string;
    referralCount: number;
    totalRewards: number;
  }>> {
    const leaderboardSection = '[data-testid="referral-leaderboard"]';
    if (!await this.isElementVisible(leaderboardSection)) {
      return [];
    }
    
    const leaderboardRows = this.page.locator('[data-testid="leaderboard-row"]');
    const count = await leaderboardRows.count();
    const leaderboard = [];
    
    for (let i = 0; i < count; i++) {
      const row = leaderboardRows.nth(i);
      
      const rankText = await row.locator('[data-testid="user-rank"]').textContent() || '0';
      const rank = parseInt(rankText) || 0;
      const username = await row.locator('[data-testid="username"]').textContent() || '';
      const referralCountText = await row.locator('[data-testid="referral-count"]').textContent() || '0';
      const referralCount = parseInt(referralCountText) || 0;
      const totalRewardsText = await row.locator('[data-testid="total-rewards"]').textContent() || '0';
      const totalRewards = parseInt(totalRewardsText.replace(/[^\d]/g, '')) || 0;
      
      leaderboard.push({
        rank,
        username,
        referralCount,
        totalRewards
      });
    }
    
    return leaderboard;
  }

  async getUserRankInLeaderboard(): Promise<number> {
    const userRankElement = '[data-testid="current-user-rank"]';
    if (await this.isElementVisible(userRankElement)) {
      const rankText = await this.getElementText(userRankElement);
      return parseInt(rankText) || 0;
    }
    return 0;
  }

  // Event and campaigns
  async getActiveReferralEvents(): Promise<Array<{
    eventId: string;
    eventName: string;
    bonusReward: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>> {
    const eventsSection = '[data-testid="referral-events"]';
    if (!await this.isElementVisible(eventsSection)) {
      return [];
    }
    
    const eventItems = this.page.locator('[data-testid="referral-event-item"]');
    const count = await eventItems.count();
    const events = [];
    
    for (let i = 0; i < count; i++) {
      const item = eventItems.nth(i);
      
      const eventId = await item.getAttribute('data-event-id') || '';
      const eventName = await item.locator('[data-testid="event-name"]').textContent() || '';
      const bonusRewardText = await item.locator('[data-testid="bonus-reward"]').textContent() || '0';
      const bonusReward = parseInt(bonusRewardText.replace(/[^\d]/g, '')) || 0;
      const startDate = await item.locator('[data-testid="start-date"]').textContent() || '';
      const endDate = await item.locator('[data-testid="end-date"]').textContent() || '';
      const isActive = await item.locator('[data-testid="event-active"]').isVisible();
      
      events.push({
        eventId,
        eventName,
        bonusReward,
        startDate,
        endDate,
        isActive
      });
    }
    
    return events;
  }

  async participateInReferralEvent(eventId: string) {
    const participateButton = `[data-testid="participate-event-${eventId}"]`;
    if (await this.isElementVisible(participateButton)) {
      await this.clickElement(participateButton);
      await this.waitForLoadingToComplete();
    }
  }

  // Rewards management
  async claimPendingRewards() {
    const claimButton = '[data-testid="claim-rewards"]';
    if (await this.isElementVisible(claimButton) && 
        await this.isElementEnabled(claimButton)) {
      await this.clickElement(claimButton);
      await this.waitForLoadingToComplete();
    }
  }

  async getPendingRewards(): Promise<number> {
    const pendingRewardsElement = '[data-testid="pending-rewards"]';
    if (await this.isElementVisible(pendingRewardsElement)) {
      const rewardsText = await this.getElementText(pendingRewardsElement);
      return parseInt(rewardsText.replace(/[^\d]/g, '')) || 0;
    }
    return 0;
  }

  async getClaimedRewards(): Promise<number> {
    const claimedRewardsElement = '[data-testid="claimed-rewards"]';
    if (await this.isElementVisible(claimedRewardsElement)) {
      const rewardsText = await this.getElementText(claimedRewardsElement);
      return parseInt(rewardsText.replace(/[^\d]/g, '')) || 0;
    }
    return 0;
  }

  // Validation methods
  async validateReferralCode(expectedPattern?: string): Promise<boolean> {
    const code = await this.getReferralCode();
    if (!code) return false;
    
    // Basic validation: should be 8 characters, alphanumeric
    if (code.length !== 8) return false;
    if (!/^[A-Z0-9]+$/.test(code)) return false;
    
    if (expectedPattern) {
      return new RegExp(expectedPattern).test(code);
    }
    
    return true;
  }

  async validateReferralLink(baseUrl: string): Promise<boolean> {
    const link = await this.getReferralLink();
    if (!link) return false;
    
    const expectedPattern = new RegExp(`${baseUrl}/signup\\?ref=[A-Z0-9]{8}`);
    return expectedPattern.test(link);
  }

  // Success/Error messages
  async getReferralSuccess(): Promise<string | null> {
    const successMessage = await this.getSuccessMessage();
    if (successMessage && successMessage.includes('추천')) {
      return successMessage;
    }
    return null;
  }

  async getReferralError(): Promise<string | null> {
    return await this.getErrorMessage();
  }

  // UTM tracking
  async createUTMReferralLink(utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  }): Promise<string> {
    const customLinkButton = '[data-testid="create-custom-link"]';
    if (await this.isElementVisible(customLinkButton)) {
      await this.clickElement(customLinkButton);
      
      // Fill UTM parameters
      if (utmParams.source) {
        await this.fillInput('[data-testid="utm-source"]', utmParams.source);
      }
      if (utmParams.medium) {
        await this.fillInput('[data-testid="utm-medium"]', utmParams.medium);
      }
      if (utmParams.campaign) {
        await this.fillInput('[data-testid="utm-campaign"]', utmParams.campaign);
      }
      if (utmParams.term) {
        await this.fillInput('[data-testid="utm-term"]', utmParams.term);
      }
      if (utmParams.content) {
        await this.fillInput('[data-testid="utm-content"]', utmParams.content);
      }
      
      const generateButton = '[data-testid="generate-utm-link"]';
      if (await this.isElementVisible(generateButton)) {
        await this.clickElement(generateButton);
        await this.waitForLoadingToComplete();
      }
      
      return await this.getReferralLink();
    }
    
    return '';
  }

  // Analytics
  async getReferralAnalytics(): Promise<{
    clickCount: number;
    signupCount: number;
    conversionRate: number;
    topSources: Array<{ source: string; count: number; }>;
  }> {
    const analyticsSection = '[data-testid="referral-analytics"]';
    if (!await this.isElementVisible(analyticsSection)) {
      return {
        clickCount: 0,
        signupCount: 0,
        conversionRate: 0,
        topSources: []
      };
    }
    
    const clickCountText = await this.getElementText('[data-testid="click-count"]');
    const signupCountText = await this.getElementText('[data-testid="signup-count"]');
    const conversionRateText = await this.getElementText('[data-testid="conversion-rate"]');
    
    const clickCount = parseInt(clickCountText.replace(/[^\d]/g, '')) || 0;
    const signupCount = parseInt(signupCountText.replace(/[^\d]/g, '')) || 0;
    const conversionRate = parseFloat(conversionRateText.replace(/[^\d.]/g, '')) || 0;
    
    // Get top sources
    const sourceItems = this.page.locator('[data-testid="top-source-item"]');
    const sourceCount = await sourceItems.count();
    const topSources = [];
    
    for (let i = 0; i < sourceCount; i++) {
      const item = sourceItems.nth(i);
      const source = await item.locator('[data-testid="source-name"]').textContent() || '';
      const countText = await item.locator('[data-testid="source-count"]').textContent() || '0';
      const count = parseInt(countText) || 0;
      
      topSources.push({ source, count });
    }
    
    return {
      clickCount,
      signupCount,
      conversionRate,
      topSources
    };
  }

  // Helper methods
  async waitForReferralUpdate() {
    // Wait for any pending referral operations to complete
    await this.waitForLoadingToComplete();
    await this.page.waitForTimeout(1000); // Additional wait for UI updates
  }

  async refreshReferralData() {
    const refreshButton = '[data-testid="refresh-referral-data"]';
    if (await this.isElementVisible(refreshButton)) {
      await this.clickElement(refreshButton);
      await this.waitForLoadingToComplete();
    } else {
      await this.reloadPage();
    }
  }
}