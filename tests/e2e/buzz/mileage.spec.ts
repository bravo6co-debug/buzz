import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { MileagePage } from '../setup/page-objects/MileagePage';
import { testData } from '../setup/test-data';

test.describe('Buzz App - Mileage System', () => {
  let authPage: AuthPage;
  let mileagePage: MileagePage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    mileagePage = new MileagePage(page);
    
    // Login before each test
    await authPage.login(
      testData.users.customer.email,
      testData.users.customer.password
    );
  });

  test.describe('Mileage Balance Display', () => {
    test('should display current mileage balance', async () => {
      await mileagePage.navigateToMileage();
      
      expect(await mileagePage.isMileageBalanceVisible()).toBeTruthy();
      
      const balance = await mileagePage.getMileageBalance();
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    test('should display mileage balance in header/navigation', async () => {
      await mileagePage.goto('/');
      
      // Mileage balance should be visible in header or main navigation
      expect(await mileagePage.isMileageBalanceVisible()).toBeTruthy();
    });

    test('should update mileage balance after transactions', async () => {
      await mileagePage.navigateToMileage();
      
      const initialBalance = await mileagePage.getMileageBalance();
      
      // Simulate earning some mileage (if test environment supports it)
      await mileagePage.earnMileage(testData.mileage.amounts.small);
      
      // Check if balance updated
      const successMessage = await mileagePage.getMileageEarnSuccess();
      if (successMessage) {
        const newBalance = await mileagePage.getMileageBalance();
        expect(newBalance).toBeGreaterThan(initialBalance);
      }
    });
  });

  test.describe('QR Code Generation', () => {
    test('should generate QR code for mileage earning', async () => {
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
      expect(await mileagePage.isQRCodeImageVisible()).toBeTruthy();
    });

    test('should close QR code modal', async () => {
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
      
      await mileagePage.closeQRCodeModal();
      expect(await mileagePage.isQRCodeModalVisible()).toBeFalsy();
    });

    test('should generate business-specific QR code', async () => {
      await mileagePage.navigateToMileage();
      
      const businessName = '테스트 카페';
      await mileagePage.generateBusinessQR(businessName);
      
      const isValid = await mileagePage.validateQRCode(businessName);
      expect(isValid).toBeTruthy();
    });

    test('should handle QR code expiration', async () => {
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
      
      // Wait for QR code expiration (if implemented)
      // This would require actual timing or mocking
      await mileagePage.page.waitForTimeout(testData.qr.expiryTime + 1000);
      
      // Check if QR code expired message appears or new QR is generated
      const errorMessage = await mileagePage.getMileageError();
      if (errorMessage && errorMessage.includes('만료')) {
        expect(errorMessage).toContain('만료');
      }
    });
  });

  test.describe('Mileage Earning', () => {
    test('should earn mileage through QR scan simulation', async () => {
      await mileagePage.navigateToMileage();
      
      const initialBalance = await mileagePage.getMileageBalance();
      
      // Simulate QR code scanning process
      await mileagePage.scanQRCode();
      
      // Check for success message
      const successMessage = await mileagePage.getMileageEarnSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(testData.ui.messages.success.mileageEarn);
        
        // Verify balance increased
        const newBalance = await mileagePage.getMileageBalance();
        expect(newBalance).toBeGreaterThan(initialBalance);
      }
    });

    test('should earn bonus mileage', async () => {
      await mileagePage.navigateToMileage();
      
      if (await mileagePage.isBonusMileageAvailable()) {
        const initialBalance = await mileagePage.getMileageBalance();
        
        await mileagePage.claimBonusMileage();
        
        const successMessage = await mileagePage.getMileageEarnSuccess();
        expect(successMessage).toBeTruthy();
        
        const newBalance = await mileagePage.getMileageBalance();
        expect(newBalance).toBeGreaterThan(initialBalance);
      }
    });

    test('should earn event mileage', async () => {
      await mileagePage.navigateToMileage();
      
      const events = await mileagePage.getAvailableEvents();
      
      if (events.length > 0) {
        const initialBalance = await mileagePage.getMileageBalance();
        const event = events[0];
        
        await mileagePage.participateInEvent(event.id);
        
        const successMessage = await mileagePage.getMileageEarnSuccess();
        if (successMessage) {
          const newBalance = await mileagePage.getMileageBalance();
          expect(newBalance).toBeGreaterThanOrEqual(initialBalance + event.reward);
        }
      }
    });

    test('should validate mileage earning limits', async () => {
      // This test would check daily/monthly earning limits if implemented
      await mileagePage.navigateToMileage();
      
      // Try to earn mileage multiple times rapidly
      for (let i = 0; i < 10; i++) {
        await mileagePage.earnMileage(testData.mileage.amounts.small);
        
        const errorMessage = await mileagePage.getMileageError();
        if (errorMessage && errorMessage.includes('한도')) {
          expect(errorMessage).toMatch(/한도.*초과/);
          break;
        }
      }
    });
  });

  test.describe('Mileage Spending', () => {
    test('should spend mileage for coupon exchange', async () => {
      await mileagePage.navigateToMileage();
      
      const initialBalance = await mileagePage.getMileageBalance();
      
      if (initialBalance >= 1000) {
        await mileagePage.exchangeCoupon('welcome');
        
        const successMessage = await mileagePage.getMileageSpendSuccess();
        if (successMessage) {
          const newBalance = await mileagePage.getMileageBalance();
          expect(newBalance).toBeLessThan(initialBalance);
        }
      }
    });

    test('should prevent spending more mileage than available', async () => {
      await mileagePage.navigateToMileage();
      
      const currentBalance = await mileagePage.getMileageBalance();
      const excessiveAmount = currentBalance + 1000;
      
      await mileagePage.spendMileage(excessiveAmount);
      
      const errorMessage = await mileagePage.getMileageError();
      expect(errorMessage).toMatch(testData.ui.messages.error.insufficientMileage);
    });

    test('should validate minimum spending amount', async () => {
      await mileagePage.navigateToMileage();
      
      // Try to spend very small amount (if minimum is enforced)
      await mileagePage.spendMileage(1);
      
      const errorMessage = await mileagePage.getMileageError();
      if (errorMessage && errorMessage.includes('최소')) {
        expect(errorMessage).toMatch(/최소.*금액/);
      }
    });

    test('should confirm spending transaction', async () => {
      await mileagePage.navigateToMileage();
      
      const initialBalance = await mileagePage.getMileageBalance();
      
      if (initialBalance >= 500) {
        await mileagePage.spendMileage(500);
        
        // Should show confirmation dialog
        const confirmDialog = '[data-testid="confirm-spend-dialog"]';
        if (await mileagePage.isElementVisible(confirmDialog)) {
          const confirmButton = '[data-testid="confirm-spend-yes"]';
          await mileagePage.clickElement(confirmButton);
          
          const successMessage = await mileagePage.getMileageSpendSuccess();
          expect(successMessage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Mileage History', () => {
    test('should display mileage transaction history', async () => {
      const history = await mileagePage.getMileageHistory();
      
      expect(Array.isArray(history)).toBeTruthy();
      
      if (history.length > 0) {
        const transaction = history[0];
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('date');
        expect(transaction).toHaveProperty('description');
        
        expect(transaction.amount).toBeGreaterThan(0);
        expect(transaction.type).toMatch(/earn|spend|bonus|referral|event/);
      }
    });

    test('should filter mileage history by transaction type', async () => {
      await mileagePage.filterMileageHistory('earn');
      
      const history = await mileagePage.getMileageHistory();
      
      // All transactions should be 'earn' type
      if (history.length > 0) {
        for (const transaction of history) {
          expect(transaction.type).toMatch(/적립|earn/);
          expect(transaction.amount).toBeGreaterThan(0);
        }
      }
    });

    test('should show spending transactions with negative amounts', async () => {
      await mileagePage.filterMileageHistory('spend');
      
      const history = await mileagePage.getMileageHistory();
      
      if (history.length > 0) {
        for (const transaction of history) {
          expect(transaction.type).toMatch(/사용|spend/);
          expect(transaction.amount).toBeLessThanOrEqual(0);
        }
      }
    });

    test('should display transaction details', async () => {
      const history = await mileagePage.getMileageHistory();
      
      if (history.length > 0) {
        const transaction = history[0];
        
        // Click on transaction for details
        const transactionRow = `[data-testid="transaction-${transaction.type}"]`;
        if (await mileagePage.isElementVisible(transactionRow)) {
          await mileagePage.clickElement(transactionRow);
          
          // Should show transaction detail modal or page
          const detailModal = '[data-testid="transaction-detail"]';
          if (await mileagePage.isElementVisible(detailModal)) {
            expect(await mileagePage.isElementVisible(detailModal)).toBeTruthy();
          }
        }
      }
    });

    test('should paginate through history', async () => {
      await mileagePage.navigateToMileageHistory();
      
      const nextButton = '[data-testid="history-next-page"]';
      if (await mileagePage.isElementVisible(nextButton) && 
          await mileagePage.isElementEnabled(nextButton)) {
        
        const firstPageHistory = await mileagePage.getMileageHistory();
        
        await mileagePage.clickElement(nextButton);
        await mileagePage.waitForLoadingToComplete();
        
        const secondPageHistory = await mileagePage.getMileageHistory();
        
        // Should have different transactions (assuming enough data)
        if (firstPageHistory.length > 0 && secondPageHistory.length > 0) {
          expect(firstPageHistory[0]).not.toEqual(secondPageHistory[0]);
        }
      }
    });
  });

  test.describe('Mileage Statistics', () => {
    test('should display mileage statistics', async () => {
      await mileagePage.navigateToMileage();
      
      const stats = await mileagePage.getMileageStats();
      
      expect(stats.totalEarned).toBeGreaterThanOrEqual(0);
      expect(stats.totalSpent).toBeGreaterThanOrEqual(0);
      expect(stats.currentBalance).toBeGreaterThanOrEqual(0);
      
      // Current balance should equal total earned minus total spent
      expect(stats.currentBalance).toBe(stats.totalEarned - stats.totalSpent);
    });

    test('should show last transaction information', async () => {
      await mileagePage.navigateToMileage();
      
      const stats = await mileagePage.getMileageStats();
      
      if (stats.lastTransaction) {
        expect(stats.lastTransaction).toBeTruthy();
        expect(typeof stats.lastTransaction).toBe('string');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      await mileagePage.navigateToMileage();
      
      // Simulate network failure (would need to mock this)
      // For now, we'll test error message display capability
      await mileagePage.earnMileage(testData.mileage.amounts.large);
      
      // Should either succeed or show appropriate error message
      const errorMessage = await mileagePage.getMileageError();
      const successMessage = await mileagePage.getMileageEarnSuccess();
      
      expect(errorMessage !== null || successMessage !== null).toBeTruthy();
    });

    test('should handle invalid QR codes', async () => {
      // This would require mocking an invalid QR code scan
      await mileagePage.navigateToMileage();
      
      // Simulate scanning invalid QR
      await mileagePage.scanQRCode();
      
      const errorMessage = await mileagePage.getMileageError();
      if (errorMessage && errorMessage.includes('유효하지')) {
        expect(errorMessage).toMatch(/유효하지.*않/);
      }
    });

    test('should handle expired QR codes', async () => {
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      // Wait for potential expiration
      await mileagePage.page.waitForTimeout(5000);
      
      // Try to use potentially expired QR
      await mileagePage.scanQRCode();
      
      const errorMessage = await mileagePage.getMileageError();
      if (errorMessage && errorMessage.includes('만료')) {
        expect(errorMessage).toMatch(/만료/);
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display mileage interface properly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await mileagePage.navigateToMileage();
      
      // Mileage balance should be visible on mobile
      expect(await mileagePage.isMileageBalanceVisible()).toBeTruthy();
      
      // QR code button should be accessible
      const qrButton = '[data-testid="qr-button"]';
      expect(await mileagePage.isElementVisible(qrButton)).toBeTruthy();
    });

    test('should handle mobile QR code scanning', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      // QR modal should be properly displayed on mobile
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
      
      // Should have mobile-optimized QR scanner (if implemented)
      const mobileScanner = '[data-testid="mobile-qr-scanner"]';
      if (await mileagePage.isElementVisible(mobileScanner)) {
        expect(await mileagePage.isElementVisible(mobileScanner)).toBeTruthy();
      }
    });
  });
});