import { useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  Target, 
  BookOpen, 
  Sparkles,
  Users,
  BarChart3,
  ArrowUp,
  Play,
  Trophy,
  Zap,
  MessageSquare,
  Clock,
  CheckCircle,
  Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// 모의 데이터
const mockData = {
  level: 2,
  levelName: '실버 마케터',
  currentExp: 750,
  nextLevelExp: 1000,
  weeklyConversion: 15.8,
  totalEarnings: 125000,
  thisWeekEarnings: 35000,
  funnel: {
    clicks: 156,
    installs: 45,
    signups: 12,
    purchases: 3
  },
  topContent: [
    { type: '인스타 릴스', views: 3420, conversions: 8 },
    { type: '블로그 포스트', views: 1250, conversions: 4 },
    { type: '스토리', views: 890, conversions: 2 }
  ],
  missions: [
    { id: 1, title: '첫 릴스 만들기', reward: 1000, completed: false },
    { id: 2, title: '10명 유치하기', reward: 5000, completed: false },
    { id: 3, title: 'AI 콘텐츠 생성 사용', reward: 500, completed: true }
  ]
};

export function MarketerPage() {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'ai' | 'education' | 'community'>('dashboard');

  const funnelData = [
    { stage: '클릭', value: mockData.funnel.clicks, percentage: 100 },
    { stage: '설치', value: mockData.funnel.installs, percentage: (mockData.funnel.installs / mockData.funnel.clicks) * 100 },
    { stage: '가입', value: mockData.funnel.signups, percentage: (mockData.funnel.signups / mockData.funnel.clicks) * 100 },
    { stage: '구매', value: mockData.funnel.purchases, percentage: (mockData.funnel.purchases / mockData.funnel.clicks) * 100 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">마케터 대시보드</h1>
              <p className="text-purple-100">마케팅을 배우고 수익을 창출하세요</p>
            </div>
            <div className="text-right">
              <Badge className="bg-yellow-400 text-black mb-2">
                <Trophy className="h-3 w-3 mr-1" />
                {mockData.levelName}
              </Badge>
              <p className="text-sm">이번 주 수익: ₩{mockData.thisWeekEarnings.toLocaleString()}</p>
            </div>
          </div>
          
          {/* 레벨 진행도 */}
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Level {mockData.level}</span>
              <span>{mockData.currentExp}/{mockData.nextLevelExp} XP</span>
            </div>
            <Progress value={(mockData.currentExp / mockData.nextLevelExp) * 100} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 탭 네비게이션 */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <Button
            variant={activeSection === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveSection('dashboard')}
            className="flex items-center"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            대시보드
          </Button>
          <Button
            variant={activeSection === 'ai' ? 'default' : 'outline'}
            onClick={() => setActiveSection('ai')}
            className="flex items-center"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI 도우미
          </Button>
          <Button
            variant={activeSection === 'education' ? 'default' : 'outline'}
            onClick={() => setActiveSection('education')}
            className="flex items-center"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            교육
          </Button>
          <Button
            variant={activeSection === 'community' ? 'default' : 'outline'}
            onClick={() => setActiveSection('community')}
            className="flex items-center"
          >
            <Users className="h-4 w-4 mr-2" />
            커뮤니티
          </Button>
        </div>

        {/* 대시보드 섹션 */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* 주요 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">전환율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center">
                    {mockData.weeklyConversion}%
                    <ArrowUp className="h-4 w-4 text-green-500 ml-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">지난 주 대비 +2.3%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">총 수익</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₩{mockData.totalEarnings.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">누적 수익</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">이번 주 성과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12명</div>
                  <p className="text-xs text-muted-foreground">신규 가입 유도</p>
                </CardContent>
              </Card>
            </div>

            {/* 전환 퍼널 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  전환 퍼널 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnelData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-16 text-sm font-medium">{item.stage}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full flex items-center justify-end pr-2"
                            style={{ width: `${item.percentage}%` }}
                          >
                            <span className="text-white text-xs font-medium">{item.value}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 인기 콘텐츠 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  이번 주 인기 콘텐츠
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.topContent.map((content, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{content.type}</p>
                          <p className="text-sm text-muted-foreground">{content.views.toLocaleString()} 조회</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{content.conversions}명 전환</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI 도우미 섹션 */}
        {activeSection === 'ai' && (
          <div className="space-y-6">
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  AI 콘텐츠 생성기
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">오늘은 어떤 콘텐츠를 만들까요?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    AI가 트렌드에 맞는 콘텐츠 아이디어를 제안해드려요
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      인스타 캡션
                    </Button>
                    <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
                      <Zap className="h-4 w-4 mr-2" />
                      릴스 스크립트
                    </Button>
                    <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
                      📝 블로그 글
                    </Button>
                    <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
                      #️⃣ 해시태그
                    </Button>
                  </div>
                </div>

                {/* AI 추천 */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">🎯 오늘의 추천 전략</h4>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm mb-2">
                      <strong>저녁 7-9시</strong>에 <strong>릴스</strong>를 올려보세요!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      최근 3일간 데이터 분석 결과, 이 시간대 릴스의 전환율이 23% 더 높았어요.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 교육 섹션 */}
        {activeSection === 'education' && (
          <div className="space-y-6">
            {/* 오늘의 미션 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  오늘의 미션
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.missions.map((mission) => (
                    <div key={mission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {mission.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                        <div>
                          <p className={mission.completed ? 'line-through text-muted-foreground' : ''}>
                            {mission.title}
                          </p>
                          <p className="text-xs text-muted-foreground">보상: {mission.reward} 마일리지</p>
                        </div>
                      </div>
                      {!mission.completed && (
                        <Button size="sm" variant="outline">시작하기</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 추천 강의 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  추천 강의
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-20 h-20 bg-purple-200 rounded-lg flex items-center justify-center">
                      <Play className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">인스타그램 릴스 마스터하기</h4>
                      <p className="text-sm text-muted-foreground mb-2">15분 | 초급</p>
                      <div className="flex items-center space-x-2">
                        <Progress value={60} className="flex-1 h-2" />
                        <span className="text-xs">60%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-20 h-20 bg-blue-200 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">카피라이팅 기초</h4>
                      <p className="text-sm text-muted-foreground mb-2">20분 | 초급</p>
                      <Button size="sm" variant="outline">시작하기</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 커뮤니티 섹션 */}
        {activeSection === 'community' && (
          <div className="space-y-6">
            {/* TOP 마케터 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  이번 주 TOP 마케터
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">김민수</p>
                        <p className="text-sm text-muted-foreground">연세대 • 45명 유치</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-400 text-black">🏆 1위</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">박지영</p>
                        <p className="text-sm text-muted-foreground">부산대 • 38명 유치</p>
                      </div>
                    </div>
                    <Badge variant="secondary">2위</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">이준호</p>
                        <p className="text-sm text-muted-foreground">경성대 • 32명 유치</p>
                      </div>
                    </div>
                    <Badge variant="secondary">3위</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 베스트 콘텐츠 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  베스트 콘텐츠
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">부산 맛집 TOP 5 릴스</p>
                        <p className="text-sm text-muted-foreground">by 김민수</p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        2시간 전
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      "부산 여행 오시는 분들 주목! 현지인만 아는 진짜 맛집..."
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span>👁️ 3.2K 조회</span>
                      <span>❤️ 245 좋아요</span>
                      <span>🔄 18 전환</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 플로팅 액션 버튼 */}
        <div className="fixed bottom-20 right-4">
          <Button 
            size="lg"
            className="rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            onClick={() => setActiveSection('ai')}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            AI 콘텐츠 만들기
          </Button>
        </div>
      </div>
    </div>
  );
}

export { MarketerPage };