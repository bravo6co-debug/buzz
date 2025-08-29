# Makefile for Buzz Platform

.PHONY: help install build dev test docker-build docker-up docker-down clean

# Colors
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Default environment
ENV ?= development

help: ## Show this help message
	@echo "${BLUE}Buzz Platform - Makefile Commands${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'
	@echo ""
	@echo "Usage: make [command] ENV=[development|staging|production]"

install: ## Install dependencies
	@echo "${GREEN}Installing dependencies...${NC}"
	pnpm install

build: ## Build all applications
	@echo "${GREEN}Building applications for ${ENV}...${NC}"
	pnpm build:${ENV}

dev: ## Run development server
	@echo "${GREEN}Starting development server...${NC}"
	pnpm dev

test: ## Run tests
	@echo "${GREEN}Running tests...${NC}"
	pnpm test
	pnpm test:e2e:critical

lint: ## Run linter
	@echo "${GREEN}Running linter...${NC}"
	pnpm lint

type-check: ## Run type checking
	@echo "${GREEN}Running type check...${NC}"
	pnpm type-check

# Docker commands
docker-build: ## Build Docker images
	@echo "${GREEN}Building Docker images...${NC}"
	./scripts/docker-build.sh ${ENV} all

docker-up: ## Start Docker containers
	@echo "${GREEN}Starting Docker containers...${NC}"
	./scripts/docker-run.sh up ${ENV}

docker-down: ## Stop Docker containers
	@echo "${YELLOW}Stopping Docker containers...${NC}"
	./scripts/docker-run.sh down ${ENV}

docker-logs: ## View Docker logs
	@echo "${GREEN}Viewing Docker logs...${NC}"
	./scripts/docker-run.sh logs ${ENV}

docker-status: ## Check Docker status
	@echo "${GREEN}Checking Docker status...${NC}"
	./scripts/docker-run.sh status ${ENV}

docker-test: ## Test Docker services
	@echo "${GREEN}Testing Docker services...${NC}"
	./scripts/docker-run.sh test ${ENV}

docker-clean: ## Clean Docker resources
	@echo "${RED}Cleaning Docker resources...${NC}"
	./scripts/docker-run.sh clean ${ENV}

# Combined commands
setup: install docker-build ## Complete setup (install + docker build)
	@echo "${GREEN}Setup completed!${NC}"

deploy: build docker-build docker-up ## Deploy application (build + docker)
	@echo "${GREEN}Deployment completed!${NC}"

restart: docker-down docker-up ## Restart Docker containers
	@echo "${GREEN}Restart completed!${NC}"

clean: ## Clean all generated files
	@echo "${RED}Cleaning generated files...${NC}"
	rm -rf dist/ build/ node_modules/ .turbo/
	pnpm clean

# Development shortcuts
d: dev ## Shortcut for dev
b: build ## Shortcut for build
t: test ## Shortcut for test
u: docker-up ## Shortcut for docker-up
dn: docker-down ## Shortcut for docker-down
dl: docker-logs ## Shortcut for docker-logs