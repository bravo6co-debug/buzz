import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRScanner } from '@/components/QRScanner';
import { useToast } from '@/components/ui/use-toast';
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  User, 
  Gift, 
  Coins,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { qrApi, businessApi, QRVerificationResult } from '@/lib/api';
interface User {
  id: number;
  name: string;
  email: string;
  mileage_balance: number;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface QRScanResult {
  valid: boolean;
  type?: 'coupon' | 'mileage';
  tokenId?: number;
  user?: User;
  coupon?: any;
  balance?: number;
  reason?: string;
}

interface MileageUsageModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

function MileageUsageModal({ isOpen, user, onClose, onConfirm }: MileageUsageModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const maxAmount = user.mileage_balance || 0;
  const numericAmount = parseInt(amount) || 0;

  const handleConfirm = async () => {
    if (numericAmount <= 0 || numericAmount > maxAmount) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(numericAmount);
      setAmount('');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // 숫자만 입력 허용
    const sanitized = value.replace(/[^\d]/g, '');
    setAmount(sanitized);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            마일리지 사용
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 고객 정보 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">보유 마일리지</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(user.mileage_balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 금액 입력 */}
          <div className="space-y-2">
            <Label htmlFor="amount">사용할 금액 (원)</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="금액을 입력하세요"
              className="text-lg"
              autoFocus
            />
            {numericAmount > maxAmount && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                보유 마일리지보다 큰 금액은 입력할 수 없습니다.
              </div>
            )}
          </div>

          {/* 빠른 선택 버튼 */}
          <div className="grid grid-cols-4 gap-2">
            {[1000, 3000, 5000, 10000].filter(val => val <= maxAmount).map((value) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() => setAmount(value.toString())}
                className="text-xs"
              >
                {formatCurrency(value)}
              </Button>
            ))}
          </div>

          {amount && (
            <Card>
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <span>사용 후 잔액</span>
                  <span className="font-medium">
                    {formatCurrency(maxAmount - numericAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!amount || numericAmount <= 0 || numericAmount > maxAmount || isProcessing}
          >
            {isProcessing ? '처리 중...' : `${formatCurrency(numericAmount)} 사용`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QRScanPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [couponResult, setCouponResult] = useState<CouponScanResult | null>(null);
  const [mileageResult, setMileageResult] = useState<MileageScanResult | null>(null);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const openScanner = () => {
    setIsScannerOpen(true);
    setScanResult(null);
    setCouponResult(null);
    setMileageResult(null);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
  };

  const handleScanSuccess = async (data: string) => {
    try {
      const qrData = parseQRData(data);
      setScanResult(qrData);
      
      if (qrData.type === 'coupon') {
        await verifyCoupon(qrData.data);
      } else if (qrData.type === 'mileage') {
        await verifyMileage(qrData.data);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "QR 코드 오류",
        description: error instanceof Error ? error.message : "유효하지 않은 QR 코드입니다."
      });
    }
    closeScanner();
  };

  const handleScanError = (error: string) => {
    toast({
      variant: "destructive",
      title: "스캔 오류",
      description: "QR 코드를 스캔할 수 없습니다."
    });
  };

  // 쿠폰 검증 API 호출
  const verifyCoupon = async (couponData: any) => {
    setIsProcessing(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 실제로는 API 호출
      // const response = await fetch('/api/coupons/verify', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ qrData: couponData })
      // });
      // const result = await response.json();
      
      // 임시 데이터
      const mockResult: CouponScanResult = {
        valid: true,
        coupon: {
          id: 1,
          user_id: 123,
          coupon_type: 'basic',
          discount_type: 'amount',
          discount_value: 3000,
          is_used: false,
          created_at: new Date().toISOString()
        },
        user: {
          id: 123,
          email: 'user@example.com',
          name: '김고객',
          role: 'user',
          mileage_balance: 15000,
          is_active: true,
          created_at: new Date().toISOString()
        }
      };
      
      setCouponResult(mockResult);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "검증 실패",
        description: "쿠폰 정보를 확인할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 마일리지 검증 API 호출
  const verifyMileage = async (mileageData: any) => {
    setIsProcessing(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 임시 데이터
      const mockResult: MileageScanResult = {
        valid: true,
        user: {
          id: 124,
          email: 'mileage@example.com',
          name: '이마일',
          role: 'user',
          mileage_balance: 25000,
          is_active: true,
          created_at: new Date().toISOString()
        },
        balance: 25000
      };
      
      setMileageResult(mockResult);
      setShowMileageModal(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "검증 실패",
        description: "마일리지 정보를 확인할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 쿠폰 사용 처리
  const handleCouponUse = async () => {
    if (!couponResult) return;

    setIsProcessing(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 실제 API 호출
      // await fetch('/api/coupons/use', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     couponId: couponResult.coupon.id,
      //     businessId: currentBusinessId
      //   })
      // });

      toast({
        title: "쿠폰 사용 완료",
        description: `${formatCurrency(couponResult.coupon.discount_value)} 할인이 적용되었습니다.`
      });

      // 결과 초기화
      setCouponResult(null);
      setScanResult(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: "쿠폰을 사용할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 마일리지 사용 처리
  const handleMileageUse = async (amount: number) => {
    if (!mileageResult) return;

    setIsProcessing(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 실제 API 호출
      // await fetch('/api/mileage/use', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId: mileageResult.user.id,
      //     amount: amount,
      //     businessId: currentBusinessId,
      //     description: '매장에서 사용'
      //   })
      // });

      toast({
        title: "마일리지 사용 완료",
        description: `${formatCurrency(amount)}가 사용되었습니다.`
      });

      // 결과 초기화
      setMileageResult(null);
      setScanResult(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: "마일리지를 사용할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR 스캔</h1>
        <p className="text-gray-600">고객의 쿠폰 및 마일리지 QR 코드를 스캔하세요.</p>
      </div>

      {/* QR 스캔 버튼 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR 코드 스캔
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={openScanner}
            size="lg"
            className="w-full h-16 text-lg"
          >
            <QrCode className="h-6 w-6 mr-2" />
            QR 코드 스캔 시작
          </Button>
          
          <div className="text-sm text-gray-500 text-center">
            카메라를 사용하여 고객의 쿠폰 또는 마일리지 QR 코드를 스캔합니다.
          </div>
        </CardContent>
      </Card>

      {/* 스캔 결과 - 쿠폰 */}
      {couponResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {couponResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              쿠폰 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 고객 정보 */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">{couponResult.user.name}</p>
                <p className="text-sm text-gray-500">{couponResult.user.email}</p>
              </div>
            </div>

            {/* 쿠폰 정보 */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Gift className="h-8 w-8 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium">
                  {couponResult.coupon.coupon_type === 'basic' ? '기본 쿠폰' : 
                   couponResult.coupon.coupon_type === 'event' ? '이벤트 쿠폰' : '특별 쿠폰'}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {couponResult.coupon.discount_type === 'amount' 
                    ? formatCurrency(couponResult.coupon.discount_value)
                    : `${couponResult.coupon.discount_value}% 할인`}
                </p>
              </div>
            </div>

            {couponResult.valid ? (
              <Button 
                onClick={handleCouponUse}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? '처리 중...' : '쿠폰 사용하기'}
              </Button>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                {couponResult.message || '사용할 수 없는 쿠폰입니다.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 스캔 결과 - 마일리지 */}
      {mileageResult && !showMileageModal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mileageResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              마일리지 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 고객 정보 */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">{mileageResult.user.name}</p>
                <p className="text-sm text-gray-500">{mileageResult.user.email}</p>
              </div>
            </div>

            {/* 마일리지 잔액 */}
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Coins className="h-8 w-8 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-700">보유 마일리지</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(mileageResult.balance)}
                </p>
              </div>
            </div>

            {mileageResult.valid ? (
              <Button 
                onClick={() => setShowMileageModal(true)}
                className="w-full"
                size="lg"
              >
                금액 입력하고 사용하기
              </Button>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                {mileageResult.message || '사용할 수 없는 마일리지입니다.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR 스캐너 */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={closeScanner}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />

      {/* 마일리지 사용 모달 */}
      {mileageResult && (
        <MileageUsageModal
          isOpen={showMileageModal}
          user={mileageResult.user}
          onClose={() => setShowMileageModal(false)}
          onConfirm={handleMileageUse}
        />
      )}
    </div>
  );
}