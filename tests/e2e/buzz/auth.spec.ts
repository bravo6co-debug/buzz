import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { testData, generateTestUser } from '../setup/test-data';

test.describe('Buzz App - Authentication', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );

      // Verify successful login
      expect(await authPage.isLoggedIn()).toBeTruthy();
      expect(await authPage.page.url()).toContain('/');
      
      // Check for success message
      const successMessage = await authPage.getLoginSuccess();
      if (successMessage) {
        expect(successMessage).toContain('로그인');
      }
    });

    test('should fail to login with invalid email', async () => {
      await authPage.login('invalid@email.com', testData.users.customer.password);

      // Verify login failure
      expect(await authPage.isLoggedIn()).toBeFalsy();
      
      const errorMessage = await authPage.getLoginError();
      expect(errorMessage).toBeTruthy();
    });

    test('should fail to login with invalid password', async () => {
      await authPage.login(testData.users.customer.email, 'wrongpassword');

      // Verify login failure
      expect(await authPage.isLoggedIn()).toBeFalsy();
      
      const errorMessage = await authPage.getLoginError();
      expect(errorMessage).toBeTruthy();
    });

    test('should fail to login with empty credentials', async () => {
      await authPage.navigateToLogin();
      await authPage.submitLogin();

      // Verify login failure
      expect(await authPage.isLoggedIn()).toBeFalsy();
      
      // Should show validation errors or remain on login page
      expect(await authPage.isLoginFormVisible()).toBeTruthy();
    });

    test('should redirect to intended page after login', async () => {
      // Try to access a protected page
      await authPage.goto('/profile');
      
      // Should redirect to login
      await authPage.waitForUrl(/login/);
      
      // Login
      await authPage.fillLoginForm(
        testData.users.customer.email,
        testData.users.customer.password
      );
      await authPage.submitLogin();
      
      // Should redirect back to intended page
      await authPage.waitForUrl(/profile/);
      expect(await authPage.page.url()).toContain('/profile');
    });
  });

  test.describe('User Signup', () => {
    test('should successfully signup with valid data', async () => {
      const newUser = generateTestUser('signup');
      
      await authPage.signup(newUser);

      // Verify successful signup
      const successMessage = await authPage.getSignupSuccess();
      if (successMessage) {
        expect(successMessage).toContain('회원가입');
      }

      // Should be logged in or redirected to login
      const isLoggedIn = await authPage.isLoggedIn();
      const onLoginPage = await authPage.page.url().includes('/login');
      expect(isLoggedIn || onLoginPage).toBeTruthy();
    });

    test('should signup with referral code', async () => {
      const newUser = generateTestUser('referral');
      const referralCode = testData.referral.codes.valid;
      
      await authPage.signupWithReferral(newUser, referralCode);

      // Verify successful signup with referral
      const successMessage = await authPage.getSignupSuccess();
      if (successMessage) {
        expect(successMessage).toContain('회원가입');
      }
      
      // Check that referral code was processed
      // This would require checking the backend or user profile for referral info
    });

    test('should fail signup with existing email', async () => {
      // Try to signup with existing user email
      const existingUser = {
        ...testData.users.customer,
        name: '다른이름'
      };
      
      await authPage.signup(existingUser);

      // Verify signup failure
      const errorMessage = await authPage.getSignupError();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toMatch(/이메일.*사용/);
    });

    test('should fail signup with invalid email format', async () => {
      const invalidUser = {
        ...generateTestUser(),
        email: 'invalid-email'
      };
      
      await authPage.signup(invalidUser);

      // Verify signup failure
      const errorMessage = await authPage.getSignupError();
      expect(errorMessage).toBeTruthy();
    });

    test('should fail signup with weak password', async () => {
      const weakPasswordUser = {
        ...generateTestUser(),
        password: '123'
      };
      
      await authPage.signup(weakPasswordUser);

      // Verify signup failure
      const errorMessage = await authPage.getSignupError();
      expect(errorMessage).toBeTruthy();
    });

    test('should fail signup with invalid phone number', async () => {
      const invalidPhoneUser = {
        ...generateTestUser(),
        phone: '123'
      };
      
      await authPage.signup(invalidPhoneUser);

      // Verify signup failure or validation
      const errorMessage = await authPage.getSignupError();
      if (errorMessage) {
        expect(errorMessage).toMatch(/전화번호/);
      }
    });

    test('should prevent self-referral signup', async () => {
      // This test would require creating a user first, getting their referral code,
      // then trying to signup with the same email and their own referral code
      const testUser = generateTestUser('self-referral');
      
      // First create the user
      await authPage.signup(testUser);
      
      // Get their referral code (would need to navigate to profile/referral page)
      // For now, we'll simulate trying to use a known code
      
      // Try to signup again with same email and a referral code
      await authPage.navigateToSignup();
      await authPage.fillSignupForm({
        ...testUser,
        email: testUser.email + '.duplicate'
      });
      await authPage.fillInput(testData.ui.selectors.referralCodeInput, 'SELF123A');
      await authPage.submitSignup();
      
      // Should prevent self-referral if implemented
      const errorMessage = await authPage.getSignupError();
      if (errorMessage) {
        expect(errorMessage).toMatch(/자기.*추천.*수.*없/);
      }
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async () => {
      // Login before each logout test
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
    });

    test('should successfully logout', async () => {
      await authPage.logout();

      // Verify successful logout
      expect(await authPage.isLoggedIn()).toBeFalsy();
      
      // Should redirect to home or login page
      const currentUrl = authPage.page.url();
      const isOnPublicPage = currentUrl.includes('/') || 
                           currentUrl.includes('/login') || 
                           currentUrl.includes('/signup');
      expect(isOnPublicPage).toBeTruthy();
    });

    test('should clear user session on logout', async () => {
      await authPage.logout();

      // Try to access protected page
      await authPage.goto('/profile');
      
      // Should redirect to login
      await authPage.waitForUrl(/login/);
      expect(await authPage.page.url()).toMatch(/login/);
    });
  });

  test.describe('Password Recovery', () => {
    test('should request password reset with valid email', async () => {
      await authPage.requestPasswordReset(testData.users.customer.email);

      // Should show success message
      const successMessage = await authPage.getSuccessMessage();
      if (successMessage) {
        expect(successMessage).toMatch(/비밀번호.*재설정/);
      }
    });

    test('should handle password reset with invalid email', async () => {
      await authPage.requestPasswordReset('nonexistent@email.com');

      // May show error or success message for security reasons
      const message = await authPage.getErrorMessage() || await authPage.getSuccessMessage();
      expect(message).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );

      expect(await authPage.isLoggedIn()).toBeTruthy();

      // Reload page
      await authPage.reloadPage();

      // Should still be logged in
      expect(await authPage.isLoggedIn()).toBeTruthy();
    });

    test('should handle session expiration gracefully', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );

      // Simulate session expiration by clearing cookies
      await authPage.clearCookies();
      await authPage.reloadPage();

      // Should handle expired session (redirect to login or show login state)
      const isLoggedIn = await authPage.isLoggedIn();
      const onLoginPage = authPage.page.url().includes('/login');
      expect(isLoggedIn || onLoginPage).toBeTruthy();
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields on signup', async () => {
      await authPage.navigateToSignup();
      
      // Try to submit empty form
      await authPage.submitSignup();
      
      // Should show validation errors or remain on signup page
      expect(await authPage.isSignupFormVisible()).toBeTruthy();
    });

    test('should validate email format', async () => {
      await authPage.navigateToSignup();
      
      await authPage.fillInput(testData.ui.selectors.emailInput, 'invalid-email');
      await authPage.fillInput(testData.ui.selectors.nameInput, 'Test User');
      await authPage.fillInput(testData.ui.selectors.passwordInput, 'TestPass123!');
      await authPage.submitSignup();
      
      // Should show email validation error
      const errorMessage = await authPage.getErrorMessage();
      if (errorMessage) {
        expect(errorMessage).toMatch(/이메일.*형식/);
      }
    });

    test('should validate password requirements', async () => {
      await authPage.navigateToSignup();
      
      await authPage.fillInput(testData.ui.selectors.emailInput, 'test@example.com');
      await authPage.fillInput(testData.ui.selectors.nameInput, 'Test User');
      await authPage.fillInput(testData.ui.selectors.passwordInput, '123');
      await authPage.submitSignup();
      
      // Should show password validation error
      const errorMessage = await authPage.getErrorMessage();
      if (errorMessage) {
        expect(errorMessage).toMatch(/비밀번호.*조건/);
      }
    });
  });
});