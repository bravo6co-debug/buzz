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
import { Coins, Gift, Clock, Info } from 'lucide-react';
import { useQRModal } from '../hooks/use-qr-modal';
import { userApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export function QRModal() {
  const { isOpen, type, data, closeQR } = useQRModal();

  const { data: mileageQRData, isLoading: mileageLoading } = useQuery({
    queryKey: ['mileage-qr'],
    queryFn: () => userApi.getMileageQR().then(res => res.data.data),
    enabled: isOpen && type === 'mileage',
  });

  const { data: couponData, isLoading: couponLoading } = useQuery({
    queryKey: ['coupon', data?.couponId],
    queryFn: () => {
      // 실제로는 쿠폰 상세 정보를 가져와야 함
      // 여기서는 더미 데이터 사용
      return Promise.resolve({
        id: data.couponId,
        discount_type: 'percentage',
        discount_value: 10,
        coupon_type: 'basic',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        qrData: `coupon_${data.couponId}_${Date.now()}`,
      });
    },
    enabled: isOpen && type === 'coupon' && !!data?.couponId,
  });

  const renderQRContent = () => {
    if (type === 'mileage') {
      if (mileageLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  {formatCurrency(mileageQRData?.balance || 0)}
                </div>
                <p className="text-sm text-muted-foreground">사용 가능한 마일리지</p>
              </CardContent>
            </Card>

            {/* QR 코드 */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              <QRCode
                value={mileageQRData?.qrData || 'loading'}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
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
                    <p>• QR 코드는 실시간으로 갱신됩니다</p>
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
          </div>
        );
      }

      const formatCouponValue = (coupon: any) => {
        if (coupon.discount_type === 'percentage') {
          return `${coupon.discount_value}% 할인`;
        } else {
          return formatCurrency(coupon.discount_value);
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
                    {getCouponTypeLabel(couponData?.coupon_type || '')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {formatCouponValue(couponData)}
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(couponData?.expires_at || '').toLocaleDateString('ko-KR')} 까지
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* QR 코드 */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              <QRCode
                value={couponData?.qrData || 'loading'}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            {/* 주의사항 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• 매장 결제 시 사장님에게 QR 코드를 보여주세요</p>
                    <p>• 쿠폰은 1회 사용 후 자동으로 삭제됩니다</p>
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