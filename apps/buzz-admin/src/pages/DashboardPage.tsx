import { Suspense } from 'react';
import { 
  Users, 
  Store, 
  CreditCard, 
  TrendingUp, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useDashboardStats } from '../hooks/api';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Mock data for charts - 실제로는 API에서 받아올 데이터
const referralData = [
  { month: '1월', referrals: 45, rewards: 22500 },
  { month: '2월', referrals: 52, rewards: 26000 },
  { month: '3월', referrals: 48, rewards: 24000 },
  { month: '4월', referrals: 61, rewards: 30500 },
  { month: '5월', referrals: 55, rewards: 27500 },
  { month: '6월', referrals: 67, rewards: 33500 },
];

const mileageData = [
  { month: '1월', issued: 850000, used: 720000 },
  { month: '2월', issued: 920000, used: 780000 },
  { month: '3월', issued: 780000, used: 850000 },
  { month: '4월', issued: 1100000, used: 920000 },
  { month: '5월', issued: 950000, used: 880000 },
  { month: '6월', issued: 1200000, used: 1050000 },
];

const budgetData = [
  { name: '리퍼럴 보상', value: 35, amount: 3500000, color: '#8884d8' },
  { name: '가입 보너스', value: 25, amount: 2500000, color: '#82ca9d' },
  { name: '이벤트 쿠폰', value: 30, amount: 3000000, color: '#ffc658' },
  { name: '운영비', value: 10, amount: 1000000, color: '#ff7300' },
];

const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  description 
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon: React.ElementType;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <div className="flex items-center text-xs text-muted-foreground">
          {changeType === 'increase' ? (
            <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
          ) : (
            <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
          )}
          <span className={changeType === 'increase' ? 'text-green-500' : 'text-red-500'}>
            {change}
          </span>
          <span className="ml-1">전월 대비</span>
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const RecentActivity = () => {
  const recentTransactions = [
    { id: 1, type: 'signup', user: '김철수', amount: 3000, time: '2024-03-15 14:30' },
    { id: 2, type: 'referral', user: '이영희', amount: 500, time: '2024-03-15 13:45' },
    { id: 3, type: 'mileage_use', user: '박민수', amount: -5000, time: '2024-03-15 12:20' },
    { id: 4, type: 'business_approval', user: '맛있는집', amount: 0, time: '2024-03-15 11:15' },
    { id: 5, type: 'settlement', user: '치킨왕', amount: 15000, time: '2024-03-15 10:30' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup': return <Users className="w-4 h-4 text-blue-500" />;
      case 'referral': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'mileage_use': return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'business_approval': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'settlement': return <Store className="w-4 h-4 text-indigo-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'signup': return '신규 가입';
      case 'referral': return '리퍼럴 보상';
      case 'mileage_use': return '마일리지 사용';
      case 'business_approval': return '매장 승인';
      case 'settlement': return '정산 처리';
      default: return '기타';
    }
  };

  return (
    <div className="space-y-4">
      {recentTransactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
          {getActivityIcon(transaction.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getActivityLabel(transaction.type)} - {transaction.user}
            </p>
            <p className="text-sm text-gray-500">
              {format(new Date(transaction.time), 'MM/dd HH:mm', { locale: ko })}
            </p>
          </div>
          <div className="text-sm font-medium">
            {transaction.amount > 0 && '+'}
            {transaction.amount !== 0 && `${transaction.amount.toLocaleString()}원`}
          </div>
        </div>
      ))}
    </div>
  );
};

