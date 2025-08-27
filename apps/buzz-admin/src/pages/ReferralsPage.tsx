import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Settings, 
  Shield,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Ban,
  CheckCircle
} from 'lucide-react';
import { adminApi } from '../lib/api';

interface ReferralStats {
  totalReferrals: number;
  totalRewards: number;
  totalBonuses: number;
  periodReferrals: number;
  periodRewards: number;
  conversionRate: number;
}

interface TopReferrer {
  userId: number;
  userName: string;
  referralCount: number;
  totalEarned: number;
  lastReferralAt: string;
}

interface RecentReferral {
  id: number;
  referrerName: string;
  refereeName: string;
  referralCode: string;
  rewardAmount: number;
  signupBonus: number;
  status: string;
  createdAt: string;
}

interface FraudPattern {
  type: string;
  userId: number;
  userName: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  evidence: any;
}

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // 리퍼럴 대시보드 데이터
  const { data: referralData, isLoading } = useQuery({
    queryKey: ['admin-referrals', selectedPeriod],
    queryFn: () => adminApi.getReferrals({ period: selectedPeriod }).then(res => res.data.data),
  });

  // 리퍼럴 설정
  const { data: referralSettings } = useQuery({
    queryKey: ['referral-settings'],
    queryFn: () => adminApi.getReferralSettings().then(res => res.data.data),
  });

  // 부정사용 감지
  const { data: fraudDetection } = useQuery({
    queryKey: ['fraud-detection'],
    queryFn: () => adminApi.getFraudDetection().then(res => res.data.data),
  });

  // 설정 업데이트
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => adminApi.updateReferralSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-settings'] });
    },
  });

  // 리퍼럴 조정
  const adjustReferralMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.adjustReferral(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
    },
  });

  const stats: ReferralStats = referralData?.summary || {
    totalReferrals: 0,
    totalRewards: 0,
    totalBonuses: 0,
    periodReferrals: 0,
    periodRewards: 0,
    conversionRate: 0,
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('ko-KR').format(amount) + '원';

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR');

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">리퍼럴 관리</h1>
          <p className="text-muted-foreground">
            리퍼럴 시스템 현황 및 정책 관리
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 리퍼럴</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              이번 달 +{stats.periodReferrals}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 지급 보상</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRewards)}
            </div>
            <p className="text-xs text-muted-foreground">
              이번 달 +{formatCurrency(stats.periodRewards)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">가입 보너스</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalBonuses)}
            </div>
            <p className="text-xs text-muted-foreground">
              총 지급액
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전환율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              사용자 대비 리퍼럴 비율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">현황</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
          <TabsTrigger value="fraud">부정사용 감지</TabsTrigger>
        </TabsList>

        {/* 현황 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 상위 리퍼러 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>상위 리퍼러</span>
                </CardTitle>
                <CardDescription>
                  {selectedPeriod} 기준 상위 추천자 목록
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referralData?.topReferrers?.map((referrer: TopReferrer, index: number) => (
                    <div key={referrer.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-300 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{referrer.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {referrer.referralCount}명 추천
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(referrer.totalEarned)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(referrer.lastReferralAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 최근 리퍼럴 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>최근 리퍼럴</span>
                </CardTitle>
                <CardDescription>
                  최근 리퍼럴 활동 내역
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referralData?.recentReferrals?.map((referral: RecentReferral) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">
                          {referral.referrerName} → {referral.refereeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          코드: {referral.referralCode} | {formatDate(referral.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                          referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {referral.status === 'completed' ? '완료' :
                           referral.status === 'pending' ? '대기' : '취소'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>리퍼럴 보상 정책</span>
              </CardTitle>
              <CardDescription>
                리퍼럴 시스템 보상 정책을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referralReward">추천인 보상 (마일리지)</Label>
                  <Input
                    id="referralReward"
                    type="number"
                    defaultValue={referralSettings?.settings?.referral_reward?.value || '500'}
                  />
                  <p className="text-xs text-muted-foreground">
                    친구를 추천했을 때 받는 마일리지
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupBonusDefault">일반 가입 보너스</Label>
                  <Input
                    id="signupBonusDefault"
                    type="number"
                    defaultValue={referralSettings?.settings?.signup_bonus_default?.value || '1000'}
                  />
                  <p className="text-xs text-muted-foreground">
                    일반 회원가입 시 지급되는 마일리지
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupBonusReferral">리퍼럴 가입 보너스</Label>
                  <Input
                    id="signupBonusReferral"
                    type="number"
                    defaultValue={referralSettings?.settings?.signup_bonus_referral?.value || '3000'}
                  />
                  <p className="text-xs text-muted-foreground">
                    리퍼럴로 가입 시 지급되는 마일리지
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralEnabled">리퍼럴 시스템 활성화</Label>
                  <select
                    id="referralEnabled"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue={referralSettings?.settings?.referral_enabled?.value || 'true'}
                  >
                    <option value="true">활성화</option>
                    <option value="false">비활성화</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    // 설정 업데이트 로직
                    const formData = new FormData();
                    // ... 폼 데이터 수집 및 전송
                  }}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? '저장 중...' : '설정 저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 부정사용 감지 탭 */}
        <TabsContent value="fraud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>부정사용 감지</span>
              </CardTitle>
              <CardDescription>
                의심스러운 리퍼럴 패턴을 모니터링합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fraudDetection?.riskSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {fraudDetection.riskSummary.highRisk}
                    </p>
                    <p className="text-sm text-muted-foreground">고위험</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {fraudDetection.riskSummary.mediumRisk}
                    </p>
                    <p className="text-sm text-muted-foreground">중위험</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {fraudDetection.riskSummary.lowRisk}
                    </p>
                    <p className="text-sm text-muted-foreground">저위험</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">
                      {fraudDetection.riskSummary.totalSuspicious}
                    </p>
                    <p className="text-sm text-muted-foreground">총 의심사례</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {fraudDetection?.suspiciousPatterns?.map((pattern: FraudPattern, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getRiskBadgeColor(pattern.riskLevel)}>
                          {pattern.riskLevel === 'high' ? '고위험' :
                           pattern.riskLevel === 'medium' ? '중위험' : '저위험'}
                        </Badge>
                        <span className="font-medium">{pattern.userName}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          조정
                        </Button>
                        <Button variant="outline" size="sm">
                          <Ban className="h-4 w-4 mr-1" />
                          제재
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {pattern.description}
                    </p>
                    <div className="text-xs bg-muted p-2 rounded">
                      패턴: {pattern.type} | 증거: {JSON.stringify(pattern.evidence)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}