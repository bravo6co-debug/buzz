import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Coins, 
  Gift, 
  Share2, 
  Copy, 
  Users, 
  TrendingUp,
  ChevronRight,
  Clock,
  Check,
  QrCode,
  Calendar
} from 'lucide-react';
import { userApi, referralApi, mileageApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { useQRModal } from '../hooks/use-qr-modal';
import { formatCurrency, shareToSNS, generateReferralLink } from '../lib/utils';

export function MyPage() {
  const [activeTab, setActiveTab] = useState<'referral' | 'mileage' | 'coupons'>('referral');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openMileageQR, openCouponQR } = useQRModal();

  // 데이터 조회
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getProfile().then(res => res.data.data),
  });

  const { data: mileageInfo } = useQuery({
    queryKey: ['user-mileage'],
    queryFn: () => mileageApi.getBalance().then(res => res.data.data),
  });

  const { data: mileageTransactions } = useQuery({
    queryKey: ['mileage-transactions'],
    queryFn: () => mileageApi.getTransactions({ page: 1, limit: 20 }).then(res => res.data.data),
  });

  const { data: coupons } = useQuery({
    queryKey: ['user-coupons'],
    queryFn: () => userApi.getCoupons().then(res => res.data.data),
  });

  const { data: referralStats } = useQuery({
    queryKey: ['user-referrals'],
    queryFn: () => referralApi.getStats().then(res => res.data.data),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: () => referralApi.getLeaderboard(10).then(res => res.data.data),
  });

  // 리퍼럴 링크 생성
  const createReferralLink = useMutation({
    mutationFn: () => referralApi.createLink().then(res => res.data.data),
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.referralLink);
      toast({
        title: "링크 복사 완료!",
        description: "리퍼럴 링크가 클립보드에 복사되었습니다.",
      });
    },
  });

  // SNS 공유 템플릿 생성
  const shareToSNSMutation = useMutation({
    mutationFn: ({ platform, customMessage }: { platform: 'kakao' | 'facebook' | 'twitter' | 'instagram' | 'copy', customMessage?: string }) =>
      referralApi.getShareTemplate(platform, customMessage).then(res => res.data.data),
    onSuccess: (data) => {
      if (data.platform === 'copy') {
        navigator.clipboard.writeText(data.message);
        toast({
          title: "메시지 복사 완료!",
          description: "공유 메시지가 클립보드에 복사되었습니다.",
        });
      } else {
        shareToSNS(data.platform as any, {
          title: data.title,
          description: data.description,
          url: data.shareUrl,
          hashtags: data.hashtags
        });
      }
    },
  });

  const tabs = [
    { key: 'referral' as const, label: '리퍼럴 허브', icon: Share2 },
    { key: 'mileage' as const, label: '마일리지', icon: Coins },
    { key: 'coupons' as const, label: '쿠폰', icon: Gift },
  ];

  const availableCoupons = coupons?.filter(coupon => !coupon.is_used) || [];
  const usedCoupons = coupons?.filter(coupon => coupon.is_used) || [];

  const formatCouponValue = (coupon: any) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% 할인`;
    } else {
      return formatCurrency(coupon.discount_value);
    }
  };

  const getCouponTypeLabel = (type: string) => {
    switch (type) {
      case 'basic': return '기본 쿠폰';
      case 'event': return '이벤트 쿠폰';
      case 'mileage_qr': return '마일리지 쿠폰';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 프로필 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.name || '사용자'}님</h1>
            <p className="text-muted-foreground text-sm">{profile?.email}</p>
          </div>
        </div>
        
        {/* 간단한 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {formatCurrency(mileageInfo?.balance || 0)}
              </p>
              <p className="text-xs text-muted-foreground">보유 마일리지</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-red-600">{availableCoupons.length}</p>
              <p className="text-xs text-muted-foreground">사용가능 쿠폰</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {referralStats?.totalReferred || 0}
              </p>
              <p className="text-xs text-muted-foreground">추천한 친구</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-muted/50 p-1 rounded-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="space-y-4">
        {/* 리퍼럴 허브 */}
        {activeTab === 'referral' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>마케팅 허브</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <h3 className="font-semibold mb-2">친구를 초대하고 마일리지를 받아보세요!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    친구 1명당 500 마일리지, 신규 친구는 3,000 마일리지 지급
                  </p>
                  <Button
                    onClick={() => createReferralLink.mutate()}
                    disabled={createReferralLink.isPending}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {createReferralLink.isPending ? '링크 생성 중...' : '리퍼럴 링크 복사'}
                  </Button>
                </div>

                {/* SNS 공유 버튼들 */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => shareToSNSMutation.mutate({ platform: 'kakao' })}
                    disabled={shareToSNSMutation.isPending}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    카카오 공유
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => shareToSNSMutation.mutate({ platform: 'facebook' })}
                    disabled={shareToSNSMutation.isPending}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    페이스북 공유
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => shareToSNSMutation.mutate({ platform: 'twitter' })}
                    disabled={shareToSNSMutation.isPending}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    트위터 공유
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => shareToSNSMutation.mutate({ platform: 'instagram' })}
                    disabled={shareToSNSMutation.isPending}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    인스타그램
                  </Button>
                </div>
                
                {/* 메시지 복사 버튼 */}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => shareToSNSMutation.mutate({ platform: 'copy' })}
                  disabled={shareToSNSMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  공유 메시지 복사
                </Button>
              </CardContent>
            </Card>

            {/* 리퍼럴 성과 */}
            <Card>
              <CardHeader>
                <CardTitle>리퍼럴 성과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {referralStats?.totalReferred || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">총 추천 인원</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(referralStats?.totalEarned || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">획득 마일리지</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">
                      {referralStats?.thisMonthReferred || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">이번 달 추천</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(referralStats?.thisMonthEarned || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">이번 달 수익</p>
                  </div>
                </div>

                {referralStats?.recentReferrals?.length ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">최근 추천 내역</h4>
                    {referralStats.recentReferrals.slice(0, 3).map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">추천 완료</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <span className="font-semibold text-green-600">
                          +{formatCurrency(referral.reward_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">아직 추천 내역이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 리더보드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>이번 달 리더보드</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard?.leaderboard?.length ? (
                  <div className="space-y-2">
                    {leaderboard.leaderboard.slice(0, 5).map((leader) => (
                      <div key={leader.rank} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            leader.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                            leader.rank === 2 ? 'bg-gray-300 text-gray-700' :
                            leader.rank === 3 ? 'bg-orange-300 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {leader.rank}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{leader.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {leader.referralCount}명 추천
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(leader.totalEarned)}
                        </span>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <p className="text-xs text-muted-foreground">
                        {leaderboard.period} 기준 상위 랭킹
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">아직 리더보드 데이터가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* 마일리지 관리 */}
        {activeTab === 'mileage' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5" />
                    <span>마일리지 잔액</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={openMileageQR}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR코드
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-3xl font-bold text-yellow-600 mb-2">
                    {formatCurrency(mileageInfo?.balance || 0)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    매장에서 QR 코드를 제시해 사용하세요
                  </p>
                </div>
                
                {/* 마일리지 통계 */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(mileageInfo?.totalEarned || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">총 적립</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(mileageInfo?.totalUsed || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">총 사용</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>마일리지 내역</CardTitle>
              </CardHeader>
              <CardContent>
                {mileageTransactions?.transactions?.length ? (
                  <div className="space-y-3">
                    {mileageTransactions.transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border-l-4 border-l-primary/20 bg-muted/30 rounded-r-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            transaction.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium">
                              {transaction.description || '마일리지 거래'}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                              {transaction.businessName && (
                                <>
                                  <span>•</span>
                                  <span>{transaction.businessName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                    
                    {mileageTransactions.pagination?.hasMore && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm">
                          더보기
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Coins className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">아직 마일리지 내역이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* 쿠폰 관리 */}
        {activeTab === 'coupons' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gift className="h-5 w-5" />
                  <span>사용 가능한 쿠폰 ({availableCoupons.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableCoupons.length ? (
                  <div className="space-y-3">
                    {availableCoupons.map((coupon) => (
                      <Card key={coupon.id} className="border-dashed border-red-200 bg-red-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  {getCouponTypeLabel(coupon.coupon_type)}
                                </span>
                                <span className="text-lg font-bold text-red-600">
                                  {formatCouponValue(coupon)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    ~{new Date(coupon.expires_at).toLocaleDateString('ko-KR')} 까지
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => openCouponQR(coupon.id)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Gift className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">사용 가능한 쿠폰이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 사용된 쿠폰 */}
            {usedCoupons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    사용한 쿠폰 ({usedCoupons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usedCoupons.slice(0, 5).map((coupon) => (
                      <div key={coupon.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-75">
                        <div>
                          <span className="text-sm font-medium">
                            {formatCouponValue(coupon)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {coupon.used_at ? new Date(coupon.used_at).toLocaleDateString('ko-KR') : ''} 사용
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}