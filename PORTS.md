# 📋 Buzz Platform 포트 정책 문서

## 🎯 개요
이 문서는 Buzz Platform의 포트 사용 정책과 관리 방법을 정의합니다.  
**모든 개발자는 이 정책을 준수해야 합니다.**

---

## ⚠️ 중요 공지
**포트 설정은 중앙에서 관리되며, 임의로 변경할 수 없습니다.**  
변경이 필요한 경우 반드시 팀 리더의 승인을 받아야 합니다.

---

## 🚫 금지된 포트

### ❌ 절대 사용 금지 포트
- **3000-3999**: 전체 범위 사용 금지
- **9004**: 특정 포트 사용 금지

### 📝 금지 사유
- 3000번대 포트는 기존 시스템과의 충돌 방지
- 9004 포트는 보안상 이유로 사용 금지
- 포트 표준화를 통한 관리 효율성 향상

---

## ✅ 허용된 포트 범위

### 🎯 서비스 포트 (8000-8999)
모든 애플리케이션 서비스는 8000-8999 범위 내에서만 포트를 사용해야 합니다.

### 🔧 표준 포트 (예외 허용)
- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx)
- **5432**: PostgreSQL
- **6379**: Redis
- **24678**: Vite HMR

---

## 📊 현재 포트 할당표

### 개발 환경 (Development)
| 서비스 | 포트 | 설명 |
|--------|------|------|
| API Server | 8083 | 백엔드 API 서버 |
| Buzz App | 8010 | 고객용 웹 애플리케이션 |
| Buzz-Biz App | 8012 | 사업자용 대시보드 |
| Buzz-Admin App | 8013 | 관리자 대시보드 |
| Buzz Standalone | 8014 | 독립 실행형 앱 |

### 프로덕션 환경 (Production/Docker)
| 서비스 | 포트 | 설명 |
|--------|------|------|
| API Server | 8083 | 백엔드 API 서버 |
| Buzz App | 8080 | 고객용 웹 애플리케이션 |
| Buzz-Biz App | 8082 | 사업자용 대시보드 |
| Buzz-Admin App | 8081 | 관리자 대시보드 |

### Docker 개발 환경
| 서비스 | 외부 포트 | 내부 포트 | 설명 |
|--------|-----------|-----------|------|
| Buzz App | 8090 | 8010 | 개발 컨테이너 |
| Buzz-Admin App | 8091 | 8013 | 개발 컨테이너 |
| Buzz-Biz App | 8092 | 8012 | 개발 컨테이너 |

### 테스트 환경 (Playwright E2E)
| 서비스 | 포트 | 설명 |
|--------|------|------|
| Test API | 8083 | 테스트 API 서버 |
| Test Buzz App | 8106 | 테스트 서버 |
| Test Buzz-Biz | 8105 | 테스트 서버 |
| Test Buzz-Admin | 8104 | 테스트 서버 |
| Test Buzz URL | 8110 | 테스트 Base URL |
| Test Biz URL | 8108 | 테스트 Base URL |
| Test Admin URL | 8109 | 테스트 Base URL |

---

## 🔒 포트 고정 메커니즘

### 1. 중앙 관리 설정
```typescript
// packages/shared/config/ports.config.ts
export const PORTS = Object.freeze({
  API: 8083,
  BUZZ_APP: 8010,
  // ... 모든 포트 정의
});
```

### 2. Vite strictPort 설정
```javascript
// vite.config.ts
server: {
  port: 8010,
  strictPort: true, // 포트 사용 중이면 에러 발생
  host: true,
}
```

### 3. 자동 검증 스크립트
```bash
# 개발 서버 시작 전 자동 실행
npm run dev  # predev 스크립트가 포트 검증 실행
```

### 4. CI/CD 파이프라인 검증
- GitHub Actions에서 자동으로 금지된 포트 사용 검사
- Pull Request 시 포트 정책 위반 체크

---

## 🛠️ 포트 검증 도구

### 수동 검증
```bash
# 포트 검증 스크립트 실행
npm run validate:ports

# 또는 직접 실행
node scripts/validate-ports.js
```

### 검증 항목
1. ✅ 포트 범위 검증 (8000-8999)
2. ✅ 금지된 포트 사용 검사
3. ✅ 포트 사용 가능 여부 확인
4. ✅ 소스 코드 내 금지된 포트 패턴 검색

---

## 📝 포트 변경 절차

### 1. 변경 요청
- 팀 리더에게 포트 변경 사유 설명
- 변경할 포트 번호 제안 (8000-8999 범위 내)

### 2. 승인 후 변경 작업
1. `packages/shared/config/ports.config.ts` 수정
2. 관련 설정 파일 업데이트
3. 포트 검증 스크립트 실행
4. 테스트 실행

### 3. 문서 업데이트
- 이 문서(PORTS.md)의 포트 할당표 업데이트
- README.md 업데이트

### 4. 팀 공지
- 변경된 포트 정보 공유
- 로컬 환경 업데이트 안내

---

## 🚨 트러블슈팅

### 포트 사용 중 오류
```bash
Error: Port 8010 is already in use
```

**해결 방법:**
1. 사용 중인 프로세스 확인
   ```bash
   # Windows
   netstat -ano | findstr :8010
   
   # Mac/Linux
   lsof -i :8010
   ```

2. 프로세스 종료
   ```bash
   # Windows
   taskkill /PID <PID> /F
   
   # Mac/Linux
   kill -9 <PID>
   ```

### strictPort 오류
Vite의 `strictPort: true` 설정으로 인해 포트가 사용 중이면 서버가 시작되지 않습니다.
이는 의도된 동작이며, 포트 정책을 강제하기 위한 것입니다.

---

## 📞 문의

포트 관련 문의사항:
- 팀 리더에게 직접 문의
- 기술 지원팀 채널 활용

---

## 📅 변경 이력

| 날짜 | 버전 | 변경 내용 | 승인자 |
|------|------|-----------|--------|
| 2024-12-29 | 1.0 | 초기 포트 정책 수립 | - |
| 2024-12-29 | 1.1 | 3000번대 → 8000번대 포트 이전 | - |

---

**⚠️ 이 문서는 Buzz Platform의 공식 포트 정책입니다.**  
**무단 변경 시 빌드 실패 및 CI/CD 파이프라인 차단이 발생할 수 있습니다.**