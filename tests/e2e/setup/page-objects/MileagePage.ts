import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { testData } from '../test-data';

export class MileagePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigateToMileage() {
    await this.goto('/mileage');
    await this.waitForLoadingToComplete();
  }

  async navigateToMileageHistory() {
    await this.goto('/mileage/history');
    await this.waitForLoadingToComplete();
  }

  // Mileage balance
  async getMileageBalance(): Promise<number> {
    const balanceText = await this.getElementText(testData.ui.selectors.mileageBalance);
    const balance = balanceText.replace(/[^\d]/g, ''); // Remove non-numeric characters
    return parseInt(balance) || 0;
  }

  async isMileageBalanceVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.mileageBalance);
  }

  // QR Code operations
  async openQRCodeModal() {
    const qrButton = '[data-testid="qr-button"]';
    if (await this.isElementVisible(qrButton)) {
      await this.clickElement(qrButton);
      await this.waitForElement(testData.ui.selectors.qrCodeModal);
    }
  }

  async isQRCodeModalVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.qrCodeModal);
  }

  async isQRCodeImageVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.qrCodeImage);
  }

  async closeQRCodeModal() {
    const closeButton = '[data-testid="qr-modal-close"]';
    if (await this.isElementVisible(closeButton)) {
      await this.clickElement(closeButton);
    } else {
      // Try pressing Escape key
      await this.pressKey('Escape');
    }
  }

  async scanQRCode() {
    if (await this.isElementVisible(testData.ui.selectors.scanButton)) {
      await this.clickElement(testData.ui.selectors.scanButton);
      await this.waitForLoadingToComplete();
    }
  }

  // Mileage earning
  async earnMileage(amount?: number) {
    if (await this.isElementVisible(testData.ui.selectors.earnMileageButton)) {
      await this.clickElement(testData.ui.selectors.earnMileageButton);
      
      // If amount is specified and there's an input field
      if (amount) {
        const amountInput = '[data-testid="mileage-amount-input"]';
        if (await this.isElementVisible(amountInput)) {
          await this.fillInput(amountInput, amount.toString());
        }
      }
      
      const confirmButton = '[data-testid="confirm-earn-mileage"]';
      if (await this.isElementVisible(confirmButton)) {
        await this.clickElement(confirmButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  // Mileage spending
  async spendMileage(amount: number) {
    if (await this.isElementVisible(testData.ui.selectors.spendMileageButton)) {
      await this.clickElement(testData.ui.selectors.spendMileageButton);
      
      const amountInput = '[data-testid="spend-amount-input"]';
      if (await this.isElementVisible(amountInput)) {
        await this.fillInput(amountInput, amount.toString());
      }
      
      const confirmButton = '[data-testid="confirm-spend-mileage"]';
      if (await this.isElementVisible(confirmButton)) {
        await this.clickElement(confirmButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  // Coupon exchange
  async exchangeCoupon(couponType: string) {
    const couponButton = `[data-testid="coupon-${couponType}"]`;
    if (await this.isElementVisible(couponButton)) {
      await this.clickElement(couponButton);
      
      const exchangeButton = '[data-testid="exchange-coupon"]';
      if (await this.isElementVisible(exchangeButton)) {
        await this.clickElement(exchangeButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  // Mileage history
  async getMileageHistory(): Promise<Array<{
    type: string;
    amount: number;
    date: string;
    description: string;
  }>> {
    await this.navigateToMileageHistory();
    
    const historyRows = this.page.locator('[data-testid="mileage-history-row"]');
    const count = await historyRows.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const row = historyRows.nth(i);
      
      const type = await row.locator('[data-testid="transaction-type"]').textContent() || '';
      const amountText = await row.locator('[data-testid="transaction-amount"]').textContent() || '0';
      const amount = parseInt(amountText.replace(/[^\d-]/g, '')) || 0;
      const date = await row.locator('[data-testid="transaction-date"]').textContent() || '';
      const description = await row.locator('[data-testid="transaction-description"]').textContent() || '';
      
      history.push({ type, amount, date, description });
    }
    
    return history;
  }

  async filterMileageHistory(filterType: 'earn' | 'spend' | 'bonus' | 'referral' | 'all') {
    const filterSelector = `[data-testid="filter-${filterType}"]`;
    if (await this.isElementVisible(filterSelector)) {
      await this.clickElement(filterSelector);
      await this.waitForLoadingToComplete();
    }
  }

  // Validation methods
  async isEarnMileageButtonEnabled(): Promise<boolean> {
    return await this.isElementEnabled(testData.ui.selectors.earnMileageButton);
  }

  async isSpendMileageButtonEnabled(): Promise<boolean> {
    return await this.isElementEnabled(testData.ui.selectors.spendMileageButton);
  }

  async getMileageEarnSuccess(): Promise<string | null> {
    const successMessage = await this.getSuccessMessage();
    if (successMessage && successMessage.includes('적립')) {
      return successMessage;
    }
    return null;
  }

  async getMileageSpendSuccess(): Promise<string | null> {
    const successMessage = await this.getSuccessMessage();
    if (successMessage && successMessage.includes('사용')) {
      return successMessage;
    }
    return null;
  }

  async getMileageError(): Promise<string | null> {
    return await this.getErrorMessage();
  }

  // Business QR interaction
  async generateBusinessQR(businessName: string) {
    const generateButton = '[data-testid="generate-business-qr"]';
    if (await this.isElementVisible(generateButton)) {
      await this.clickElement(generateButton);
      
      const businessInput = '[data-testid="business-name-input"]';
      if (await this.isElementVisible(businessInput)) {
        await this.fillInput(businessInput, businessName);
      }
      
      const confirmButton = '[data-testid="confirm-generate-qr"]';
      if (await this.isElementVisible(confirmButton)) {
        await this.clickElement(confirmButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  async validateQRCode(expectedBusinessName?: string): Promise<boolean> {
    if (!await this.isQRCodeImageVisible()) {
      return false;
    }

    if (expectedBusinessName) {
      const businessNameElement = '[data-testid="qr-business-name"]';
      if (await this.isElementVisible(businessNameElement)) {
        const displayedName = await this.getElementText(businessNameElement);
        return displayedName.includes(expectedBusinessName);
      }
    }
    
    return true;
  }

  // Mileage statistics
  async getMileageStats(): Promise<{
    totalEarned: number;
    totalSpent: number;
    currentBalance: number;
    lastTransaction: string;
  }> {
    const statsSection = '[data-testid="mileage-stats"]';
    if (await this.isElementVisible(statsSection)) {
      const totalEarnedText = await this.getElementText('[data-testid="total-earned"]');
      const totalSpentText = await this.getElementText('[data-testid="total-spent"]');
      const lastTransactionText = await this.getElementText('[data-testid="last-transaction"]');
      
      return {
        totalEarned: parseInt(totalEarnedText.replace(/[^\d]/g, '')) || 0,
        totalSpent: parseInt(totalSpentText.replace(/[^\d]/g, '')) || 0,
        currentBalance: await this.getMileageBalance(),
        lastTransaction: lastTransactionText
      };
    }
    
    return {
      totalEarned: 0,
      totalSpent: 0,
      currentBalance: await this.getMileageBalance(),
      lastTransaction: ''
    };
  }

  // Bonus mileage
  async claimBonusMileage() {
    const bonusButton = '[data-testid="claim-bonus-mileage"]';
    if (await this.isElementVisible(bonusButton)) {
      await this.clickElement(bonusButton);
      await this.waitForLoadingToComplete();
    }
  }

  async isBonusMileageAvailable(): Promise<boolean> {
    const bonusIndicator = '[data-testid="bonus-available"]';
    return await this.isElementVisible(bonusIndicator);
  }

  // Event mileage
  async participateInEvent(eventId: string) {
    const eventButton = `[data-testid="event-${eventId}"]`;
    if (await this.isElementVisible(eventButton)) {
      await this.clickElement(eventButton);
      
      const participateButton = '[data-testid="participate-event"]';
      if (await this.isElementVisible(participateButton)) {
        await this.clickElement(participateButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  async getAvailableEvents(): Promise<Array<{
    id: string;
    name: string;
    reward: number;
    expiresAt: string;
  }>> {
    const eventList = '[data-testid="event-list"]';
    if (!await this.isElementVisible(eventList)) {
      return [];
    }
    
    const eventItems = this.page.locator('[data-testid="event-item"]');
    const count = await eventItems.count();
    const events = [];
    
    for (let i = 0; i < count; i++) {
      const item = eventItems.nth(i);
      
      const id = await item.getAttribute('data-event-id') || '';
      const name = await item.locator('[data-testid="event-name"]').textContent() || '';
      const rewardText = await item.locator('[data-testid="event-reward"]').textContent() || '0';
      const reward = parseInt(rewardText.replace(/[^\d]/g, '')) || 0;
      const expiresAt = await item.locator('[data-testid="event-expires"]').textContent() || '';
      
      events.push({ id, name, reward, expiresAt });
    }
    
    return events;
  }
}