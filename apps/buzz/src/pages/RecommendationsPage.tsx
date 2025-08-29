import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, MapPin, Clock, Share2, Heart, Star, Eye, ThumbsUp, Users } from 'lucide-react';
import { regionalApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { shareToSNS } from '../lib/utils';

const contentTypes = [
  { key: 'all', label: '🌟 전체', color: 'text-gray-600' },
  { key: 'food_tour', label: '🍽️ 맛집투어', color: 'text-red-600' },
  { key: 'photo_spot', label: '📸 인스타 핫플', color: 'text-purple-600' },
  { key: 'tour_course', label: '🗺️ 관광코스', color: 'text-blue-600' },
  { key: 'seasonal_special', label: '⭐ 이달의 특집', color: 'text-orange-600' },
  { key: 'shopping', label: '🛍️ 쇼핑&기념품', color: 'text-green-600' },
  { key: 'culture', label: '🎭 문화체험', color: 'text-indigo-600' },
];

export function RecommendationsPage() {
  const [selectedType, setSelectedType] = useState('all');

  const { data: regionalContent, isLoading } = useQuery({
    queryKey: ['regional-content', selectedType],
    queryFn: () => regionalApi.getContent(selectedType === 'all' ? undefined : selectedType)
      .then(res => res.data.data),
  });

  const handleShare = (content: any) => {
    shareToSNS('kakao', {
      title: content.title,
      description: content.content.substring(0, 100) + '...',
      url: window.location.href,
      imageUrl: content.images?.[0],
    });
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'food_tour': return <Heart className="h-5 w-5 text-red-600" />;
      case 'photo_spot': return <Camera className="h-5 w-5 text-purple-600" />;
      case 'tour_course': return <MapPin className="h-5 w-5 text-blue-600" />;
      case 'seasonal_special': return <Star className="h-5 w-5 text-orange-600" />;
      case 'shopping': return <Users className="h-5 w-5 text-green-600" />;
      case 'culture': return <ThumbsUp className="h-5 w-5 text-indigo-600" />;
      default: return <MapPin className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = contentTypes.find(t => t.key === type);
    return found ? found.label : type;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          🌟 부산 관광 추천
        </h1>
        <p className="text-muted-foreground">
          현지 관리자가 직접 선별한 부산의 진짜 핫플레이스를 만나보세요
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {contentTypes.map((type) => (
          <Button
            key={type.key}
            variant={selectedType === type.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type.key)}
            className={`whitespace-nowrap justify-start h-12 ${
              selectedType === type.key 
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg" 
                : "hover:shadow-md"
            }`}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* 콘텐츠 리스트 - 카드 그리드 레이아웃 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse overflow-hidden">
                <div className="h-48 bg-muted"></div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-4/5"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          regionalContent?.map((content) => (
            <Card key={content.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
              {/* 메인 이미지 */}
              {content.images && content.images.length > 0 && (
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={content.images[0]}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* 오버레이 그라데이션 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* 카테고리 뱃지 */}
                  <div className="absolute top-3 left-3 flex items-center space-x-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-medium">
                    {getContentIcon(content.content_type)}
                    <span>{getTypeLabel(content.content_type)}</span>
                  </div>
                  
                  {/* 추천 뱃지 */}
                  {content.is_featured && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      🔥 HOT
                    </div>
                  )}
                  
                  {/* 공유 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(content);
                    }}
                    className="absolute bottom-3 right-3 bg-white/20 backdrop-blur text-white hover:bg-white/30"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <CardContent className="p-4">
                {/* 제목 */}
                <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                  {content.title}
                </h3>
                
                {/* 설명 */}
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                  {content.content}
                </p>

                {/* 메타 정보 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{Math.floor(Math.random() * 1000) + 100}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{Math.floor(Math.random() * 50) + 10}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(content.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* 추가 이미지 미리보기 */}
                {content.images && content.images.length > 1 && (
                  <div className="flex space-x-1 mb-3">
                    {content.images.slice(1, 4).map((image, index) => (
                      <div key={index} className="flex-1 aspect-square max-w-[60px]">
                        <img
                          src={image}
                          alt={`${content.title} ${index + 2}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                    {content.images.length > 4 && (
                      <div className="flex-1 aspect-square max-w-[60px] bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500">
                        +{content.images.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* 액션 버튼 */}
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  size="sm"
                >
                  자세히 보기
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        {regionalContent && regionalContent.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🏖️</div>
            <div className="text-lg font-semibold text-muted-foreground mb-2">
              {selectedType === 'all' ? '아직 추천 장소가 없어요' : `${getTypeLabel(selectedType)} 추천이 없어요`}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              관리자가 열심히 새로운 핫플레이스를 발굴하고 있어요!
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSelectedType('all')}
              className="hover:bg-orange-50 hover:border-orange-300"
            >
              전체 보기로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}