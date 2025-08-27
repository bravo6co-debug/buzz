import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Store, 
  Camera, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  Save,
  Upload,
  X,
  Plus,
  Edit
} from 'lucide-react';
import { Business, BusinessHours } from '@/types';

const mockBusiness: Business = {
  id: 1,
  user_id: 1,
  business_name: '맛있는 한식당',
  description: '전통 한식을 현대적으로 재해석한 맛있는 요리를 제공합니다.',
  address: '서울시 강남구 테헤란로 123',
  phone: '02-1234-5678',
  category: '한식',
  images: [
    'https://images.unsplash.com/photo-1555992733-4f3ade9c5b33?w=300',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300'
  ],
  business_hours: {
    monday: { open: '11:00', close: '22:00' },
    tuesday: { open: '11:00', close: '22:00' },
    wednesday: { open: '11:00', close: '22:00' },
    thursday: { open: '11:00', close: '22:00' },
    friday: { open: '11:00', close: '22:00' },
    saturday: { open: '11:00', close: '23:00' },
    sunday: { open: '12:00', close: '21:00', closed: false }
  },
  rating: 4.5,
  review_count: 128,
  is_approved: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z'
};

const DAYS_KR = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
  saturday: '토요일',
  sunday: '일요일'
};

interface BusinessFormData {
  business_name: string;
  description: string;
  address: string;
  phone: string;
  category: string;
  business_hours: BusinessHours;
}

export function BusinessPage() {
  const [business, setBusiness] = useState<Business>(mockBusiness);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: business.business_name,
    description: business.description || '',
    address: business.address || '',
    phone: business.phone || '',
    category: business.category || '',
    business_hours: business.business_hours || {}
  });

  const { toast } = useToast();

  const handleSave = async () => {
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 실제 API 호출
      // const response = await fetch('/api/business/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      setBusiness({
        ...business,
        ...formData,
        updated_at: new Date().toISOString()
      });
      
      setIsEditing(false);

      toast({
        title: "정보 수정 완료",
        description: "매장 정보가 성공적으로 업데이트되었습니다."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: "매장 정보를 저장할 수 없습니다."
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      business_name: business.business_name,
      description: business.description || '',
      address: business.address || '',
      phone: business.phone || '',
      category: business.category || '',
      business_hours: business.business_hours || {}
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      // 파일 업로드 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 실제 파일 업로드 API 호출
      // const formData = new FormData();
      // Array.from(files).forEach(file => {
      //   formData.append('images', file);
      // });
      // const response = await fetch('/api/business/images', {
      //   method: 'POST',
      //   body: formData
      // });
      // const result = await response.json();

      // 임시로 새 이미지 URL 추가
      const newImages = Array.from(files).map(() => 
        `https://images.unsplash.com/photo-${Date.now()}?w=300`
      );

      setBusiness({
        ...business,
        images: [...(business.images || []), ...newImages]
      });

      toast({
        title: "이미지 업로드 완료",
        description: `${files.length}개의 이미지가 업로드되었습니다.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "업로드 실패",
        description: "이미지를 업로드할 수 없습니다."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(business.images || [])];
    newImages.splice(index, 1);
    setBusiness({
      ...business,
      images: newImages
    });
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData({
      ...formData,
      business_hours: {
        ...formData.business_hours,
        [day]: {
          ...formData.business_hours[day],
          [field]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매장 관리</h1>
          <p className="text-gray-600">매장 정보와 설정을 관리하세요.</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              정보 수정
            </Button>
          )}
        </div>
      </div>

      {/* 매장 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">매장명</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={!isEditing}
                placeholder="예: 한식, 중식, 카페"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">매장 설명</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              rows={3}
              placeholder="매장에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                주소
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                전화번호
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 매장 이미지 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            매장 사진
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {business.images?.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`매장 사진 ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {/* 이미지 추가 버튼 */}
            <label className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="text-center">
                  <Upload className="h-5 w-5 mx-auto mb-1 animate-pulse" />
                  <span className="text-xs">업로드 중...</span>
                </div>
              ) : (
                <div className="text-center">
                  <Plus className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">사진 추가</span>
                </div>
              )}
            </label>
          </div>
          <p className="text-sm text-gray-500">
            최대 8장까지 업로드 가능합니다. 권장 크기: 800x600px 이상
          </p>
        </CardContent>
      </Card>

      {/* 영업시간 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            영업시간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(DAYS_KR).map(([day, dayKr]) => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium">{dayKr}</div>
                
                {formData.business_hours[day]?.closed ? (
                  <div className="flex-1 flex items-center">
                    <span className="text-gray-500">휴무</span>
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => updateBusinessHours(day, 'closed', false)}
                      >
                        영업일로 변경
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="time"
                      value={formData.business_hours[day]?.open || '09:00'}
                      onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                      disabled={!isEditing}
                      className="w-32"
                    />
                    <span className="text-gray-500">~</span>
                    <Input
                      type="time"
                      value={formData.business_hours[day]?.close || '18:00'}
                      onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                      disabled={!isEditing}
                      className="w-32"
                    />
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBusinessHours(day, 'closed', true)}
                      >
                        휴무 설정
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 매장 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>매장 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">평점</p>
              <p className="text-2xl font-bold text-blue-600">
                {business.rating.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">
                {business.review_count}개 리뷰
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">승인 상태</p>
              <p className="text-lg font-bold text-green-600">
                {business.is_approved ? '승인됨' : '승인 대기중'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">등록일</p>
              <p className="text-lg font-bold text-purple-600">
                {new Date(business.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}