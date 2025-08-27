import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Gift, 
  Calendar, 
  QrCode, 
  CheckCircle, 
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { userApi } from '../lib/api';
import { useQRModal } from '../hooks/use-qr-modal';
import { formatCurrency } from '../lib/utils';

interface Coupon {
  id: number;
  userId: number;
  couponType: 'basic' | 'event' | 'mileage_qr';
  discountType: 'amount' | 'percentage';
  discountValue: number;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function CouponsPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const { openQR } = useQRModal();

  const { data: availableCoupons, isLoading: availableLoading } = useQuery({
    queryKey: ['coupons', 'available'],
    queryFn: async () => {
      const response = await userApi.getCoupons({ status: 'available', limit: 50 });
      return response.data.coupons || [];
    },
    enabled: activeTab === 'available',
  });

  const { data: usedCoupons, isLoading: usedLoading } = useQuery({
    queryKey: ['coupons', 'used'],
    queryFn: async () => {
      const response = await userApi.getCoupons({ status: 'used', limit: 50 });
      return response.data.coupons || [];
    },
    enabled: activeTab === 'used',
  });

  const { data: expiredCoupons, isLoading: expiredLoading } = useQuery({
    queryKey: ['coupons', 'expired'],
    queryFn: async () => {
      const response = await userApi.getCoupons({ status: 'expired', limit: 50 });
      return response.data.coupons || [];
    },
    enabled: activeTab === 'expired',
  });

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% 할인`;
    } else {
      return formatCurrency(coupon.discountValue);
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

  const getCouponTypeColor = (type: string) => {
    switch (type) {
      case 'basic': return 'bg-blue-100 text-blue-700';
      case 'event': return 'bg-purple-100 text-purple-700';
      case 'mileage_qr': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleGenerateQR = (coupon: Coupon) => {
    openQR('coupon', { couponId: coupon.id });
  };

  const renderCouponCard = (coupon: Coupon) => (
    <Card key={coupon.id} className={`relative ${coupon.isUsed ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-red-600" />
            <Badge className={getCouponTypeColor(coupon.couponType)}>
              {getCouponTypeLabel(coupon.couponType)}
            </Badge>
          </div>
          {coupon.couponType === 'event' && (
            <Sparkles className="h-5 w-5 text-purple-600" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {formatCouponValue(coupon)}
          </div>
          {coupon.couponType === 'event' && (
            <p className="text-sm text-purple-600 font-medium">정부 50% 지원</p>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>발급일</span>
            <span>{new Date(coupon.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
          
          {coupon.expiresAt && (
            <div className="flex items-center justify-between">
              <span>만료일</span>
              <span className={isExpired(coupon.expiresAt) ? 'text-red-600' : ''}>
                {new Date(coupon.expiresAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
          
          {coupon.usedAt && (
            <div className="flex items-center justify-between">
              <span>사용일</span>
              <span>{new Date(coupon.usedAt).toLocaleDateString('ko-KR')}</span>
            </div>
          )}
        </div>

        {!coupon.isUsed && !isExpired(coupon.expiresAt) && (
          <Button 
            onClick={() => handleGenerateQR(coupon)}
            className="w-full"
            size="sm"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR 코드 생성
          </Button>
        )}

        {coupon.isUsed && (
          <div className="flex items-center justify-center space-x-2 text-gray-500 p-2 bg-gray-50 rounded">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">사용 완료</span>
          </div>
        )}

        {!coupon.isUsed && isExpired(coupon.expiresAt) && (
          <div className="flex items-center justify-center space-x-2 text-red-500 p-2 bg-red-50 rounded">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">기간 만료</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTabContent = (coupons: Coupon[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-3 text-sm text-gray-600">쿠폰 로딩 중...</p>
        </div>
      );
    }

    if (!coupons || coupons.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Gift className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">쿠폰이 없습니다</p>
          <p className="text-sm text-center">
            {activeTab === 'available' && '사용 가능한 쿠폰이 없습니다.'}
            {activeTab === 'used' && '사용한 쿠폰이 없습니다.'}
            {activeTab === 'expired' && '만료된 쿠폰이 없습니다.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {coupons.map(renderCouponCard)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 쿠폰</h1>
        <p className="text-gray-600">보유한 쿠폰을 확인하고 QR 코드를 생성하세요.</p>
      </div>

      {/* 쿠폰 개요 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {availableCoupons?.length || 0}
            </div>
            <p className="text-sm text-gray-600">사용가능</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {usedCoupons?.length || 0}
            </div>
            <p className="text-sm text-gray-600">사용완료</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {expiredCoupons?.length || 0}
            </div>
            <p className="text-sm text-gray-600">만료</p>
          </CardContent>
        </Card>
      </div>

      {/* 쿠폰 목록 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>사용가능</span>
          </TabsTrigger>
          <TabsTrigger value="used" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>사용완료</span>
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>만료</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {renderTabContent(availableCoupons, availableLoading)}
        </TabsContent>

        <TabsContent value="used" className="mt-6">
          {renderTabContent(usedCoupons, usedLoading)}
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          {renderTabContent(expiredCoupons, expiredLoading)}
        </TabsContent>
      </Tabs>
    </div>
  );
}