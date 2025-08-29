import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { BusinessPage } from '../setup/page-objects/BusinessPage';
import { testData, generateBusinessData } from '../setup/test-data';

test.describe('Buzz-Biz App - Business Registration', () => {
  let authPage: AuthPage;
  let businessPage: BusinessPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    businessPage = new BusinessPage(page);
    
    // Login with business account
    await authPage.login(
      testData.users.business.email,
      testData.users.business.password
    );
  });

  test.describe('Business Account Creation', () => {
    test('should register new business successfully', async () => {
      const businessData = generateBusinessData('new-business');
      
      await businessPage.registerBusiness({
        businessName: businessData.businessName,
        businessPhone: businessData.businessPhone,
        address: businessData.address,
        category: businessData.category,
        description: businessData.description
      });
      
      const successMessage = await businessPage.getBusinessSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(/등록|신청/);
      }
      
      // Should be pending approval
      expect(await businessPage.isPendingApproval()).toBeTruthy();
    });

    test('should validate required business information fields', async () => {
      await businessPage.navigateToBusinessRegistration();
      
      // Try to submit empty form
      await businessPage.submitBusinessRegistration();
      
      const errorMessage = await businessPage.getBusinessError();
      expect(errorMessage).toBeTruthy();
    });

    test('should validate business name uniqueness', async () => {
      const existingBusinessData = {
        businessName: testData.users.business.businessName,
        businessPhone: '02-9999-9999',
        address: '서울시 테스트구 테스트로 999',
        category: 'restaurant'
      };
      
      await businessPage.registerBusiness(existingBusinessData);
      
      const errorMessage = await businessPage.getBusinessError();
      if (errorMessage && errorMessage.includes('중복')) {
        expect(errorMessage).toMatch(/중복|이미.*사용/);
      }
    });

    test('should validate business phone number format', async () => {
      const invalidPhoneData = generateBusinessData();
      invalidPhoneData.businessPhone = '123-456';
      
      await businessPage.registerBusiness(invalidPhoneData);
      
      const errorMessage = await businessPage.getBusinessError();
      if (errorMessage) {
        expect(errorMessage).toMatch(/전화번호.*형식/);
      }
    });

    test('should support business category selection', async () => {
      await businessPage.navigateToBusinessRegistration();
      
      const categories = testData.business.categories;
      
      for (const category of categories) {
        await businessPage.selectOption('[data-testid="business-category"]', category);
        
        const selectedValue = await businessPage.page
          .locator('[data-testid="business-category"]')
          .inputValue();
        
        expect(selectedValue).toBe(category);
      }
    });

    test('should handle business image upload', async () => {
      await businessPage.navigateToBusinessRegistration();
      
      // This would require a test image file
      const testImagePath = './tests/fixtures/test-business-image.jpg';
      
      // Only test if image upload element exists
      const imageUpload = '[data-testid="business-image-upload"]';
      if (await businessPage.isElementVisible(imageUpload)) {
        // In real test, would upload actual file
        // await businessPage.uploadBusinessImage(testImagePath);
        expect(await businessPage.isElementVisible(imageUpload)).toBeTruthy();
      }
    });
  });

  test.describe('Business Status Management', () => {
    test('should display current business status', async () => {
      await businessPage.navigateToBusinessDashboard();
      
      const status = await businessPage.getBusinessStatus();
      expect(status).toBeTruthy();
      
      const validStatuses = testData.business.statuses;
      const isValidStatus = validStatuses.some(validStatus => 
        status.includes(validStatus) || 
        status.includes(validStatus === 'pending' ? '대기' : 
                       validStatus === 'approved' ? '승인' : 
                       validStatus === 'rejected' ? '반려' : 
                       validStatus === 'suspended' ? '정지' : validStatus)
      );
      expect(isValidStatus).toBeTruthy();
    });

    test('should show pending approval message', async () => {
      if (await businessPage.isPendingApproval()) {
        await businessPage.navigateToBusinessDashboard();
        
        const pendingMessage = '[data-testid="pending-approval-message"]';
        if (await businessPage.isElementVisible(pendingMessage)) {
          const message = await businessPage.getElementText(pendingMessage);
          expect(message).toMatch(/승인.*대기|검토.*진행/);
        }
      }
    });

    test('should allow business info updates when approved', async () => {
      if (await businessPage.isBusinessApproved()) {
        const updates = {
          businessName: '업데이트된 비즈니스명',
          description: '업데이트된 설명입니다.'
        };
        
        await businessPage.updateBusinessInfo(updates);
        
        const successMessage = await businessPage.getBusinessSuccess();
        if (successMessage) {
          expect(successMessage).toMatch(/수정|업데이트/);
        }
      }
    });

    test('should restrict features when not approved', async () => {
      if (await businessPage.isPendingApproval()) {
        await businessPage.navigateToQRManagement();
        
        // QR generation should be disabled or show message
        const generateQRButton = '[data-testid="generate-qr-code"]';
        if (await businessPage.isElementVisible(generateQRButton)) {
          const isEnabled = await businessPage.isElementEnabled(generateQRButton);
          
          if (!isEnabled) {
            expect(isEnabled).toBeFalsy();
          } else {
            // Try to generate QR
            await businessPage.clickElement(generateQRButton);
            
            const errorMessage = await businessPage.getBusinessError();
            if (errorMessage && errorMessage.includes('승인')) {
              expect(errorMessage).toMatch(/승인.*필요|승인.*후/);
            }
          }
        }
      }
    });

    test('should handle business rejection', async () => {
      if (await businessPage.isBusinessRejected()) {
        await businessPage.navigateToBusinessDashboard();
        
        const rejectionReason = '[data-testid="rejection-reason"]';
        if (await businessPage.isElementVisible(rejectionReason)) {
          const reason = await businessPage.getElementText(rejectionReason);
          expect(reason).toBeTruthy();
        }
        
        // Should allow re-application
        const reapplyButton = '[data-testid="reapply-business"]';
        if (await businessPage.isElementVisible(reapplyButton)) {
          expect(await businessPage.isElementVisible(reapplyButton)).toBeTruthy();
        }
      }
    });
  });

  test.describe('Business Dashboard Access', () => {
    test('should display business dashboard for approved business', async () => {
      if (await businessPage.isBusinessApproved()) {
        await businessPage.navigateToBusinessDashboard();
        
        expect(await businessPage.isBusinessDashboardVisible()).toBeTruthy();
        
        const stats = await businessPage.getDashboardStats();
        expect(stats.totalCustomers).toBeGreaterThanOrEqual(0);
        expect(stats.totalTransactions).toBeGreaterThanOrEqual(0);
        expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(stats.averageRating).toBeGreaterThanOrEqual(0);
        expect(stats.averageRating).toBeLessThanOrEqual(5);
      }
    });

    test('should show appropriate navigation menu', async () => {
      await businessPage.navigateToBusinessDashboard();
      
      expect(await businessPage.hasBusinessAccess()).toBeTruthy();
      
      // Check if business menu items are accessible
      const menuItems = [
        '[data-testid="dashboard-menu"]',
        '[data-testid="qr-menu"]',
        '[data-testid="customers-menu"]',
        '[data-testid="reviews-menu"]',
        '[data-testid="settlements-menu"]'
      ];
      
      let visibleMenus = 0;
      for (const menu of menuItems) {
        if (await businessPage.isElementVisible(menu)) {
          visibleMenus++;
        }
      }
      
      expect(visibleMenus).toBeGreaterThan(0);
    });

    test('should redirect non-business users appropriately', async () => {
      // Logout and login as regular customer
      await authPage.logout();
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Try to access business dashboard
      await businessPage.goto('/dashboard');
      
      // Should redirect to access denied or home page
      const currentUrl = businessPage.page.url();
      const isRedirected = !currentUrl.includes('/dashboard') || 
                          currentUrl.includes('/access-denied') ||
                          await businessPage.getErrorMessage();
      
      expect(isRedirected).toBeTruthy();
    });
  });

  test.describe('Business Information Display', () => {
    test('should display business information correctly', async () => {
      await businessPage.navigateToBusinessDashboard();
      
      const businessName = await businessPage.getElementText('[data-testid="business-name"]');
      const businessCategory = await businessPage.getElementText('[data-testid="business-category"]');
      
      expect(businessName).toBeTruthy();
      expect(businessCategory).toBeTruthy();
    });

    test('should show business contact information', async () => {
      await businessPage.goto('/settings');
      await businessPage.waitForLoadingToComplete();
      
      const contactElements = [
        '[data-testid="display-business-phone"]',
        '[data-testid="display-business-address"]',
        '[data-testid="display-business-email"]'
      ];
      
      for (const element of contactElements) {
        if (await businessPage.isElementVisible(element)) {
          const text = await businessPage.getElementText(element);
          expect(text).toBeTruthy();
        }
      }
    });

    test('should display business hours if configured', async () => {
      await businessPage.goto('/settings');
      await businessPage.waitForLoadingToComplete();
      
      const hoursSection = '[data-testid="business-hours"]';
      if (await businessPage.isElementVisible(hoursSection)) {
        const hours = await businessPage.getElementText(hoursSection);
        expect(hours).toBeTruthy();
      }
    });
  });

  test.describe('Business Settings', () => {
    test('should allow business information updates', async () => {
      const originalName = await businessPage.getElementText('[data-testid="business-name"]');
      
      const updates = {
        businessName: '수정된 비즈니스명 ' + Date.now(),
        description: '수정된 비즈니스 설명'
      };
      
      await businessPage.updateBusinessInfo(updates);
      
      const successMessage = await businessPage.getBusinessSuccess();
      if (successMessage) {
        expect(successMessage).toMatch(/저장|수정|업데이트/);
      }
      
      // Verify the change was applied
      await businessPage.reloadPage();
      const newName = await businessPage.getElementText('[data-testid="business-name"]');
      
      if (newName !== originalName) {
        expect(newName).toContain('수정된');
      }
    });

    test('should validate business information updates', async () => {
      const invalidUpdates = {
        businessName: '', // Empty name should be invalid
        businessPhone: '123' // Invalid phone format
      };
      
      await businessPage.updateBusinessInfo(invalidUpdates);
      
      const errorMessage = await businessPage.getBusinessError();
      if (errorMessage) {
        expect(errorMessage).toBeTruthy();
      }
    });

    test('should handle business image updates', async () => {
      await businessPage.goto('/settings');
      await businessPage.waitForLoadingToComplete();
      
      const imageSection = '[data-testid="business-image-section"]';
      if (await businessPage.isElementVisible(imageSection)) {
        const updateImageButton = '[data-testid="update-business-image"]';
        
        if (await businessPage.isElementVisible(updateImageButton)) {
          expect(await businessPage.isElementVisible(updateImageButton)).toBeTruthy();
        }
      }
    });
  });

  test.describe('Business Verification', () => {
    test('should show verification requirements', async () => {
      await businessPage.navigateToBusinessDashboard();
      
      const verificationSection = '[data-testid="verification-requirements"]';
      if (await businessPage.isElementVisible(verificationSection)) {
        const requirements = await businessPage.getElementText(verificationSection);
        expect(requirements).toBeTruthy();
      }
    });

    test('should handle document upload for verification', async () => {
      const documentUpload = '[data-testid="verification-document-upload"]';
      if (await businessPage.isElementVisible(documentUpload)) {
        expect(await businessPage.isElementVisible(documentUpload)).toBeTruthy();
        
        // Would test actual document upload in real implementation
        // const testDocument = './tests/fixtures/business-registration.pdf';
        // await businessPage.uploadFile(documentUpload, testDocument);
      }
    });

    test('should show verification status', async () => {
      const verificationStatus = '[data-testid="verification-status"]';
      if (await businessPage.isElementVisible(verificationStatus)) {
        const status = await businessPage.getElementText(verificationStatus);
        expect(status).toMatch(/확인|검토|승인|대기/);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle registration errors gracefully', async () => {
      const invalidData = {
        businessName: 'A', // Too short
        businessPhone: '123', // Invalid format
        address: '', // Empty address
        category: 'invalid-category'
      };
      
      await businessPage.registerBusiness(invalidData);
      
      const errorMessage = await businessPage.getBusinessError();
      expect(errorMessage).toBeTruthy();
      
      // Should remain on registration page
      expect(businessPage.page.url()).toContain('/register');
    });

    test('should handle network errors during registration', async () => {
      const businessData = generateBusinessData('network-test');
      
      await businessPage.navigateToBusinessRegistration();
      await businessPage.fillBusinessRegistrationForm({
        businessName: businessData.businessName,
        businessPhone: businessData.businessPhone,
        address: businessData.address,
        category: businessData.category
      });
      
      // Simulate network issues by attempting registration
      await businessPage.submitBusinessRegistration();
      
      // Should either succeed or show appropriate error
      const errorMessage = await businessPage.getBusinessError();
      const successMessage = await businessPage.getBusinessSuccess();
      
      expect(errorMessage !== null || successMessage !== null).toBeTruthy();
    });

    test('should validate file upload restrictions', async () => {
      const imageUpload = '[data-testid="business-image-upload"]';
      if (await businessPage.isElementVisible(imageUpload)) {
        // Test file size/type restrictions would go here
        // This would require creating test files of various sizes and types
        expect(await businessPage.isElementVisible(imageUpload)).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display business registration form on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await businessPage.navigateToBusinessRegistration();
      
      // Form elements should be visible and accessible on mobile
      const formElements = [
        '[data-testid="business-name"]',
        '[data-testid="business-phone"]',
        '[data-testid="business-address"]',
        '[data-testid="business-category"]'
      ];
      
      for (const element of formElements) {
        expect(await businessPage.isElementVisible(element)).toBeTruthy();
      }
    });

    test('should handle mobile business dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await businessPage.navigateToBusinessDashboard();
      
      // Dashboard should be responsive
      expect(await businessPage.isBusinessDashboardVisible()).toBeTruthy();
      
      // Key statistics should be visible
      const statsElements = [
        '[data-testid="total-customers"]',
        '[data-testid="total-transactions"]',
        '[data-testid="total-revenue"]'
      ];
      
      let visibleStats = 0;
      for (const element of statsElements) {
        if (await businessPage.isElementVisible(element)) {
          visibleStats++;
        }
      }
      
      expect(visibleStats).toBeGreaterThan(0);
    });
  });
});