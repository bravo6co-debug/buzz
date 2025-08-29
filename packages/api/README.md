# Buzz Platform API Server

Express + TypeScript 기반의 Buzz 플랫폼 백엔드 API 서버입니다.

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript (ES Modules)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with PostgreSQL store
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI 3.0
- **QR Code**: qrcode library
- **Security**: Helmet, CORS, Rate limiting

## 주요 기능

### 인증 시스템
- 세션 기반 인증 (JWT 대신 사용)
- 역할 기반 접근 제어 (user, business, admin)
- PostgreSQL 세션 저장소
- 비밀번호 해싱 (bcrypt)

### API 엔드포인트

#### 인증 API (`/api/auth`)
- `POST /signup` - 일반 사용자 회원가입
- `POST /business/signup` - 사업자 회원가입
- `POST /login` - 로그인
- `POST /logout` - 로그아웃
- `GET /me` - 현재 사용자 정보

#### 사용자 API (`/api/user`)
- `GET /profile` - 사용자 프로필
- `GET /dashboard` - 대시보드 정보
- `GET /mileage` - 마일리지 정보
- `GET /coupons` - 보유 쿠폰
- `GET /referrals` - 리퍼럴 성과

#### 리퍼럴 API (`/api/referrals`)
- `POST /link` - 리퍼럴 링크 생성
- `GET /stats` - 리퍼럴 성과 조회
- `POST /share-template` - SNS 공유 템플릿
- `GET /leaderboard` - 리퍼럴 리더보드

#### 마일리지 API (`/api/mileage`)
- `GET /balance` - 잔액 조회
- `GET /transactions` - 거래 내역
- `GET /qr` - 사용 QR 코드 생성
- `POST /use` - 마일리지 사용 (사업자용)
- `POST /verify-qr` - QR 검증 (사업자용)
- `POST /admin/adjust` - 관리자 조정

#### QR/쿠폰 API (`/api/coupons`, `/api/qr`)
- `GET /coupons` - 쿠폰 목록
- `POST /coupons/verify` - 쿠폰 검증 (사업자용)
- `POST /coupons/use` - 쿠폰 사용 (사업자용)
- `POST /coupons/issue` - 쿠폰 발급 (관리자용)
- `GET /qr/mileage` - 마일리지 QR 생성
- `GET /qr/coupon/:id` - 쿠폰 QR 생성

#### 매장 API (`/api/businesses`)
- `GET /` - 매장 목록
- `GET /featured` - 인기 매장
- `GET /:id` - 매장 상세
- `GET /:id/reviews` - 매장 리뷰
- `POST /:id/reviews` - 리뷰 작성
- `GET /my/profile` - 내 매장 정보 (사업자용)
- `PUT /my/profile` - 매장 정보 수정 (사업자용)

#### 사업자 API (`/api/business`)
- `GET /settlements` - 정산 내역
- `POST /settlement-request` - 정산 요청
- `GET /stats` - 매장 통계

#### 관리자 API (`/api/admin`)
- `GET /dashboard` - 관리자 대시보드
- `GET /users` - 사용자 목록
- `GET /businesses` - 매장 목록
- `POST /businesses/:id/approve` - 매장 승인
- `GET /settlements` - 정산 내역
- `POST /settlements/:id/process` - 정산 처리
- `GET /settings` - 시스템 설정
- `PUT /settings` - 설정 업데이트

#### 컨텐츠 API (`/api/contents`)
- `GET /regional` - 지역 추천 컨텐츠
- `GET /regional/:id` - 컨텐츠 상세
- `POST /regional` - 컨텐츠 생성 (관리자)
- `PUT /regional/:id` - 컨텐츠 수정 (관리자)
- `DELETE /regional/:id` - 컨텐츠 삭제 (관리자)

#### 이벤트 API (`/api/events`)
- `GET /active` - 진행 중인 이벤트
- `GET /` - 이벤트 목록
- `GET /:id` - 이벤트 상세
- `POST /` - 이벤트 생성 (관리자)
- `PUT /:id` - 이벤트 수정 (관리자)
- `POST /:id/toggle` - 이벤트 활성화/비활성화

