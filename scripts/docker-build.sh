#!/bin/bash

# Docker 빌드 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 빌드 환경 설정
ENV=${1:-production}
TARGET=${2:-all}

echo -e "${BLUE}🐳 Docker Build Script${NC}"
echo -e "${GREEN}Environment: ${YELLOW}${ENV}${NC}"
echo -e "${GREEN}Target: ${YELLOW}${TARGET}${NC}"
echo ""

# 환경 파일 확인
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.${ENV} file not found${NC}"
    echo -e "${GREEN}Creating default environment file...${NC}"
    cp .env.example .env.${ENV} 2>/dev/null || echo "No .env.example found"
fi

# Docker 버전 확인
echo -e "${GREEN}📋 Checking Docker version...${NC}"
docker --version
docker-compose --version

# 기존 컨테이너 정리 (옵션)
if [ "$3" = "--clean" ]; then
    echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
    docker-compose down -v
    docker system prune -f
fi

# 빌드 함수
build_app() {
    local app_name=$1
    local dockerfile=$2
    
    echo -e "${GREEN}🔨 Building ${app_name}...${NC}"
    docker build \
        --build-arg BUILD_ENV=${ENV} \
        -t buzz-${app_name}:${ENV} \
        -t buzz-${app_name}:latest \
        -f ${dockerfile} \
        .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${app_name} build completed${NC}"
    else
        echo -e "${RED}❌ ${app_name} build failed${NC}"
        exit 1
    fi
}

# 빌드 실행
case $TARGET in
    all)
        echo -e "${BLUE}Building all applications...${NC}"
        build_app "customer" "apps/buzz/Dockerfile"
        build_app "business" "apps/buzz-biz/Dockerfile"
        build_app "admin" "apps/buzz-admin/Dockerfile"
        ;;
    buzz)
        build_app "customer" "apps/buzz/Dockerfile"
        ;;
    buzz-biz)
        build_app "business" "apps/buzz-biz/Dockerfile"
        ;;
    buzz-admin)
        build_app "admin" "apps/buzz-admin/Dockerfile"
        ;;
    *)
        echo -e "${RED}❌ Unknown target: ${TARGET}${NC}"
        echo "Usage: ./docker-build.sh [production|staging|development] [all|buzz|buzz-biz|buzz-admin] [--clean]"
        exit 1
        ;;
esac

# 이미지 목록 출력
echo ""
echo -e "${BLUE}📦 Built images:${NC}"
docker images | grep buzz-

# 빌드 크기 리포트
echo ""
echo -e "${BLUE}📊 Image size report:${NC}"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep buzz-

echo ""
echo -e "${GREEN}🎉 Docker build completed successfully!${NC}"
echo -e "${YELLOW}To run the containers, use:${NC}"
echo "  docker-compose up -d"
echo ""
echo -e "${YELLOW}To run specific services:${NC}"
echo "  docker-compose up -d buzz postgres redis"