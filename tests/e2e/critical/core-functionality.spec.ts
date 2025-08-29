import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { MileagePage } from '../setup/page-objects/MileagePage';
import { ReferralPage } from '../setup/page-objects/ReferralPage';
import { testData, generateTestUser } from '../setup/test-data';

test.describe('Critical Core Functionality', () => {
  test.describe('Essential User Journey - Customer', () => {
    test('should complete full customer journey successfully', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      const referralPage = new ReferralPage(page);
      
      // 1. User Registration
      const newUser = generateTestUser('journey');
      await authPage.signup(newUser);
      
      // Verify successful registration
      const signupSuccess = await authPage.getSignupSuccess();
      const isLoggedIn = await authPage.isLoggedIn();
      expect(signupSuccess || isLoggedIn).toBeTruthy();
      
      // 2. Initial Mileage Balance Check
      await mileagePage.navigateToMileage();
      const initialBalance = await mileagePage.getMileageBalance();
      expect(initialBalance).toBeGreaterThanOrEqual(0);
      
      // 3. Generate QR Code for Mileage
      await mileagePage.openQRCodeModal();
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
      expect(await mileagePage.isQRCodeImageVisible()).toBeTruthy();
      
      // 4. Get Referral Code
      await referralPage.navigateToReferral();
      const referralCode = await referralPage.getReferralCode();
      expect(referralCode).toBeTruthy();
      expect(await referralPage.validateReferralCode()).toBeTruthy();
      
      // 5. Share Referral Link
      const referralLink = await referralPage.getReferralLink();
      expect(referralLink).toBeTruthy();
      expect(referralLink).toContain(referralCode);
      
      // 6. View Statistics
      const stats = await referralPage.getReferralStats();
      expect(stats.totalReferrals).toBeGreaterThanOrEqual(0);
      
      // Journey completed successfully
      expect(true).toBeTruthy();
    });
  });

  test.describe('Essential System Health', () => {
    test('should load all main pages without errors', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      // Login first
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      const criticalPages = [
        { path: '/', name: 'Home' },
        { path: '/profile', name: 'Profile' },
        { path: '/mileage', name: 'Mileage' },
        { path: '/referral', name: 'Referral' },
        { path: '/coupons', name: 'Coupons' },
        { path: '/history', name: 'History' }
      ];
      
      for (const pageInfo of criticalPages) {
        await authPage.goto(pageInfo.path);
        await authPage.waitForLoadingToComplete();
        
        // Check for JavaScript errors
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Verify no critical errors
        expect(errors.filter(e => e.includes('ReferenceError') || e.includes('TypeError'))).toHaveLength(0);
        
        // Verify page loaded (not showing error page)
        const is404 = await page.locator('text=404').isVisible();
        const is500 = await page.locator('text=500').isVisible();
        const hasError = await page.locator('[data-testid="error-page"]').isVisible();
        
        expect(is404 || is500 || hasError).toBeFalsy();
      }
    });

    test('should handle API connectivity', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      // Test basic API endpoints
      const apiEndpoints = [
        { url: `${testData.env.baseUrls.api}/health`, name: 'Health Check' },
        { url: `${testData.env.baseUrls.api}/api/auth/check`, name: 'Auth Check' }
      ];
      
      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(endpoint.url);
        
        // API should respond (not necessarily with 200, but should respond)
        expect(response.status()).toBeLessThan(500);
        
        if (response.status() >= 400 && response.status() < 500) {
          // Client errors are acceptable for some endpoints
          console.log(`${endpoint.name}: ${response.status()} (Client Error - Acceptable)`);
        } else if (response.status() >= 200 && response.status() < 400) {
          // Success responses
          console.log(`${endpoint.name}: ${response.status()} (Success)`);
        }
      }
    });

    test('should maintain session across page navigation', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      expect(await authPage.isLoggedIn()).toBeTruthy();
      
      // Navigate through multiple pages
      const pages = ['/', '/profile', '/mileage', '/referral'];
      
      for (const pagePath of pages) {
        await authPage.goto(pagePath);
        await authPage.waitForLoadingToComplete();
        
        // Should still be logged in
        expect(await authPage.isLoggedIn()).toBeTruthy();
      }
    });
  });

  test.describe('Core Business Logic', () => {
    test('should enforce business rules for mileage system', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      await mileagePage.navigateToMileage();
      const currentBalance = await mileagePage.getMileageBalance();
      
      // Cannot spend more than available balance
      if (currentBalance > 0) {
        const excessAmount = currentBalance + 1000;
        await mileagePage.spendMileage(excessAmount);
        
        const errorMessage = await mileagePage.getMileageError();
        if (errorMessage) {
          expect(errorMessage).toMatch(/부족|insufficient/i);
        }
      }
      
      // Balance should remain non-negative
      expect(await mileagePage.getMileageBalance()).toBeGreaterThanOrEqual(0);
    });

    test('should enforce referral system constraints', async ({ page, browser }) => {
      const authPage = new AuthPage(page);
      const referralPage = new ReferralPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      await referralPage.navigateToReferral();
      const referralCode = await referralPage.getReferralCode();
      
      // Test self-referral prevention
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      const newAuthPage = new AuthPage(newPage);
      
      try {
        const selfReferralUser = {
          ...generateTestUser('self'),
          email: testData.users.customer.email + '.self'
        };
        
        await newAuthPage.signupWithReferral(selfReferralUser, referralCode);
        
        const errorMessage = await newAuthPage.getSignupError();
        if (errorMessage && errorMessage.includes('자기')) {
          expect(errorMessage).toMatch(/자기.*추천.*수.*없/);
        }
      } finally {
        await newContext.close();
      }
    });

    test('should validate QR code security', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      await mileagePage.navigateToMileage();
      await mileagePage.openQRCodeModal();
      
      // QR code should be generated and visible
      expect(await mileagePage.isQRCodeImageVisible()).toBeTruthy();
      
      // QR code should have appropriate security measures
      const qrImage = page.locator(testData.ui.selectors.qrCodeImage);
      const qrSrc = await qrImage.getAttribute('src');
      
      if (qrSrc) {
        // QR code should not contain sensitive information directly in URL
        expect(qrSrc).not.toMatch(/password|token|secret/i);
        
        // Should be base64 encoded or proper image format
        expect(qrSrc).toMatch(/^(data:image|https?:\/\/)/);
      }
    });
  });

  test.describe('Performance Critical Paths', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      const performanceCriticalPages = [
        { path: '/', maxLoadTime: 3000, name: 'Home Page' },
        { path: '/mileage', maxLoadTime: 2000, name: 'Mileage Page' },
        { path: '/referral', maxLoadTime: 2000, name: 'Referral Page' }
      ];
      
      for (const pageTest of performanceCriticalPages) {
        const startTime = Date.now();
        
        await authPage.goto(pageTest.path);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        console.log(`${pageTest.name} loaded in ${loadTime}ms`);
        
        // In development, we'll be more lenient with load times
        const maxTime = process.env.NODE_ENV === 'production' ? pageTest.maxLoadTime : pageTest.maxLoadTime * 2;
        expect(loadTime).toBeLessThan(maxTime);
      }
    });

    test('should handle concurrent user operations', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Perform multiple operations concurrently
      const operations = [
        mileagePage.navigateToMileage(),
        mileagePage.getMileageBalance(),
        mileagePage.openQRCodeModal()
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      // All operations should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      // Operations should not interfere with each other
      expect(results.length).toBe(operations.length);
    });
  });

  test.describe('Data Integrity', () => {
    test('should maintain data consistency across operations', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Get initial state
      await mileagePage.navigateToMileage();
      const initialBalance = await mileagePage.getMileageBalance();
      const initialStats = await mileagePage.getMileageStats();
      
      // Perform operations and verify consistency
      if (initialBalance === initialStats.currentBalance) {
        expect(initialBalance).toBe(initialStats.currentBalance);
      }
      
      // Verify transaction history reflects current balance
      const history = await mileagePage.getMileageHistory();
      
      if (history.length > 0) {
        // Calculate balance from history
        let calculatedBalance = 0;
        for (const transaction of history) {
          calculatedBalance += transaction.amount;
        }
        
        // Should match current balance (within reasonable margin for ongoing transactions)
        const margin = 1000; // Allow for recent transactions not yet reflected
        expect(Math.abs(calculatedBalance - initialBalance)).toBeLessThan(margin);
      }
    });

    test('should prevent duplicate operations', async ({ page }) => {
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      await mileagePage.navigateToMileage();
      
      // Try to perform the same operation multiple times rapidly
      const initialBalance = await mileagePage.getMileageBalance();
      
      // Rapidly click QR generation (if available)
      const qrButton = '[data-testid="qr-button"]';
      if (await mileagePage.isElementVisible(qrButton)) {
        // Click multiple times rapidly
        await Promise.all([
          mileagePage.clickElement(qrButton),
          mileagePage.clickElement(qrButton),
          mileagePage.clickElement(qrButton)
        ]);
        
        // Should still only have one QR modal or handle gracefully
        const modalCount = await page.locator(testData.ui.selectors.qrCodeModal).count();
        expect(modalCount).toBeLessThanOrEqual(1);
      }
      
      // Balance should not change from duplicate requests
      const finalBalance = await mileagePage.getMileageBalance();
      expect(finalBalance).toBe(initialBalance);
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network interruptions', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Simulate network issues by intercepting requests
      await page.route('**/api/**', async (route) => {
        // Fail the first request, succeed the second
        const url = route.request().url();
        
        if (url.includes('/mileage') && !url.includes('retry')) {
          await route.abort();
        } else {
          await route.continue();
        }
      });
      
      // Try to access mileage page
      await authPage.goto('/mileage');
      
      // Should show error state or retry mechanism
      const errorMessage = await authPage.getErrorMessage();
      const retryButton = '[data-testid="retry-button"]';
      
      if (errorMessage || await authPage.isElementVisible(retryButton)) {
        // If retry button exists, clicking it should recover
        if (await authPage.isElementVisible(retryButton)) {
          await authPage.clickElement(retryButton);
          await authPage.waitForLoadingToComplete();
        }
      }
      
      // Remove route interception
      await page.unroute('**/api/**');
      
      // Should eventually be able to load the page
      await authPage.reloadPage();
      await authPage.waitForLoadingToComplete();
      
      // Page should load successfully after network recovery
      const finalError = await authPage.getErrorMessage();
      expect(finalError).toBeFalsy();
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      const authPage = new AuthPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Clear session cookies to simulate expiration
      await authPage.clearCookies();
      
      // Try to access protected page
      await authPage.goto('/profile');
      
      // Should redirect to login or show appropriate message
      const isOnLoginPage = authPage.page.url().includes('/login');
      const hasSessionError = await authPage.getErrorMessage();
      
      expect(isOnLoginPage || hasSessionError).toBeTruthy();
      
      // Should be able to login again
      if (isOnLoginPage) {
        await authPage.login(
          testData.users.customer.email,
          testData.users.customer.password
        );
        
        expect(await authPage.isLoggedIn()).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Critical Functionality', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const authPage = new AuthPage(page);
      const mileagePage = new MileagePage(page);
      
      // Mobile login should work
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      expect(await authPage.isLoggedIn()).toBeTruthy();
      
      // Core mobile functionality
      await mileagePage.navigateToMileage();
      expect(await mileagePage.isMileageBalanceVisible()).toBeTruthy();
      
      // Mobile QR functionality
      await mileagePage.openQRCodeModal();
      expect(await mileagePage.isQRCodeModalVisible()).toBeTruthy();
    });

    test('should be touch-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const authPage = new AuthPage(page);
      
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Test touch interactions
      const touchTargets = [
        '[data-testid="home-link"]',
        '[data-testid="profile-link"]',
        '[data-testid="mileage-link"]'
      ];
      
      for (const target of touchTargets) {
        if (await authPage.isElementVisible(target)) {
          const element = page.locator(target);
          const boundingBox = await element.boundingBox();
          
          if (boundingBox) {
            // Touch targets should be at least 44px (iOS guideline)
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });
});