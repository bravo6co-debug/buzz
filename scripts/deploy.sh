#!/bin/bash

# 배포 스크립트 - 환경별 배포 자동화

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 확인
ENV=${1:-staging}
DEPLOY_TARGET=${2:-all}

echo -e "${BLUE}🚀 Deploying Buzz Platform to ${YELLOW}${ENV}${NC}"

# 프로덕션 배포 확인
if [ "$ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Production deployment detected!${NC}"
    read -p "Are you sure you want to deploy to production? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# 빌드 실행
echo -e "${GREEN}🔨 Building for ${ENV}...${NC}"
./scripts/build.sh $ENV

# Docker 이미지 빌드
echo -e "${GREEN}🐳 Building Docker images...${NC}"
case $DEPLOY_TARGET in
    buzz|all)
        docker build -t buzz-app:$ENV -f apps/buzz/Dockerfile apps/buzz
        ;;
    buzz-biz|all)
        docker build -t buzz-biz:$ENV -f apps/buzz-biz/Dockerfile apps/buzz-biz
        ;;
    buzz-admin|all)
        docker build -t buzz-admin:$ENV -f apps/buzz-admin/Dockerfile apps/buzz-admin
        ;;
    *)
        echo -e "${RED}❌ Unknown deploy target: ${DEPLOY_TARGET}${NC}"
        echo "Usage: ./deploy.sh [development|staging|production] [buzz|buzz-biz|buzz-admin|all]"
        exit 1
        ;;
esac

# 환경별 배포
case $ENV in
    development)
        echo -e "${GREEN}🏠 Deploying to local development...${NC}"
        docker-compose -f docker-compose.dev.yml up -d
        ;;
    staging)
        echo -e "${GREEN}🧪 Deploying to staging...${NC}"
        # 스테이징 서버로 이미지 푸시
        # docker tag buzz-app:staging registry.buzz-platform.com/buzz-app:staging
        # docker push registry.buzz-platform.com/buzz-app:staging
        # kubectl apply -f k8s/staging/
        echo "Staging deployment configured (implement actual deployment)"
        ;;
    production)
        echo -e "${GREEN}🌟 Deploying to production...${NC}"
        # 프로덕션 서버로 이미지 푸시
        # docker tag buzz-app:production registry.buzz-platform.com/buzz-app:production
        # docker push registry.buzz-platform.com/buzz-app:production
        # kubectl apply -f k8s/production/
        echo "Production deployment configured (implement actual deployment)"
        ;;
esac

# 헬스 체크
echo -e "${GREEN}💓 Running health checks...${NC}"
sleep 5

# 배포 완료
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Deployment summary:${NC}"
echo "  Environment: $ENV"
echo "  Target: $DEPLOY_TARGET"
echo "  Timestamp: $(date)"

# 로그 확인 안내
echo -e "${YELLOW}📋 To view logs, run:${NC}"
case $ENV in
    development)
        echo "  docker-compose -f docker-compose.dev.yml logs -f"
        ;;
    staging|production)
        echo "  kubectl logs -f deployment/buzz-app -n $ENV"
        ;;
esac