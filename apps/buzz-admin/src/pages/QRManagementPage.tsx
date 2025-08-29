import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  QrCode,
  Users,
  Gift,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Trash2,
  Plus
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface QRToken {
  id: number;
  userId: number;
  tokenType: 'coupon' | 'mileage';
  referenceId: number | null;
  isUsed: boolean;
  usedAt: string | null;
  usedBusinessId: number | null;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  business?: {
    id: number;
    businessName: string;
  };
}

interface QRUsageLog {
  id: number;
  tokenId: number;
  userId: number;
  businessUserId: number | null;
  businessId: number | null;
  action: 'generated' | 'scanned' | 'verified' | 'used' | 'expired';
  tokenType: 'coupon' | 'mileage';
  amount: number | null;
  discountAmount: number | null;
  governmentSupport: number | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
  business?: {
    businessName: string;
  };
}

interface CouponCreateForm {
  userId: number;
  couponType: 'basic' | 'event';
  discountType: 'amount' | 'percentage';
  discountValue: number;
  expiresAt: string;
}

export function QRManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [createCouponForm, setCreateCouponForm] = useState<CouponCreateForm>({
    userId: 0,
    couponType: 'basic',
    discountType: 'amount',
    discountValue: 3000,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  const queryClient = useQueryClient();

  // QR Token Statistics
  const { data: qrStats } = useQuery({
    queryKey: ['qr-stats', selectedDateRange],
    queryFn: async () => {
      // Mock API call - replace with actual endpoint
      return {
        totalGenerated: 1234,
        totalUsed: 987,
        totalExpired: 123,
        activeTokens: 124,
        mileageUsage: 2450000,
        couponsSaved: 1875000,
        governmentSupport: 562500
      };
    }
  });

  // Active QR Tokens
  const { data: activeTokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['qr-tokens', 'active'],
    queryFn: async () => {
      // Mock API call - replace with actual endpoint
      const mockTokens: QRToken[] = [
        {
          id: 1,
          userId: 123,
          tokenType: 'mileage',
          referenceId: null,
          isUsed: false,
          usedAt: null,
          usedBusinessId: null,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          user: { id: 123, name: '김고객', email: 'customer@example.com' }
        },
        {
          id: 2,
          userId: 124,
          tokenType: 'coupon',
          referenceId: 456,
          isUsed: false,
          usedAt: null,
          usedBusinessId: null,
          expiresAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          user: { id: 124, name: '이고객', email: 'customer2@example.com' }
        }
      ];
      return mockTokens;
    }
  });

  // Usage Logs
  const { data: usageLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['qr-logs', selectedDateRange],
    queryFn: async () => {
      // Mock API call - replace with actual endpoint
      const mockLogs: QRUsageLog[] = [
        {
          id: 1,
          tokenId: 1,
          userId: 123,
          businessUserId: 789,
          businessId: 45,
          action: 'used',
          tokenType: 'mileage',
          amount: 5000,
          discountAmount: null,
          governmentSupport: null,
          createdAt: new Date().toISOString(),
          user: { name: '김고객', email: 'customer@example.com' },
          business: { businessName: '맛있는 식당' }
        },
        {
          id: 2,
          tokenId: 2,
          userId: 124,
          businessUserId: 789,
          businessId: 45,
          action: 'used',
          tokenType: 'coupon',
          amount: null,
          discountAmount: 3000,
          governmentSupport: 1500,
          createdAt: new Date().toISOString(),
          user: { name: '이고객', email: 'customer2@example.com' },
          business: { businessName: '맛있는 식당' }
        }
      ];
      return mockLogs;
    }
  });

  // Cleanup expired tokens
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { cleaned: 15 };
    },
    onSuccess: (data) => {
      alert(`${data.cleaned}개의 만료된 토큰이 정리되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['qr-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['qr-stats'] });
    }
  });

  // Create coupon
  const createCouponMutation = useMutation({
    mutationFn: async (form: CouponCreateForm) => {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { couponId: Math.floor(Math.random() * 1000) };
    },
    onSuccess: () => {
      alert('쿠폰이 성공적으로 발급되었습니다.');
      setShowCreateCouponModal(false);
      setCreateCouponForm({
        userId: 0,
        couponType: 'basic',
        discountType: 'amount',
        discountValue: 3000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      queryClient.invalidateQueries({ queryKey: ['qr-stats'] });
    }
  });

  const getTokenStatusBadge = (token: QRToken) => {
    if (token.isUsed) {
      return <Badge variant="secondary">사용완료</Badge>;
    }
    
    const expiresAt = new Date(token.expiresAt);
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return <Badge variant="destructive">만료</Badge>;
    }
    
    if (timeLeft <= 2 * 60 * 1000) { // 2분 이내
      return <Badge variant="destructive">곧 만료</Badge>;
    }
    
    return <Badge variant="default">활성</Badge>;
  };

  const getActionBadge = (action: string) => {
    const variants = {
      generated: 'default',
      scanned: 'secondary',
      verified: 'secondary',
      used: 'default',
      expired: 'destructive'
    } as const;
    
    const labels = {
      generated: '생성',
      scanned: '스캔',
      verified: '검증',
      used: '사용',
      expired: '만료'
    };
    
    return (
      <Badge variant={variants[action as keyof typeof variants] || 'default'}>
        {labels[action as keyof typeof labels] || action}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR & 쿠폰 관리</h1>
          <p className="text-gray-600">QR 코드 및 쿠폰 시스템을 관리합니다.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => setShowCreateCouponModal(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            쿠폰 발급
          </Button>
          
          <Button 
            onClick={() => cleanupMutation.mutate()}
            variant="outline"
            size="sm"
            disabled={cleanupMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {cleanupMutation.isPending ? '정리 중...' : '만료 토큰 정리'}
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">생성된 QR</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrStats?.totalGenerated || 0}</div>
            <p className="text-xs text-muted-foreground">총 생성 수</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용된 QR</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrStats?.totalUsed || 0}</div>
            <p className="text-xs text-muted-foreground">
              사용률: {qrStats ? Math.round((qrStats.totalUsed / qrStats.totalGenerated) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마일리지 사용액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(qrStats?.mileageUsage || 0)}</div>
            <p className="text-xs text-muted-foreground">총 사용 금액</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">정부 지원금</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(qrStats?.governmentSupport || 0)}</div>
            <p className="text-xs text-muted-foreground">이벤트 쿠폰</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="tokens">활성 QR 토큰</TabsTrigger>
          <TabsTrigger value="logs">사용 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>QR 토큰 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">활성 토큰</span>
                  <span className="font-medium text-green-600">{qrStats?.activeTokens || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">만료 토큰</span>
                  <span className="font-medium text-red-600">{qrStats?.totalExpired || 0}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium">총 토큰</span>
                  <span className="font-bold">{qrStats?.totalGenerated || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>금액 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">마일리지 사용</span>
                  <span className="font-medium">{formatCurrency(qrStats?.mileageUsage || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">쿠폰 할인</span>
                  <span className="font-medium">{formatCurrency(qrStats?.couponsSaved || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium text-green-600">정부 지원금</span>
                  <span className="font-bold text-green-600">{formatCurrency(qrStats?.governmentSupport || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>활성 QR 토큰 ({activeTokens?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>토큰 ID</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>타입</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>만료 시간</TableHead>
                      <TableHead>생성일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTokens?.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-mono text-sm">#{token.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{token.user?.name}</p>
                            <p className="text-sm text-muted-foreground">{token.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={token.tokenType === 'mileage' ? 'secondary' : 'default'}>
                            {token.tokenType === 'mileage' ? '마일리지' : '쿠폰'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getTokenStatusBadge(token)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(token.expiresAt).toLocaleString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(token.createdAt).toLocaleString('ko-KR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용 로그 ({usageLogs?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>시간</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>액션</TableHead>
                      <TableHead>타입</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>매장</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.user?.name}</p>
                            <p className="text-sm text-muted-foreground">{log.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant={log.tokenType === 'mileage' ? 'secondary' : 'default'}>
                            {log.tokenType === 'mileage' ? '마일리지' : '쿠폰'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.amount && <span className="text-blue-600">{formatCurrency(log.amount)}</span>}
                          {log.discountAmount && <span className="text-red-600">{formatCurrency(log.discountAmount)}</span>}
                          {log.governmentSupport && (
                            <div className="text-sm text-green-600">정부지원: {formatCurrency(log.governmentSupport)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.business?.businessName || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 쿠폰 생성 모달 */}
      <Dialog open={showCreateCouponModal} onOpenChange={setShowCreateCouponModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 쿠폰 발급</DialogTitle>
            <DialogDescription>
              사용자에게 쿠폰을 발급합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">사용자 ID</Label>
              <Input
                id="userId"
                type="number"
                value={createCouponForm.userId || ''}
                onChange={(e) => setCreateCouponForm(prev => ({
                  ...prev,
                  userId: parseInt(e.target.value) || 0
                }))}
                placeholder="사용자 ID를 입력하세요"
              />
            </div>
            
            <div>
              <Label htmlFor="couponType">쿠폰 타입</Label>
              <Select 
                value={createCouponForm.couponType} 
                onValueChange={(value: 'basic' | 'event') => 
                  setCreateCouponForm(prev => ({ ...prev, couponType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">기본 쿠폰</SelectItem>
                  <SelectItem value="event">이벤트 쿠폰 (정부지원)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discountType">할인 타입</Label>
              <Select 
                value={createCouponForm.discountType} 
                onValueChange={(value: 'amount' | 'percentage') => 
                  setCreateCouponForm(prev => ({ ...prev, discountType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">금액 할인</SelectItem>
                  <SelectItem value="percentage">퍼센트 할인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discountValue">
                할인 값 ({createCouponForm.discountType === 'amount' ? '원' : '%'})
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={createCouponForm.discountValue}
                onChange={(e) => setCreateCouponForm(prev => ({
                  ...prev,
                  discountValue: parseInt(e.target.value) || 0
                }))}
                placeholder={createCouponForm.discountType === 'amount' ? '3000' : '10'}
              />
            </div>
            
            <div>
              <Label htmlFor="expiresAt">만료일</Label>
              <Input
                id="expiresAt"
                type="date"
                value={createCouponForm.expiresAt}
                onChange={(e) => setCreateCouponForm(prev => ({
                  ...prev,
                  expiresAt: e.target.value
                }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCouponModal(false)}>
              취소
            </Button>
            <Button 
              onClick={() => createCouponMutation.mutate(createCouponForm)}
              disabled={createCouponMutation.isPending || !createCouponForm.userId}
            >
              {createCouponMutation.isPending ? '발급 중...' : '쿠폰 발급'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}