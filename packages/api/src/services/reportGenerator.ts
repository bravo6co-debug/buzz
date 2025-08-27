// 정산 리포트 생성 서비스
import { db } from '@buzz/database';
import { 
  businessSettlements, 
  businesses,
  mileageTransactions,
  coupons,
  qrTokens 
} from '@buzz/database/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ReportData {
  settlement: {
    id: number;
    businessName: string;
    businessId: number;
    settlementType: string;
    amount: number;
    platformFee: number;
    vat: number;
    netAmount: number;
    transactionCount: number;
    mileageUsed: number;
    couponUsed: number;
    status: string;
    settlementPeriodStart: Date;
    settlementPeriodEnd: Date;
    requestedAt: Date;
    approvedAt?: Date;
    paidAt?: Date;
  };
  transactions: {
    id: number;
    type: 'mileage' | 'coupon';
    amount: number;
    date: Date;
    description: string;
  }[];
  summary: {
    totalTransactions: number;
    averageTransaction: number;
    mileagePercentage: number;
    couponPercentage: number;
    platformFeeRate: number;
    vatRate: number;
  };
}

export class ReportGenerator {
  private reportsDir = path.join(process.cwd(), 'reports');

  constructor() {
    // 리포트 디렉토리 생성
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // 정산 리포트 데이터 수집
  async getSettlementReportData(settlementId: number): Promise<ReportData> {
    // 정산 기본 정보
    const settlement = await db
      .select({
        id: businessSettlements.id,
        businessName: businesses.name,
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
        settlementPeriodStart: businessSettlements.settlementPeriodStart,
        settlementPeriodEnd: businessSettlements.settlementPeriodEnd,
        requestedAt: businessSettlements.requestedAt,
        approvedAt: businessSettlements.approvedAt,
        paidAt: businessSettlements.paidAt
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .where(eq(businessSettlements.id, settlementId))
      .limit(1);

    if (!settlement.length) {
      throw new Error('Settlement not found');
    }

    const settlementData = settlement[0];

    // 마일리지 거래 내역
    const mileageData = await db
      .select({
        id: mileageTransactions.id,
        amount: mileageTransactions.amount,
        createdAt: mileageTransactions.createdAt,
        description: sql<string>`CONCAT('마일리지 ', ${mileageTransactions.transactionType})`
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.businessId, settlementData.businessId),
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, settlementData.settlementPeriodStart),
        lte(mileageTransactions.createdAt, settlementData.settlementPeriodEnd)
      ));

    // 쿠폰 거래 내역
    const couponData = await db
      .select({
        id: qrTokens.id,
        amount: coupons.discountAmount,
        usedAt: qrTokens.usedAt,
        description: sql<string>`CONCAT('쿠폰 할인 (', ${coupons.title}, ')')`
      })
      .from(qrTokens)
      .innerJoin(coupons, eq(qrTokens.couponId, coupons.id))
      .where(and(
        eq(qrTokens.businessId, settlementData.businessId),
        eq(qrTokens.status, 'used'),
        gte(qrTokens.usedAt, settlementData.settlementPeriodStart),
        lte(qrTokens.usedAt, settlementData.settlementPeriodEnd)
      ));

    // 거래 내역 통합
    const transactions = [
      ...mileageData.map(tx => ({
        id: tx.id,
        type: 'mileage' as const,
        amount: Math.abs(tx.amount),
        date: tx.createdAt,
        description: tx.description
      })),
      ...couponData.map(tx => ({
        id: tx.id,
        type: 'coupon' as const,
        amount: tx.amount,
        date: tx.usedAt!,
        description: tx.description
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // 요약 통계 계산
    const summary = {
      totalTransactions: transactions.length,
      averageTransaction: transactions.length > 0 ? settlementData.amount / transactions.length : 0,
      mileagePercentage: settlementData.amount > 0 ? (settlementData.mileageUsed / settlementData.amount) * 100 : 0,
      couponPercentage: settlementData.amount > 0 ? (settlementData.couponUsed / settlementData.amount) * 100 : 0,
      platformFeeRate: 3.0, // 3% 고정
      vatRate: 10.0 // 10% 고정
    };

    return {
      settlement: settlementData,
      transactions,
      summary
    };
  }

  // Excel 리포트 생성
  async generateExcelReport(settlementId: number): Promise<string> {
    const reportData = await this.getSettlementReportData(settlementId);
    
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 정산 요약 시트
    const summaryData = [
      ['정산 리포트'],
      [''],
      ['기본 정보'],
      ['정산 ID', reportData.settlement.id],
      ['사업체명', reportData.settlement.businessName],
      ['정산 타입', this.getSettlementTypeText(reportData.settlement.settlementType)],
      ['정산 기간', `${this.formatDate(reportData.settlement.settlementPeriodStart)} ~ ${this.formatDate(reportData.settlement.settlementPeriodEnd)}`],
      ['상태', this.getStatusText(reportData.settlement.status)],
      [''],
      ['금액 정보'],
      ['총 거래액', `₩${reportData.settlement.amount.toLocaleString()}`],
      ['플랫폼 수수료 (3%)', `₩${reportData.settlement.platformFee.toLocaleString()}`],
      ['부가세 (10%)', `₩${reportData.settlement.vat.toLocaleString()}`],
      ['실지급액', `₩${reportData.settlement.netAmount.toLocaleString()}`],
      [''],
      ['거래 통계'],
      ['총 거래 건수', reportData.summary.totalTransactions],
      ['평균 거래액', `₩${Math.round(reportData.summary.averageTransaction).toLocaleString()}`],
      ['마일리지 사용액', `₩${reportData.settlement.mileageUsed.toLocaleString()} (${reportData.summary.mileagePercentage.toFixed(1)}%)`],
      ['쿠폰 할인액', `₩${reportData.settlement.couponUsed.toLocaleString()} (${reportData.summary.couponPercentage.toFixed(1)}%)`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '정산 요약');

    // 거래 내역 시트
    const transactionHeaders = ['거래 ID', '타입', '금액', '일시', '설명'];
    const transactionData = [
      transactionHeaders,
      ...reportData.transactions.map(tx => [
        tx.id,
        tx.type === 'mileage' ? '마일리지' : '쿠폰',
        `₩${tx.amount.toLocaleString()}`,
        this.formatDateTime(tx.date),
        tx.description
      ])
    ];

    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, '거래 내역');

    // 파일 저장
    const fileName = `settlement_${settlementId}_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    
    XLSX.writeFile(workbook, filePath);
    
    return fileName;
  }

  // PDF 리포트 생성
  async generatePDFReport(settlementId: number): Promise<string> {
    const reportData = await this.getSettlementReportData(settlementId);
    
    const fileName = `settlement_${settlementId}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);
    
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // 제목
    doc.fontSize(20).font('Helvetica-Bold').text('정산 리포트', 50, 50);
    doc.moveDown();

    // 기본 정보
    doc.fontSize(16).font('Helvetica-Bold').text('기본 정보', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`정산 ID: ${reportData.settlement.id}`);
    doc.text(`사업체명: ${reportData.settlement.businessName}`);
    doc.text(`정산 타입: ${this.getSettlementTypeText(reportData.settlement.settlementType)}`);
    doc.text(`정산 기간: ${this.formatDate(reportData.settlement.settlementPeriodStart)} ~ ${this.formatDate(reportData.settlement.settlementPeriodEnd)}`);
    doc.text(`상태: ${this.getStatusText(reportData.settlement.status)}`);
    doc.moveDown();

    // 금액 정보
    doc.fontSize(16).font('Helvetica-Bold').text('금액 정보', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`총 거래액: ₩${reportData.settlement.amount.toLocaleString()}`);
    doc.text(`플랫폼 수수료 (3%): ₩${reportData.settlement.platformFee.toLocaleString()}`);
    doc.text(`부가세 (10%): ₩${reportData.settlement.vat.toLocaleString()}`);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`실지급액: ₩${reportData.settlement.netAmount.toLocaleString()}`);
    doc.moveDown();

    // 거래 통계
    doc.fontSize(16).font('Helvetica-Bold').text('거래 통계', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`총 거래 건수: ${reportData.summary.totalTransactions}건`);
    doc.text(`평균 거래액: ₩${Math.round(reportData.summary.averageTransaction).toLocaleString()}`);
    doc.text(`마일리지 사용액: ₩${reportData.settlement.mileageUsed.toLocaleString()} (${reportData.summary.mileagePercentage.toFixed(1)}%)`);
    doc.text(`쿠폰 할인액: ₩${reportData.settlement.couponUsed.toLocaleString()} (${reportData.summary.couponPercentage.toFixed(1)}%)`);
    doc.moveDown();

    // 거래 내역 (페이지가 있는 경우만)
    if (reportData.transactions.length > 0 && doc.y < 700) {
      doc.fontSize(16).font('Helvetica-Bold').text('최근 거래 내역', 50, doc.y);
      doc.moveDown(0.5);
      
      // 최대 10개 거래만 표시
      const displayTransactions = reportData.transactions.slice(0, 10);
      
      doc.fontSize(10).font('Helvetica');
      for (const tx of displayTransactions) {
        if (doc.y > 750) {
          doc.addPage();
          doc.y = 50;
        }
        
        doc.text(`${this.formatDateTime(tx.date)} | ${tx.type === 'mileage' ? '마일리지' : '쿠폰'} | ₩${tx.amount.toLocaleString()} | ${tx.description}`);
      }
      
      if (reportData.transactions.length > 10) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Oblique');
        doc.text(`... 그 외 ${reportData.transactions.length - 10}건의 거래가 더 있습니다.`);
      }
    }

    // 생성 일시
    doc.fontSize(8).font('Helvetica-Oblique').text(`생성일시: ${this.formatDateTime(new Date())}`, 50, 750);

    doc.end();
    
    return fileName;
  }

  // 월간 종합 리포트 생성
  async generateMonthlyReport(year: number, month: number, format: 'excel' | 'pdf' = 'excel'): Promise<string> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 월간 정산 데이터
    const monthlySettlements = await db
      .select({
        id: businessSettlements.id,
        businessName: businesses.name,
        settlementType: businessSettlements.settlementType,
        amount: businessSettlements.amount,
        platformFee: businessSettlements.platformFee,
        vat: businessSettlements.vat,
        netAmount: businessSettlements.netAmount,
        transactionCount: businessSettlements.transactionCount,
        status: businessSettlements.status,
        requestedAt: businessSettlements.requestedAt,
        approvedAt: businessSettlements.approvedAt
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .where(and(
        gte(businessSettlements.requestedAt, startDate),
        lte(businessSettlements.requestedAt, endDate)
      ))
      .orderBy(desc(businessSettlements.requestedAt));

    // 통계 계산
    const totalAmount = monthlySettlements.reduce((sum, s) => sum + s.amount, 0);
    const totalPlatformFee = monthlySettlements.reduce((sum, s) => sum + s.platformFee, 0);
    const totalVat = monthlySettlements.reduce((sum, s) => sum + s.vat, 0);
    const totalNetAmount = monthlySettlements.reduce((sum, s) => sum + s.netAmount, 0);
    const totalTransactions = monthlySettlements.reduce((sum, s) => sum + s.transactionCount, 0);

    const statusCounts = monthlySettlements.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (format === 'excel') {
      return this.generateMonthlyExcelReport(
        year, month, monthlySettlements, 
        { totalAmount, totalPlatformFee, totalVat, totalNetAmount, totalTransactions, statusCounts }
      );
    } else {
      return this.generateMonthlyPDFReport(
        year, month, monthlySettlements,
        { totalAmount, totalPlatformFee, totalVat, totalNetAmount, totalTransactions, statusCounts }
      );
    }
  }

  private async generateMonthlyExcelReport(
    year: number, 
    month: number, 
    settlements: any[], 
    summary: any
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();
    
    // 요약 시트
    const summaryData = [
      [`${year}년 ${month}월 정산 종합 리포트`],
      [''],
      ['전체 통계'],
      ['총 정산 건수', settlements.length],
      ['총 거래액', `₩${summary.totalAmount.toLocaleString()}`],
      ['총 플랫폼 수수료', `₩${summary.totalPlatformFee.toLocaleString()}`],
      ['총 부가세', `₩${summary.totalVat.toLocaleString()}`],
      ['총 실지급액', `₩${summary.totalNetAmount.toLocaleString()}`],
      ['총 거래 건수', summary.totalTransactions],
      [''],
      ['상태별 통계'],
      ...Object.entries(summary.statusCounts).map(([status, count]) => [
        this.getStatusText(status), count
      ])
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '월간 요약');

    // 정산 목록 시트
    const settlementHeaders = [
      '정산ID', '사업체명', '타입', '총액', '수수료', '부가세', '실지급액', 
      '거래건수', '상태', '요청일', '승인일'
    ];
    
    const settlementData = [
      settlementHeaders,
      ...settlements.map(s => [
        s.id,
        s.businessName,
        this.getSettlementTypeText(s.settlementType),
        `₩${s.amount.toLocaleString()}`,
        `₩${s.platformFee.toLocaleString()}`,
        `₩${s.vat.toLocaleString()}`,
        `₩${s.netAmount.toLocaleString()}`,
        s.transactionCount,
        this.getStatusText(s.status),
        this.formatDate(s.requestedAt),
        s.approvedAt ? this.formatDate(s.approvedAt) : '-'
      ])
    ];

    const settlementSheet = XLSX.utils.aoa_to_sheet(settlementData);
    XLSX.utils.book_append_sheet(workbook, settlementSheet, '정산 목록');

    const fileName = `monthly_report_${year}_${month.toString().padStart(2, '0')}_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    
    XLSX.writeFile(workbook, filePath);
    
    return fileName;
  }

  private async generateMonthlyPDFReport(
    year: number, 
    month: number, 
    settlements: any[], 
    summary: any
  ): Promise<string> {
    const fileName = `monthly_report_${year}_${month.toString().padStart(2, '0')}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);
    
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // 제목
    doc.fontSize(20).font('Helvetica-Bold').text(`${year}년 ${month}월 정산 종합 리포트`, 50, 50);
    doc.moveDown();

    // 전체 통계
    doc.fontSize(16).font('Helvetica-Bold').text('전체 통계', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`총 정산 건수: ${settlements.length}건`);
    doc.text(`총 거래액: ₩${summary.totalAmount.toLocaleString()}`);
    doc.text(`총 플랫폼 수수료: ₩${summary.totalPlatformFee.toLocaleString()}`);
    doc.text(`총 부가세: ₩${summary.totalVat.toLocaleString()}`);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`총 실지급액: ₩${summary.totalNetAmount.toLocaleString()}`);
    doc.moveDown();

    // 상태별 통계
    doc.fontSize(16).font('Helvetica-Bold').text('상태별 통계', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica');
    for (const [status, count] of Object.entries(summary.statusCounts)) {
      doc.text(`${this.getStatusText(status)}: ${count}건`);
    }

    doc.end();
    
    return fileName;
  }

  // 리포트 파일 다운로드 URL 반환
  getReportUrl(fileName: string): string {
    return `/api/reports/download/${fileName}`;
  }

  // 리포트 파일 정리 (30일 이상 된 파일 삭제)
  async cleanupOldReports(): Promise<void> {
    try {
      const files = fs.readdirSync(this.reportsDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old report: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }

  // 유틸리티 메서드들
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ko-KR');
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('ko-KR');
  }

  private getSettlementTypeText(type: string): string {
    const types = {
      daily: '일일 정산',
      weekly: '주간 정산',
      monthly: '월간 정산',
      manual: '수동 정산',
      realtime: '실시간 정산'
    };
    return types[type] || type;
  }

  private getStatusText(status: string): string {
    const statuses = {
      pending: '대기',
      reviewing: '검토중',
      approved: '승인',
      paid: '지급완료',
      rejected: '반려'
    };
    return statuses[status] || status;
  }
}

// 싱글톤 인스턴스
export const reportGenerator = new ReportGenerator();