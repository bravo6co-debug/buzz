import { useState } from 'react';
import { 
  Store, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Filter,
  Search,
  Download,
  MapPin,
  Phone,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useBusinesses, useApproveBusiness } from '../hooks/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Business } from '../types';

const BusinessCard = ({ business, onApprove, onReject, onView }: {
  business: Business;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onView: (business: Business) => void;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{business.businessName}</CardTitle>
          <CardDescription className="flex items-center space-x-4 mt-2">
            <span className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{business.address || '주소 미등록'}</span>
            </span>
            {business.phone && (
              <span className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{business.phone}</span>
              </span>
            )}
          </CardDescription>
        </div>
        <Badge variant={business.isApproved ? 'default' : 'secondary'}>
          {business.isApproved ? '승인완료' : '승인대기'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {business.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>카테고리: {business.category || '미분류'}</span>
          <span>등록일: {format(new Date(business.createdAt), 'yyyy.MM.dd', { locale: ko })}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onView(business)}
            className="flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>상세보기</span>
          </Button>
          
          {!business.isApproved && (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onApprove(business.id)}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="w-4 h-4" />
                <span>승인</span>
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onReject(business.id)}
                className="flex items-center space-x-1"
              >
                <XCircle className="w-4 h-4" />
                <span>반려</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const SettlementTable = () => {
  // Mock settlement data
  const settlements = [
    { id: 1, businessName: '맛있는 치킨집', amount: 45000, type: 'mileage_use', status: 'requested', requestedAt: '2024-03-15' },
    { id: 2, businessName: '커피야 놀자', amount: 23000, type: 'event_coupon', status: 'approved', requestedAt: '2024-03-14' },
    { id: 3, businessName: '분식왕', amount: 67000, type: 'mileage_use', status: 'paid', requestedAt: '2024-03-13' },
    { id: 4, businessName: '햄버거 천국', amount: 34000, type: 'mileage_use', status: 'requested', requestedAt: '2024-03-12' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary">요청</Badge>;
      case 'approved':
        return <Badge variant="default">승인</Badge>;
      case 'paid':
        return <Badge variant="outline">완료</Badge>;
      case 'rejected':
        return <Badge variant="destructive">반려</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mileage_use':
        return '마일리지 사용';
      case 'event_coupon':
        return '이벤트 쿠폰';
      default:
        return type;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>매장명</TableHead>
          <TableHead>정산 유형</TableHead>
          <TableHead>정산 금액</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>요청일</TableHead>
          <TableHead>작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settlements.map((settlement) => (
          <TableRow key={settlement.id}>
            <TableCell className="font-medium">{settlement.businessName}</TableCell>
            <TableCell>{getTypeLabel(settlement.type)}</TableCell>
            <TableCell>{settlement.amount.toLocaleString()}원</TableCell>
            <TableCell>{getStatusBadge(settlement.status)}</TableCell>
            <TableCell>{format(new Date(settlement.requestedAt), 'yyyy.MM.dd', { locale: ko })}</TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                {settlement.status === 'requested' && (
                  <>
                    <Button variant="default" size="sm">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const BusinessesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  
  const { data: businessesData, isLoading } = useBusinesses();
  const approveBusiness = useApproveBusiness();

  const handleApprove = async (businessId: number) => {
    try {
      await approveBusiness.mutateAsync({
        businessId,
        action: 'approve',
      });
    } catch (error) {
      console.error('Failed to approve business:', error);
    }
  };

  const handleReject = async (businessId: number) => {
    try {
      await approveBusiness.mutateAsync({
        businessId,
        action: 'reject',
        reason: '검토 결과 승인 기준에 부합하지 않음',
      });
    } catch (error) {
      console.error('Failed to reject business:', error);
    }
  };

  const handleView = (business: Business) => {
    setSelectedBusiness(business);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">사업자 관리</h1>
            <p className="text-muted-foreground">매장 등록 및 정산 관리</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Mock data since API might not be ready
  const mockBusinesses: Business[] = [
    {
      id: 1,
      userId: 101,
      businessName: '맛있는 치킨집',
      description: '바삭하고 맛있는 치킨을 제공하는 전문점입니다. 다양한 치킨 메뉴와 사이드 메뉴를 준비하고 있습니다.',
      address: '부산광역시 남구 대연동 123-45',
      phone: '051-123-4567',
      category: '치킨/닭강정',
      images: [],
      businessHours: {},
      rating: 4.5,
      reviewCount: 127,
      isApproved: false,
      createdAt: '2024-03-10T09:30:00Z',
      updatedAt: '2024-03-10T09:30:00Z',
    },
    {
      id: 2,
      userId: 102,
      businessName: '커피야 놀자',
      description: '신선한 원두로 내린 맛있는 커피와 디저트를 즐길 수 있는 카페입니다.',
      address: '부산광역시 남구 문현동 67-89',
      phone: '051-987-6543',
      category: '카페/디저트',
      images: [],
      businessHours: {},
      rating: 4.2,
      reviewCount: 89,
      isApproved: true,
      createdAt: '2024-03-08T14:20:00Z',
      updatedAt: '2024-03-09T10:15:00Z',
    },
    {
      id: 3,
      userId: 103,
      businessName: '분식왕',
      description: '어릴 적 추억의 분식을 현대적으로 재해석한 분식집입니다.',
      address: '부산광역시 남구 용호동 234-56',
      phone: '051-555-0123',
      category: '분식',
      images: [],
      businessHours: {},
      rating: 4.7,
      reviewCount: 203,
      isApproved: true,
      createdAt: '2024-03-05T11:45:00Z',
      updatedAt: '2024-03-05T11:45:00Z',
    },
  ];

  const pendingBusinesses = mockBusinesses.filter(b => !b.isApproved);
  const approvedBusinesses = mockBusinesses.filter(b => b.isApproved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">사업자 관리</h1>
          <p className="text-muted-foreground">
            매장 등록 승인 및 정산 관리를 수행합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>내보내기</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="매장명으로 검색..."
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

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <span>승인 대기</span>
            <Badge variant="secondary">{pendingBusinesses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center space-x-2">
            <span>승인 완료</span>
            <Badge variant="outline">{approvedBusinesses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="settlements">정산 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={handleView}
              />
            ))}
          </div>
          {pendingBusinesses.length === 0 && (
            <div className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">승인 대기 중인 매장이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">새로운 매장 등록 요청이 있을 때 여기에 표시됩니다.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={handleView}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>정산 요청 관리</CardTitle>
              <CardDescription>사업자들의 정산 요청을 확인하고 처리합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettlementTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};