## 설치 및 실행

### 1. 환경 설정

```bash
# 패키지 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
```

### 2. 환경 변수 구성

`.env` 파일에서 다음 변수들을 설정하세요:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/buzz_platform

# Session
SESSION_SECRET=your-super-secret-session-key

# URLs
API_BASE_URL=http://localhost:8083
FRONTEND_URL=https://buzz.namgu.kr
ALLOWED_ORIGINS=http://localhost:8010,http://localhost:8012,http://localhost:8013
```

### 3. 데이터베이스 설정

```bash
# 데이터베이스 마이그레이션 (database 패키지에서)
cd ../database
pnpm run migrate

# 시드 데이터 삽입
pnpm run seed
```

### 4. 서버 실행

```bash
# 개발 모드
pnpm run dev

# 프로덕션 빌드
pnpm run build

# 프로덕션 실행
pnpm run start
```

## API 문서

서버 실행 후 다음 URL에서 Swagger 문서를 확인할 수 있습니다:

- 개발: http://localhost:8083/docs
- 프로덕션: {API_BASE_URL}/docs

## 보안 기능

### 인증 및 인가
- 세션 기반 인증 시스템
- 역할 기반 접근 제어 (RBAC)
- CSRF 보호 (세션 기반)
- 보안 헤더 (Helmet)

### 데이터 보안
- 비밀번호 해싱 (bcrypt, salt rounds: 12)
- QR 코드 만료 시간 (10분)
- 개인정보 마스킹 (리뷰, 리퍼럴 등)

### API 보안
- Rate limiting (15분당 100 요청)
- CORS 설정
- 요청 크기 제한 (10MB)
- 입력값 검증 (Zod)

## 프로젝트 구조

```
src/
├── index.ts              # 메인 서버 파일
├── middleware/           # 미들웨어
│   ├── auth.ts          # 인증/인가 미들웨어
│   ├── validation.ts    # 유효성 검증 미들웨어
│   ├── errorHandler.ts  # 에러 처리 미들웨어
│   └── notFound.ts      # 404 처리
├── routes/              # API 라우트
│   ├── auth.ts          # 인증 라우트
│   ├── user.ts          # 사용자 라우트
│   ├── business.ts      # 매장 라우트
│   ├── mileage.ts       # 마일리지 라우트
│   ├── coupon.ts        # 쿠폰 라우트
│   ├── qr.ts           # QR 코드 라우트
│   ├── referral.ts      # 리퍼럴 라우트
│   ├── admin.ts         # 관리자 라우트
│   ├── content.ts       # 컨텐츠 라우트
│   └── event.ts         # 이벤트 라우트
└── schemas/             # 유효성 검증 스키마
    ├── common.ts        # 공통 스키마
    ├── auth.ts          # 인증 스키마
    ├── business.ts      # 매장 스키마
    ├── mileage.ts       # 마일리지 스키마
    ├── coupon.ts        # 쿠폰 스키마
    └── referral.ts      # 리퍼럴 스키마
```

## 개발 가이드

### API 응답 형식

성공 응답:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

에러 응답:
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }  // Optional error details
}
```

### 세션 데이터 구조

```typescript
interface SessionData {
  userId?: number;
  userRole?: 'user' | 'business' | 'admin';
}
```

### 미들웨어 사용

```typescript
import { requireAuth, requireRole, requireBusinessOwner } from '../middleware/auth.js';

// 로그인 필요
router.get('/protected', requireAuth, handler);

// 특정 역할 필요
router.get('/admin-only', requireRole(['admin']), handler);

// 사업자 또는 관리자만
router.get('/business', requireBusinessOwner, handler);
```

## 라이센스

이 프로젝트는 부산 남구청의 지역경제 활성화 프로젝트의 일환으로 개발되었습니다.