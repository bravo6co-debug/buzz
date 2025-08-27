import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Gift, 
  Navigation,
  Calendar 
} from 'lucide-react';
import { useBusinessModal } from '../hooks/use-business-modal';
import { businessApi } from '../lib/api';

export function BusinessModal() {
  const { isOpen, businessId, closeBusiness } = useBusinessModal();

  const { data: businessData, isLoading } = useQuery({
    queryKey: ['business-detail', businessId],
    queryFn: () => businessApi.getById(businessId!).then(res => res.data.data),
    enabled: !!businessId,
  });

  const business = businessData?.business;
  const reviews = businessData?.reviews || [];
  const availableCoupons = businessData?.availableCoupons || [];

  const openInMaps = (address: string) => {
    // 카카오맵 또는 구글맵으로 길찾기
    const encodedAddress = encodeURIComponent(address);
    if (navigator.userAgent.includes('KAKAO')) {
      window.open(`kakaomap://search?q=${encodedAddress}`);
    } else {
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`);
    }
  };

  const formatBusinessHours = (hours: any) => {
    if (!hours) return '영업시간 정보 없음';
    
    const today = new Date().getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const todayKey = dayNames[today];
    
    if (hours[todayKey]) {
      const todayHours = hours[todayKey];
      if (todayHours.closed) {
        return '오늘 휴무';
      }
      return `${todayHours.open} - ${todayHours.close}`;
    }
    
    return '영업시간 정보 없음';
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeBusiness}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-lg animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ) : business ? (
          <>
            {/* 매장 이미지 */}
            {business.images && business.images.length > 0 && (
              <div className="relative -mx-6 -mt-6 mb-4">
                <img
                  src={business.images[0]}
                  alt={business.business_name}
                  className="w-full h-48 object-cover"
                />
                {!business.is_approved && (
                  <div className="absolute top-3 right-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    승인 대기중
                  </div>
                )}
              </div>
            )}

            <DialogHeader>
              <DialogTitle className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{business.business_name}</h2>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{business.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({business.review_count})</span>
                    </div>
                    {business.category && (
                      <span className="px-2 py-0.5 bg-secondary rounded-full text-xs">
                        {business.category}
                      </span>
                    )}
                  </div>
                </div>
              </DialogTitle>
              {business.description && (
                <DialogDescription className="text-left">
                  {business.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* 기본 정보 */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {business.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm">{business.address}</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto text-primary"
                          onClick={() => openInMaps(business.address!)}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          길찾기
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {business.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{business.phone}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatBusinessHours(business.business_hours)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 사용 가능한 쿠폰 */}
              {availableCoupons.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Gift className="h-4 w-4 text-red-500" />
                      <h3 className="font-medium">사용 가능한 쿠폰</h3>
                    </div>
                    <div className="space-y-2">
                      {availableCoupons.map((coupon, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                          <div>
                            <p className="text-sm font-medium text-red-700">
                              {coupon.discount_type === 'percentage' 
                                ? `${coupon.discount_value}% 할인`
                                : `${coupon.discount_value.toLocaleString()}원 할인`
                              }
                            </p>
                            <p className="text-xs text-red-600">
                              {coupon.coupon_type === 'basic' ? '기본 쿠폰' : '이벤트 쿠폰'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 최근 리뷰 */}
              {reviews.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">최근 리뷰</h3>
                    <div className="space-y-3">
                      {reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="border-l-4 border-l-primary/20 pl-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${
                                    i < review.rating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-muted-foreground/30'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {review.user_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          {review.review_text && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {review.review_text}
                            </p>
                          )}
                          {/* 리뷰 이미지 */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex space-x-2 mt-2">
                              {review.images.slice(0, 3).map((image, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={image}
                                  alt={`리뷰 이미지 ${imgIndex + 1}`}
                                  className="w-12 h-12 object-cover rounded-md"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {reviews.length > 3 && (
                        <Button variant="outline" size="sm" className="w-full">
                          리뷰 더보기 ({reviews.length - 3}개 더)
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 추가 이미지 */}
              {business.images && business.images.length > 1 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">매장 사진</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {business.images.slice(1).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${business.business_name} ${index + 2}`}
                          className="w-full h-20 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">매장 정보를 불러올 수 없습니다.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}