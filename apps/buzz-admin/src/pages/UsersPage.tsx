import { useState } from 'react';
import { Users, Search, Filter, Plus, Minus, Edit, Eye, Coins, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useUsers } from '../hooks/api';
import { User } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MileageAdjustmentModal {
  isOpen: boolean;
  user: User | null;
  type: 'add' | 'subtract';
}

export const UsersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mileageModal, setMileageModal] = useState<MileageAdjustmentModal>({ 
    isOpen: false, 
    user: null, 
    type: 'add' 
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: '',
    reason: 'bonus' as 'bonus' | 'penalty' | 'correction' | 'event' | 'refund',
    description: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: usersData, isLoading } = useUsers();

  // Mock data
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'kim.cheolsu@example.com',
      name: '김철수',
      phone: '010-1234-5678',
      role: 'user',
      mileageBalance: 15000,
      referralCode: 'KIM123',
      isActive: true,
      createdAt: '2024-03-01T09:30:00Z',
      updatedAt: '2024-03-15T14:20:00Z',
    },
    {
      id: 2,
      email: 'lee.younghee@example.com',
      name: '이영희',
      phone: '010-9876-5432',
      role: 'user',
      mileageBalance: 8500,
      referralCode: 'LEE456',
      isActive: true,
      createdAt: '2024-02-28T16:45:00Z',
      updatedAt: '2024-03-14T10:15:00Z',
    },
    {
      id: 3,
      email: 'park.minsu@example.com',
      name: '박민수',
      phone: '010-5555-1234',
      role: 'user',
      mileageBalance: 23000,
      referralCode: 'PARK789',
      isActive: true,
      createdAt: '2024-02-25T11:20:00Z',
      updatedAt: '2024-03-13T15:30:00Z',
    },
    {
      id: 4,
      email: 'choi.business@example.com',
      name: '최사장',
      phone: '010-1111-2222',
      role: 'business',
      mileageBalance: 5000,
      referralCode: 'BIZ001',
      isActive: true,
      createdAt: '2024-02-20T14:10:00Z',
      updatedAt: '2024-03-12T09:45:00Z',
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">관리자</Badge>;
      case 'business':
        return <Badge variant="default">사업자</Badge>;
      case 'user':
        return <Badge variant="secondary">일반회원</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="outline">활성</Badge>
    ) : (
      <Badge variant="destructive">비활성</Badge>
    );
  };

  const openMileageModal = (user: User, type: 'add' | 'subtract') => {
    setMileageModal({ isOpen: true, user, type });
    setAdjustmentForm({
      amount: '',
      reason: 'bonus',
      description: ''
    });
  };

  const closeMileageModal = () => {
    setMileageModal({ isOpen: false, user: null, type: 'add' });
    setAdjustmentForm({
      amount: '',
      reason: 'bonus',
      description: ''
    });
  };

  const handleMileageAdjustment = async () => {
    if (!mileageModal.user || !adjustmentForm.amount || !adjustmentForm.description) {
      return;
    }

    const amount = parseInt(adjustmentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    // Check if subtraction would result in negative balance
    if (mileageModal.type === 'subtract' && amount > mileageModal.user.mileageBalance) {
      alert('차감할 금액이 보유 마일리지보다 큽니다.');
      return;
    }

    setIsProcessing(true);
    try {
      // Call mileage adjustment API
      const adjustmentAmount = mileageModal.type === 'add' ? amount : -amount;
      
      // TODO: Replace with actual API call
      console.log('Adjusting mileage:', {
        userId: mileageModal.user.id,
        amount: adjustmentAmount,
        reason: adjustmentForm.reason,
        description: adjustmentForm.description
      });

      // Mock success - in real implementation, this would be the API response
      alert(`마일리지 ${mileageModal.type === 'add' ? '지급' : '차감'}이 완료되었습니다.`);
      closeMileageModal();
      
      // TODO: Refresh user data
      
    } catch (error) {
      console.error('Mileage adjustment failed:', error);
      alert('마일리지 조정 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
            <p className="text-muted-foreground">회원 정보 및 마일리지 관리</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
          <p className="text-muted-foreground">
            회원 정보를 확인하고 마일리지를 관리합니다.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 회원 {mockUsers.filter(u => u.isActive).length}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일반 회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockUsers.filter(u => u.role === 'user').length}
            </div>
            <p className="text-xs text-muted-foreground">전체의 75%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사업자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockUsers.filter(u => u.role === 'business').length}
            </div>
            <p className="text-xs text-muted-foreground">전체의 25%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 마일리지</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(mockUsers.reduce((sum, u) => sum + u.mileageBalance, 0) / mockUsers.length).toLocaleString()}원
            </div>
            <p className="text-xs text-muted-foreground">회원당 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>필터</span>
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>회원 목록</CardTitle>
          <CardDescription>등록된 모든 회원들의 정보를 확인하고 관리할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회원 정보</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>마일리지</TableHead>
                <TableHead>리퍼럴 코드</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-muted-foreground">{user.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="font-medium">
                    {user.mileageBalance.toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {user.referralCode}
                    </code>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" title="상세 보기">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="수정">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="마일리지 지급"
                        onClick={() => openMileageModal(user, 'add')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="마일리지 차감"
                        onClick={() => openMileageModal(user, 'subtract')}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mileage Adjustment Modal */}
      <Dialog open={mileageModal.isOpen} onOpenChange={closeMileageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-600" />
              마일리지 {mileageModal.type === 'add' ? '지급' : '차감'}
            </DialogTitle>
          </DialogHeader>

          {mileageModal.user && (
            <div className="space-y-4">
              {/* User Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{mileageModal.user.name}</p>
                      <p className="text-sm text-gray-500">{mileageModal.user.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">현재 보유 마일리지</span>
                      <span className="font-bold text-lg text-yellow-600">
                        {mileageModal.user.mileageBalance.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {mileageModal.type === 'add' ? '지급' : '차감'}할 금액 (원)
                </Label>
                <Input
                  id="amount"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm(prev => ({
                    ...prev,
                    amount: e.target.value.replace(/[^\d]/g, '')
                  }))}
                  placeholder="금액을 입력하세요"
                  className="text-lg"
                />
                {mileageModal.type === 'subtract' && 
                 adjustmentForm.amount && 
                 parseInt(adjustmentForm.amount) > mileageModal.user.mileageBalance && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    보유 마일리지보다 큰 금액은 차감할 수 없습니다.
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1000, 3000, 5000, 10000].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentForm(prev => ({
                      ...prev,
                      amount: value.toString()
                    }))}
                    className="text-xs"
                  >
                    {value.toLocaleString()}원
                  </Button>
                ))}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">조정 사유</Label>
                <Select
                  value={adjustmentForm.reason}
                  onValueChange={(value: 'bonus' | 'penalty' | 'correction' | 'event' | 'refund') =>
                    setAdjustmentForm(prev => ({ ...prev, reason: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">보너스</SelectItem>
                    <SelectItem value="penalty">페널티</SelectItem>
                    <SelectItem value="correction">정정</SelectItem>
                    <SelectItem value="event">이벤트</SelectItem>
                    <SelectItem value="refund">환불</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">상세 설명</Label>
                <Input
                  id="description"
                  value={adjustmentForm.description}
                  onChange={(e) => setAdjustmentForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="조정 내용을 입력하세요"
                />
              </div>

              {/* Preview */}
              {adjustmentForm.amount && (
                <Card>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">현재 잔액</span>
                        <span className="font-medium">
                          {mileageModal.user.mileageBalance.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          {mileageModal.type === 'add' ? '지급' : '차감'} 금액
                        </span>
                        <span className={`font-medium ${
                          mileageModal.type === 'add' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mileageModal.type === 'add' ? '+' : '-'}{parseInt(adjustmentForm.amount || '0').toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">변경 후 잔액</span>
                        <span className="font-bold text-lg text-blue-600">
                          {(
                            mileageModal.user.mileageBalance + 
                            (mileageModal.type === 'add' ? 1 : -1) * parseInt(adjustmentForm.amount || '0')
                          ).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeMileageModal}>
              취소
            </Button>
            <Button 
              onClick={handleMileageAdjustment}
              disabled={
                !adjustmentForm.amount || 
                !adjustmentForm.description || 
                isProcessing ||
                (mileageModal.type === 'subtract' && 
                 parseInt(adjustmentForm.amount) > (mileageModal.user?.mileageBalance || 0))
              }
            >
              {isProcessing ? '처리 중...' : 
               `${parseInt(adjustmentForm.amount || '0').toLocaleString()}원 ${mileageModal.type === 'add' ? '지급' : '차감'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};