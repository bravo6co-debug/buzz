import { TrendingUp, Users, Store, CreditCard, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Mock data for analytics
const userGrowthData = [
  { month: '1월', users: 1200, newUsers: 150 },
  { month: '2월', users: 1380, newUsers: 180 },
  { month: '3월', users: 1520, newUsers: 140 },
  { month: '4월', users: 1750, newUsers: 230 },
  { month: '5월', users: 1920, newUsers: 170 },
  { month: '6월', users: 2150, newUsers: 230 },
];

const referralData = [
  { date: '3/1', referrals: 12, conversions: 8 },
  { date: '3/2', referrals: 18, conversions: 12 },
  { date: '3/3', referrals: 15, conversions: 10 },
  { date: '3/4', referrals: 22, conversions: 16 },
  { date: '3/5', referrals: 25, conversions: 18 },
  { date: '3/6', referrals: 20, conversions: 14 },
  { date: '3/7', referrals: 28, conversions: 20 },
];

const mileageUsageData = [
  { category: '음식점', used: 4500000, businesses: 45 },
  { category: '카페', used: 2800000, businesses: 28 },
  { category: '편의점', used: 1200000, businesses: 12 },
  { category: '기타', used: 800000, businesses: 8 },
];

export const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">통계 & 분석</h1>
          <p className="text-muted-foreground">
            Buzz 플랫폼의 상세한 통계와 분석 리포트를 확인하세요.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>기간 선택</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>리포트 다운로드</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 회원 증가율</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12.5%</div>
            <p className="text-xs text-muted-foreground">
              지난달 대비 신규 가입자 증가
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">리퍼럴 전환율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.3%</div>
            <p className="text-xs text-muted-foreground">
              추천 링크를 통한 가입 성공률
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 매장 비율</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77.2%</div>
            <p className="text-xs text-muted-foreground">
              월간 거래가 있는 매장 비율
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마일리지 사용률</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73.1%</div>
            <p className="text-xs text-muted-foreground">
              발행 대비 사용 마일리지 비율
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">사용자 분석</TabsTrigger>
          <TabsTrigger value="referrals">리퍼럴 분석</TabsTrigger>
          <TabsTrigger value="mileage">마일리지 분석</TabsTrigger>
          <TabsTrigger value="business">매장 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>월별 사용자 증가</CardTitle>
                <CardDescription>
                  신규 가입자와 총 누적 사용자 현황
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" name="총 사용자" />
                    <Line type="monotone" dataKey="newUsers" stroke="#82ca9d" name="신규 사용자" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 행동 분석</CardTitle>
                <CardDescription>
                  주요 사용자 행동 지표
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">평균 세션 시간</span>
                    <span className="text-sm text-muted-foreground">4분 32초</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">월간 활성 사용자</span>
                    <span className="text-sm text-muted-foreground">1,847명 (86%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">리텐션율 (7일)</span>
                    <span className="text-sm text-muted-foreground">65.3%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">리텐션율 (30일)</span>
                    <span className="text-sm text-muted-foreground">42.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>일별 리퍼럴 성과</CardTitle>
              <CardDescription>
                최근 7일간 리퍼럴 추천 및 전환 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={referralData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="referrals" fill="#8884d8" name="추천 수" />
                  <Bar dataKey="conversions" fill="#82ca9d" name="전환 수" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mileage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 마일리지 사용</CardTitle>
                <CardDescription>
                  매장 카테고리별 마일리지 사용 현황
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mileageUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}원`, '']} />
                    <Bar dataKey="used" fill="#8884d8" name="사용액" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>마일리지 통계</CardTitle>
                <CardDescription>
                  마일리지 발행 및 사용 관련 주요 지표
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">월간 발행액</span>
                    <span className="text-sm text-muted-foreground">12,500,000원</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">월간 사용액</span>
                    <span className="text-sm text-muted-foreground">9,134,000원</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">평균 거래 금액</span>
                    <span className="text-sm text-muted-foreground">15,200원</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">사용자당 평균 잔액</span>
                    <span className="text-sm text-muted-foreground">12,800원</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>매장 현황</CardTitle>
                <CardDescription>
                  등록 및 활성 매장 통계
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">전체 등록 매장</span>
                    <span className="text-sm text-muted-foreground">127개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">승인 완료</span>
                    <span className="text-sm text-muted-foreground">98개 (77%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">승인 대기</span>
                    <span className="text-sm text-muted-foreground">29개 (23%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">월간 신규 등록</span>
                    <span className="text-sm text-muted-foreground">12개</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>인기 카테고리</CardTitle>
                <CardDescription>
                  거래량 기준 인기 매장 카테고리
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: '음식점', count: 45, percentage: 46 },
                    { category: '카페/디저트', count: 28, percentage: 29 },
                    { category: '편의점', count: 12, percentage: 12 },
                    { category: '기타', count: 13, percentage: 13 },
                  ].map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">{item.count}개 ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};