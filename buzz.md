# Buzz 플랫폼 - 개발 명세서

## 📋 프로젝트 개요

### 목적
정부 주도 지역경제 활성화를 위한 선순환 바이럴 마케팅 시스템
- 대학생들을 시드로 한 바이럴 마케팅으로 관광객 유치
- 리퍼럴 시스템을 통한 자발적 홍보 생태계 구축
- 마일리지 시스템을 통한 실질적 혜택 제공

### 시스템 구성
1. 🏠 **buzz** (모바일웹) - 일반 사용자용 플랫폼
2. 🏪 **buzz비즈** (모바일앱) - 매장 사업자용 앱  
3. 🏢 **buzz관리자** (관리자 웹) - 정부 관리자용 시스템

## 🏗️ 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI + Tailwind CSS (shadcn/ui)
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod

### Backend  
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: 세션 기반 (PostgreSQL store)

### Mobile App (buzz비즈)
- **Framework**: React Native 또는 Progressive Web App
- **Camera**: QR 코드 스캔 기능 필요

## 🗃️ 데이터베이스 설계

### 핵심 테이블

```sql
-- 사용자 관리
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user', -- user, business, admin
  mileage_balance INTEGER DEFAULT 0,
  referral_code VARCHAR(50) UNIQUE, -- 개인 리퍼럴 코드
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 리퍼럴 관리
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id), -- 추천인
  referee_id INTEGER REFERENCES users(id), -- 피추천인
  referral_code VARCHAR(50), -- 사용된 리퍼럴 코드
  reward_amount INTEGER, -- 추천인에게 지급된 보상
  signup_bonus INTEGER, -- 피추천인에게 지급된 가입 보상
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

-- QR 쿠폰 관리
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  coupon_type VARCHAR(20) NOT NULL, -- basic, event, mileage_qr
  discount_type VARCHAR(20), -- amount, percentage
  discount_value INTEGER, -- 할인 금액 또는 퍼센트
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  used_business_id INTEGER REFERENCES users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 마일리지 거래 내역
CREATE TABLE mileage_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  transaction_type VARCHAR(20) NOT NULL, -- earn, use, admin_adjust
  amount INTEGER NOT NULL, -- 양수: 적립, 음수: 사용
  description TEXT,
  reference_type VARCHAR(20), -- referral, signup, mileage_use, admin
  reference_id INTEGER, -- 관련 레코드 ID
  created_at TIMESTAMP DEFAULT NOW()
);

-- 매장 정보
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id), -- 사업자 계정
  business_name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(20),
  category VARCHAR(50),
  images JSON, -- 매장 사진 URLs
  business_hours JSON, -- 영업시간 정보
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false, -- 남지 승인 여부
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 매장 리뷰
CREATE TABLE business_reviews (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  user_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  images JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사업자 정산 관리
CREATE TABLE business_settlements (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  settlement_type VARCHAR(20), -- mileage_use, event_coupon
  amount INTEGER NOT NULL, -- 정산 금액
  reference_type VARCHAR(20), -- mileage_transaction, coupon
  reference_id INTEGER, -- 관련 거래 ID
  status VARCHAR(20) DEFAULT 'requested', -- requested, approved, paid, rejected
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- 시스템 설정
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 지역 추천 컨텐츠 (남지에서 관리)
CREATE TABLE regional_contents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  images JSON,
  content_type VARCHAR(50), -- tour_course, photo_spot, seasonal_special
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 이벤트 관리
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(50), -- signup_bonus, referral_bonus, special_coupon
  bonus_amount INTEGER, -- 보너스 마일리지 또는 할인액
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 기본 시스템 설정 데이터

```sql
-- 기본 설정값 삽입
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('referral_reward', '500', '리퍼럴 추천인 보상 (원)'),
('signup_bonus_default', '1000', '기본 가입 보너스 (원)'),
('signup_bonus_referral', '3000', '리퍼럴 가입 보너스 (원)'),
('basic_coupon_amount', '3000', '기본 쿠폰 할인 금액 (원)'),
('basic_coupon_percentage', '10', '기본 쿠폰 할인율 (%)'),
('event_coupon_percentage', '30', '이벤트 쿠폰 할인율 (%)'),
('event_coupon_government_ratio', '50', '이벤트 쿠폰 정부 지원 비율 (%)');
```

## 📱 buzz (모바일웹) 상세 설계

### UI/UX 구조
Bottom Navigation: 홈, 지역추천, 이벤트, 마이

### 주요 페이지

#### 🏠 홈 페이지 (`/`)
**컴포넌트**: `HomePage`
**기능**:
- 남구 대표 배너 이미지
- 인기 매장 카드 리스트 (클릭시 매장 모달)
- 내 마일리지 잔액 표시 (상단 고정)
- 사용 가능한 쿠폰 수 표시
- 빠른 QR 접근 버튼

**API 요구사항**:
- `GET /api/businesses/featured` - 인기 매장 목록
- `GET /api/user/dashboard` - 사용자 대시보드 정보

#### 🎯 지역추천 페이지 (`/recommendations`)
**컴포넌트**: `RecommendationsPage`
**기능**:
- 남구 관광 코스 추천 (남지에서 관리)
- 계절별 특집 컨텐츠
- 맛집 투어 코스
- 포토스팟 소개
- SNS 공유 최적화된 컨텐츠

**API 요구사항**:
- `GET /api/contents/regional` - 지역 추천 컨텐츠

#### 🎪 이벤트 페이지 (`/events`)
**컴포넌트**: `EventsPage`
**기능**:
- 현재 진행 중인 가입 이벤트
- 특별 할인 쿠폰 이벤트
- 리퍼럴 보상 이벤트
- 이벤트 참여 버튼

**API 요구사항**:
- `GET /api/events/active` - 진행 중인 이벤트

#### 👤 마이 페이지 (`/my`)
**컴포넌트**: `MyPage`

**마케팅 허브 섹션**:
- 내 리퍼럴 링크 생성/공유
- SNS 공유용 템플릿 제공
- 리퍼럴 성과 대시보드 (실시간)

**마일리지 관리 섹션**:
- 마일리지 잔액 및 사용내역
- 획득 내역 (리퍼럴, 이벤트)
- 마일리지 사용 QR 코드 표시

**쿠폰 관리 섹션**:
- 보유 쿠폰 목록 (사용가능/만료)
- QR 코드 표시

**API 요구사항**:
- `GET /api/user/profile` - 사용자 정보
- `GET /api/user/mileage` - 마일리지 정보
- `GET /api/user/coupons` - 보유 쿠폰
- `GET /api/user/referrals` - 리퍼럴 성과
- `POST /api/user/referral-link` - 리퍼럴 링크 생성

#### 🏪 매장 상세 모달
**컴포넌트**: `BusinessModal`
**기능**:
- 매장 사진, 기본 정보, 위치
- 리뷰 및 평점 표시
- 사용 가능한 쿠폰 종류
- 길찾기 연동 (카카오맵/구글맵)

**API 요구사항**:
- `GET /api/businesses/:id` - 매장 상세 정보
- `GET /api/businesses/:id/reviews` - 매장 리뷰

#### 🔐 인증 페이지
**회원가입 (`/signup`)**:
- 리퍼럴 코드 확인 (URL 파라미터)
- 기본 정보 입력
- 리퍼럴 가입시 보너스 안내

**로그인 (`/login`)**:
- 이메일/비밀번호 로그인
- 회원가입 링크

## 🏪 buzz비즈 (사장님 앱) 상세 설계

### 주요 기능

#### 📱 QR 스캔 시스템
**컴포넌트**: `QRScanner`
**기능**:
1. **기본/이벤트 쿠폰 스캔**:
   - QR 코드 스캔
   - 쿠폰 유효성 검증
   - 할인 적용 및 사용 처리

2. **마일리지 사용 QR 스캔**:
   - QR 코드 스캔 후 사용자 확인
   - **금액 입력 인터페이스** (중요!)
   - 마일리지 잔액 확인
   - 금액 차감 및 할인 적용

**API 요구사항**:
- `POST /api/coupons/verify` - 쿠폰 유효성 검증
- `POST /api/coupons/use` - 쿠폰 사용 처리
- `POST /api/mileage/use` - 마일리지 사용 처리

#### 💳 정산 관리
**컴포넌트**: `SettlementPage`
**기능**:
- 일일 마일리지 사용 내역
- 이벤트 쿠폰 사용 내역 (부분 정산)
- 남지에게 정산 요청
- 정산 상태 조회

**API 요구사항**:
- `GET /api/business/settlements` - 정산 내역
- `POST /api/business/settlement-request` - 정산 요청

#### 📊 매장 통계
**컴포넌트**: `BusinessStats`
**기능**:
- 일일 쿠폰 고객 수
- 쿠폰 종류별 사용 현황  
- 월별 정산 금액

**API 요구사항**:
- `GET /api/business/stats` - 매장 통계

#### ⚙️ 매장 관리
**컴포넌트**: `BusinessManagement`
**기능**:
- 매장 정보 수정
- 매장 사진 업로드
- 영업 상태 설정

**API 요구사항**:
- `PUT /api/business/profile` - 매장 정보 수정
- `POST /api/business/images` - 이미지 업로드

## 🏢 남지 (관리자 웹) 상세 설계

### 대시보드
**컴포넌트**: `AdminDashboard`
**주요 지표**:
- 전체 회원 수 및 증가율
- 일일/월별 리퍼럴 성과
- 마일리지 발행량 vs 사용량
- 예산 집행 현황

### 정책 관리
**컴포넌트**: `PolicyManagement`
**기능**:
- 리퍼럴 보상 금액 설정
- 가입 이벤트 마일리지 설정
- 할인 쿠폰 정책 (기본/이벤트)
- 이벤트 기간 설정

### 사업자 관리
**컴포넌트**: `BusinessManagement`
**기능**:
- 매장 등록 신청 승인/반려
- 매장 정보 검토 및 수정 지원
- 정산 요청 승인/반려
- 사업자별 정산 내역

### 컨텐츠 관리
**컴포넌트**: `ContentManagement`
**기능**:
- 지역 추천 컨텐츠 작성/수정
- 이벤트 생성 및 관리
- 배너 이미지 관리

## 🔄 핵심 API 설계

### 인증 API
```typescript
// 회원가입
POST /api/auth/signup
{
  email: string;
  password: string;
  name: string;
  phone?: string;
  referralCode?: string; // 리퍼럴 코드 (선택)
}

