// 고급 통계 분석 서비스
import { db } from '@buzz/database';
import { 
  businessSettlements,
  businesses,
  users,
  referrals,
  mileageTransactions,
  coupons,
  qrTokens,
  businessReviews
} from '@buzz/database/schema';
import { eq, and, gte, lte, desc, asc, sql, count, sum, avg } from 'drizzle-orm';

export interface DashboardMetrics {
  overview: {
    totalUsers: number;
    totalBusinesses: number;
    totalSettlements: number;
    totalRevenue: number;
    monthlyGrowth: {
      users: number;
      businesses: number;
      revenue: number;
    };
  };
  settlements: {
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
    totalAmount: number;
    averageAmount: number;
  };
  referrals: {
    totalReferrals: number;
    successRate: number;
    topReferrers: Array<{
      userId: number;
      name: string;
      referralCount: number;
      conversionRate: number;
    }>;
  };
  businesses: {
    active: number;
    topPerforming: Array<{
      businessId: number;
      name: string;
      totalRevenue: number;
      averageRating: number;
      reviewCount: number;
    }>;
  };
  trends: {
    dailyTransactions: Array<{
      date: string;
      mileage: number;
      coupon: number;
      total: number;
    }>;
    weeklyRevenue: Array<{
      week: string;
      revenue: number;
      settlements: number;
    }>;
  };
}

export interface BusinessAnalytics {
  businessId: number;
  businessName: string;
  performance: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    monthlyGrowth: number;
  };
  settlements: {
    pending: number;
    approved: number;
    paid: number;
    totalPaid: number;
  };
  customers: {
    totalCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
    responseRate: number;
  };
  trends: {
    last7Days: Array<{
      date: string;
      transactions: number;
      revenue: number;
    }>;
    last12Months: Array<{
      month: string;
      revenue: number;
      transactions: number;
    }>;
  };
}

export interface UserAnalytics {
  userId: number;
  userName: string;
  activity: {
    totalSpent: number;
    totalTransactions: number;
    averageSpending: number;
    lastActivity: Date;
  };
  referrals: {
    totalReferrals: number;
    successfulReferrals: number;
    conversionRate: number;
    earnedMileage: number;
  };
  mileage: {
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  preferences: {
    favoriteBusinesses: Array<{
      businessId: number;
      name: string;
      visitCount: number;
    }>;
    spending_pattern: {
      mostActiveDay: string;
      mostActiveHour: number;
      averageSessionValue: number;
    };
  };
}

export class AnalyticsService {
  // 관리자 대시보드 종합 통계
  async getDashboardMetrics(startDate?: Date, endDate?: Date): Promise<DashboardMetrics> {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1); // 이번 달 시작
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // 이번 달 마지막

    const periodStart = startDate || defaultStart;
    const periodEnd = endDate || defaultEnd;

    // 이전 기간 (성장률 계산용)
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
    const prevPeriodEnd = new Date(periodEnd);
    prevPeriodEnd.setMonth(prevPeriodEnd.getMonth() - 1);

    // 전체 개요 통계
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalBusinesses] = await db.select({ count: count() }).from(businesses).where(eq(businesses.isActive, true));
    const [totalSettlements] = await db.select({ count: count() }).from(businessSettlements);
    const [totalRevenueResult] = await db.select({ 
      total: sql<number>`SUM(${businessSettlements.netAmount})` 
    }).from(businessSettlements).where(eq(businessSettlements.status, 'paid'));

    // 이번 달 신규 사용자/사업체
    const [currentMonthUsers] = await db.select({ count: count() })
      .from(users)
      .where(and(gte(users.createdAt, periodStart), lte(users.createdAt, periodEnd)));
    
    const [currentMonthBusinesses] = await db.select({ count: count() })
      .from(businesses)
      .where(and(gte(businesses.createdAt, periodStart), lte(businesses.createdAt, periodEnd)));

    const [currentMonthRevenue] = await db.select({ 
      total: sql<number>`COALESCE(SUM(${businessSettlements.netAmount}), 0)` 
    }).from(businessSettlements)
      .where(and(
        eq(businessSettlements.status, 'paid'),
        gte(businessSettlements.paidAt, periodStart),
        lte(businessSettlements.paidAt, periodEnd)
      ));

    // 지난 달 통계 (성장률 계산)
    const [prevMonthUsers] = await db.select({ count: count() })
      .from(users)
      .where(and(gte(users.createdAt, prevPeriodStart), lte(users.createdAt, prevPeriodEnd)));
    
    const [prevMonthRevenue] = await db.select({ 
      total: sql<number>`COALESCE(SUM(${businessSettlements.netAmount}), 0)` 
    }).from(businessSettlements)
      .where(and(
        eq(businessSettlements.status, 'paid'),
        gte(businessSettlements.paidAt, prevPeriodStart),
        lte(businessSettlements.paidAt, prevPeriodEnd)
      ));

