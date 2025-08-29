#!/usr/bin/env node

/**
 * 포트 검증 스크립트
 * 
 * 이 스크립트는 다음을 검증합니다:
 * 1. 포트가 허용된 범위(8000-8999)에 있는지
 * 2. 금지된 포트(3000-3999, 9004)를 사용하지 않는지
 * 3. 포트가 이미 사용 중이지 않은지
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// 포트 설정 (ports.config.ts와 동일하게 유지)
const PORTS = {
  // API 서버
  API: 8083,
  
  // 개발 환경 (Vite)
  BUZZ_APP: 8010,
  BUZZ_BIZ: 8012,
  BUZZ_ADMIN: 8013,
  BUZZ_STANDALONE: 8014,
  
  // Docker 프로덕션
  DOCKER_BUZZ: 8080,
  DOCKER_ADMIN: 8081,
  DOCKER_BIZ: 8082,
  
  // Docker 개발
  DOCKER_DEV_BUZZ: 8090,
  DOCKER_DEV_ADMIN: 8091,
  DOCKER_DEV_BIZ: 8092,
  
  // 테스트 환경 (Playwright)
  TEST_BUZZ: 8106,
  TEST_BIZ: 8105,
  TEST_ADMIN: 8104,
  TEST_BUZZ_URL: 8110,
  TEST_BIZ_URL: 8108,
  TEST_ADMIN_URL: 8109,
  
  // 데이터베이스 (표준 포트 유지)
  POSTGRES: 5432,
  REDIS: 6379,
  
  // 웹 서버 (표준 포트 유지)
  HTTP: 80,
  HTTPS: 443,
  
  // Vite HMR
  VITE_HMR: 24678,
};

// 금지된 포트 범위
const FORBIDDEN_RANGES = [
  { start: 3000, end: 3999, reason: '3000번대 포트는 사용이 금지되어 있습니다' },
];

// 금지된 특정 포트
const FORBIDDEN_PORTS = [
  { port: 9004, reason: '포트 9004는 사용이 금지되어 있습니다' },
];

// 허용된 포트 범위
const ALLOWED_RANGE = {
  start: 8000,
  end: 8999,
};

// 표준 포트 (예외 허용)
const STANDARD_PORTS = [80, 443, 5432, 6379, 24678];

// 색상 코드
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

/**
 * 포트가 사용 중인지 확인
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, '127.0.0.1');
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // 포트 사용 중
      } else {
        resolve(false); // 다른 에러
      }
    });
    
    server.on('listening', () => {
      server.close();
      resolve(false); // 포트 사용 가능
    });
  });
}

/**
 * 포트 유효성 검증
 * @param {number} port 
 * @param {string} name 
 */
function validatePort(port, name) {
  // 표준 포트는 허용
  if (STANDARD_PORTS.includes(port)) {
    return;
  }
  
  // 금지된 특정 포트 검사
  for (const forbidden of FORBIDDEN_PORTS) {
    if (port === forbidden.port) {
      throw new Error(`${colors.red}❌ 포트 ${port} (${name}): ${forbidden.reason}${colors.reset}`);
    }
  }
  
  // 금지된 포트 범위 검사
  for (const range of FORBIDDEN_RANGES) {
    if (port >= range.start && port <= range.end) {
      throw new Error(`${colors.red}❌ 포트 ${port} (${name}): ${range.reason}${colors.reset}`);
    }
  }
  
  // 허용된 포트 범위 검사
  if (port < ALLOWED_RANGE.start || port > ALLOWED_RANGE.end) {
    throw new Error(
      `${colors.red}❌ 포트 ${port} (${name}): ${ALLOWED_RANGE.start}-${ALLOWED_RANGE.end} 범위만 사용 가능합니다${colors.reset}`
    );
  }
}

/**
 * 파일에서 금지된 포트 패턴 검색
 * @param {string} filePath 
 * @returns {Array}
 */
