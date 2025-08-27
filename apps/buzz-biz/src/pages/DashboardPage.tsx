import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  QrCode, 
  Users, 
  Gift, 
  Coins,
  TrendingUp,
  Calculator,
  BarChart3,
  Clock,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const recentTransactions = [
  {
    id: 1,
    type: 'coupon',
    customer: '김고객',
    amount: 3000,
    time: new Date(Date.now() - 1000 * 60 * 30) // 30분 전
  },
  {
    id: 2,
    type: 'mileage',
    customer: '이마일',
    amount: 5000,
    time: new Date(Date.now() - 1000 * 60 * 45) // 45분 전
  },
  {
    id: 3,
    type: 'coupon',
    customer: '박쿠폰',
    amount: 10000,
    time: new Date(Date.now() - 1000 * 60 * 60) // 1시간 전
  }
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">안녕하세요! 맛있는 한식당입니다</h1>
        <p className="text-blue-100">오늘도 좋은 하루 되세요. Buzz비즈와 함께 매장을 효율적으로 관리하세요.</p>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/scan">
              <Button className="w-full h-20 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700">
                <QrCode className="h-6 w-6" />
                <span className="text-sm">QR 스캔</span>
              </Button>
            </Link>
            
            <Link href="/settlements">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calculator className="h-6 w-6" />
                <span className="text-sm">정산 관리</span>
              </Button>
            </Link>
            
            <Link href="/stats">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">통계 보기</span>
              </Button>
            </Link>
            
            <Link href="/business">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span className="text-sm">매장 관리</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 오늘의 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오늘 고객수</p>
                <p className="text-2xl font-bold">45</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs 어제
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">쿠폰 사용</p>
                <p className="text-2xl font-bold">32</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs 어제
                </p>
              </div>
              <Gift className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">마일리지 사용</p>
                <p className="text-2xl font-bold">28</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +15% vs 어제
                </p>
              </div>
              <Coins className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">예상 정산액</p>
                <p className="text-2xl font-bold">{formatCurrency(380000)}</p>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  이번 달
                </p>
              </div>
              <Calculator className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 거래 내역 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              최근 거래 내역
            </CardTitle>
            <Link href="/settlements">
              <Button variant="outline" size="sm">
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>오늘 아직 거래가 없습니다.</p>
                <p className="text-sm">QR 코드를 스캔하여 첫 번째 거래를 시작해보세요!</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'coupon' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {transaction.type === 'coupon' ? (
                        <Gift className="h-5 w-5 text-green-600" />
                      ) : (
                        <Coins className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.customer}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.type === 'coupon' ? '쿠폰 사용' : '마일리지 사용'} • {formatDateTime(transaction.time)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(transaction.amount)}</p>
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-3 w-3" />
                      완료
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 이번 주 간단 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              이번 주 요약
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">총 고객수</span>
              <span className="font-bold">285명</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">쿠폰 사용</span>
              <span className="font-bold">198건</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">마일리지 사용</span>
              <span className="font-bold">167건</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">총 매출</span>
              <span className="font-bold text-lg">{formatCurrency(5200000)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>매장 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">영업 상태</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-600">영업중</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">매장 평점</span>
              <span className="font-bold">4.5 ⭐</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">리뷰 수</span>
              <span className="font-bold">128개</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">정산 대기</span>
              <span className="font-bold text-orange-600">2건</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}