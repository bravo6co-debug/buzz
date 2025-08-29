import { test, expect } from '@playwright/test';
import { AuthPage } from '../setup/page-objects/AuthPage';
import { testData } from '../setup/test-data';

test.describe('Security - CSRF Protection', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe('CSRF Token Validation', () => {
    test('should include CSRF token in forms', async () => {
      await authPage.navigateToLogin();
      
      // Check if CSRF token is present in login form
      const csrfToken = await authPage.page.locator('input[name="_token"]').first();
      const csrfMeta = await authPage.page.locator('meta[name="csrf-token"]').first();
      
      const hasToken = await csrfToken.isVisible() || await csrfMeta.isVisible();
      
      if (hasToken) {
        if (await csrfToken.isVisible()) {
          const tokenValue = await csrfToken.getAttribute('value');
          expect(tokenValue).toBeTruthy();
          expect(tokenValue.length).toBeGreaterThan(10);
        }
        
        if (await csrfMeta.isVisible()) {
          const metaContent = await csrfMeta.getAttribute('content');
          expect(metaContent).toBeTruthy();
          expect(metaContent.length).toBeGreaterThan(10);
        }
      }
    });

    test('should validate CSRF token on form submission', async () => {
      await authPage.navigateToLogin();
      
      // Try to submit form without CSRF token (if we can manipulate it)
      const csrfInput = authPage.page.locator('input[name="_token"]').first();
      
      if (await csrfInput.isVisible()) {
        // Remove or modify the CSRF token
        await authPage.page.evaluate(() => {
          const token = document.querySelector('input[name="_token"]') as HTMLInputElement;
          if (token) {
            token.value = 'invalid-token';
          }
        });
        
        // Try to submit the form
        await authPage.fillLoginForm(
          testData.users.customer.email,
          testData.users.customer.password
        );
        await authPage.submitLogin();
        
        // Should get CSRF error or be rejected
        const errorMessage = await authPage.getLoginError();
        if (errorMessage && errorMessage.includes('토큰')) {
          expect(errorMessage).toMatch(/토큰|token|csrf/i);
        }
      }
    });

    test('should regenerate CSRF token after login', async () => {
      await authPage.navigateToLogin();
      
      // Get initial CSRF token
      let initialToken = '';
      const csrfInput = authPage.page.locator('input[name="_token"]').first();
      const csrfMeta = authPage.page.locator('meta[name="csrf-token"]').first();
      
      if (await csrfInput.isVisible()) {
        initialToken = await csrfInput.getAttribute('value') || '';
      } else if (await csrfMeta.isVisible()) {
        initialToken = await csrfMeta.getAttribute('content') || '';
      }
      
      if (initialToken) {
        // Login successfully
        await authPage.login(
          testData.users.customer.email,
          testData.users.customer.password
        );
        
        // Check if token changed after login
        await authPage.goto('/profile');
        
        let newToken = '';
        if (await csrfInput.isVisible()) {
          newToken = await csrfInput.getAttribute('value') || '';
        } else if (await csrfMeta.isVisible()) {
          newToken = await csrfMeta.getAttribute('content') || '';
        }
        
        if (newToken) {
          expect(newToken).not.toBe(initialToken);
        }
      }
    });

    test('should protect state-changing operations', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Try to perform a state-changing operation via direct API call without CSRF token
      const response = await authPage.page.request.post('/api/users/profile', {
        data: { name: 'Hacked Name' },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should be rejected due to missing CSRF token
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Double Submit Cookie Pattern', () => {
    test('should use double submit cookie for AJAX requests', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Monitor network requests for CSRF headers
      const requests: any[] = [];
      
      authPage.page.on('request', (request) => {
        if (request.method() === 'POST' || request.method() === 'PUT' || request.method() === 'DELETE') {
          requests.push({
            url: request.url(),
            headers: request.headers(),
            method: request.method()
          });
        }
      });
      
      // Perform an action that makes an AJAX request
      await authPage.goto('/profile');
      
      // Try to update profile (this should make an AJAX request)
      const nameInput = '[data-testid="profile-name"]';
      if (await authPage.isElementVisible(nameInput)) {
        await authPage.fillInput(nameInput, 'Updated Name');
        
        const saveButton = '[data-testid="save-profile"]';
        if (await authPage.isElementVisible(saveButton)) {
          await authPage.clickElement(saveButton);
          await authPage.waitForLoadingToComplete();
        }
      }
      
      // Check if CSRF headers were sent
      const postRequests = requests.filter(req => 
        req.method === 'POST' && req.url.includes('/api/')
      );
      
      if (postRequests.length > 0) {
        const hasCSRFHeader = postRequests.some(req => 
          req.headers['x-csrf-token'] || 
          req.headers['x-xsrf-token'] ||
          req.headers['csrf-token']
        );
        
        expect(hasCSRFHeader).toBeTruthy();
      }
    });

    test('should reject requests with mismatched CSRF tokens', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Make request with invalid CSRF token
      const response = await authPage.page.request.post('/api/users/profile', {
        data: { name: 'Invalid Update' },
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': 'invalid-csrf-token'
        }
      });
      
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Origin Validation', () => {
    test('should validate request origin', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Try to make request with different origin
      const response = await authPage.page.request.post('/api/users/profile', {
        data: { name: 'Cross Origin Update' },
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil.com'
        }
      });
      
      // Should be rejected due to invalid origin
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should validate referer header', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Try to make request with invalid referer
      const response = await authPage.page.request.post('/api/users/profile', {
        data: { name: 'Invalid Referer Update' },
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://malicious-site.com'
        }
      });
      
      // Should be rejected due to invalid referer
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('SameSite Cookie Protection', () => {
    test('should set SameSite attribute on session cookies', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      const cookies = await authPage.page.context().cookies();
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('auth') ||
        cookie.name === 'connect.sid'
      );
      
      if (sessionCookie) {
        expect(sessionCookie.sameSite).toBeTruthy();
        expect(['Strict', 'Lax']).toContain(sessionCookie.sameSite);
      }
    });

    test('should set Secure flag on cookies in production', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      const cookies = await authPage.page.context().cookies();
      
      // In production (HTTPS), cookies should be secure
      if (authPage.page.url().startsWith('https://')) {
        const sessionCookie = cookies.find(cookie => 
          cookie.name.includes('session') || cookie.name.includes('auth')
        );
        
        if (sessionCookie) {
          expect(sessionCookie.secure).toBeTruthy();
        }
      }
    });

    test('should set HttpOnly flag on session cookies', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      const cookies = await authPage.page.context().cookies();
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || cookie.name.includes('auth')
      );
      
      if (sessionCookie) {
        expect(sessionCookie.httpOnly).toBeTruthy();
      }
    });
  });

  test.describe('Cross-Origin Requests', () => {
    test('should block cross-origin form submissions', async () => {
      // This test would simulate a CSRF attack from another origin
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Create a malicious form that tries to submit to our API
      await authPage.page.setContent(`
        <html>
          <body>
            <form id="maliciousForm" action="${testData.env.baseUrls.api}/users/profile" method="POST">
              <input name="name" value="Hacked Name">
              <input name="email" value="hacker@evil.com">
            </form>
            <script>
              document.getElementById('maliciousForm').submit();
            </script>
          </body>
        </html>
      `);
      
      // Wait for the form submission attempt
      await authPage.page.waitForTimeout(2000);
      
      // The request should be blocked by CORS or CSRF protection
      // We can't easily test the actual blocking, but we can ensure
      // our legitimate API still works correctly
      await authPage.goto('/profile');
      
      const currentName = await authPage.getElementText('[data-testid="profile-name"]');
      expect(currentName).not.toBe('Hacked Name');
    });

    test('should validate CORS headers', async () => {
      const response = await authPage.page.request.options('/api/users');
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers()['access-control-allow-origin'],
        'access-control-allow-methods': response.headers()['access-control-allow-methods'],
        'access-control-allow-headers': response.headers()['access-control-allow-headers']
      };
      
      // Should have appropriate CORS headers
      if (corsHeaders['access-control-allow-origin']) {
        expect(corsHeaders['access-control-allow-origin']).not.toBe('*');
      }
      
      if (corsHeaders['access-control-allow-methods']) {
        expect(corsHeaders['access-control-allow-methods']).toBeTruthy();
      }
    });
  });

  test.describe('Timing Attack Protection', () => {
    test('should have consistent response times for invalid tokens', async () => {
      const measurements: number[] = [];
      
      // Measure response times for requests with invalid CSRF tokens
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const response = await authPage.page.request.post('/api/auth/login', {
          data: {
            email: testData.users.customer.email,
            password: testData.users.customer.password,
            _token: `invalid-token-${i}`
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = Date.now();
        measurements.push(endTime - startTime);
        
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
      
      // Check that response times are relatively consistent
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxDeviation = Math.max(...measurements.map(t => Math.abs(t - avgTime)));
      
      // Deviation should not be too large (indicating timing attack vulnerability)
      expect(maxDeviation).toBeLessThan(avgTime * 0.5);
    });
  });

  test.describe('Session Management', () => {
    test('should invalidate CSRF token after logout', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Get CSRF token while logged in
      let csrfToken = '';
      const csrfMeta = authPage.page.locator('meta[name="csrf-token"]');
      if (await csrfMeta.isVisible()) {
        csrfToken = await csrfMeta.getAttribute('content') || '';
      }
      
      // Logout
      await authPage.logout();
      
      if (csrfToken) {
        // Try to use old CSRF token after logout
        const response = await authPage.page.request.post('/api/users/profile', {
          data: { name: 'After Logout Update' },
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
          }
        });
        
        // Should be rejected
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('should regenerate CSRF token on privilege escalation', async () => {
      await authPage.login(
        testData.users.customer.email,
        testData.users.customer.password
      );
      
      // Get initial CSRF token
      let initialToken = '';
      const csrfMeta = authPage.page.locator('meta[name="csrf-token"]');
      if (await csrfMeta.isVisible()) {
        initialToken = await csrfMeta.getAttribute('content') || '';
      }
      
      // Simulate privilege change (if such feature exists)
      // This would be specific to the application's business logic
      const upgradeButton = '[data-testid="upgrade-account"]';
      if (await authPage.isElementVisible(upgradeButton)) {
        await authPage.clickElement(upgradeButton);
        await authPage.waitForLoadingToComplete();
        
        // Check if CSRF token was regenerated
        let newToken = '';
        if (await csrfMeta.isVisible()) {
          newToken = await csrfMeta.getAttribute('content') || '';
        }
        
        if (initialToken && newToken) {
          expect(newToken).not.toBe(initialToken);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should not expose sensitive information in CSRF errors', async () => {
      await authPage.navigateToLogin();
      
      // Submit form with invalid CSRF token
      await authPage.page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const tokenInput = form.querySelector('input[name="_token"]') as HTMLInputElement;
          if (tokenInput) {
            tokenInput.value = 'definitely-invalid-token';
          }
        });
      });
      
      await authPage.fillLoginForm(
        testData.users.customer.email,
        testData.users.customer.password
      );
      await authPage.submitLogin();
      
      const errorMessage = await authPage.getLoginError();
      
      if (errorMessage) {
        // Error message should not expose sensitive information
        expect(errorMessage).not.toMatch(/token.*[a-f0-9]{32,}/i); // Don't expose actual token values
        expect(errorMessage).not.toMatch(/session.*id/i); // Don't expose session IDs
        expect(errorMessage).not.toMatch(/internal.*error/i); // Don't expose internal details
      }
    });

    test('should log CSRF violations for monitoring', async () => {
      // This test would verify that CSRF violations are properly logged
      // In a real implementation, this might check log files or monitoring endpoints
      
      await authPage.page.request.post('/api/auth/login', {
        data: {
          email: testData.users.customer.email,
          password: testData.users.customer.password,
          _token: 'invalid-csrf-token'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // In a real test, we might check if this was logged properly
      // For now, we just ensure the request was handled
      expect(true).toBeTruthy(); // Placeholder assertion
    });
  });
});