function searchForbiddenPorts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // 3000번대 포트 패턴 검색
  const port3000Pattern = /(?:port|PORT)[:\s]*3\d{3}/g;
  const matches3000 = content.match(port3000Pattern);
  if (matches3000) {
    violations.push({
      file: filePath,
      matches: matches3000,
      reason: '3000번대 포트 사용 발견'
    });
  }
  
  // 9004 포트 패턴 검색
  const port9004Pattern = /(?:port|PORT)[:\s]*9004/g;
  const matches9004 = content.match(port9004Pattern);
  if (matches9004) {
    violations.push({
      file: filePath,
      matches: matches9004,
      reason: '금지된 9004 포트 사용 발견'
    });
  }
  
  return violations;
}

/**
 * 프로젝트 파일에서 금지된 포트 검색
 */
function searchProjectFiles() {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml'];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
  const violations = [];
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file)) {
          searchDir(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          const fileViolations = searchForbiddenPorts(fullPath);
          violations.push(...fileViolations);
        }
      }
    }
  }
  
  // 현재 디렉토리부터 검색 시작
  searchDir(process.cwd());
  
  return violations;
}

/**
 * 모든 포트 검증
 */
async function validateAllPorts() {
  console.log(`${colors.blue}🔍 포트 설정 검증을 시작합니다...${colors.reset}\n`);
  
  let hasError = false;
  
  // 1. 포트 범위 검증
  console.log(`${colors.yellow}1. 포트 범위 검증${colors.reset}`);
  for (const [name, port] of Object.entries(PORTS)) {
    try {
      validatePort(port, name);
      console.log(`  ${colors.green}✓${colors.reset} ${name}: ${port}`);
    } catch (error) {
      console.error(`  ${error.message}`);
      hasError = true;
    }
  }
  
  // 2. 포트 사용 가능 여부 확인 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n${colors.yellow}2. 포트 사용 가능 여부 확인${colors.reset}`);
    
    // 개발 환경에서 체크할 포트들
    const devPorts = {
      API: PORTS.API,
      BUZZ_APP: PORTS.BUZZ_APP,
      BUZZ_BIZ: PORTS.BUZZ_BIZ,
      BUZZ_ADMIN: PORTS.BUZZ_ADMIN,
    };
    
    for (const [name, port] of Object.entries(devPorts)) {
      const inUse = await checkPortInUse(port);
      if (inUse) {
        console.error(`  ${colors.red}✗${colors.reset} ${name}: ${port} - 이미 사용 중`);
        hasError = true;
      } else {
        console.log(`  ${colors.green}✓${colors.reset} ${name}: ${port} - 사용 가능`);
      }
    }
  }
  
  // 3. 파일에서 금지된 포트 패턴 검색
  console.log(`\n${colors.yellow}3. 소스 코드에서 금지된 포트 검색${colors.reset}`);
  
  try {
    const violations = searchProjectFiles();
    
    if (violations.length > 0) {
      console.error(`  ${colors.red}✗ 금지된 포트 사용이 발견되었습니다:${colors.reset}`);
      for (const violation of violations) {
        console.error(`    ${colors.red}파일: ${violation.file}${colors.reset}`);
        console.error(`    ${colors.red}이유: ${violation.reason}${colors.reset}`);
        console.error(`    ${colors.red}발견: ${violation.matches.join(', ')}${colors.reset}`);
      }
      hasError = true;
    } else {
      console.log(`  ${colors.green}✓${colors.reset} 금지된 포트 패턴이 발견되지 않았습니다`);
    }
  } catch (error) {
    console.log(`  ${colors.yellow}⚠${colors.reset} 파일 검색을 건너뜁니다 (선택 사항)`);
  }
  
  // 결과 출력
  console.log('\n' + '='.repeat(50));
  if (hasError) {
    console.error(`${colors.red}❌ 포트 검증 실패: 위의 문제를 해결해주세요${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ 모든 포트 검증 완료${colors.reset}`);
    console.log(`${colors.blue}ℹ️  포트 정책: 8000-8999 범위만 사용, 3000-3999 및 9004 사용 금지${colors.reset}`);
  }
}

// 스크립트 실행
if (require.main === module) {
  validateAllPorts().catch((error) => {
    console.error(`${colors.red}오류: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  validatePort,
  checkPortInUse,
  validateAllPorts,
  PORTS,
};