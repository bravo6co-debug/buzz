import { Coins, Gift, QrCode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from './ui/button';
import { useQRModal } from '../hooks/use-qr-modal';

export function Header() {
  const { data: dashboard } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => userApi.getDashboard().then(res => res.data.data),
  });

  const { openMileageQR } = useQRModal();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">Buzz</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 마일리지 표시 */}
          <div className="flex items-center space-x-1 text-sm">
            <Coins className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold">
              {dashboard ? formatCurrency(dashboard.mileage_balance) : '0원'}
            </span>
          </div>
          
          {/* 쿠폰 수 표시 */}
          <div className="flex items-center space-x-1 text-sm">
            <Gift className="h-4 w-4 text-red-600" />
            <span className="font-semibold">
              {dashboard ? dashboard.available_coupons : 0}장
            </span>
          </div>
          
          {/* QR 코드 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={openMileageQR}
            className="p-2"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}