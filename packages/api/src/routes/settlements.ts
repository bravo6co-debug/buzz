// 정산 관리 API
import express from 'express';
import { db } from '@buzz/database';
import { 
  businessSettlements, 
  settlementBatchLogs, 
  businesses,
  users 
} from '@buzz/database/schema';
import { eq, and, gte, lte, desc, asc, sql, count } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { settlementBatchService } from '../services/settlementBatch.js';
import { notifySettlementApproved, notifySettlementRejected } from './notifications.js';
import { reportGenerator } from '../services/reportGenerator.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 정산 목록 조회 (사업자용)
router.get('/my', requireAuth, requireRole(['business']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [eq(businessSettlements.businessId, req.user.businessId)];
    
    if (status) {
      whereConditions.push(eq(businessSettlements.status, status as string));
    }
    
    if (type) {
      whereConditions.push(eq(businessSettlements.settlementType, type as string));
    }
    
    const settlements = await db
      .select({
        id: businessSettlements.id,
        settlementType: businessSettlements.settlementType,
        amount: businessSettlements.amount,
        platformFee: businessSettlements.platformFee,
        vat: businessSettlements.vat,
        netAmount: businessSettlements.netAmount,
        transactionCount: businessSettlements.transactionCount,
        status: businessSettlements.status,
        isAutomatic: businessSettlements.isAutomatic,
        settlementPeriodStart: businessSettlements.settlementPeriodStart,
        settlementPeriodEnd: businessSettlements.settlementPeriodEnd,
        requestedAt: businessSettlements.requestedAt,
        approvedAt: businessSettlements.approvedAt,
        paidAt: businessSettlements.paidAt,
        rejectionReason: businessSettlements.rejectionReason,
        approvedBy: users.name
      })
      .from(businessSettlements)
      .leftJoin(users, eq(businessSettlements.approvedBy, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(businessSettlements.createdAt))
      .limit(Number(limit))
      .offset(offset);
    
    const totalCount = await db
      .select({ count: count() })
      .from(businessSettlements)
      .where(and(...whereConditions));
    
    res.json({
      settlements,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount[0].count / Number(limit)),
        totalCount: totalCount[0].count,
        hasNext: offset + settlements.length < totalCount[0].count
      }
    });
    
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// 정산 상세 조회
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    
    const settlement = await db
      .select({
        id: businessSettlements.id,
        business: businesses.name,
        businessId: businessSettlements.businessId,
        settlementType: businessSettlements.settlementType,
        amount: businessSettlements.amount,
        platformFee: businessSettlements.platformFee,
        vat: businessSettlements.vat,
        netAmount: businessSettlements.netAmount,
        transactionCount: businessSettlements.transactionCount,
        mileageUsed: businessSettlements.mileageUsed,
        couponUsed: businessSettlements.couponUsed,
        status: businessSettlements.status,
        isAutomatic: businessSettlements.isAutomatic,
        settlementPeriodStart: businessSettlements.settlementPeriodStart,
        settlementPeriodEnd: businessSettlements.settlementPeriodEnd,
        reportData: businessSettlements.reportData,
        documentUrl: businessSettlements.documentUrl,
        requestedAt: businessSettlements.requestedAt,
        reviewedAt: businessSettlements.reviewedAt,
        approvedAt: businessSettlements.approvedAt,
        paidAt: businessSettlements.paidAt,
        rejectionReason: businessSettlements.rejectionReason,
        approvedBy: users.name,
        createdAt: businessSettlements.createdAt,
        updatedAt: businessSettlements.updatedAt
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .leftJoin(users, eq(businessSettlements.approvedBy, users.id))
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    // 권한 확인 (사업자는 자신의 정산만, 관리자는 모든 정산)
    if (req.user.role === 'business' && settlement[0].businessId !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // reportData JSON 파싱
    const settlementData = {
      ...settlement[0],
      reportData: settlement[0].reportData ? JSON.parse(settlement[0].reportData as string) : null
    };
    
    res.json(settlementData);
    
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({ error: 'Failed to fetch settlement' });
  }
});

// 수동 정산 요청 (사업자용)
router.post('/request', requireAuth, requireRole(['business']), async (req, res) => {
  try {
    const { startDate, endDate, notes } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 기간 유효성 검사
    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // 최대 3개월 이내 데이터만 허용
    const maxDays = 90;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      return res.status(400).json({ error: `Maximum ${maxDays} days period allowed` });
    }
    
    // 중복 정산 요청 확인
    const existingSettlement = await db
      .select({ id: businessSettlements.id })
      .from(businessSettlements)
      .where(and(
        eq(businessSettlements.businessId, req.user.businessId),
        eq(businessSettlements.settlementPeriodStart, start),
        eq(businessSettlements.settlementPeriodEnd, end),
        sql`status IN ('pending', 'reviewing', 'approved')`
      ));
    
    if (existingSettlement.length > 0) {
      return res.status(400).json({ error: 'Settlement already exists for this period' });
    }
    
    // 정산 계산
    const calculation = await settlementBatchService['calculateBusinessSettlement'](
      req.user.businessId, 
      start, 
      end
    );
    
    if (calculation.amount <= 0) {
      return res.status(400).json({ error: 'No transactions found for the specified period' });
    }
    
    // 정산 생성
    await settlementBatchService['createSettlement']({
      ...calculation,
      settlementType: 'manual',
      settlementPeriodStart: start,
      settlementPeriodEnd: end,
      isAutomatic: false
    });
    
    console.log(`Manual settlement requested by business ${req.user.businessId}: ₩${calculation.netAmount.toLocaleString()}`);
    
    res.json({
      message: 'Settlement request submitted successfully',
      settlement: {
        amount: calculation.amount,
        platformFee: calculation.platformFee,
        vat: calculation.vat,
        netAmount: calculation.netAmount,
        transactionCount: calculation.transactionCount,
        period: { start, end }
      }
    });
    
  } catch (error) {
    console.error('Error requesting settlement:', error);
    res.status(500).json({ error: 'Failed to request settlement' });
  }
});