// 로그인
POST /api/auth/login
{
  email: string;
  password: string;
}
```

### 리퍼럴 API
```typescript
// 리퍼럴 링크 생성
POST /api/user/referral-link
Response: {
  referralLink: string;
  referralCode: string;
}

// 리퍼럴 성과 조회
GET /api/user/referrals
Response: {
  totalReferred: number;
  totalEarned: number;
  recentReferrals: ReferralRecord[];
}
```

### 마일리지 API
```typescript
// 마일리지 잔액 및 내역
GET /api/user/mileage
Response: {
  balance: number;
  transactions: MileageTransaction[];
}

// 마일리지 사용 (남즐사에서 호출)
POST /api/mileage/use
{
  userId: number;
  amount: number;
  businessId: number;
  description?: string;
}
```

### QR/쿠폰 API
```typescript
// 쿠폰 검증 (남즐사)
POST /api/coupons/verify
{
  qrData: string;
}
Response: {
  valid: boolean;
  coupon: CouponInfo;
  user: UserInfo;
}

// 쿠폰 사용 처리 (남즐사)
POST /api/coupons/use
{
  couponId: number;
  businessId: number;
}

// 마일리지 QR 정보 (남구알리)
GET /api/user/mileage-qr
Response: {
  qrData: string;
  balance: number;
}
```

### 매장 API
```typescript
// 매장 목록 조회
GET /api/businesses
Query: {
  category?: string;
  featured?: boolean;
  limit?: number;
}

