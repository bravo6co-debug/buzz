import { test, expect } from '@playwright/test';

test.describe('Enhanced Signup Page Tests', () => {
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

  test('should validate password complexity requirements', async ({ page }) => {
    // Test weak password
    await page.fill('input#password', 'weak');
    await page.fill('input#confirmPassword', 'weak');
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    
    // Should show error message for password requirements
    await expect(page.locator('text=비밀번호는 8자 이상 입력하세요')).toBeVisible();
  });

  test('should enforce strong password with complexity', async ({ page }) => {
    // Test password without special characters
    await page.fill('input#password', 'Password123');
    await page.fill('input#confirmPassword', 'Password123');
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    
    // Should show error message for missing special character
    await expect(page.locator('text=비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다')).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    // Test invalid phone number
    await page.fill('input#phone', '123456');
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'Password123!');
    await page.fill('input#confirmPassword', 'Password123!');
    
    await page.click('button[type="submit"]');
    
    // Should show error message for invalid phone format
    await expect(page.locator('text=올바른 휴대폰 번호 형식을 입력하세요')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    const confirmPasswordInput = page.locator('input#confirmPassword');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button for password
    const passwordToggle = page.locator('button[aria-label="비밀번호 보이기"]').first();
    await passwordToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(passwordToggle).toHaveAttribute('aria-label', '비밀번호 숨기기');
    
    // Click toggle button for confirm password
    const confirmToggle = page.locator('button[aria-label="비밀번호 확인 보이기"]').first();
    await confirmToggle.click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    await expect(confirmToggle).toHaveAttribute('aria-label', '비밀번호 확인 숨기기');
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'Password123!@#');
    await page.fill('input#confirmPassword', 'DifferentPassword123!');
    
    await page.click('button[type="submit"]');
    
    // Should show error message for password mismatch
    await expect(page.locator('text=비밀번호가 일치하지 않습니다')).toBeVisible();
  });

  test('should handle referral code from URL', async ({ page }) => {
    // Navigate with referral code
    await page.goto('/signup?ref=TEST123');
    await page.waitForLoadState('networkidle');
    
    // Check if referral code is auto-filled and field is disabled
    const referralInput = page.locator('input#referralCode');
    await expect(referralInput).toHaveValue('TEST123');
    await expect(referralInput).toBeDisabled();
    
    // Check if referral bonus message is displayed
    await expect(page.locator('text=리퍼럴 코드로 가입하면 3,000 마일리지를 받을 수 있어요!')).toBeVisible();
    await expect(page.locator('text=리퍼럴 코드가 자동으로 적용되었습니다!')).toBeVisible();
  });

  test('should display correct mileage rewards', async ({ page }) => {
    // Without referral code
    await expect(page.locator('text=1,000 마일리지').first()).toBeVisible();
    
    // Navigate with referral code
    await page.goto('/signup?ref=TEST123');
    await page.waitForLoadState('networkidle');
    
    // With referral code - should show 3,000 total
    await expect(page.locator('text=3,000 마일리지').first()).toBeVisible();
    await expect(page.locator('text=+2,000 마일리지')).toBeVisible();
  });

  test('should successfully submit valid signup form', async ({ page }) => {
    // Fill in valid data
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', `test${Date.now()}@example.com`);
    await page.fill('input#phone', '010-1234-5678');
    await page.fill('input#password', 'Password123!@#');
    await page.fill('input#confirmPassword', 'Password123!@#');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('button:has-text("가입 중...")')).toBeVisible();
    
    // Wait for response (may redirect or show success message)
    await page.waitForLoadState('networkidle');
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Block API requests to simulate network error
    await context.route('**/api/auth/signup', route => {
      route.abort('failed');
    });
    
    // Fill in valid data
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#phone', '010-1234-5678');
    await page.fill('input#password', 'Password123!@#');
    await page.fill('input#confirmPassword', 'Password123!@#');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.destructive')).toBeVisible();
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    // Check password toggle buttons have proper ARIA labels
    const passwordToggle = page.locator('button[aria-label="비밀번호 보이기"]').first();
    const confirmToggle = page.locator('button[aria-label="비밀번호 확인 보이기"]').first();
    
    await expect(passwordToggle).toBeVisible();
    await expect(confirmToggle).toBeVisible();
    
    // Check form inputs have proper labels
    await expect(page.locator('label[for="name"]')).toHaveText('이름');
    await expect(page.locator('label[for="email"]')).toHaveText('이메일');
    await expect(page.locator('label[for="password"]')).toHaveText('비밀번호');
    await expect(page.locator('label[for="confirmPassword"]')).toHaveText('비밀번호 확인');
  });

  test('should navigate to login page', async ({ page }) => {
    // Click login link
    await page.click('text=로그인하기');
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Referral System Navigation', () => {
  test('should navigate to referral hub without errors', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input#email', 'user@buzz.com');
    await page.fill('input#password', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Navigate to referral hub
    await page.goto('/referrals');
    await page.waitForLoadState('networkidle');
    
    // Should not have any console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);
    
    // Check that no routing errors occurred
    expect(consoleErrors.filter(err => err.includes('useNavigate'))).toHaveLength(0);
    expect(consoleErrors.filter(err => err.includes('Router'))).toHaveLength(0);
    
    // Check that page loaded correctly
    await expect(page.locator('h1, h2').filter({ hasText: /리퍼럴|추천/ })).toBeVisible();
  });
});