// 관리자용 정산 목록 조회
router.get('/admin/list', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, businessId, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [];
    
    if (status) {
      whereConditions.push(eq(businessSettlements.status, status as string));
    }
    
    if (businessId) {
      whereConditions.push(eq(businessSettlements.businessId, Number(businessId)));
    }
    
    if (startDate) {
      whereConditions.push(gte(businessSettlements.requestedAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      whereConditions.push(lte(businessSettlements.requestedAt, new Date(endDate as string)));
    }
    
    const settlements = await db
      .select({
        id: businessSettlements.id,
        business: businesses.name,
        businessId: businessSettlements.businessId,
        settlementType: businessSettlements.settlementType,
        amount: businessSettlements.amount,
        platformFee: businessSettlements.platformFee,
        vat: businessSettlements.vat,
        netAmount: businessSettlements.netAmount,
        transactionCount: businessSettlements.transactionCount,
        status: businessSettlements.status,
        isAutomatic: businessSettlements.isAutomatic,
        settlementPeriodStart: businessSettlements.settlementPeriodStart,
        settlementPeriodEnd: businessSettlements.settlementPeriodEnd,
        requestedAt: businessSettlements.requestedAt,
        approvedAt: businessSettlements.approvedAt,
        paidAt: businessSettlements.paidAt,
        approvedBy: users.name
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .leftJoin(users, eq(businessSettlements.approvedBy, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(businessSettlements.requestedAt))
      .limit(Number(limit))
      .offset(offset);
    
    const totalCount = await db
      .select({ count: count() })
      .from(businessSettlements)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    // 상태별 통계
    const statusStats = await db
      .select({
        status: businessSettlements.status,
        count: count(),
        totalAmount: sql<number>`SUM(${businessSettlements.netAmount})`
      })
      .from(businessSettlements)
      .groupBy(businessSettlements.status);
    
    res.json({
      settlements,
      statistics: statusStats,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount[0].count / Number(limit)),
        totalCount: totalCount[0].count,
        hasNext: offset + settlements.length < totalCount[0].count
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin settlements:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// 정산 승인 (관리자용)
router.post('/:id/approve', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    const { notes } = req.body;
    
    // 정산 정보 조회
    const settlement = await db
      .select({
        id: businessSettlements.id,
        businessId: businessSettlements.businessId,
        netAmount: businessSettlements.netAmount,
        status: businessSettlements.status
      })
      .from(businessSettlements)
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    if (settlement[0].status !== 'pending') {
      return res.status(400).json({ error: 'Settlement is not in pending status' });
    }
    
    // 승인 처리
    await db
      .update(businessSettlements)
      .set({
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(businessSettlements.id, settlementId));
    
    // 승인 알림 전송
    await notifySettlementApproved(settlement[0].businessId, settlement[0].netAmount);
    
    console.log(`Settlement ${settlementId} approved by admin ${req.user.id}: ₩${settlement[0].netAmount.toLocaleString()}`);
    
    res.json({ 
      message: 'Settlement approved successfully',
      settlementId,
      approvedAmount: settlement[0].netAmount
    });
    
  } catch (error) {
    console.error('Error approving settlement:', error);
    res.status(500).json({ error: 'Failed to approve settlement' });
  }
});

// 정산 반려 (관리자용)
router.post('/:id/reject', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    // 정산 정보 조회
    const settlement = await db
      .select({
        id: businessSettlements.id,
        businessId: businessSettlements.businessId,
        status: businessSettlements.status
      })
      .from(businessSettlements)
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    if (settlement[0].status !== 'pending') {
      return res.status(400).json({ error: 'Settlement is not in pending status' });
    }
    
    // 반려 처리
    await db
      .update(businessSettlements)
      .set({
        status: 'rejected',
        approvedBy: req.user.id,
        rejectionReason: reason,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(businessSettlements.id, settlementId));
    
    // 반려 알림 전송
    await notifySettlementRejected(settlement[0].businessId, reason);
    
    console.log(`Settlement ${settlementId} rejected by admin ${req.user.id}: ${reason}`);
    
    res.json({ 
      message: 'Settlement rejected successfully',
      settlementId,
      reason
    });
    
  } catch (error) {
    console.error('Error rejecting settlement:', error);
    res.status(500).json({ error: 'Failed to reject settlement' });
  }
});

// 정산 지급 완료 처리 (관리자용)
router.post('/:id/mark-paid', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    const { transactionId, notes } = req.body;
    
    // 정산 정보 조회
    const settlement = await db
      .select({
        id: businessSettlements.id,
        businessId: businessSettlements.businessId,
        netAmount: businessSettlements.netAmount,
        status: businessSettlements.status
      })
      .from(businessSettlements)
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    if (settlement[0].status !== 'approved') {
      return res.status(400).json({ error: 'Settlement must be approved before marking as paid' });
    }
    
    // 지급 완료 처리
    await db
      .update(businessSettlements)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(businessSettlements.id, settlementId));
    
    console.log(`Settlement ${settlementId} marked as paid by admin ${req.user.id}: ₩${settlement[0].netAmount.toLocaleString()}`);
    
    res.json({ 
      message: 'Settlement marked as paid successfully',
      settlementId,
      paidAmount: settlement[0].netAmount
    });
    
  } catch (error) {
    console.error('Error marking settlement as paid:', error);
    res.status(500).json({ error: 'Failed to mark settlement as paid' });
  }
});

// 배치 작업 상태 조회 (관리자용)
router.get('/admin/batch-status', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const batchLogs = await settlementBatchService.getBatchStatus(Number(limit));
    
    // 최근 24시간 통계
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStats = await db
      .select({
        batchType: settlementBatchLogs.batchType,
        totalExecutions: count(),
        successCount: sql<number>`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        failedCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
        totalProcessed: sql<number>`SUM(${settlementBatchLogs.processedCount})`,
        totalAmount: sql<number>`SUM(${settlementBatchLogs.totalAmount})`
      })
      .from(settlementBatchLogs)
      .where(gte(settlementBatchLogs.executedAt, last24Hours))
      .groupBy(settlementBatchLogs.batchType);
    
    res.json({
      recentLogs: batchLogs,
      statistics: recentStats
    });
    
  } catch (error) {
    console.error('Error fetching batch status:', error);
    res.status(500).json({ error: 'Failed to fetch batch status' });
  }
});

// 수동 배치 실행 (관리자용)
router.post('/admin/run-batch', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;
    
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({ error: 'Invalid batch type' });
    }
    
    let result;
    
    switch (type) {
      case 'daily':
        result = await settlementBatchService.runDailySettlement();
        break;
      case 'weekly':
        result = await settlementBatchService.runWeeklySettlement();
        break;
      case 'monthly':
        result = await settlementBatchService.runMonthlySettlement();
        break;
    }
    
    console.log(`Manual ${type} batch executed by admin ${req.user.id}`);
    
    res.json({ 
      message: `${type} settlement batch executed successfully`,
      type
    });
    
  } catch (error) {
    console.error('Error running manual batch:', error);
    res.status(500).json({ error: 'Failed to run settlement batch' });
  }
});

// 정산 리포트 생성 (Excel)
router.get('/:id/report/excel', requireAuth, async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    
    // 권한 확인
    const settlement = await db
      .select({ businessId: businessSettlements.businessId })
      .from(businessSettlements)
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    if (req.user.role === 'business' && settlement[0].businessId !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const fileName = await reportGenerator.generateExcelReport(settlementId);
    const downloadUrl = reportGenerator.getReportUrl(fileName);
    
    res.json({
      fileName,
      downloadUrl,
      message: 'Excel report generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// 정산 리포트 생성 (PDF)
router.get('/:id/report/pdf', requireAuth, async (req, res) => {
  try {
    const settlementId = Number(req.params.id);
    
    // 권한 확인
    const settlement = await db
      .select({ businessId: businessSettlements.businessId })
      .from(businessSettlements)
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);
    
    if (!settlement.length) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    
    if (req.user.role === 'business' && settlement[0].businessId !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const fileName = await reportGenerator.generatePDFReport(settlementId);
    const downloadUrl = reportGenerator.getReportUrl(fileName);
    
    res.json({
      fileName,
      downloadUrl,
      message: 'PDF report generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// 월간 종합 리포트 생성 (관리자용)
router.get('/admin/monthly-report/:year/:month', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const format = req.query.format as 'excel' | 'pdf' || 'excel';
    
    if (year < 2020 || year > 2030 || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    
    const fileName = await reportGenerator.generateMonthlyReport(year, month, format);
    const downloadUrl = reportGenerator.getReportUrl(fileName);
    
    res.json({
      fileName,
      downloadUrl,
      message: `Monthly ${format.toUpperCase()} report generated successfully`
    });
    
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

export { router as settlementsRouter };