// 매장 상세 정보
GET /api/businesses/:id
Response: {
  business: BusinessInfo;
  reviews: ReviewInfo[];
  availableCoupons: CouponType[];
}
```

## 🔒 보안 요구사항

### 인증/인가
- 세션 기반 인증 (JWT 대신)
- 사용자 역할별 권한 관리 (user, business, admin)
- API 요청시 세션 검증

### QR 코드 보안
- QR 데이터에 만료시간 포함
- 1회용 쿠폰의 중복 사용 방지
- 마일리지 사용시 실시간 잔액 검증

### 데이터 보안
- 개인정보 암호화 저장
- 마일리지 거래 내역 감사 로그
- 정산 요청 승인 프로세스

## 🚀 개발 우선순위

### Phase 1: 기본 시스템 구축
1. 데이터베이스 설계 및 구축
2. 사용자 인증 시스템 (회원가입/로그인)
3. 남구알리 기본 UI (홈, 마이 페이지)
4. 리퍼럴 링크 생성 및 추적

### Phase 2: 핵심 기능 개발
1. QR 쿠폰 시스템 (생성/사용)
2. 마일리지 시스템 (적립/사용)
3. 남즐사 QR 스캔 기능
4. 기본 정산 시스템

### Phase 3: 고도화
1. 매장 관리 및 리뷰 시스템
2. 남지 관리자 대시보드
3. 이벤트 관리 시스템
4. 지역 컨텐츠 관리

### Phase 4: 최적화
1. 성능 최적화
2. 모바일 앱 최적화
3. 통계 및 분석 기능
4. 알림 시스템

## 📁 프로젝트 구조

```
namgu-platform/
├── packages/
│   ├── database/           # 데이터베이스 스키마 및 마이그레이션
│   ├── shared/             # 공통 타입 및 유틸리티
│   └── api/                # 백엔드 API 서버
├── apps/
│   ├── namgu-alli/         # 남구알리 (모바일웹)
│   ├── namjeul-sa/         # 남즐사 (사장님 앱)
│   └── namji/              # 남지 (관리자 웹)
├── docs/                   # 프로젝트 문서
└── scripts/               # 빌드 및 배포 스크립트
```

## 🔧 개발 환경 설정

### 필요한 도구
- Node.js 18+
- PostgreSQL 14+
- npm 또는 yarn
- Git

### 환경변수
```env
DATABASE_URL=postgresql://user:password@localhost:5432/namgu_platform
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
UPLOAD_PATH=./uploads
KAKAO_MAP_API_KEY=your_kakao_api_key
```

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate

# 시드 데이터 삽입
npm run db:seed

# 개발 서버 실행
npm run dev
```

이제 Claude Code가 이 명세서를 바탕으로 체계적으로 개발을 진행할 수 있습니다!