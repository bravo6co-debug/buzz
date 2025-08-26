import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calculator, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { BusinessSettlement } from '@/types';

interface SettlementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { type: string; startDate: string; endDate: string }) => void;
}

function SettlementRequestModal({ isOpen, onClose, onSubmit }: SettlementRequestModalProps) {
  const [type, setType] = useState<'mileage_use' | 'event_coupon'>('mileage_use');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      return;
    }
    onSubmit({ type, startDate, endDate });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>정산 요청</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>정산 유형</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant={type === 'mileage_use' ? 'default' : 'outline'}
                onClick={() => setType('mileage_use')}
                size="sm"
              >
                마일리지 사용
              </Button>
              <Button
                variant={type === 'event_coupon' ? 'default' : 'outline'}
                onClick={() => setType('event_coupon')}
                size="sm"
              >
                이벤트 쿠폰
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="startDate">시작 날짜</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDate">종료 날짜</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!startDate || !endDate}
          >
            정산 요청
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementsPage() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [settlements, setSettlements] = useState<BusinessSettlement[]>([
    {
      id: 1,
      business_id: 1,
      settlement_type: 'mileage_use',
      amount: 150000,
      reference_type: 'daily_summary',
      reference_id: 1,
      status: 'approved',
      requested_at: '2024-01-15T09:00:00Z',
      processed_at: '2024-01-16T14:30:00Z'
    },
    {
      id: 2,
      business_id: 1,
      settlement_type: 'event_coupon',
      amount: 75000,
      reference_type: 'coupon_usage',
      reference_id: 2,
      status: 'requested',
      requested_at: '2024-01-20T10:15:00Z'
    },
    {
      id: 3,
      business_id: 1,
      settlement_type: 'mileage_use',
      amount: 200000,
      reference_type: 'daily_summary',
      reference_id: 3,
      status: 'paid',
      requested_at: '2024-01-10T08:30:00Z',
      processed_at: '2024-01-12T16:45:00Z'
    }
  ]);

  const { toast } = useToast();

  // 정산 통계 계산
  const stats = settlements.reduce(
    (acc, settlement) => {
      acc.total += settlement.amount;
      if (settlement.status === 'paid') {
        acc.paid += settlement.amount;
      } else if (settlement.status === 'approved') {
        acc.approved += settlement.amount;
      } else if (settlement.status === 'requested') {
        acc.pending += settlement.amount;
      }
      return acc;
    },
    { total: 0, paid: 0, approved: 0, pending: 0 }
  );

  const handleSettlementRequest = async (data: { type: string; startDate: string; endDate: string }) => {
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 새로운 정산 요청 추가
      const newSettlement: BusinessSettlement = {
        id: settlements.length + 1,
        business_id: 1,
        settlement_type: data.type as 'mileage_use' | 'event_coupon',
        amount: Math.floor(Math.random() * 100000) + 50000, // 임시 금액
        reference_type: 'manual_request',
        reference_id: settlements.length + 1,
        status: 'requested',
        requested_at: new Date().toISOString()
      };

      setSettlements([newSettlement, ...settlements]);

      toast({
        title: "정산 요청 완료",
        description: "정산 요청이 성공적으로 제출되었습니다."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "정산 요청 실패",
        description: "정산 요청 중 오류가 발생했습니다."
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested':
        return '요청됨';
      case 'approved':
        return '승인됨';
      case 'paid':
        return '지급완료';
      case 'rejected':
        return '반려됨';
      default:
        return '알 수 없음';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'text-yellow-600 bg-yellow-50';
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'paid':
        return 'text-blue-600 bg-blue-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">정산 관리</h1>
          <p className="text-gray-600">마일리지 사용 및 이벤트 쿠폰 정산을 관리하세요.</p>
        </div>
        <Button onClick={() => setShowRequestModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          정산 요청
        </Button>
      </div>

      {/* 정산 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 정산액</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">지급완료</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.paid)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">승인대기</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.approved)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">요청중</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 정산 내역 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              정산 내역
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settlements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>정산 내역이 없습니다.</p>
                <p className="text-sm">첫 번째 정산을 요청해보세요.</p>
              </div>
            ) : (
              settlements.map((settlement) => (
                <Card key={settlement.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {settlement.settlement_type === 'mileage_use' ? '마일리지 사용' : '이벤트 쿠폰'}
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(settlement.status)}`}>
                            {getStatusIcon(settlement.status)}
                            {getStatusText(settlement.status)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            요청: {formatDate(new Date(settlement.requested_at))}
                          </div>
                          {settlement.processed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              처리: {formatDate(new Date(settlement.processed_at))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(settlement.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          #{settlement.id}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 정산 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">정산 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• 마일리지 사용 정산: 고객이 사용한 마일리지 금액을 정산받을 수 있습니다.</p>
          <p>• 이벤트 쿠폰 정산: 정부 지원 이벤트 쿠폰 사용 시 부분 정산을 받을 수 있습니다.</p>
          <p>• 정산은 요청일로부터 3-5 영업일 내에 처리됩니다.</p>
          <p>• 정산금은 등록된 사업자 계좌로 입금됩니다.</p>
        </CardContent>
      </Card>

      {/* 정산 요청 모달 */}
      <SettlementRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleSettlementRequest}
      />
    </div>
  );
}