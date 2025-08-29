# Buzz Platform E2E Testing Suite

이 문서는 Buzz Platform의 종단간(E2E) 테스트 스위트에 대한 종합 가이드입니다.

## 🎯 테스트 개요

Buzz Platform E2E 테스트는 다음 세 가지 앱의 핵심 기능을 검증합니다:

- **Buzz App** (고객용): 회원가입/로그인, 마일리지 시스템, 리퍼럴 시스템
- **Buzz-Biz App** (사업자용): 사업자 등록, QR 코드 관리, 고객 관리, 정산
- **Buzz-Admin App** (관리자용): 사용자 관리, 사업자 승인, 시스템 관리

## 📁 테스트 구조

```
tests/
├── e2e/
│   ├── setup/
│   │   ├── global-setup.ts           # 전역 테스트 환경 설정
│   │   ├── test-data.ts              # 테스트 데이터 및 헬퍼 함수
│   │   └── page-objects/             # 페이지 오브젝트 모델
│   │       ├── BasePage.ts           # 기본 페이지 클래스
│   │       ├── AuthPage.ts           # 인증 관련 페이지
│   │       ├── MileagePage.ts        # 마일리지 페이지
│   │       ├── ReferralPage.ts       # 리퍼럴 페이지
│   │       └── BusinessPage.ts       # 비즈니스 페이지
│   ├── buzz/                         # 고객 앱 테스트
│   │   ├── auth.spec.ts              # 인증 테스트
│   │   ├── mileage.spec.ts           # 마일리지 시스템 테스트
│   │   └── referral.spec.ts          # 리퍼럴 시스템 테스트
│   ├── buzz-biz/                     # 사업자 앱 테스트
│   │   └── business-registration.spec.ts  # 사업자 등록 테스트
│   ├── buzz-admin/                   # 관리자 앱 테스트
│   ├── security/                     # 보안 테스트
│   │   └── csrf.spec.ts              # CSRF 보호 테스트
│   └── critical/                     # 핵심 기능 테스트
│       └── core-functionality.spec.ts # 크리티컬 패스 테스트
├── playwright.config.ts             # Playwright 설정
└── README.md                         # 이 파일
```

## 🚀 테스트 실행 방법

### 전체 E2E 테스트 실행
```bash
pnpm test:e2e
```

### 특정 앱 테스트 실행
```bash
# Buzz 앱 (고객용) 테스트
pnpm test:e2e:buzz

# Buzz-Biz 앱 (사업자용) 테스트
pnpm test:e2e:buzz-biz

# Buzz-Admin 앱 (관리자용) 테스트
pnpm test:e2e:buzz-admin
```

### 개발 모드 테스트 실행
```bash
# 브라우저 UI와 함께 실행
pnpm test:e2e:headed

# Playwright UI 모드 실행
pnpm test:e2e:ui

# 디버그 모드 실행
pnpm test:e2e:debug
```

### 특수 테스트 실행
```bash
# 모바일 테스트
pnpm test:e2e:mobile

# 크로스 브라우저 테스트 (Firefox)
pnpm test:e2e:critical

# 보안 테스트
pnpm test:e2e:security
```

### 테스트 리포트 확인
```bash
pnpm test:e2e:report
```

## 🎨 테스트 카테고리

### 1. 인증 테스트 (buzz/auth.spec.ts)
- 사용자 로그인/로그아웃
- 회원가입 (일반 및 리퍼럴)
- 비밀번호 찾기
- 세션 관리
- 폼 유효성 검사

### 2. 마일리지 시스템 테스트 (buzz/mileage.spec.ts)
- 마일리지 잔액 표시
- QR 코드 생성 및 관리
- 마일리지 적립/사용
- 쿠폰 교환
- 거래 내역 조회
- 통계 및 분석

### 3. 리퍼럴 시스템 테스트 (buzz/referral.spec.ts)
- 리퍼럴 코드 생성/관리
- 리퍼럴 링크 생성 및 공유
- 리퍼럴 프로세스 (추천/가입)
- 보상 시스템
- 리더보드 및 순위
- 월간 랭킹 이벤트
- UTM 트래킹

### 4. 사업자 등록 테스트 (buzz-biz/business-registration.spec.ts)
- 사업자 계정 생성
- 사업자 정보 등록 및 검증
- 승인/반려 프로세스
- QR 코드 관리
- 고객 관리
- 리뷰 관리
- 정산 시스템

### 5. 보안 테스트 (security/csrf.spec.ts)
- CSRF 토큰 검증
- 세션 보안
- 쿠키 보안 설정
- 크로스 오리진 요청 보호
- 타이밍 공격 방어

### 6. 핵심 기능 테스트 (critical/core-functionality.spec.ts)
- 전체 사용자 여정
- 시스템 상태 확인
- 성능 크리티컬 패스
- 데이터 무결성
- 에러 복구
- 모바일 기능

## 📋 테스트 데이터 관리

### 테스트 사용자 계정
```typescript
testData.users = {
  customer: {
    email: 'test.customer@buzz.test',
    password: 'TestPass123!',
    name: '김테스트'
  },
  business: {
    email: 'test.business@buzz.test',
    password: 'TestPass123!',
    name: '사업자테스트',
    businessName: '테스트 카페'
  },
  admin: {
    email: 'admin@buzz.test',
    password: 'AdminPass123!',
    name: '관리자'
  }
}
```

### 동적 테스트 데이터 생성
```typescript
// 고유한 사용자 데이터 생성
const newUser = generateTestUser('prefix');

// 비즈니스 데이터 생성
const businessData = generateBusinessData('business-name');

// 리퍼럴 코드 생성
const referralCode = generateReferralCode('사용자명');
```

