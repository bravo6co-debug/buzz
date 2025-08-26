import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, Gift, TrendingUp } from 'lucide-react';
import { businessApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useBusinessModal } from '../hooks/use-business-modal';
import { formatCurrency } from '../lib/utils';

export function HomePage() {
  const { data: featuredBusinesses, isLoading } = useQuery({
    queryKey: ['featured-businesses'],
    queryFn: () => businessApi.getFeatured().then(res => res.data.data),
  });

  const { openBusiness } = useBusinessModal();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 남구 대표 배너 */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">부산 남구에 오신 것을 환영합니다!</h2>
          <p className="text-blue-100 mb-4">
            지역 경제 활성화를 위한 바이럴 마케팅 플랫폼 Buzz와 함께하세요
          </p>
          <Button variant="secondary" size="sm">
            지역 둘러보기
          </Button>
        </div>
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* 빠른 액세스 카드들 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium">쿠폰함</p>
            <p className="text-xs text-muted-foreground">사용 가능한 쿠폰 확인</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">추천 리워드</p>
            <p className="text-xs text-muted-foreground">친구 초대하고 마일리지 획득</p>
          </CardContent>
        </Card>
      </div>

      {/* 인기 매장 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">인기 매장</h3>
          <Button variant="ghost" size="sm">전체보기</Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-md"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {featuredBusinesses?.map((business) => (
              <Card
                key={business.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openBusiness(business.id)}
              >
                <CardContent className="p-4">
                  <div className="flex space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                      {business.images && business.images.length > 0 ? (
                        <img 
                          src={business.images[0]} 
                          alt={business.business_name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary/20 rounded"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{business.business_name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{business.rating.toFixed(1)}</span>
                          <span>({business.review_count})</span>
                        </div>
                        {business.category && (
                          <span className="px-2 py-0.5 bg-secondary rounded-full text-xs">
                            {business.category}
                          </span>
                        )}
                      </div>
                      {business.address && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{business.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 지역 특색 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">남구의 특별함을 만나보세요</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-1">관광 코스</h4>
              <p className="text-xs text-muted-foreground">추천 여행지 둘러보기</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-sm mb-1">맛집 투어</h4>
              <p className="text-xs text-muted-foreground">현지인 추천 맛집</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}