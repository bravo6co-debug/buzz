import { pgTable, serial, integer, varchar, timestamp, decimal, text, boolean, json } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { users } from './users';

export const businessSettlements = pgTable('business_settlements', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').references(() => businesses.id).notNull(),
  settlementType: varchar('settlement_type', { length: 20 }).notNull(), // daily, weekly, monthly, manual
  amount: integer('amount').notNull(), // 정산 금액 (원)
  platformFee: integer('platform_fee').default(0), // 플랫폼 수수료
  vat: integer('vat').default(0), // 부가세
  netAmount: integer('net_amount').notNull(), // 실지급액
  
  // 거래 정보
  transactionCount: integer('transaction_count').default(0), // 거래 건수
  mileageUsed: integer('mileage_used').default(0), // 사용된 마일리지
  couponUsed: integer('coupon_used').default(0), // 사용된 쿠폰 금액
  
  // 승인 워크플로우
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, reviewing, approved, paid, rejected
  approvedBy: integer('approved_by').references(() => users.id), // 승인자
  rejectionReason: text('rejection_reason'), // 반려 사유
  
  // 자동화 관련
  isAutomatic: boolean('is_automatic').default(true), // 자동 정산 여부
  settlementPeriodStart: timestamp('settlement_period_start').notNull(), // 정산 시작일
  settlementPeriodEnd: timestamp('settlement_period_end').notNull(), // 정산 종료일
  
  // 리포트 데이터
  reportData: json('report_data'), // 상세 정산 데이터 (JSON)
  documentUrl: varchar('document_url', { length: 500 }), // 정산서 URL
  
  // 타임스탬프
  requestedAt: timestamp('requested_at').default(sql`NOW()`).notNull(),
  reviewedAt: timestamp('reviewed_at'),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 정산 배치 작업 로그
export const settlementBatchLogs = pgTable('settlement_batch_logs', {
  id: serial('id').primaryKey(),
  batchType: varchar('batch_type', { length: 20 }).notNull(), // daily, weekly, monthly
  executedAt: timestamp('executed_at').default(sql`NOW()`).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // success, failed, partial
  processedCount: integer('processed_count').default(0),
  failedCount: integer('failed_count').default(0),
  totalAmount: integer('total_amount').default(0),
  errorLog: text('error_log'),
  executionTime: integer('execution_time'), // 실행 시간 (초)
});

// 실시간 모니터링 데이터
export const systemMetrics = pgTable('system_metrics', {
  id: serial('id').primaryKey(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // api_response_time, db_query_time, active_users, etc.
  metricValue: decimal('metric_value', { precision: 10, scale: 2 }).notNull(),
  metricUnit: varchar('metric_unit', { length: 20 }), // ms, count, percentage, etc.
  tags: json('tags'), // 추가 메타데이터
  recordedAt: timestamp('recorded_at').default(sql`NOW()`).notNull(),
});

// 백업 작업 로그
export const backupLogs = pgTable('backup_logs', {
  id: serial('id').primaryKey(),
  backupType: varchar('backup_type', { length: 20 }).notNull(), // database, files, full
  status: varchar('status', { length: 20 }).notNull(), // started, completed, failed
  fileSize: bigint('file_size', { mode: 'number' }), // 백업 파일 크기 (bytes)
  filePath: varchar('file_path', { length: 500 }), // 백업 파일 경로
  startedAt: timestamp('started_at').default(sql`NOW()`).notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
});