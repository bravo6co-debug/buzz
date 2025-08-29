// 환경별 로깅 유틸리티
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'error',
      enabled: import.meta.env.MODE !== 'production',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `[${timestamp}] ${prefix}[${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '');
      
      // 프로덕션에서는 에러 리포팅 서비스로 전송
      if (import.meta.env.MODE === 'production' && error) {
        this.reportError(message, error);
      }
    }
  }

  private reportError(message: string, error: any): void {
    // 에러 리포팅 서비스 (Sentry, LogRocket 등) 통합
    // 예시: Sentry.captureException(error, { extra: { message } });
    
    // 서버로 에러 로그 전송
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(() => {
      // 로깅 실패 시 조용히 실패
    });
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 특정 모듈용 로거 생성
export const createLogger = (prefix: string): Logger => {
  return new Logger({ prefix });
};

export default logger;