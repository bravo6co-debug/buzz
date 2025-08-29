#!/bin/bash

# Docker 실행 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 실행 모드
MODE=${1:-up}
ENV=${2:-production}

echo -e "${BLUE}🚀 Docker Run Script${NC}"
echo -e "${GREEN}Mode: ${YELLOW}${MODE}${NC}"
echo -e "${GREEN}Environment: ${YELLOW}${ENV}${NC}"
echo ""

# 환경 파일 확인
if [ -f ".env.${ENV}" ]; then
    export $(cat .env.${ENV} | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded from .env.${ENV}${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: .env.${ENV} file not found${NC}"
fi

# Docker Compose 파일 선택
COMPOSE_FILE="docker-compose.yml"
if [ "$ENV" = "development" ] && [ -f "docker-compose.dev.yml" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    echo -e "${GREEN}Using development compose file${NC}"
fi

# 실행 모드별 처리
case $MODE in
    up)
        echo -e "${GREEN}🚀 Starting all services...${NC}"
        docker-compose -f ${COMPOSE_FILE} up -d
        
        echo -e "${GREEN}⏳ Waiting for services to be healthy...${NC}"
        sleep 10
        
        echo -e "${GREEN}📊 Service status:${NC}"
        docker-compose -f ${COMPOSE_FILE} ps
        ;;
        
    down)
        echo -e "${YELLOW}⏹️  Stopping all services...${NC}"
        docker-compose -f ${COMPOSE_FILE} down
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting all services...${NC}"
        docker-compose -f ${COMPOSE_FILE} restart
        ;;
        
    logs)
        SERVICE=${3:-}
        if [ -z "$SERVICE" ]; then
            echo -e "${GREEN}📋 Showing logs for all services...${NC}"
            docker-compose -f ${COMPOSE_FILE} logs -f --tail=100
        else
            echo -e "${GREEN}📋 Showing logs for ${SERVICE}...${NC}"
            docker-compose -f ${COMPOSE_FILE} logs -f --tail=100 ${SERVICE}
        fi
        ;;
        
    status)
        echo -e "${GREEN}📊 Service status:${NC}"
        docker-compose -f ${COMPOSE_FILE} ps
        echo ""
        echo -e "${GREEN}🔍 Container health:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
        
    shell)
        SERVICE=${3:-buzz}
        echo -e "${GREEN}🖥️  Opening shell in ${SERVICE} container...${NC}"
        docker-compose -f ${COMPOSE_FILE} exec ${SERVICE} sh
        ;;
        
    rebuild)
        SERVICE=${3:-}
        if [ -z "$SERVICE" ]; then
            echo -e "${YELLOW}🔨 Rebuilding all services...${NC}"
            docker-compose -f ${COMPOSE_FILE} build --no-cache
            docker-compose -f ${COMPOSE_FILE} up -d
        else
            echo -e "${YELLOW}🔨 Rebuilding ${SERVICE}...${NC}"
            docker-compose -f ${COMPOSE_FILE} build --no-cache ${SERVICE}
            docker-compose -f ${COMPOSE_FILE} up -d ${SERVICE}
        fi
        ;;
        
    clean)
        echo -e "${RED}🧹 Cleaning up Docker resources...${NC}"
        read -p "This will remove all containers, volumes, and images. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f ${COMPOSE_FILE} down -v
            docker system prune -af
            echo -e "${GREEN}✅ Cleanup completed${NC}"
        else
            echo -e "${YELLOW}Cleanup cancelled${NC}"
        fi
        ;;
        
    test)
        echo -e "${GREEN}🧪 Running health checks...${NC}"
        
        # Check main app
        echo -n "Checking Buzz app... "
        curl -f http://localhost:8080/health > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        
        # Check admin
        echo -n "Checking Admin app... "
        curl -f http://localhost:8081/health > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        
        # Check business
        echo -n "Checking Business app... "
        curl -f http://localhost:8082/health > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        
        # Check nginx
        echo -n "Checking Nginx... "
        curl -f http://localhost/health > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        
        # Check database
        echo -n "Checking PostgreSQL... "
        docker-compose -f ${COMPOSE_FILE} exec -T postgres pg_isready > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        
        # Check Redis
        echo -n "Checking Redis... "
        docker-compose -f ${COMPOSE_FILE} exec -T redis redis-cli ping > /dev/null 2>&1 && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Unknown mode: ${MODE}${NC}"
        echo ""
        echo "Usage: ./docker-run.sh [mode] [environment] [service]"
        echo ""
        echo "Modes:"
        echo "  up       - Start all services"
        echo "  down     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs (optionally specify service)"
        echo "  status   - Show service status"
        echo "  shell    - Open shell in container (specify service)"
        echo "  rebuild  - Rebuild and restart services"
        echo "  clean    - Clean up all Docker resources"
        echo "  test     - Run health checks"
        echo ""
        echo "Examples:"
        echo "  ./docker-run.sh up production"
        echo "  ./docker-run.sh logs development buzz"
        echo "  ./docker-run.sh shell production postgres"
        exit 1
        ;;
esac

# 실행 완료 메시지
if [ "$MODE" = "up" ]; then
    echo ""
    echo -e "${GREEN}🎉 Services are running!${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Customer App:  http://localhost:8080"
    echo "  Admin App:     http://localhost:8081"
    echo "  Business App:  http://localhost:8082"
    echo "  Main Proxy:    http://localhost"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  View logs:     ./docker-run.sh logs"
    echo "  Check status:  ./docker-run.sh status"
    echo "  Stop services: ./docker-run.sh down"
fi