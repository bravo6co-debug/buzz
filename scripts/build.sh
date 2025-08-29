#!/bin/bash

# 빌드 스크립트 - 환경별 빌드 자동화

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 확인
ENV=${1:-development}

echo -e "${GREEN}🚀 Building Buzz Platform for ${YELLOW}${ENV}${GREEN} environment${NC}"

# 환경별 설정 파일 확인
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${RED}❌ Environment file .env.${ENV} not found!${NC}"
    exit 1
fi

# 의존성 설치
echo -e "${GREEN}📦 Installing dependencies...${NC}"
pnpm install

# 타입 체크
echo -e "${GREEN}🔍 Running type check...${NC}"
pnpm type-check

# 린트 실행
echo -e "${GREEN}🧹 Running linter...${NC}"
pnpm lint

# 테스트 실행 (프로덕션 빌드 시에만)
if [ "$ENV" = "production" ]; then
    echo -e "${GREEN}🧪 Running tests...${NC}"
    pnpm test:e2e:critical
fi

# 빌드 실행
echo -e "${GREEN}🔨 Building applications...${NC}"
case $ENV in
    development)
        pnpm build:dev
        ;;
    staging)
        pnpm build:staging
        ;;
    production)
        pnpm build:prod
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: ${ENV}${NC}"
        echo "Usage: ./build.sh [development|staging|production]"
        exit 1
        ;;
esac

# 빌드 결과 확인
if [ -d "apps/buzz/dist" ] && [ -d "apps/buzz-biz/dist" ] && [ -d "apps/buzz-admin/dist" ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    # 빌드 크기 리포트
    echo -e "${GREEN}📊 Build size report:${NC}"
    du -sh apps/buzz/dist
    du -sh apps/buzz-biz/dist
    du -sh apps/buzz-admin/dist
else
    echo -e "${RED}❌ Build failed! Check the logs above.${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Build process completed for ${YELLOW}${ENV}${GREEN} environment!${NC}"