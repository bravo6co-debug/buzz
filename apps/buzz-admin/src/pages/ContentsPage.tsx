import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useContents } from '../hooks/api';
import { RegionalContent } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const ContentCard = ({ content, onEdit, onDelete }: {
  content: RegionalContent;
  onEdit: (content: RegionalContent) => void;
  onDelete: (id: number) => void;
}) => (
  <Card className="overflow-hidden">
    <div className="aspect-video bg-gray-100 flex items-center justify-center">
      {content.images.length > 0 ? (
        <img 
          src={content.images[0]} 
          alt={content.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center text-gray-400">
          <ImageIcon className="w-12 h-12 mb-2" />
          <span className="text-sm">이미지 없음</span>
        </div>
      )}
    </div>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg line-clamp-1">{content.title}</CardTitle>
          <CardDescription className="line-clamp-2 mt-2">
            {content.content.slice(0, 100)}...
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {content.isFeatured && <Badge variant="default">추천</Badge>}
          <Badge variant={content.isActive ? 'outline' : 'secondary'}>
            {content.isActive ? '활성' : '비활성'}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(new Date(content.createdAt), 'yyyy.MM.dd', { locale: ko })}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>보기</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(content)}
            className="flex items-center space-x-1"
          >
            <Edit className="w-4 h-4" />
            <span>수정</span>
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onDelete(content.id)}
            className="flex items-center space-x-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>삭제</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ContentsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: contentsData, isLoading } = useContents();

  const handleEdit = (content: RegionalContent) => {
    console.log('Edit content:', content);
  };

  const handleDelete = (id: number) => {
    console.log('Delete content:', id);
  };

  // Mock data
  const mockContents: RegionalContent[] = [
    {
      id: 1,
      title: '남구의 숨은 맛집 투어',
      content: '남구에서 현지인들만 아는 맛집들을 소개합니다. 대연동의 40년 전통 국밥집부터 문현동의 신상 카페까지, 남구의 진짜 맛을 경험해보세요.',
      images: [],
      contentType: 'tour_course',
      isFeatured: true,
      displayOrder: 1,
      isActive: true,
      createdAt: '2024-03-15T10:30:00Z',
      updatedAt: '2024-03-15T10:30:00Z',
    },
    {
      id: 2,
      title: '용호만 해안산책로 일몰 명소',
      content: '용호만 해안산책로에서 바라보는 부산의 일몰은 정말 아름답습니다. 최고의 포토스팟과 함께 로맨틱한 데이트 코스를 소개합니다.',
      images: [],
      contentType: 'photo_spot',
      isFeatured: false,
      displayOrder: 2,
      isActive: true,
      createdAt: '2024-03-14T15:20:00Z',
      updatedAt: '2024-03-14T15:20:00Z',
    },
    {
      id: 3,
      title: '봄꽃 축제 - 대연동 벚꽃길',
      content: '매년 봄이 되면 대연동 일대가 벚꽃으로 가득 찹니다. 아름다운 벚꽃길을 따라 걸으며 봄의 정취를 만끽해보세요.',
      images: [],
      contentType: 'seasonal_special',
      isFeatured: true,
      displayOrder: 0,
      isActive: true,
      createdAt: '2024-03-12T09:15:00Z',
      updatedAt: '2024-03-13T11:30:00Z',
    },
  ];

  const tourCourses = mockContents.filter(c => c.contentType === 'tour_course');
  const photoSpots = mockContents.filter(c => c.contentType === 'photo_spot');
  const seasonalContents = mockContents.filter(c => c.contentType === 'seasonal_special');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">컨텐츠 관리</h1>
            <p className="text-muted-foreground">지역 추천 컨텐츠를 관리합니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="aspect-video bg-gray-200 animate-pulse"></div>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">컨텐츠 관리</h1>
          <p className="text-muted-foreground">
            남구 지역 추천 컨텐츠를 생성하고 관리합니다.
          </p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>새 컨텐츠 작성</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="컨텐츠 제목으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>필터</span>
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <span>전체</span>
            <Badge variant="secondary">{mockContents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tour" className="flex items-center space-x-2">
            <span>투어 코스</span>
            <Badge variant="outline">{tourCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex items-center space-x-2">
            <span>포토스팟</span>
            <Badge variant="outline">{photoSpots.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center space-x-2">
            <span>계절 특집</span>
            <Badge variant="outline">{seasonalContents.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tour" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tourCourses.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {tourCourses.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">투어 코스가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">새로운 투어 코스 컨텐츠를 작성해보세요.</p>
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                투어 코스 만들기
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="photo" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photoSpots.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonalContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};