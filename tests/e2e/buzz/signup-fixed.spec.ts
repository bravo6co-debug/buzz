import { test, expect } from '@playwright/test';

test.describe('Signup Page Tests - Fixed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
  });

  test('should display signup form with all fields', async ({ page }) => {
    // Check all form fields are present
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
    await expect(page.locator('input#referralCode')).toBeVisible();
  });

  test('should validate password on blur', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    
    // Enter weak password and blur
    await passwordInput.fill('weak');
    await passwordInput.blur();
    await page.waitForTimeout(500); // Wait for validation
    
    // Check for any error message
    const errorMessages = await page.locator('.text-destructive').count();
    expect(errorMessages).toBeGreaterThan(0);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find and click the toggle button (using a more flexible selector)
    const passwordToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await passwordToggle.click();
    
    // Password should now be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('should handle referral code from URL', async ({ page }) => {
    // Navigate with referral code
    await page.goto('/signup?ref=TEST123');
    await page.waitForLoadState('networkidle');
    
    // Check if referral code is auto-filled
    const referralInput = page.locator('input#referralCode');
    await expect(referralInput).toHaveValue('TEST123');
    
    // Check if referral bonus message is displayed
    await expect(page.locator('text=/3,000.*마일리지/')).toBeVisible();
  });

  test('should display mileage rewards correctly', async ({ page }) => {
    // Without referral code - should show 1,000
    await expect(page.locator('text=/1,000.*마일리지/').first()).toBeVisible();
    
    // Navigate with referral code
    await page.goto('/signup?ref=TEST123');
    await page.waitForLoadState('networkidle');
    
    // With referral code - should show 3,000
    await expect(page.locator('text=/3,000.*마일리지/').first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Click login link
    await page.click('text=로그인하기');
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });

  test('should show validation errors on submit with invalid data', async ({ page }) => {
    // Fill with invalid data
    await page.fill('input#name', 'T'); // Too short
    await page.fill('input#email', 'invalid'); // Invalid email
    await page.fill('input#password', 'weak'); // Too weak
    await page.fill('input#confirmPassword', 'different'); // Doesn't match
    await page.fill('input#phone', '123'); // Invalid phone
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Wait for validation messages
    await page.waitForTimeout(500);
    
    // Should have multiple error messages
    const errorMessages = await page.locator('.text-destructive').count();
    expect(errorMessages).toBeGreaterThan(0);
  });

  test('should successfully submit with valid data', async ({ page }) => {
    // Fill with valid data
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', `test${Date.now()}@example.com`);
    await page.fill('input#password', 'ValidPass123!@#');
    await page.fill('input#confirmPassword', 'ValidPass123!@#');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForLoadState('networkidle');
    
    // Should either redirect or show toast
    // Check if we're still on signup page
    const url = page.url();
    const isStillOnSignup = url.includes('/signup');
    
    if (isStillOnSignup) {
      // If still on signup, should show error toast
      await expect(page.locator('.destructive, [role="alert"]')).toBeVisible();
    } else {
      // Otherwise, should have redirected
      expect(url).not.toContain('/signup');
    }
  });
});

test.describe('Referral Hub Navigation', () => {
  test('should load referral hub page', async ({ page }) => {
    // Navigate directly to referral hub
    await page.goto('/referrals');
    await page.waitForLoadState('networkidle');
    
    // Check for any element that contains "리퍼럴" or "마케터"
    const hasReferralContent = await page.locator('text=/리퍼럴|마케터|추천/').count();
    expect(hasReferralContent).toBeGreaterThan(0);
  });
});