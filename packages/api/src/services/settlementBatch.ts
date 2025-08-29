// 자동 정산 배치 처리 서비스

import { db } from '@buzz/database';
import { 
  businessSettlements, 
  settlementBatchLogs, 
  businesses, 
  mileageTransactions,
  coupons,
  qrTokens
} from '@buzz/database/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { notifySettlementCompleted, notifySettlementFailed } from '../routes/notifications.js';
import { log } from '@buzz/shared/logger';

export interface SettlementCalculation {
  businessId: number;
  amount: number;
  platformFee: number;
  vat: number;
  netAmount: number;
  transactionCount: number;
  mileageUsed: number;
  couponUsed: number;
  transactions: any[];
}

export class SettlementBatchService {
  // 일일 자동 정산 (매일 자정 실행)
  async runDailySettlement(): Promise<void> {
    const startTime = Date.now();
    const batchLog = await this.createBatchLog('daily');
    
    try {
      log.info('🔄 Starting daily settlement batch...');
      
      // 어제 거래 데이터 기준으로 정산
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      
      const settlements = await this.calculateSettlements(yesterday, endOfYesterday);
      
      let processedCount = 0;
      let failedCount = 0;
      let totalAmount = 0;
      const errors: string[] = [];
      
      for (const settlement of settlements) {
        try {
          await this.createSettlement({
            ...settlement,
            settlementType: 'daily',
            settlementPeriodStart: yesterday,
            settlementPeriodEnd: endOfYesterday,
            isAutomatic: true
          });
          
          processedCount++;
          totalAmount += settlement.netAmount;
          
          // 정산 완료 알림 전송
          await notifySettlementCompleted(settlement.businessId, settlement.netAmount);
          
        } catch (error) {
          failedCount++;
          errors.push(`Business ${settlement.businessId}: ${error.message}`);
          log.error(`Failed to process settlement for business ${settlement.businessId}`, error);
        }
      }
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      await this.updateBatchLog(batchLog.id, {
        status: failedCount > 0 ? 'partial' : 'success',
        processedCount,
        failedCount,
        totalAmount,
        errorLog: errors.length > 0 ? errors.join('\n') : null,
        executionTime
      });
      
      log.info(`✅ Daily settlement completed: ${processedCount} processed, ${failedCount} failed, Total: ₩${totalAmount.toLocaleString()}`);
      
    } catch (error) {
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      await this.updateBatchLog(batchLog.id, {
        status: 'failed',
        errorLog: error.message,
        executionTime
      });
      
      log.error('❌ Daily settlement batch failed', error);
      throw error;
    }
  }
  
  // 주간 정산 (매주 월요일 실행)
  async runWeeklySettlement(): Promise<void> {
    const startTime = Date.now();
    const batchLog = await this.createBatchLog('weekly');
    
    try {
      log.info('🔄 Starting weekly settlement batch...');
      
      // 지난주 데이터 기준
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      
      const settlements = await this.calculateSettlements(lastWeekStart, lastWeekEnd);
      
      let processedCount = 0;
      let totalAmount = 0;
      
      for (const settlement of settlements) {
        await this.createSettlement({
          ...settlement,
          settlementType: 'weekly',
          settlementPeriodStart: lastWeekStart,
          settlementPeriodEnd: lastWeekEnd,
          isAutomatic: true
        });
        
        processedCount++;
        totalAmount += settlement.netAmount;
      }
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      await this.updateBatchLog(batchLog.id, {
        status: 'success',
        processedCount,
        totalAmount,
        executionTime
      });
      
      log.info(`✅ Weekly settlement completed: ${processedCount} processed, Total: ₩${totalAmount.toLocaleString()}`);
      
    } catch (error) {
      log.error('❌ Weekly settlement batch failed', error);
      throw error;
    }
  }
  
