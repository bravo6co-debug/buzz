import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { testData } from '../test-data';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Login functionality
  async navigateToLogin() {
    await this.goto('/login');
    await this.waitForLoadingToComplete();
  }

  async fillLoginForm(email: string, password: string) {
    await this.fillInput(testData.ui.selectors.emailInput, email);
    await this.fillInput(testData.ui.selectors.passwordInput, password);
  }

  async submitLogin() {
    await this.clickElement(testData.ui.selectors.submitButton);
  }

  async login(email: string, password: string) {
    await this.navigateToLogin();
    await this.fillLoginForm(email, password);
    await this.submitLogin();
    await this.waitForLoadingToComplete();
  }

  // Signup functionality
  async navigateToSignup() {
    await this.goto('/signup');
    await this.waitForLoadingToComplete();
  }

  async fillSignupForm(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    referralCode?: string;
  }) {
    await this.fillInput(testData.ui.selectors.emailInput, userData.email);
    await this.fillInput(testData.ui.selectors.passwordInput, userData.password);
    await this.fillInput(testData.ui.selectors.nameInput, userData.name);
    
    if (userData.phone) {
      await this.fillInput(testData.ui.selectors.phoneInput, userData.phone);
    }
    
    if (userData.referralCode) {
      await this.fillInput(testData.ui.selectors.referralCodeInput, userData.referralCode);
    }
  }

  async submitSignup() {
    await this.clickElement(testData.ui.selectors.submitButton);
  }

  async signup(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    referralCode?: string;
  }) {
    await this.navigateToSignup();
    await this.fillSignupForm(userData);
    await this.submitSignup();
    await this.waitForLoadingToComplete();
  }

  // Logout functionality
  async logout() {
    // Look for logout button in header or profile menu
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("로그아웃")',
      'button:has-text("Logout")'
    ];

    for (const selector of logoutSelectors) {
      if (await this.isElementVisible(selector)) {
        await this.clickElement(selector);
        break;
      }
    }
    
    await this.waitForLoadingToComplete();
  }

  // Validation methods
  async isLoggedIn(): Promise<boolean> {
    // Check for user-specific elements that indicate logged-in state
    const loggedInIndicators = [
      '[data-testid="user-profile"]',
      '[data-testid="mileage-balance"]',
      'button:has-text("로그아웃")',
      '[data-testid="logout-button"]'
    ];

    for (const selector of loggedInIndicators) {
      if (await this.isElementVisible(selector)) {
        return true;
      }
    }
    return false;
  }

  async isLoginFormVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.emailInput) &&
           await this.isElementVisible(testData.ui.selectors.passwordInput) &&
           await this.isElementVisible(testData.ui.selectors.submitButton);
  }

  async isSignupFormVisible(): Promise<boolean> {
    return await this.isElementVisible(testData.ui.selectors.emailInput) &&
           await this.isElementVisible(testData.ui.selectors.passwordInput) &&
           await this.isElementVisible(testData.ui.selectors.nameInput) &&
           await this.isElementVisible(testData.ui.selectors.submitButton);
  }

  async getLoginError(): Promise<string | null> {
    return await this.getErrorMessage();
  }

  async getSignupError(): Promise<string | null> {
    return await this.getErrorMessage();
  }

  async getLoginSuccess(): Promise<string | null> {
    return await this.getSuccessMessage();
  }

  async getSignupSuccess(): Promise<string | null> {
    return await this.getSuccessMessage();
  }

  // Password reset functionality
  async navigateToPasswordReset() {
    await this.goto('/forgot-password');
    await this.waitForLoadingToComplete();
  }

  async requestPasswordReset(email: string) {
    await this.navigateToPasswordReset();
    await this.fillInput(testData.ui.selectors.emailInput, email);
    await this.clickElement(testData.ui.selectors.submitButton);
    await this.waitForLoadingToComplete();
  }

  // Referral signup with code
  async signupWithReferral(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }, referralCode: string) {
    await this.goto(`/signup?ref=${referralCode}`);
    await this.waitForLoadingToComplete();
    
    // Check if referral code is pre-filled
    const referralInput = this.page.locator(testData.ui.selectors.referralCodeInput);
    if (await referralInput.isVisible()) {
      const preFilledCode = await referralInput.inputValue();
      if (preFilledCode !== referralCode) {
        await this.fillInput(testData.ui.selectors.referralCodeInput, referralCode);
      }
    }

    await this.fillSignupForm({ ...userData, referralCode });
    await this.submitSignup();
    await this.waitForLoadingToComplete();
  }

  // Social login (if implemented)
  async loginWithGoogle() {
    const googleLoginButton = '[data-testid="google-login"]';
    if (await this.isElementVisible(googleLoginButton)) {
      await this.clickElement(googleLoginButton);
      // Handle Google OAuth flow
      // This would need to be implemented based on the actual Google OAuth integration
    }
  }

  async loginWithKakao() {
    const kakaoLoginButton = '[data-testid="kakao-login"]';
    if (await this.isElementVisible(kakaoLoginButton)) {
      await this.clickElement(kakaoLoginButton);
      // Handle Kakao OAuth flow
      // This would need to be implemented based on the actual Kakao OAuth integration
    }
  }

  // Form validation helpers
  async checkFormValidation(field: string, expectedError: string) {
    const fieldSelector = field === 'email' ? testData.ui.selectors.emailInput :
                         field === 'password' ? testData.ui.selectors.passwordInput :
                         field === 'name' ? testData.ui.selectors.nameInput :
                         field === 'phone' ? testData.ui.selectors.phoneInput : '';
    
    if (fieldSelector) {
      await this.fillInput(fieldSelector, '');
      await this.submitSignup();
      
      // Check for validation error
      const errorText = await this.getErrorMessage();
      return errorText?.includes(expectedError) || false;
    }
    return false;
  }
}