## 🎯 페이지 오브젝트 모델

각 페이지에 대한 재사용 가능한 페이지 오브젝트를 제공합니다:

### BasePage
- 공통 기능 (클릭, 입력, 대기 등)
- 에러/성공 메시지 처리
- 스크린샷 캡처

### AuthPage
- 로그인/로그아웃 기능
- 회원가입 기능
- 세션 관리

### MileagePage
- 마일리지 관련 모든 기능
- QR 코드 생성/관리
- 거래 내역 조회

### ReferralPage
- 리퍼럴 시스템 전체 기능
- 통계 및 분석
- 이벤트 참여

### BusinessPage
- 사업자 등록 및 관리
- QR 코드 관리
- 고객 및 리뷰 관리
- 정산 시스템

## 🏃‍♂️ 테스트 실행 환경

### 로컬 개발 환경
```bash
# 서버 시작
pnpm dev

# 테스트 실행
pnpm test:e2e
```

### CI/CD 환경
- GitHub Actions 또는 기타 CI 시스템에서 자동 실행
- 헤드리스 모드로 실행
- 테스트 결과 리포트 생성
- 실패 시 스크린샷 및 비디오 캡처

### 브라우저 지원
- **Chrome**: 기본 테스트 브라우저
- **Firefox**: 크로스 브라우저 테스트
- **Safari**: 크로스 브라우저 테스트 (macOS)
- **Mobile**: 모바일 반응형 테스트

## ⚙️ 설정 및 구성

### Playwright 설정 (playwright.config.ts)
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  projects: [
    { name: 'buzz-chrome' },      // Buzz 앱 - Chrome
    { name: 'buzz-mobile' },      // Buzz 앱 - 모바일
    { name: 'buzz-biz-chrome' },  // Buzz-Biz 앱 - Chrome
    { name: 'buzz-admin-chrome' }, // Buzz-Admin 앱 - Chrome
    { name: 'cross-browser-firefox' } // 크로스 브라우저 테스트
  ],
  
  webServer: [
    { command: 'pnpm --filter=buzz dev', port: 8106 },
    { command: 'pnpm --filter=buzz-biz dev', port: 8105 },
    { command: 'pnpm --filter=buzz-admin dev', port: 8104 },
    { command: 'pnpm --filter=@buzz/api dev', port: 8083 }
  ]
});
```

### 환경 변수
- `NODE_ENV`: 실행 환경 (development/test/production)
- `BASE_URL`: 애플리케이션 기본 URL
- `API_URL`: API 서버 URL
- `HEADLESS`: 헤드리스 모드 실행 여부

## 📊 테스트 리포팅

### HTML 리포트
```bash
pnpm test:e2e:report
```
- 상세한 테스트 결과
- 실행 시간 및 통계
- 실패한 테스트의 스크린샷 및 비디오

### JUnit XML 리포트
- CI/CD 시스템 통합을 위한 XML 형식 리포트
- 테스트 결과 트렌드 분석

## 🐛 테스트 디버깅

### 디버그 모드 실행
```bash
pnpm test:e2e:debug
```

### 스크린샷 및 비디오
- 실패한 테스트의 자동 스크린샷 캡처
- 테스트 실행 비디오 녹화 (설정 시)
- 트레이스 파일 생성

### 로깅
- 상세한 브라우저 콘솔 로그
- 네트워크 요청/응답 로그
- 테스트 실행 단계별 로그

## 📈 모범 사례

### 1. 테스트 작성 가이드라인
- **독립성**: 각 테스트는 서로 독립적이어야 함
- **안정성**: 플레이키 테스트 방지를 위한 적절한 대기
- **가독성**: 명확하고 설명적인 테스트 이름
- **유지보수성**: 페이지 오브젝트 모델 사용

### 2. 데이터 관리
- 테스트 데이터는 격리되어야 함
- 각 테스트 실행 시 고유한 데이터 사용
- 테스트 후 데이터 정리 (필요시)

### 3. 성능 고려사항
- 병렬 실행을 통한 테스트 시간 단축
- 필요한 경우에만 전체 페이지 로드
- 적절한 타임아웃 설정

### 4. 보안 테스트
- 인증 및 권한 검증
- 입력 유효성 검사
- CSRF 및 XSS 방어 확인

## 🔧 트러블슈팅

### 자주 발생하는 문제

1. **서버 시작 실패**
   ```bash
   # 포트 충돌 확인
   lsof -i :8083,8104,8105,8106
   
   # 프로세스 종료
   kill -9 [PID]
   ```

2. **테스트 타임아웃**
   - 네트워크 연결 확인
   - 서버 응답 시간 확인
   - 타임아웃 설정 조정

3. **브라우저 실행 오류**
   ```bash
   # Playwright 브라우저 재설치
   npx playwright install
   ```

4. **파일 권한 문제**
   ```bash
   # 테스트 디렉토리 권한 확인
   chmod -R 755 tests/
   ```

## 📚 추가 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [테스트 전략 가이드](https://martinfowler.com/articles/practical-test-pyramid.html)
- [페이지 오브젝트 모델](https://playwright.dev/docs/pom)
- [E2E 테스트 모범 사례](https://docs.cypress.io/guides/references/best-practices)

## 📞 지원

테스트 관련 문제나 질문이 있으시면:
- 이슈 트래커에 문제 보고
- 개발팀에 문의
- 문서 업데이트 제안

---

이 E2E 테스트 스위트는 Buzz Platform의 안정성과 품질을 보장하는 핵심 구성 요소입니다. 지속적인 유지보수와 개선을 통해 더 나은 사용자 경험을 제공할 수 있습니다.