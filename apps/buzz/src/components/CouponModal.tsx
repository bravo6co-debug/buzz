import { useState } from 'react';
import { X, Gift, QrCode, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { formatCurrency } from '../lib/utils';

interface Coupon {
  id: number;
  title: string;
  discount_amount: number;
  discount_type: 'amount' | 'percentage';
  business_name: string;
  business_address?: string;
  expires_at: string;
  is_used: boolean;
  qr_code?: string;
}

const mockCoupons: Coupon[] = [
  {
    id: 1,
    title: '🎉 웰컴 할인 쿠폰',
    discount_amount: 5000,
    discount_type: 'amount',
    business_name: '맛있는 한식당',
    business_address: '부산시 남구 대연동',
    expires_at: '2024-03-31T23:59:59Z',
    is_used: false,
    qr_code: 'WELCOME5000'
  },
  {
    id: 2,
    title: '신규 회원 특별 할인',
    discount_amount: 10,
    discount_type: 'percentage',
    business_name: '부산 해물 전문점',
    business_address: '부산시 남구 용호동',
    expires_at: '2024-04-15T23:59:59Z',
    is_used: false,
    qr_code: 'NEWMEMBER10'
  },
  {
    id: 3,
    title: '관광객 환영 쿠폰',
    discount_amount: 3000,
    discount_type: 'amount',
    business_name: '전통 찻집',
    business_address: '부산시 남구 문현동',
    expires_at: '2024-05-01T23:59:59Z',
    is_used: false,
    qr_code: 'TOURIST3000'
  }
];

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const handleCouponClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowQR(true);
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setSelectedCoupon(null);
  };

  const formatDiscount = (coupon: Coupon) => {
    return coupon.discount_type === 'amount' 
      ? formatCurrency(coupon.discount_amount)
      : `${coupon.discount_amount}%`;
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {!showQR ? (
        // 쿠폰 목록 모달
        <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-red-500" />
              내 쿠폰함
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-3">
              {mockCoupons.map((coupon) => (
                <Card 
                  key={coupon.id} 
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    coupon.is_used ? 'opacity-50 bg-gray-50' : 'hover:scale-[1.02]'
                  }`}
                  onClick={() => !coupon.is_used && handleCouponClick(coupon)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{coupon.title}</h3>
                        <p className="text-lg font-bold text-red-600 mb-2">
                          {formatDiscount(coupon)} 할인
                        </p>
                        <p className="text-sm text-gray-700 mb-1">{coupon.business_name}</p>
                        {coupon.business_address && (
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            {coupon.business_address}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatExpiryDate(coupon.expires_at)}까지
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {!coupon.is_used && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs mb-2">
                            사용가능
                          </div>
                        )}
                        <QrCode className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs text-center text-gray-600">
              💡 쿠폰을 클릭하면 QR 코드를 볼 수 있습니다
            </p>
          </div>
        </div>
      ) : (
        // QR 코드 모달
        <div className="bg-white rounded-lg max-w-sm w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">쿠폰 사용</h2>
            <Button variant="ghost" size="sm" onClick={handleCloseQR}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {selectedCoupon && (
            <div className="text-center">
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">{selectedCoupon.title}</h3>
                <p className="text-2xl font-bold text-red-600 mb-2">
                  {formatDiscount(selectedCoupon)} 할인
                </p>
                <p className="text-gray-600 mb-4">{selectedCoupon.business_name}</p>
              </div>
              
              {/* QR 코드 영역 - 실제로는 QR 라이브러리 사용 */}
              <div className="w-48 h-48 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">QR 코드</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedCoupon.qr_code}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <p>매장에서 이 QR 코드를 보여주세요</p>
                <p className="text-xs mt-1">
                  유효기간: {formatExpiryDate(selectedCoupon.expires_at)}
                </p>
              </div>
              
              <Button 
                onClick={handleCloseQR}
                className="w-full"
              >
                확인
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}