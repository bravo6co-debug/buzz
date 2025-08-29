/**
 * 포트 중앙 관리 설정 파일
 * 
 * 정책:
 * - 8000-8999 범위만 사용 가능
 * - 3000-3999 범위 사용 금지
 * - 9004 포트 사용 금지
 * 
 * 이 파일의 포트 설정은 절대 변경하지 마세요.
 * 변경이 필요한 경우 팀 리더의 승인이 필요합니다.
 */

// 포트 설정 (읽기 전용)
export const PORTS = Object.freeze({
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
} as const);

// 포트 타입
export type PortConfig = typeof PORTS;
export type PortName = keyof PortConfig;
export type PortNumber = PortConfig[PortName];

// 금지된 포트 범위
const FORBIDDEN_RANGES = [
  { start: 3000, end: 3999, reason: '3000번대 포트는 사용이 금지되어 있습니다' },
] as const;

// 금지된 특정 포트
const FORBIDDEN_PORTS = [
  // { port: 9004, reason: '포트 9004는 사용이 금지되어 있습니다' }, // 예시용 주석 처리
] as const;

// 허용된 포트 범위
const ALLOWED_RANGE = {
  start: 8000,
  end: 8999,
} as const;

// 표준 포트 (예외 허용)
const STANDARD_PORTS = [80, 443, 5432, 6379, 24678] as const;

/**
 * 포트 유효성 검증
 * @param port 검증할 포트 번호
 * @param name 포트 이름 (옵션)
 * @throws {Error} 포트가 유효하지 않은 경우
 */
export function validatePort(port: number, name?: string): void {
  const portName = name ? `${name} (${port})` : `${port}`;
  
  // 표준 포트는 허용
  if (STANDARD_PORTS.includes(port as any)) {
    return;
  }
  
  // 금지된 특정 포트 검사
  for (const forbidden of FORBIDDEN_PORTS) {
    if (port === forbidden.port) {
      throw new Error(`포트 ${portName}: ${forbidden.reason}`);
    }
  }
  
  // 금지된 포트 범위 검사
  for (const range of FORBIDDEN_RANGES) {
    if (port >= range.start && port <= range.end) {
      throw new Error(`포트 ${portName}: ${range.reason}`);
    }
  }
  
  // 허용된 포트 범위 검사
  if (port < ALLOWED_RANGE.start || port > ALLOWED_RANGE.end) {
    throw new Error(
      `포트 ${portName}: ${ALLOWED_RANGE.start}-${ALLOWED_RANGE.end} 범위만 사용 가능합니다`
    );
  }
}

/**
 * 모든 설정된 포트 검증
 * @throws {Error} 유효하지 않은 포트가 있는 경우
 */
export function validateAllPorts(): void {
  for (const [name, port] of Object.entries(PORTS)) {
    validatePort(port, name);
  }
}

/**
 * 포트 설정 가져오기 (읽기 전용)
 * @param name 포트 이름
 * @returns 포트 번호
 */
export function getPort(name: PortName): number {
  return PORTS[name];
}

/**
 * 환경에 따른 포트 가져오기
 * @param service 서비스 이름
 * @param env 환경 (development, production, test)
 * @returns 포트 번호
 */
export function getPortByEnv(
  service: 'buzz' | 'biz' | 'admin' | 'api',
  env: 'development' | 'production' | 'test' = 'development'
): number {
  const portMap = {
    development: {
      buzz: PORTS.BUZZ_APP,
      biz: PORTS.BUZZ_BIZ,
      admin: PORTS.BUZZ_ADMIN,
      api: PORTS.API,
    },
    production: {
      buzz: PORTS.DOCKER_BUZZ,
      biz: PORTS.DOCKER_BIZ,
      admin: PORTS.DOCKER_ADMIN,
      api: PORTS.API,
    },
    test: {
      buzz: PORTS.TEST_BUZZ,
      biz: PORTS.TEST_BIZ,
      admin: PORTS.TEST_ADMIN,
      api: PORTS.API,
    },
  };
  
  return portMap[env][service];
}

// 초기화 시 모든 포트 검증
validateAllPorts();

// 포트 설정 변경 방지를 위한 디버깅 메시지
if (process.env.NODE_ENV === 'development') {
  console.log('✅ 포트 설정이 로드되었습니다. 포트 변경은 금지되어 있습니다.');
}