import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Coins, Gift, Clock, Info, AlertCircle } from 'lucide-react';
import { useQRModal } from '../hooks/use-qr-modal';
import { userApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export function QRModal() {
  const { isOpen, type, data, closeQR } = useQRModal();

  const { data: mileageQRData, isLoading: mileageLoading, error: mileageError } = useQuery({
    queryKey: ['mileage-qr'],
    queryFn: async () => {
      const response = await userApi.getMileageQR();
      return response.data;
    },
    enabled: isOpen && type === 'mileage',
    retry: 2,
    retryDelay: 1000,
  });

  const { data: couponData, isLoading: couponLoading, error: couponError } = useQuery({
    queryKey: ['coupon-qr', data?.couponId],
    queryFn: async () => {
      if (!data?.couponId) throw new Error('No coupon ID provided');
      const response = await userApi.getCouponQR(data.couponId);
      return response.data;
    },
    enabled: isOpen && type === 'coupon' && !!data?.couponId,
    retry: 2,
    retryDelay: 1000,
  });

  const renderQRContent = () => {
    if (type === 'mileage') {
      if (mileageLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-sm text-gray-600">QR 코드 생성 중...</p>
          </div>
        );
      }

      if (mileageError || !mileageQRData) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-2">
                {mileageError?.message || '마일리지 QR 코드를 생성할 수 없습니다.'}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 underline text-sm"
              >
                다시 시도
              </button>
            </div>
          </div>
        );
      }

      return (
        <>
          <DialogHeader className="text-center">
            <DialogTitle className="flex items-center justify-center space-x-2">
              <Coins className="h-6 w-6 text-yellow-600" />
              <span>마일리지 QR 코드</span>
            </DialogTitle>
            <DialogDescription>
              매장에서 이 QR 코드를 제시하여 마일리지를 사용하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 잔액 표시 */}
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  {formatCurrency(mileageQRData.balance || 0)}
                </div>
                <p className="text-sm text-muted-foreground">사용 가능한 마일리지</p>
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground mt-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(mileageQRData.expiresAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} 까지
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* QR 코드 */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              {mileageQRData.qrImage ? (
                <img 
                  src={mileageQRData.qrImage} 
                  alt="Mileage QR Code" 
                  className="w-52 h-52"
                />
              ) : (
                <QRCode
                  value={mileageQRData.qrData || 'loading'}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              )}
            </div>

            {/* 주의사항 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• 매장 사장님에게 QR 코드를 보여주세요</p>
                    <p>• 사용할 금액을 사장님이 입력합니다</p>
                    <p>• 마일리지 잔액 내에서만 사용 가능합니다</p>
                    <p>• QR 코드는 10분간 유효합니다</p>
                    <p>• 1회 사용 후 자동으로 만료됩니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      );
    }

    if (type === 'coupon') {
      if (couponLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-sm text-gray-600">쿠폰 QR 코드 생성 중...</p>
          </div>
        );
      }

      if (couponError || !couponData) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-2">
                {couponError?.message || '쿠폰 QR 코드를 생성할 수 없습니다.'}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 underline text-sm"
              >
                다시 시도
              </button>
            </div>
          </div>
        );
      }

      const formatCouponValue = (coupon: any) => {
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

      return (
        <>
          <DialogHeader className="text-center">
            <DialogTitle className="flex items-center justify-center space-x-2">
              <Gift className="h-6 w-6 text-red-600" />
              <span>할인 쿠폰 QR 코드</span>
            </DialogTitle>
            <DialogDescription>
              매장에서 이 QR 코드를 제시하여 할인을 받으세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 쿠폰 정보 */}
            <Card className="border-dashed border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    {getCouponTypeLabel(couponData.coupon.couponType || '')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {formatCouponValue(couponData.coupon)}
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {couponData.coupon.expiresAt ? 
                      new Date(couponData.coupon.expiresAt).toLocaleDateString('ko-KR') + ' 까지' :
                      '무제한'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* QR 코드 */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              {couponData.qrImage ? (
                <img 
                  src={couponData.qrImage} 
                  alt="Coupon QR Code" 
                  className="w-52 h-52"
                />
              ) : (
                <QRCode
                  value={couponData.qrData || 'loading'}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              )}
            </div>

            {/* 주의사항 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• 매장 결제 시 사장님에게 QR 코드를 보여주세요</p>
                    <p>• 쿠폰은 1회 사용 후 자동으로 삭제됩니다</p>
                    <p>• QR 코드는 10분간 유효합니다</p>
                    <p>• 유효기간을 확인하고 사용하세요</p>
                    <p>• 타 할인과 중복 사용이 불가할 수 있습니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeQR}>
      <DialogContent className="max-w-sm mx-4">
        {renderQRContent()}
      </DialogContent>
    </Dialog>
  );
}