    // 정산 상태별 통계
    const settlementStats = await db
      .select({
        status: businessSettlements.status,
        count: count(),
        total: sql<number>`COALESCE(SUM(${businessSettlements.netAmount}), 0)`
      })
      .from(businessSettlements)
      .groupBy(businessSettlements.status);

    const settlementsByStatus = settlementStats.reduce((acc, stat) => {
      acc[stat.status] = { count: stat.count, total: stat.total };
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // 평균 정산 금액
    const [avgSettlement] = await db.select({ 
      avg: sql<number>`COALESCE(AVG(${businessSettlements.netAmount}), 0)` 
    }).from(businessSettlements);

    // 리퍼럴 통계
    const [totalReferralsResult] = await db.select({ count: count() }).from(referrals);
    const [successfulReferrals] = await db.select({ count: count() })
      .from(referrals)
      .where(sql`${referrals.bonusAwarded} = true`);

    // 상위 리퍼러
    const topReferrers = await db
      .select({
        userId: referrals.referrerId,
        name: users.name,
        referralCount: count(),
        successCount: sql<number>`SUM(CASE WHEN ${referrals.bonusAwarded} THEN 1 ELSE 0 END)`
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .groupBy(referrals.referrerId, users.name)
      .orderBy(desc(count()))
      .limit(10);

    // 상위 성과 사업체
    const topBusinesses = await db
      .select({
        businessId: businessSettlements.businessId,
        name: businesses.name,
        totalRevenue: sql<number>`SUM(${businessSettlements.netAmount})`,
        avgRating: sql<number>`COALESCE(AVG(${businessReviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(DISTINCT ${businessReviews.id})`
      })
      .from(businessSettlements)
      .innerJoin(businesses, eq(businessSettlements.businessId, businesses.id))
      .leftJoin(businessReviews, eq(businesses.id, businessReviews.businessId))
      .where(eq(businessSettlements.status, 'paid'))
      .groupBy(businessSettlements.businessId, businesses.name)
      .orderBy(desc(sql`SUM(${businessSettlements.netAmount})`))
      .limit(10);

    // 일별 거래 트렌드 (최근 30일)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyMileage = await db
      .select({
        date: sql<string>`DATE(${mileageTransactions.createdAt})`,
        total: sql<number>`SUM(ABS(${mileageTransactions.amount}))`
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${mileageTransactions.createdAt})`);

    const dailyCoupons = await db
      .select({
        date: sql<string>`DATE(${qrTokens.usedAt})`,
        total: sql<number>`SUM(${coupons.discountAmount})`
      })
      .from(qrTokens)
      .innerJoin(coupons, eq(qrTokens.couponId, coupons.id))
      .where(and(
        eq(qrTokens.status, 'used'),
        gte(qrTokens.usedAt, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${qrTokens.usedAt})`);

    // 일별 데이터 통합
    const dailyTrends = this.mergeDailyTrends(dailyMileage, dailyCoupons, thirtyDaysAgo, now);

    // 주별 매출 트렌드 (최근 12주)
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    
    const weeklyRevenue = await db
      .select({
        week: sql<string>`DATE_TRUNC('week', ${businessSettlements.paidAt})`,
        revenue: sql<number>`SUM(${businessSettlements.netAmount})`,
        settlements: count()
      })
      .from(businessSettlements)
      .where(and(
        eq(businessSettlements.status, 'paid'),
        gte(businessSettlements.paidAt, twelveWeeksAgo)
      ))
      .groupBy(sql`DATE_TRUNC('week', ${businessSettlements.paidAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${businessSettlements.paidAt})`);

    return {
      overview: {
        totalUsers: totalUsers.count,
        totalBusinesses: totalBusinesses.count,
        totalSettlements: totalSettlements.count,
        totalRevenue: totalRevenueResult.total || 0,
        monthlyGrowth: {
          users: this.calculateGrowthRate(currentMonthUsers.count, prevMonthUsers.count),
          businesses: this.calculateGrowthRate(currentMonthBusinesses.count, 0), // 신규 사업체 성장률은 별도 계산 필요
          revenue: this.calculateGrowthRate(currentMonthRevenue.total, prevMonthRevenue.total)
        }
      },
      settlements: {
        pending: settlementsByStatus.pending?.count || 0,
        approved: settlementsByStatus.approved?.count || 0,
        paid: settlementsByStatus.paid?.count || 0,
        rejected: settlementsByStatus.rejected?.count || 0,
        totalAmount: settlementsByStatus.paid?.total || 0,
        averageAmount: avgSettlement.avg
      },
      referrals: {
        totalReferrals: totalReferralsResult.count,
        successRate: totalReferralsResult.count > 0 ? (successfulReferrals.count / totalReferralsResult.count) * 100 : 0,
        topReferrers: topReferrers.map(r => ({
          userId: r.userId,
          name: r.name,
          referralCount: r.referralCount,
          conversionRate: r.referralCount > 0 ? (r.successCount / r.referralCount) * 100 : 0
        }))
      },
      businesses: {
        active: totalBusinesses.count,
        topPerforming: topBusinesses.map(b => ({
          businessId: b.businessId,
          name: b.name,
          totalRevenue: b.totalRevenue,
          averageRating: Number(b.avgRating.toFixed(1)),
          reviewCount: b.reviewCount
        }))
      },
      trends: {
        dailyTransactions: dailyTrends,
        weeklyRevenue: weeklyRevenue.map(w => ({
          week: w.week,
          revenue: w.revenue,
          settlements: w.settlements
        }))
      }
    };
  }

  // 사업체별 상세 분석
  async getBusinessAnalytics(businessId: number, months: number = 12): Promise<BusinessAnalytics> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = now;

    // 사업체 기본 정보
    const business = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business.length) {
      throw new Error('Business not found');
    }

    // 성과 지표
    const [revenueStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${businessSettlements.netAmount}), 0)`,
        totalTransactions: sql<number>`COALESCE(SUM(${businessSettlements.transactionCount}), 0)`
      })
      .from(businessSettlements)
      .where(and(
        eq(businessSettlements.businessId, businessId),
        eq(businessSettlements.status, 'paid'),
        gte(businessSettlements.paidAt, startDate)
      ));

    // 정산 상태별 통계
    const settlementStats = await db
      .select({
        status: businessSettlements.status,
        count: count(),
        total: sql<number>`COALESCE(SUM(${businessSettlements.netAmount}), 0)`
      })
      .from(businessSettlements)
      .where(eq(businessSettlements.businessId, businessId))
      .groupBy(businessSettlements.status);

    const settlementsByStatus = settlementStats.reduce((acc, stat) => {
      acc[stat.status] = { count: stat.count, total: stat.total };
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // 고객 분석
    const uniqueCustomers = await db
      .select({
        userId: mileageTransactions.userId,
        transactionCount: count()
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.businessId, businessId),
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, startDate)
      ))
      .groupBy(mileageTransactions.userId);

    const totalCustomers = uniqueCustomers.length;
    const repeatCustomers = uniqueCustomers.filter(c => c.transactionCount > 1).length;

    // 리뷰 통계
    const [reviewStats] = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${businessReviews.rating}), 0)`,
        totalReviews: count(),
        responseCount: sql<number>`SUM(CASE WHEN ${businessReviews.businessReply} IS NOT NULL THEN 1 ELSE 0 END)`
      })
      .from(businessReviews)
      .where(eq(businessReviews.businessId, businessId));

    // 최근 7일 트렌드
    const last7Days = await this.getLast7DaysTrend(businessId);

    // 최근 12개월 트렌드
    const last12Months = await this.getLast12MonthsTrend(businessId);

    // 월별 성장률 계산
    const monthlyGrowth = this.calculateMonthlyGrowth(last12Months);

    return {
      businessId,
      businessName: business[0].name,
      performance: {
        totalRevenue: revenueStats.totalRevenue,
        totalTransactions: revenueStats.totalTransactions,
        averageTransaction: revenueStats.totalTransactions > 0 ? revenueStats.totalRevenue / revenueStats.totalTransactions : 0,
        monthlyGrowth
      },
      settlements: {
        pending: settlementsByStatus.pending?.count || 0,
        approved: settlementsByStatus.approved?.count || 0,
        paid: settlementsByStatus.paid?.count || 0,
        totalPaid: settlementsByStatus.paid?.total || 0
      },
      customers: {
        totalCustomers,
        repeatCustomers,
        retentionRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0
      },
      reviews: {
        averageRating: Number(reviewStats.avgRating.toFixed(1)),
        totalReviews: reviewStats.totalReviews,
        responseRate: reviewStats.totalReviews > 0 ? (reviewStats.responseCount / reviewStats.totalReviews) * 100 : 0
      },
      trends: {
        last7Days,
        last12Months
      }
    };
  }

  // 사용자별 분석
  async getUserAnalytics(userId: number): Promise<UserAnalytics> {
    // 사용자 기본 정보
    const user = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error('User not found');
    }

    // 활동 통계
    const [activityStats] = await db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(ABS(${mileageTransactions.amount})), 0)`,
        totalTransactions: count(),
        lastActivity: sql<Date>`MAX(${mileageTransactions.createdAt})`
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.userId, userId),
        eq(mileageTransactions.transactionType, 'use')
      ));

    // 리퍼럴 통계
    const [referralStats] = await db
      .select({
        totalReferrals: count(),
        successfulReferrals: sql<number>`SUM(CASE WHEN ${referrals.bonusAwarded} THEN 1 ELSE 0 END)`,
        earnedMileage: sql<number>`COALESCE(SUM(CASE WHEN ${referrals.bonusAwarded} THEN 500 ELSE 0 END), 0)`
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // 마일리지 잔액 및 통계
    const [mileageStats] = await db
      .select({
        currentBalance: sql<number>`COALESCE(SUM(${mileageTransactions.amount}), 0)`,
        totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${mileageTransactions.amount} > 0 THEN ${mileageTransactions.amount} ELSE 0 END), 0)`,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${mileageTransactions.amount} < 0 THEN ABS(${mileageTransactions.amount}) ELSE 0 END), 0)`
      })
      .from(mileageTransactions)
      .where(eq(mileageTransactions.userId, userId));

    // 자주 이용하는 사업체
    const favoriteBusinesses = await db
      .select({
        businessId: mileageTransactions.businessId,
        name: businesses.name,
        visitCount: count()
      })
      .from(mileageTransactions)
      .innerJoin(businesses, eq(mileageTransactions.businessId, businesses.id))
      .where(and(
        eq(mileageTransactions.userId, userId),
        eq(mileageTransactions.transactionType, 'use')
      ))
      .groupBy(mileageTransactions.businessId, businesses.name)
      .orderBy(desc(count()))
      .limit(5);

    return {
      userId,
      userName: user[0].name,
      activity: {
        totalSpent: activityStats.totalSpent,
        totalTransactions: activityStats.totalTransactions,
        averageSpending: activityStats.totalTransactions > 0 ? activityStats.totalSpent / activityStats.totalTransactions : 0,
        lastActivity: activityStats.lastActivity
      },
      referrals: {
        totalReferrals: referralStats.totalReferrals,
        successfulReferrals: referralStats.successfulReferrals,
        conversionRate: referralStats.totalReferrals > 0 ? (referralStats.successfulReferrals / referralStats.totalReferrals) * 100 : 0,
        earnedMileage: referralStats.earnedMileage
      },
      mileage: {
        currentBalance: mileageStats.currentBalance,
        totalEarned: mileageStats.totalEarned,
        totalSpent: mileageStats.totalSpent
      },
      preferences: {
        favoriteBusinesses: favoriteBusinesses.map(b => ({
          businessId: b.businessId,
          name: b.name,
          visitCount: b.visitCount
        })),
        spending_pattern: {
          mostActiveDay: 'Monday', // 실제로는 별도 계산 필요
          mostActiveHour: 14, // 실제로는 별도 계산 필요
          averageSessionValue: activityStats.totalTransactions > 0 ? activityStats.totalSpent / activityStats.totalTransactions : 0
        }
      }
    };
  }

  // 유틸리티 메서드들
  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private mergeDailyTrends(mileageData: any[], couponData: any[], startDate: Date, endDate: Date) {
    const trends = [];
    const mileageMap = new Map(mileageData.map(d => [d.date, d.total]));
    const couponMap = new Map(couponData.map(d => [d.date, d.total]));
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const mileage = mileageMap.get(dateStr) || 0;
      const coupon = couponMap.get(dateStr) || 0;
      
      trends.push({
        date: dateStr,
        mileage,
        coupon,
        total: mileage + coupon
      });
    }
    
    return trends;
  }

  private async getLast7DaysTrend(businessId: number) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return await db
      .select({
        date: sql<string>`DATE(${mileageTransactions.createdAt})`,
        transactions: count(),
        revenue: sql<number>`SUM(ABS(${mileageTransactions.amount}))`
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.businessId, businessId),
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, sevenDaysAgo)
      ))
      .groupBy(sql`DATE(${mileageTransactions.createdAt})`)
      .orderBy(sql`DATE(${mileageTransactions.createdAt})`);
  }

  private async getLast12MonthsTrend(businessId: number) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    return await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${mileageTransactions.createdAt})`,
        revenue: sql<number>`SUM(ABS(${mileageTransactions.amount}))`,
        transactions: count()
      })
      .from(mileageTransactions)
      .where(and(
        eq(mileageTransactions.businessId, businessId),
        eq(mileageTransactions.transactionType, 'use'),
        gte(mileageTransactions.createdAt, twelveMonthsAgo)
      ))
      .groupBy(sql`DATE_TRUNC('month', ${mileageTransactions.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${mileageTransactions.createdAt})`);
  }

  private calculateMonthlyGrowth(monthlyData: any[]): number {
    if (monthlyData.length < 2) return 0;
    
    const latest = monthlyData[monthlyData.length - 1];
    const previous = monthlyData[monthlyData.length - 2];
    
    return this.calculateGrowthRate(latest.revenue, previous.revenue);
  }
}

// 싱글톤 인스턴스
export const analyticsService = new AnalyticsService();