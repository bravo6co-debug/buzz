import React, { useState, useEffect } from 'react';
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
                    {formatCurrency(maxAmount)}
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
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();

  // Load current business info on component mount
  useEffect(() => {
    loadCurrentBusiness();
  }, []);

  const loadCurrentBusiness = async () => {
    try {
      const response = await businessApi.getCurrent();
      if (response.success && response.data) {
        setCurrentBusiness(response.data);
      }
    } catch (error) {
      console.error('Failed to load business info:', error);
      // Use fallback business ID if API fails
      setCurrentBusiness({ id: 1, name: 'Default Business' });
    }
  };

  const openScanner = () => {
    setIsScannerOpen(true);
    setScanResult(null);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
  };

  const handleScanSuccess = async (data: string) => {
    try {
      setIsProcessing(true);
      
      // Verify QR code using API
      const response = await qrApi.verify(data);
      
      if (!response.success) {
        throw new Error(response.error || 'Verification failed');
      }
      
      const result = response.data as QRVerificationResult;
      
      if (!result.valid) {
        toast({
          variant: "destructive",
          title: "QR 코드 오류",
          description: result.reason || "유효하지 않은 QR 코드입니다."
        });
        return;
      }
      
      // Convert API response to our format
      const scanResult: QRScanResult = {
        valid: result.valid,
        type: result.type,
        tokenId: result.tokenId,
        user: result.user ? {
          ...result.user,
          mileage_balance: result.balance || 0,
          role: 'user',
          is_active: true,
          created_at: new Date().toISOString()
        } : undefined,
        coupon: result.coupon,
        balance: result.balance,
        reason: result.reason
      };
      
      setScanResult(scanResult);
      
      // Show mileage modal if it's a mileage QR
      if (result.type === 'mileage') {
        setShowMileageModal(true);
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        variant: "destructive",
        title: "QR 코드 오류",
        description: error instanceof Error ? error.message : "QR 코드를 처리할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
      closeScanner();
    }
  };

  const handleScanError = (error: string) => {
    toast({
      variant: "destructive",
      title: "스캔 오류",
      description: "QR 코드를 스캔할 수 없습니다."
    });
  };

  // 쿠폰 사용 처리
  const handleCouponUse = async (orderAmount?: number) => {
    if (!scanResult || !scanResult.tokenId || !currentBusiness) return;

    setIsProcessing(true);
    try {
      const response = await qrApi.useCoupon({
        tokenId: scanResult.tokenId,
        businessId: currentBusiness.id,
        orderAmount
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to use coupon');
      }

      toast({
        title: "쿠폰 사용 완료",
        description: response.message || "쿠폰이 성공적으로 사용되었습니다."
      });

      // 결과 초기화
      setScanResult(null);
    } catch (error) {
      console.error('Coupon usage error:', error);
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: error instanceof Error ? error.message : "쿠폰을 사용할 수 없습니다."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 마일리지 사용 처리
  const handleMileageUse = async (amount: number) => {
    if (!scanResult || !scanResult.user || !currentBusiness) return;

    setIsProcessing(true);
    try {
      const response = await qrApi.useMileage({
        userId: scanResult.user.id,
        amount,
        businessId: currentBusiness.id,
        description: `${currentBusiness.name}에서 마일리지 사용`
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to use mileage');
      }

      toast({
        title: "마일리지 사용 완료",
        description: `${formatCurrency(amount)}가 사용되었습니다.`
      });

      // 결과 초기화
      setScanResult(null);
      setShowMileageModal(false);
    } catch (error) {
      console.error('Mileage usage error:', error);
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: error instanceof Error ? error.message : "마일리지를 사용할 수 없습니다."
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
        {currentBusiness && (
          <p className="text-sm text-gray-500 mt-1">현재 매장: {currentBusiness.name}</p>
        )}
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
            disabled={isProcessing}
          >
            <QrCode className="h-6 w-6 mr-2" />
            {isProcessing ? '처리 중...' : 'QR 코드 스캔 시작'}
          </Button>
          
          <div className="text-sm text-gray-500 text-center">
            카메라를 사용하여 고객의 쿠폰 또는 마일리지 QR 코드를 스캔합니다.
          </div>
        </CardContent>
      </Card>

      {/* 스캔 결과 - 쿠폰 */}
      {scanResult && scanResult.type === 'coupon' && scanResult.user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.valid ? (
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
                <p className="font-medium">{scanResult.user.name}</p>
                <p className="text-sm text-gray-500">{scanResult.user.email}</p>
              </div>
            </div>

            {/* 쿠폰 정보 */}
            {scanResult.coupon && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Gift className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">
                    {scanResult.coupon.couponType === 'basic' ? '기본 쿠폰' : 
                     scanResult.coupon.couponType === 'event' ? '이벤트 쿠폰' : '특별 쿠폰'}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {scanResult.coupon.discountType === 'amount' 
                      ? formatCurrency(scanResult.coupon.discountValue)
                      : `${scanResult.coupon.discountValue}% 할인`}
                  </p>
                </div>
              </div>
            )}

            {scanResult.valid ? (
              <Button 
                onClick={() => handleCouponUse()}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? '처리 중...' : '쿠폰 사용하기'}
              </Button>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                {scanResult.reason || '사용할 수 없는 쿠폰입니다.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 스캔 결과 - 마일리지 */}
      {scanResult && scanResult.type === 'mileage' && scanResult.user && !showMileageModal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.valid ? (
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
                <p className="font-medium">{scanResult.user.name}</p>
                <p className="text-sm text-gray-500">{scanResult.user.email}</p>
              </div>
            </div>

            {/* 마일리지 잔액 */}
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Coins className="h-8 w-8 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-700">보유 마일리지</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(scanResult.balance || 0)}
                </p>
              </div>
            </div>

            {scanResult.valid ? (
              <Button 
                onClick={() => setShowMileageModal(true)}
                className="w-full"
                size="lg"
              >
                금액 입력하고 사용하기
              </Button>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                {scanResult.reason || '사용할 수 없는 마일리지입니다.'}
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
      {scanResult && scanResult.user && (
        <MileageUsageModal
          isOpen={showMileageModal}
          user={scanResult.user}
          onClose={() => setShowMileageModal(false)}
          onConfirm={handleMileageUse}
        />
      )}
    </div>
  );
}