  // 월간 정산 (매월 1일 실행)
  async runMonthlySettlement(): Promise<void> {
    const startTime = Date.now();
    const batchLog = await this.createBatchLog('monthly');
    
    try {
      log.info('🔄 Starting monthly settlement batch...');
      
      // 지난달 데이터 기준
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      
      const lastMonthEnd = new Date(lastMonth);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
      lastMonthEnd.setDate(0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      
      const settlements = await this.calculateSettlements(lastMonth, lastMonthEnd);
      
      let processedCount = 0;
      let totalAmount = 0;
      
      for (const settlement of settlements) {
        await this.createSettlement({
          ...settlement,
          settlementType: 'monthly',
          settlementPeriodStart: lastMonth,
          settlementPeriodEnd: lastMonthEnd,
          isAutomatic: true
        });
        
        processedCount++;
        totalAmount += settlement.netAmount;
      }
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      await this.updateBatchLog(batchLog.id, {
        status: 'success',
        processedCount,
        totalAmount,
        executionTime
      });
      
      log.info(`✅ Monthly settlement completed: ${processedCount} processed, Total: ₩${totalAmount.toLocaleString()}`);
      
    } catch (error) {
      log.error('❌ Monthly settlement batch failed', error);
      throw error;
    }
  }
  
  // 정산 계산 로직
  private async calculateSettlements(startDate: Date, endDate: Date): Promise<SettlementCalculation[]> {
    // 활성 사업체 목록 가져오기
    const activeBusinesses = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.isActive, true));
    
    const settlements: SettlementCalculation[] = [];
    
    for (const business of activeBusinesses) {
      const calculation = await this.calculateBusinessSettlement(business.id, startDate, endDate);
      
      // 정산할 금액이 있는 경우만 추가
      if (calculation.amount > 0) {
        settlements.push(calculation);
      }
    }
    
