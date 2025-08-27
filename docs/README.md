# 📚 Buzz Platform Documentation

> 부산 남구 지역경제 활성화를 위한 선순환 바이럴 마케팅 시스템

## 🎯 프로젝트 개요

### 비즈니스 목표
- **정부 주도** 지역경제 활성화 플랫폼
- **대학생 시드 마케팅**으로 관광객 유치
- **리퍼럴 시스템**을 통한 자발적 홍보 생태계
- **마일리지 시스템**으로 실질적 혜택 제공

### 핵심 가치
1. **지역 상권 활성화**: 매장 방문 유도 및 매출 증대
2. **바이럴 마케팅**: 사용자가 직접 홍보하는 선순환 구조
3. **실질적 혜택**: 마일리지와 쿠폰으로 즉시 사용 가능한 할인

## 🏗️ 시스템 구성

### 3개 애플리케이션 구조

| 앱 이름 | 대상 | 주요 기능 | 접속 URL |
|---------|------|----------|----------|
| **buzz** | 일반 사용자 | 리퍼럴, 마일리지, 쿠폰, 매장 정보 | http://localhost:5173 |
| **buzz-biz** | 매장 사업자 | QR 스캔, 정산, 매장 관리, 통계 | http://localhost:5174 |
| **buzz-admin** | 정부 관리자 | 정책 관리, 통계, 사업자 승인 | http://localhost:5175 |

## 🛠️ 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI + Tailwind CSS (shadcn/ui)
- **State Management**: 
  - TanStack Query (서버 상태)
  - Zustand (클라이언트 상태)
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: 세션 기반 (express-session + connect-pg-simple)
- **API Documentation**: Swagger/OpenAPI

### Development Tools
- **Monorepo**: Turborepo + pnpm workspaces
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

## 📁 프로젝트 구조

```
buzz-master/
├── apps/                    # 애플리케이션
│   ├── buzz/               # 일반 사용자 앱
│   ├── buzz-biz/           # 사업자 앱
│   └── buzz-admin/         # 관리자 앱
├── packages/               # 공유 패키지
│   ├── api/               # Express API 서버
│   ├── database/          # DB 스키마 & Drizzle ORM
│   └── shared/            # 공통 타입 & 유틸리티
├── docs/                   # 문서
│   ├── architecture/      # 아키텍처 문서
│   ├── features/          # 기능별 상세 문서
│   ├── api/              # API 문서
│   ├── security/         # 보안 문서
│   ├── database/         # 데이터베이스 문서
│   ├── setup/            # 환경 설정 가이드
│   └── development/      # 개발 가이드
└── turbo.json             # Turborepo 설정
```

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+

### 설치 및 실행
```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에서 데이터베이스 연결 정보 수정

# 3. 데이터베이스 마이그레이션
cd packages/database
pnpm db:migrate

# 4. 개발 서버 실행 (모든 앱)
pnpm dev

# 5. 개별 앱 실행
pnpm dev --filter=buzz        # 사용자 앱만
pnpm dev --filter=buzz-biz    # 사업자 앱만
pnpm dev --filter=@buzz/api   # API 서버만
```

## 📖 문서 네비게이션

### 핵심 문서
- 📊 [개발 현황](./development-status.md) - 현재 개발 상태 및 진행 사항
- 🔄 [리퍼럴 시스템](./features/referral-system.md) - 핵심 비즈니스 로직
- 🔐 [보안 가이드](./security/security-audit.md) - 보안 체크리스트
- 🗄️ [데이터베이스 스키마](./database/schema-guide.md) - ERD 및 관계 설명

### 기능별 문서
- [마일리지 시스템](./features/mileage-system.md)
- [QR/쿠폰 시스템](./features/qr-coupon-system.md)
- [리뷰 시스템](./features/review-system.md)
- [정산 시스템](./features/settlement-system.md)

### API 문서
- [인증 API](./api/auth-api.md)
- [리퍼럴 API](./api/referral-api.md)
- [비즈니스 API](./api/business-api.md)
- [완전한 API 가이드](./api/complete-api-guide.md)

### 개발 가이드
- [환경 설정](./setup/environment.md)
- [로컬 개발](./development/local-development.md)
- [배포 가이드](./development/deployment.md)
- [트러블슈팅](./development/troubleshooting.md)

## 💡 주요 기능

### 1. 리퍼럴 시스템
- 고유 추천 링크 생성
- SNS 공유 최적화
- 자동 마일리지 지급
- 실시간 성과 추적

### 2. 마일리지 시스템
- 리퍼럴 보상 (추천인 500원, 피추천인 3,000원)
- 실제 현금처럼 사용
- QR 코드로 결제

### 3. QR/쿠폰 시스템
- 기본 쿠폰 (10% 할인)
- 이벤트 쿠폰 (30% 할인, 정부 50% 지원)
- 마일리지 QR 결제

### 4. 매장 관리
- 사업자 전용 대시보드
- QR 스캔 앱
- 정산 시스템
- 매출 통계

## 🔒 보안 고려사항

### 구현된 보안
- ✅ 세션 기반 인증
- ✅ 비밀번호 암호화 (bcrypt)
- ✅ CORS 설정
- ✅ Rate limiting
- ✅ SQL Injection 방지 (ORM 사용)

### 추가 필요 보안
- ⚠️ 자기 자신 리퍼럴 방지
- ⚠️ 중복 가입 방지
- ⚠️ 리퍼럴 코드 유효기간
- ⚠️ 비정상 패턴 감지

## 📈 개발 로드맵

### Phase 1 - 핵심 기능 (완료)
- ✅ 기본 인증 시스템
- ✅ 리퍼럴 링크 생성
- ✅ 마일리지 적립/사용
- ✅ QR 코드 생성/스캔

### Phase 2 - 보안 강화 (진행중)
- 🚧 리퍼럴 보안 강화
- 🚧 리뷰 시스템 완성
- 🚧 정산 자동화

### Phase 3 - 고도화 (계획)
- 📅 실시간 알림
- 📅 통계 대시보드
- 📅 모바일 앱 개발

## 🤝 기여 가이드

1. 문서 업데이트시 날짜 명시
2. 코드 변경시 관련 문서 동시 수정
3. 새 기능 추가시 문서 먼저 작성
4. API 변경시 Swagger 문서 업데이트

## 📞 문의 및 지원

- 기술 문의: tech@buzz.namgu.kr
- 사업 제휴: business@buzz.namgu.kr
- 버그 리포트: GitHub Issues

---

*최종 업데이트: 2025-08-27*
*문서 버전: 1.0.0*