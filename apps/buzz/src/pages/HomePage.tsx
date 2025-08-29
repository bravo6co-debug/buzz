import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, Gift, Clock, Phone, ChevronLeft, ChevronRight, Filter, Flame, Award, Utensils, Camera, Tag, TrendingUp } from 'lucide-react';
import { businessApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useBusinessModal } from '../hooks/use-business-modal';
import { useCouponModal } from '../hooks/use-coupon-modal';
import { formatCurrency } from '../lib/utils';
import { Business } from '../types';

export function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { data: featuredBusinesses, isLoading } = useQuery({
    queryKey: ['featured-businesses'],
    queryFn: () => businessApi.getFeatured().then(res => res.data.data),
  });

  const { data: allBusinesses } = useQuery({
    queryKey: ['all-businesses', selectedCategory],
    queryFn: () => businessApi.getAll({ 
      category: selectedCategory === 'all' ? undefined : selectedCategory 
    }).then(res => res.data),
  });

  const { openBusiness } = useBusinessModal();
  const { openCouponModal } = useCouponModal();

  // 자동 슬라이드
  useEffect(() => {
    if (!featuredBusinesses || featuredBusinesses.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredBusinesses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredBusinesses]);

  const categories = [
    { key: 'all', label: '전체', icon: '🍽️' },
    { key: 'korean', label: '한식', icon: '🥘' },
    { key: 'chinese', label: '중식', icon: '🥟' },
    { key: 'japanese', label: '일식', icon: '🍱' },
    { key: 'western', label: '양식', icon: '🍝' },
    { key: 'cafe', label: '카페', icon: '☕' },
    { key: 'bar', label: '술집', icon: '🍺' },
  ];

  const topRatedBusinesses = featuredBusinesses?.filter(b => b.rating >= 4.5).slice(0, 10);
  const discountBusinesses = featuredBusinesses?.filter(b => b.category).slice(0, 6); // 임시로 카테고리가 있는 것들

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 메인 히어로 섹션 - 인기 가게 슬라이드쇼 */}
      {featuredBusinesses && featuredBusinesses.length > 0 && (
        <div className="relative h-[400px] md:h-[500px] overflow-hidden bg-black">
          <div className="absolute inset-0">
            <img
              src={featuredBusinesses[currentSlide]?.images?.[0] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'}
              alt={featuredBusinesses[currentSlide]?.business_name}
              className="w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-12 max-w-6xl mx-auto">
            <div className="text-white">
              <Badge className="mb-3 bg-orange-500 text-white">오늘의 추천</Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                {featuredBusinesses[currentSlide]?.business_name}
              </h1>
              <p className="text-xl mb-4 text-gray-200">
                {featuredBusinesses[currentSlide]?.description || '부산의 맛을 느껴보세요'}
              </p>
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(featuredBusinesses[currentSlide]?.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-400'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-lg font-semibold">
                    {featuredBusinesses[currentSlide]?.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-gray-300">|</span>
                <span>{featuredBusinesses[currentSlide]?.review_count || 0} 리뷰</span>
                <span className="text-gray-300">|</span>
                <Badge variant="secondary">{featuredBusinesses[currentSlide]?.category || '맛집'}</Badge>
              </div>
              <Button 
                size="lg" 
                onClick={() => openBusiness(featuredBusinesses[currentSlide]?.id)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                자세히 보기
              </Button>
            </div>
            
            {/* 슬라이드 컨트롤 */}
            <div className="absolute bottom-8 right-8 flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + featuredBusinesses.length) % featuredBusinesses.length)}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % featuredBusinesses.length)}
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 카테고리 필터 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">카테고리별 맛집 찾기</h2>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedCategory === cat.key ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.key)}
                className="whitespace-nowrap"
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 🔥 실시간 인기 매장 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Flame className="h-6 w-6 text-orange-500 mr-2" />
              실시간 인기 매장
            </h2>
            <Button variant="ghost">전체보기 →</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              featuredBusinesses?.slice(0, 3).map((business) => (
                <Card 
                  key={business.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => openBusiness(business.id)}
                >
                  <div className="relative h-48">
                    <img
                      src={business.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                      alt={business.business_name}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-3 left-3 bg-orange-500 text-white">
                      HOT
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2">{business.business_name}</h3>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(business.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-semibold">{business.rating.toFixed(1)}</span>
                      <span className="ml-1 text-sm text-gray-500">({business.review_count})</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{business.category || '맛집'}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{business.address || '부산'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* ⭐ 평점 TOP 10 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Award className="h-6 w-6 text-yellow-500 mr-2" />
              평점 TOP 10
            </h2>
            <Button variant="ghost">전체보기 →</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topRatedBusinesses?.slice(0, 10).map((business, index) => (
              <Card 
                key={business.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openBusiness(business.id)}
              >
                <CardContent className="p-4">
                  <div className="relative mb-3">
                    <div className="w-full h-24 rounded-lg overflow-hidden">
                      <img
                        src={business.images?.[0] || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200'}
                        alt={business.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Badge className="absolute -top-2 -left-2 bg-yellow-500 text-white text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm truncate mb-1">{business.business_name}</h4>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="ml-1 text-xs font-semibold">{business.rating.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 🎁 할인 쿠폰 제공 매장 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Tag className="h-6 w-6 text-red-500 mr-2" />
              할인 쿠폰 제공 매장
            </h2>
            <Button variant="ghost">전체보기 →</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {discountBusinesses?.map((business) => (
              <Card 
                key={business.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openBusiness(business.id)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-1/3">
                      <img
                        src={business.images?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200'}
                        alt={business.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <Badge className="bg-red-500 text-white mb-2">10% 할인</Badge>
                      <h3 className="font-bold text-lg mb-1">{business.business_name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {business.description || '특별 할인 혜택을 제공하는 매장입니다'}
                      </p>
                      <div className="flex items-center text-sm">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 font-semibold">{business.rating.toFixed(1)}</span>
                        <span className="ml-2 text-gray-500">{business.category}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 📸 인스타 핫플레이스 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Camera className="h-6 w-6 text-purple-500 mr-2" />
              인스타 핫플레이스
            </h2>
            <Button variant="ghost">전체보기 →</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredBusinesses?.slice(0, 8).map((business) => (
              <Card 
                key={business.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openBusiness(business.id)}
              >
                <div className="relative h-48">
                  <img
                    src={business.images?.[0] || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400'}
                    alt={business.business_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h4 className="font-bold text-sm">{business.business_name}</h4>
                    <p className="text-xs opacity-90">{business.category}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 빠른 액세스 버튼들 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center hover:bg-orange-50 hover:border-orange-300"
            onClick={openCouponModal}
          >
            <Gift className="h-6 w-6 mb-2 text-red-500" />
            <span>쿠폰함</span>
          </Button>
          <Button 
            variant="outline"
            className="h-20 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-300"
          >
            <Clock className="h-6 w-6 mb-2 text-blue-500" />
            <span>영업시간</span>
          </Button>
          <Button 
            variant="outline"
            className="h-20 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-300"
          >
            <Phone className="h-6 w-6 mb-2 text-green-500" />
            <span>예약하기</span>
          </Button>
          <Button 
            variant="outline"
            className="h-20 flex flex-col items-center justify-center hover:bg-purple-50 hover:border-purple-300"
          >
            <TrendingUp className="h-6 w-6 mb-2 text-purple-500" />
            <span>실시간 트렌드</span>
          </Button>
        </div>

      </div>
    </div>
  );
}