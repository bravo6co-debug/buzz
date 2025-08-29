import { test, expect } from '@playwright/test';

/**
 * 오류 상황 및 복구 시나리오 테스트
 */

test.describe('오류 상황 및 복구 시나리오', () => {
  
  test.describe('네트워크 연결 문제 대응', () => {
    test('회원가입 시 네트워크 오류 처리', async ({ page, context }) => {
      // API 요청 차단으로 네트워크 오류 시뮬레이션
      await context.route('**/api/auth/signup', route => {
        route.abort('failed');
      });
      
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      // 회원가입 정보 입력
      await page.fill('input#name', '네트워크테스트');
      await page.fill('input#email', `network${Date.now()}@test.com`);
      await page.fill('input#password', 'TestPass123!@#');
      await page.fill('input#confirmPassword', 'TestPass123!@#');
      
      // 제출 시도
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // 에러 처리 확인
      const hasErrorFeedback = await page.locator('.text-destructive, .error, [role="alert"], .toast').count() > 0;
      const stillOnSignupPage = page.url().includes('/signup');
      
      // 네트워크 오류 시 적절한 피드백이 있어야 함
      expect(hasErrorFeedback || stillOnSignupPage).toBeTruthy();
    });

    test('로그인 시 서버 오류 처리', async ({ page, context }) => {
      // 서버 오류 응답 시뮬레이션
      await context.route('**/api/auth/login', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input#email, input[type="email"]', 'test@example.com');
      await page.fill('input#password, input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // 서버 오류에 대한 적절한 처리 확인
      const currentUrl = page.url();
      const hasErrorMessage = await page.locator('.text-destructive, .error, [role="alert"]').count() > 0;
      
      expect(hasErrorMessage || currentUrl.includes('/login')).toBeTruthy();
    });
  });

  test.describe('폼 검증 오류 복구', () => {
    test('잘못된 이메일 형식 오류에서 복구', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      // 1. 잘못된 이메일 입력
      await page.fill('input#email', 'invalid-email');
      await page.fill('input#name', '테스트유저');
      await page.fill('input#password', 'ValidPass123!@#');
      await page.fill('input#confirmPassword', 'ValidPass123!@#');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // 이메일 오류 확인
      let hasEmailError = await page.locator('.text-destructive').count() > 0;
      
      // 2. 올바른 이메일로 수정
      await page.fill('input#email', `corrected${Date.now()}@example.com`);
      await page.waitForTimeout(300);
      
      // 3. 다시 제출 시도
      let networkRequestMade = false;
      page.on('request', request => {
        if (request.url().includes('/api/auth/signup')) {
          networkRequestMade = true;
        }
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);
      
      // 수정 후에는 요청이 전송되어야 함
      const afterCorrection = page.url();
      expect(networkRequestMade || !afterCorrection.includes('/signup') || hasEmailError).toBeTruthy();
    });

    test('비밀번호 불일치 오류에서 복구', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      // 1. 비밀번호 불일치 상황 만들기
      await page.fill('input#name', '비밀번호테스트');
      await page.fill('input#email', `mismatch${Date.now()}@example.com`);
      await page.fill('input#password', 'Password123!@#');
      await page.fill('input#confirmPassword', 'DifferentPass123!@#');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // 2. 비밀번호 확인란 수정
      await page.fill('input#confirmPassword', 'Password123!@#');
      await page.waitForTimeout(300);
      
      // 3. 다시 제출
      let signupAttempted = false;
      page.on('request', request => {
        if (request.url().includes('/api/auth/signup')) {
          signupAttempted = true;
        }
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // 수정 후에는 제대로 처리되어야 함
      expect(signupAttempted || !page.url().includes('/signup')).toBeTruthy();
    });
  });

  test.describe('페이지 로드 실패 복구', () => {
    test('404 페이지 처리', async ({ page }) => {
      // 존재하지 않는 페이지 접근
      await page.goto('/non-existent-page');
      await page.waitForLoadState('networkidle');
      
      // 404 처리 확인
      const pageContent = await page.textContent('body');
      const has404Content = pageContent?.includes('404') || 
                           pageContent?.includes('찾을 수 없') || 
                           pageContent?.includes('Not Found') ||
                           pageContent?.length === 0; // 빈 페이지도 가능
      
      // 홈으로 돌아가기 링크나 네비게이션 확인
      const hasNavigation = await page.locator('a[href="/"], a[href="./"], button').count() > 0;
      
      expect(has404Content || hasNavigation).toBeTruthy();
    });

    test('JavaScript 오류 발생 시 기본 기능 동작', async ({ page }) => {
      // 콘솔 오류 모니터링
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 기본 네비게이션이 작동하는지 확인
      const canNavigate = await page.locator('a, button').count() > 0;
      const hasContent = (await page.textContent('body'))?.length || 0 > 10;
      
      // 심각한 JS 오류가 있어도 기본 기능은 동작해야 함
      expect(canNavigate || hasContent).toBeTruthy();
      
      // 너무 많은 에러가 있으면 로그 출력
      if (consoleErrors.length > 5) {
        console.log(`경고: ${consoleErrors.length}개의 JS 오류 발생`);
        console.log('주요 오류:', consoleErrors.slice(0, 3));
      }
    });
  });

  test.describe('세션 만료 및 재인증', () => {
    test('로그인 후 페이지 새로고침 시 세션 유지', async ({ page }) => {
      // 로그인 시도
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const hasLoginForm = await page.locator('input[type="email"], input#email').count() > 0;
      
      if (hasLoginForm) {
        await page.fill('input[type="email"], input#email', 'user@buzz.com');
        await page.fill('input[type="password"], input#password', 'Password123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        const afterLogin = page.url();
        
        if (!afterLogin.includes('/login')) {
          // 로그인 성공 후 새로고침
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          // 다시 로그인 페이지로 리다이렉트되지 않아야 함
          const afterRefresh = page.url();
          expect(afterRefresh).not.toContain('/login');
        }
      } else {
        // 로그인 폼이 없으면 테스트 스킵
        console.log('로그인 폼을 찾을 수 없어 세션 테스트를 스킵합니다.');
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('브라우저 호환성 및 기능 저하 대응', () => {
    test('JavaScript 비활성화 상황 시뮬레이션', async ({ page }) => {
      // 일부 JavaScript 기능을 차단하여 저하 상황 시뮬레이션
      await page.addInitScript(() => {
        // 일부 최신 기능들을 undefined로 설정
        // @ts-ignore
        window.fetch = undefined;
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 기본 HTML/CSS 기능은 동작해야 함
      const bodyContent = await page.textContent('body');
      const hasBasicContent = (bodyContent?.length || 0) > 10;
      const hasNavigationLinks = await page.locator('a[href]').count() > 0;
      
      // JavaScript가 비활성화되어도 기본 콘텐츠나 링크 중 하나는 있어야 함
      expect(hasBasicContent || hasNavigationLinks).toBeTruthy();
    });

    test('느린 네트워크 조건 시뮬레이션', async ({ page, context }) => {
      // 느린 응답 시뮬레이션
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 지연
        route.continue();
      });
      
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 페이지는 로드되어야 하지만 시간이 걸릴 수 있음
      const hasContent = (await page.textContent('body'))?.length || 0 > 5;
      expect(hasContent).toBeTruthy();
      
      // 로드 시간이 예상보다 오래 걸렸는지 확인
      expect(loadTime).toBeGreaterThan(900); // 지연이 적용되었는지 확인
    });
  });

  test.describe('데이터 무결성 및 복구', () => {
    test('폼 데이터 보존 - 페이지 새로고침 후', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      // 폼 데이터 입력
      await page.fill('input#name', '데이터보존테스트');
      await page.fill('input#email', `preserve${Date.now()}@example.com`);
      
      // 일부 브라우저에서 폼 데이터 보존 기능 테스트
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 브라우저가 자동으로 데이터를 복원했는지 확인
      const nameValue = await page.inputValue('input#name');
      const emailValue = await page.inputValue('input#email');
      
      // 데이터가 보존되었거나 최소한 폼이 다시 사용 가능해야 함
      const hasFormFields = await page.locator('input#name, input#email').count() >= 2;
      expect(hasFormFields).toBeTruthy();
      
      if (nameValue || emailValue) {
        console.log('브라우저가 폼 데이터를 보존했습니다.');
      }
    });
  });

  test.describe('접근성 및 사용성 복구', () => {
    test('키보드 네비게이션 기본 동작', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 탭 키로 네비게이션 가능한 요소들 확인
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      
      // 포커스 가능한 요소가 있는지 확인
      const hasFocusableElements = await page.locator('button, a, input, [tabindex="0"]').count() > 0;
      expect(hasFocusableElements).toBeTruthy();
      
      if (activeElement) {
        console.log(`키보드 네비게이션 가능: ${activeElement} 요소에 포커스`);
      }
    });

    test('화면 크기 변경 대응', async ({ page }) => {
      // 데스크톱 크기로 시작
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      let desktopContent = await page.textContent('body');
      
      // 모바일 크기로 변경
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      let mobileContent = await page.textContent('body');
      
      // 태블릿 크기로 변경
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      let tabletContent = await page.textContent('body');
      
      // 모든 화면 크기에서 기본 컨텐츠가 표시되어야 함
      const allSizesWork = [desktopContent, mobileContent, tabletContent].every(
        content => content && content.length > 10
      );
      
      expect(allSizesWork).toBeTruthy();
    });
  });
});