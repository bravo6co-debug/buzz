# @buzz/database

Buzz 플랫폼의 데이터베이스 패키지입니다. Drizzle ORM을 사용하여 PostgreSQL 데이터베이스와의 상호작용을 담당합니다.

## 🏗️ 구조

```
src/
├── schema/                 # Drizzle 스키마 정의
│   ├── users.ts           # 사용자 테이블
│   ├── referrals.ts       # 리퍼럴 테이블
│   ├── coupons.ts         # 쿠폰 테이블
│   ├── mileageTransactions.ts  # 마일리지 거래내역
│   ├── businesses.ts      # 매장 정보
│   ├── businessReviews.ts # 매장 리뷰
│   ├── businessSettlements.ts  # 사업자 정산
│   ├── systemSettings.ts  # 시스템 설정
│   ├── regionalContents.ts # 지역 추천 컨텐츠
│   ├── events.ts          # 이벤트 관리
│   └── index.ts           # 스키마 통합 내보내기
├── client.ts              # 데이터베이스 연결 클라이언트
├── types.ts               # TypeScript 타입 정의
├── utils.ts               # 유틸리티 함수
├── seed.ts                # 시드 데이터
└── index.ts               # 메인 진입점
```

## 🚀 사용법

### 환경 설정

1. `.env` 파일 생성:
```bash
cp .env.example .env
```

2. 데이터베이스 URL 설정:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/buzz_platform"
```

### 스크립트 실행

```bash
# 의존성 설치
pnpm install

# 마이그레이션 생성
pnpm db:generate

# 마이그레이션 실행
pnpm db:migrate

# 시드 데이터 삽입
pnpm db:seed

# Drizzle Studio 실행 (GUI 툴)
pnpm db:studio
```

### 코드에서 사용

```typescript
import { db, users, businesses } from '@buzz/database';
import { eq } from 'drizzle-orm';

// 사용자 조회
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'))
  .limit(1);

// 매장 생성
const newBusiness = await db
  .insert(businesses)
  .values({
    userId: 1,
    businessName: '새로운 매장',
    description: '매장 설명',
    // ...
  })
  .returning();
```

## 📊 데이터베이스 스키마

### 핵심 테이블

- **users**: 사용자 정보 (일반 사용자, 사업자, 관리자)
- **referrals**: 리퍼럴 관리 (추천인-피추천인 관계)
- **coupons**: QR 쿠폰 관리
- **mileage_transactions**: 마일리지 거래 내역
- **businesses**: 매장 정보
- **business_reviews**: 매장 리뷰
- **business_settlements**: 사업자 정산 관리
- **system_settings**: 시스템 설정값
- **regional_contents**: 지역 추천 컨텐츠
- **events**: 이벤트 관리

### 시스템 설정 기본값

- `referral_reward`: 500 (리퍼럴 추천인 보상)
- `signup_bonus_default`: 1000 (기본 가입 보너스)
- `signup_bonus_referral`: 3000 (리퍼럴 가입 보너스)
- `basic_coupon_amount`: 3000 (기본 쿠폰 할인 금액)
- `basic_coupon_percentage`: 10 (기본 쿠폰 할인율)
- `event_coupon_percentage`: 30 (이벤트 쿠폰 할인율)
- `event_coupon_government_ratio`: 50 (이벤트 쿠폰 정부 지원 비율)

## 🔧 유틸리티 함수

```typescript
import { 
  generateReferralCode,
  getUserMileageBalance,
  createMileageTransaction,
  getSystemSetting,
  generateMileageQRData 
} from '@buzz/database';

// 리퍼럴 코드 생성
const referralCode = generateReferralCode(userId);

// 마일리지 잔액 조회
const balance = await getUserMileageBalance(userId);

// 마일리지 거래 생성
await createMileageTransaction(
  userId, 
  'earn', 
  1000, 
  '가입 보너스'
);

// 시스템 설정 조회
const referralReward = await getSystemSetting('referral_reward');

// QR 데이터 생성
const qrData = generateMileageQRData(userId, 5000);
```

## 🔒 보안 고려사항

- QR 코드에는 만료시간이 포함됩니다
- 마일리지 거래는 모두 로그로 기록됩니다
- 사용자 역할별 권한 검증이 포함됩니다
- 정산 요청은 승인 프로세스를 거칩니다

## 📝 타입 안정성

모든 데이터베이스 테이블에 대해 TypeScript 타입이 자동 생성됩니다:

```typescript
import type { 
  User, NewUser, 
  Business, NewBusiness,
  MileageTransaction 
} from '@buzz/database';
```

## 🏃‍♂️ 개발 워크플로우

1. 스키마 변경 시 `pnpm db:generate`로 마이그레이션 생성
2. `pnpm db:migrate`로 데이터베이스에 적용
3. 타입이 자동으로 업데이트됨
4. `pnpm db:studio`로 데이터 확인 가능