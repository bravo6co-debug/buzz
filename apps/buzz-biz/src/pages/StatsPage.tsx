import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Gift, 
  Coins, 
  TrendingUp,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart,
  Line,
  Legend,
  Tooltip
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// 모의 데이터
const dailyStats = {
  today: {
    customer_count: 45,
    coupon_usage: 32,
    mileage_usage: 28,
    total_sales: 850000
  },
  week: {
    customer_count: 285,
    coupon_usage: 198,
    mileage_usage: 167,
    total_sales: 5200000
  },
  month: {
    customer_count: 1240,
    coupon_usage: 892,
    mileage_usage: 756,
    total_sales: 22800000,
    settlement_amount: 3400000
  },
  coupon_breakdown: [
    { type: '기본 쿠폰', count: 145, amount: 435000 },
    { type: '이벤트 쿠폰', count: 78, amount: 234000 },
    { type: '마일리지 사용', count: 132, amount: 1980000 }
  ]
};

const weeklyData = [
  { name: '월', customers: 42, coupons: 28, mileage: 25, sales: 720000 },
  { name: '화', customers: 38, coupons: 32, mileage: 19, sales: 680000 },
  { name: '수', customers: 51, coupons: 41, mileage: 37, sales: 950000 },
  { name: '목', customers: 47, coupons: 35, mileage: 31, sales: 820000 },
  { name: '금', customers: 62, coupons: 48, mileage: 42, sales: 1150000 },
  { name: '토', customers: 73, coupons: 58, mileage: 51, sales: 1380000 },
  { name: '일', customers: 56, coupons: 44, mileage: 38, sales: 1020000 }
];

const monthlyTrend = [
  { month: '10월', customers: 980, sales: 18500000 },
  { month: '11월', customers: 1120, sales: 21200000 },
  { month: '12월', customers: 1350, sales: 25600000 },
  { month: '1월', customers: 1240, sales: 22800000 }
];

export function StatsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const currentStats = selectedPeriod === 'day' ? dailyStats.today : 
                     selectedPeriod === 'week' ? dailyStats.week : 
                     dailyStats.month;

  const pieData = dailyStats.coupon_breakdown.map((item, index) => ({
    name: item.type,
    value: item.count,
    amount: item.amount,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매장 통계</h1>
          <p className="text-gray-600">매장의 상세 통계와 트렌드를 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 기간 선택 */}
      <div className="flex gap-2">
        <Button
          variant={selectedPeriod === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('day')}
        >
          오늘
        </Button>
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('week')}
        >
          이번 주
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('month')}
        >
          이번 달
        </Button>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 고객수</p>
                <p className="text-2xl font-bold">{currentStats.customer_count.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs 지난 {selectedPeriod === 'day' ? '일' : selectedPeriod === 'week' ? '주' : '달'}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">쿠폰 사용</p>
                <p className="text-2xl font-bold">{currentStats.coupon_usage.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs 지난 {selectedPeriod === 'day' ? '일' : selectedPeriod === 'week' ? '주' : '달'}
                </p>
              </div>
              <Gift className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">마일리지 사용</p>
                <p className="text-2xl font-bold">{currentStats.mileage_usage.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +15% vs 지난 {selectedPeriod === 'day' ? '일' : selectedPeriod === 'week' ? '주' : '달'}
                </p>
              </div>
              <Coins className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 매출</p>
                <p className="text-2xl font-bold">{formatCurrency(currentStats.total_sales)}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +18% vs 지난 {selectedPeriod === 'day' ? '일' : selectedPeriod === 'week' ? '주' : '달'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 주간 트렌드 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              주간 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'sales') {
                        return [formatCurrency(value as number), '매출'];
                      }
                      return [value, name === 'customers' ? '고객수' : name === 'coupons' ? '쿠폰' : '마일리지'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="customers" fill="#3B82F6" name="고객수" />
                  <Bar dataKey="coupons" fill="#10B981" name="쿠폰" />
                  <Bar dataKey="mileage" fill="#F59E0B" name="마일리지" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 쿠폰 유형별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              쿠폰 유형별 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}건 (${formatCurrency(props.payload.amount)})`,
                      props.payload.name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            월별 트렌드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'sales') {
                      return [formatCurrency(value as number), '매출'];
                    }
                    return [value, '고객수'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="customers" fill="#3B82F6" name="고객수" />
                <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={3} name="매출" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 상세 통계 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            쿠폰별 상세 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3">유형</th>
                  <th className="text-right py-3">사용 건수</th>
                  <th className="text-right py-3">총 금액</th>
                  <th className="text-right py-3">평균 금액</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.coupon_breakdown.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 font-medium">{item.type}</td>
                    <td className="text-right py-3">{item.count.toLocaleString()}건</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(item.amount)}</td>
                    <td className="text-right py-3">{formatCurrency(Math.round(item.amount / item.count))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 정산 정보 (월간만) */}
      {selectedPeriod === 'month' && (
        <Card>
          <CardHeader>
            <CardTitle>이번 달 정산 예상액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">마일리지 정산</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dailyStats.month.settlement_amount * 0.6)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">이벤트 쿠폰 정산</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(dailyStats.month.settlement_amount * 0.3)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">총 정산 예상액</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dailyStats.month.settlement_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}