const DashboardContent = () => {
  const { data: stats, isLoading, error } = useDashboardStats();
  
  // 리퍼럴 데이터 조회
  const { data: referralData } = useQuery({
    queryKey: ['admin-referrals-dashboard'],
    queryFn: () => adminApi.getReferrals({ period: 'month' }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">데이터 로딩 오류</h3>
        <p className="mt-1 text-sm text-gray-500">대시보드 데이터를 불러올 수 없습니다.</p>
        <Button className="mt-4">다시 시도</Button>
      </div>
    );
  }

  // 실제 데이터와 mock 데이터 결합
  const actualStats = stats?.data || {};
  const referralStats = referralData?.data?.summary || {};
  
  const combinedStats = {
    // 실제 데이터 우선 사용, 없으면 mock 데이터
    totalUsers: actualStats.userStats?.totalUsers || 15847,
    userGrowthRate: actualStats.userStats?.newUsersThisMonth || 12.5,
    totalBusinesses: actualStats.businessStats?.totalBusinesses || 127,
    approvedBusinesses: actualStats.businessStats?.approvedBusinesses || 98,
    pendingApprovals: actualStats.businessStats?.pendingApproval || 29,
    totalMileageIssued: actualStats.mileageStats?.totalIssued || 8547000,
    totalMileageUsed: actualStats.mileageStats?.totalUsed || 6234000,
    mileageBalance: actualStats.mileageStats?.currentBalance || 2313000,
    budgetUsed: 10000000, // 예산 관련은 별도 API 필요
    budgetTotal: 15000000,
    // 리퍼럴 통계
    totalReferrals: referralStats.totalReferrals || 387,
    monthlyReferrals: referralStats.periodReferrals || 23,
    referralConversionRate: referralStats.conversionRate || 68.5,
    totalReferralRewards: referralStats.totalRewards || 193500,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="전체 회원수"
          value={combinedStats.totalUsers.toLocaleString()}
          change={`+${combinedStats.userGrowthRate}%`}
          changeType="increase"
          icon={Users}
          description="활성 회원 기준"
        />
        <StatCard
          title="승인 매장수"
          value={combinedStats.approvedBusinesses}
          change="+8개"
          changeType="increase"
          icon={Store}
          description={`대기: ${combinedStats.pendingApprovals}개`}
        />
        <StatCard
          title="마일리지 잔액"
          value={`${(combinedStats.mileageBalance / 10000).toFixed(0)}만원`}
          change="-5.2%"
          changeType="decrease"
          icon={CreditCard}
          description={`리퍼럴 보상: ${combinedStats.totalReferralRewards.toLocaleString()}원`}
        />
        <StatCard
          title="리퍼럴 전환율"
          value={`${combinedStats.referralConversionRate.toFixed(1)}%`}
          change={`+${combinedStats.monthlyReferrals}`}
          changeType="increase"
          icon={TrendingUp}
          description={`총 ${combinedStats.totalReferrals}건 추천 완료`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Performance */}
        <Card>
          <CardHeader>
            <CardTitle>리퍼럴 성과</CardTitle>
            <CardDescription>월별 리퍼럴 추천 및 보상 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={referralData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="referrals" fill="#8884d8" name="추천 건수" />
                <Line yAxisId="right" type="monotone" dataKey="rewards" stroke="#82ca9d" name="보상 금액(원)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mileage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>마일리지 현황</CardTitle>
            <CardDescription>월별 마일리지 발행 및 사용 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mileageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}원`, '']} />
                <Legend />
                <Bar dataKey="issued" fill="#8884d8" name="발행액" />
                <Bar dataKey="used" fill="#82ca9d" name="사용액" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>예산 집행 현황</CardTitle>
            <CardDescription>분야별 예산 사용 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '비율']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>승인 대기</CardTitle>
            <CardDescription>처리가 필요한 항목들</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Store className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">매장 등록 신청</span>
                </div>
                <Badge variant="secondary">{combinedStats.pendingApprovals}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  <span className="text-sm">정산 요청</span>
                </div>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">신고/문의</span>
                </div>
                <Badge variant="destructive">5</Badge>
              </div>
              <Button className="w-full mt-4" variant="outline">
                모든 대기 항목 보기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>실시간 시스템 활동 내역</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">
          Buzz 플랫폼의 전반적인 현황을 한눈에 확인하세요.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
};