    return settlements;
  }
  
  // 개별 사업체 정산 계산
  private async calculateBusinessSettlement(
    businessId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<SettlementCalculation> {
    
    // 마일리지 사용 거래 조회
    const mileageTransactions = await db
      .select()
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.businessId, businessId),
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, startDate),
        lte(mileageTransactions.createdAt, endDate)
      ));
    
    // QR 토큰 사용 조회 (쿠폰 사용)
    const qrTransactions = await db
      .select({
        qr: qrTokens,
        coupon: coupons
      })
      .from(qrTokens)
      .innerJoin(coupons, eq(qrTokens.couponId, coupons.id))
      .where(and(
        eq(qrTokens.businessId, businessId),
        eq(qrTokens.status, 'used'),
        gte(qrTokens.usedAt, startDate),
        lte(qrTokens.usedAt, endDate)
      ));
    
    // 총 거래 금액 계산
    const mileageUsed = mileageTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const couponUsed = qrTransactions.reduce((sum, tx) => sum + tx.coupon.discountAmount, 0);
    const totalAmount = mileageUsed + couponUsed;
    
    // 플랫폼 수수료 계산 (3%)
    const platformFeeRate = 0.03;
    const platformFee = Math.round(totalAmount * platformFeeRate);
    
    // 부가세 계산 (플랫폼 수수료의 10%)
    const vat = Math.round(platformFee * 0.1);
    
    // 실지급액
    const netAmount = totalAmount - platformFee - vat;
    
    return {
      businessId,
      amount: totalAmount,
      platformFee,
      vat,
      netAmount: Math.max(0, netAmount), // 음수 방지
      transactionCount: mileageTransactions.length + qrTransactions.length,
      mileageUsed,
      couponUsed,
      transactions: [...mileageTransactions, ...qrTransactions.map(tx => tx.qr)]
    };
  }
  
  // 정산 데이터 생성
  private async createSettlement(data: {
    businessId: number;
    amount: number;
    platformFee: number;
    vat: number;
    netAmount: number;
    transactionCount: number;
    mileageUsed: number;
    couponUsed: number;
    transactions: any[];
    settlementType: string;
    settlementPeriodStart: Date;
    settlementPeriodEnd: Date;
    isAutomatic: boolean;
  }): Promise<void> {
    
    // 상세 리포트 데이터 생성
    const reportData = {
      summary: {
        totalAmount: data.amount,
        platformFee: data.platformFee,
        vat: data.vat,
        netAmount: data.netAmount,
        feeRate: '3%'
      },
      breakdown: {
        mileageTransactions: data.mileageUsed,
        couponTransactions: data.couponUsed,
        transactionCount: data.transactionCount
      },
      period: {
        start: data.settlementPeriodStart.toISOString(),
        end: data.settlementPeriodEnd.toISOString(),
        type: data.settlementType
      },
      transactions: data.transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount || tx.discountAmount,
        date: tx.createdAt || tx.usedAt,
        type: tx.transactionType || 'coupon'
      }))
    };
    
    // 자동 승인 조건 (10만원 이하)
    const autoApprovalThreshold = 100000;
    const shouldAutoApprove = data.netAmount <= autoApprovalThreshold;
    
    await db.insert(businessSettlements).values({
      businessId: data.businessId,
      settlementType: data.settlementType,
      amount: data.amount,
      platformFee: data.platformFee,
      vat: data.vat,
      netAmount: data.netAmount,
      transactionCount: data.transactionCount,
      mileageUsed: data.mileageUsed,
      couponUsed: data.couponUsed,
      status: shouldAutoApprove ? 'approved' : 'pending',
      isAutomatic: data.isAutomatic,
      settlementPeriodStart: data.settlementPeriodStart,
      settlementPeriodEnd: data.settlementPeriodEnd,
      reportData: JSON.stringify(reportData),
      approvedAt: shouldAutoApprove ? new Date() : null
    });
    
    log.info(`Settlement created for business ${data.businessId}: ₩${data.netAmount.toLocaleString()} (${shouldAutoApprove ? 'auto-approved' : 'pending review'})`);
  }
  
  // 배치 로그 생성
  private async createBatchLog(batchType: string): Promise<{ id: number }> {
    const [log] = await db.insert(settlementBatchLogs).values({
      batchType,
      status: 'started'
    }).returning({ id: settlementBatchLogs.id });
    
    return log;
  }
  
  // 배치 로그 업데이트
  private async updateBatchLog(id: number, data: {
    status: string;
    processedCount?: number;
    failedCount?: number;
    totalAmount?: number;
    errorLog?: string;
    executionTime?: number;
  }): Promise<void> {
    await db.update(settlementBatchLogs)
      .set(data)
      .where(eq(settlementBatchLogs.id, id));
  }
  
  // 배치 작업 상태 조회
  async getBatchStatus(limit: number = 10): Promise<any[]> {
    return await db
      .select()
      .from(settlementBatchLogs)
      .orderBy(desc(settlementBatchLogs.executedAt))
      .limit(limit);
  }
  
  // 실시간 정산 (거래 발생시 즉시 실행)
  async processRealTimeSettlement(businessId: number, transactionId: number, amount: number): Promise<void> {
    try {
      // 실시간 정산은 일정 금액 이상일 때만 처리
      const threshold = 50000; // 5만원 이상
      
      if (amount >= threshold) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        
        const calculation = await this.calculateBusinessSettlement(businessId, today, endOfToday);
        
        if (calculation.netAmount >= threshold) {
          await this.createSettlement({
            ...calculation,
            settlementType: 'realtime',
            settlementPeriodStart: today,
            settlementPeriodEnd: endOfToday,
            isAutomatic: true
          });
          
          log.info(`Real-time settlement created for business ${businessId}: ₩${calculation.netAmount.toLocaleString()}`);
        }
      }
    } catch (error) {
      log.error('Failed to process real-time settlement', error);
    }
  }
}

// 싱글톤 인스턴스
export const settlementBatchService = new SettlementBatchService();