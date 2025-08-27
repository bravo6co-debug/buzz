import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, MapPin, Clock, Share2, Heart } from 'lucide-react';
import { regionalApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { shareToSNS } from '../lib/utils';

const contentTypes = [
  { key: 'all', label: '전체' },
  { key: 'tour_course', label: '관광코스' },
  { key: 'photo_spot', label: '포토스팟' },
  { key: 'seasonal_special', label: '계절특집' },
  { key: 'food_tour', label: '맛집투어' },
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
      case 'tour_course': return <MapPin className="h-5 w-5 text-blue-600" />;
      case 'photo_spot': return <Camera className="h-5 w-5 text-purple-600" />;
      case 'seasonal_special': return <Clock className="h-5 w-5 text-orange-600" />;
      case 'food_tour': return <Heart className="h-5 w-5 text-red-600" />;
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
        <h1 className="text-2xl font-bold mb-2">남구 지역추천</h1>
        <p className="text-muted-foreground">
          부산 남구의 숨겨진 보석같은 장소들을 발견해보세요
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {contentTypes.map((type) => (
          <Button
            key={type.key}
            variant={selectedType === type.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type.key)}
            className="whitespace-nowrap"
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* 콘텐츠 리스트 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-48 bg-muted rounded-lg"></div>
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
          </div>
        ) : (
          regionalContent?.map((content) => (
            <Card key={content.id} className="overflow-hidden">
              {/* 이미지 */}
              {content.images && content.images.length > 0 && (
                <div className="relative aspect-video">
                  <img
                    src={content.images[0]}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                  {content.is_featured && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                      추천
                    </div>
                  )}
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 mb-2">
                    {getContentIcon(content.content_type)}
                    <span className="text-sm font-medium text-muted-foreground">
                      {getTypeLabel(content.content_type)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(content)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{content.title}</CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {content.content.substring(0, 150)}
                  {content.content.length > 150 && '...'}
                </p>

                {/* 추가 이미지들 */}
                {content.images && content.images.length > 1 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {content.images.slice(1, 4).map((image, index) => (
                      <div key={index} className="aspect-square">
                        <img
                          src={image}
                          alt={`${content.title} ${index + 2}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(content.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                  <Button variant="outline" size="sm">
                    자세히 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {regionalContent && regionalContent.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2">
              {selectedType === 'all' ? '등록된 콘텐츠가 없습니다' : `${getTypeLabel(selectedType)} 콘텐츠가 없습니다`}
            </div>
            <p className="text-sm text-muted-foreground">
              곧 새로운 콘텐츠가 업데이트될 예정입니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}