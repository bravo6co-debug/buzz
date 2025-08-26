import { useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { useSettings, useUpdateSettings } from '../hooks/api';
import { PolicyForm } from '../types';

const PolicyCard = ({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode 
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Settings className="w-5 h-5" />
        <span>{title}</span>
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const PoliciesPage = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  
  const [formData, setFormData] = useState<PolicyForm>({
    referralReward: 500,
    signupBonusDefault: 1000,
    signupBonusReferral: 3000,
    basicCouponAmount: 3000,
    basicCouponPercentage: 10,
    eventCouponPercentage: 30,
    eventCouponGovernmentRatio: 50,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof PolicyForm, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">정책 관리</h1>
            <p className="text-muted-foreground">시스템 정책과 설정을 관리합니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">정책 관리</h1>
          <p className="text-muted-foreground">
            Buzz 플랫폼의 정책과 설정을 관리합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>변경사항 있음</span>
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className="flex items-center space-x-2"
          >
            {updateSettings.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>설정 저장</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {updateSettings.isSuccess && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span>정책 설정이 성공적으로 업데이트되었습니다.</span>
        </div>
      )}

      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rewards">리퍼럴 & 보상</TabsTrigger>
          <TabsTrigger value="coupons">쿠폰 정책</TabsTrigger>
          <TabsTrigger value="events">이벤트 설정</TabsTrigger>
          <TabsTrigger value="system">시스템 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PolicyCard
              title="리퍼럴 보상 정책"
              description="사용자가 다른 사용자를 추천했을 때 지급되는 보상을 설정합니다."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="referralReward">추천인 보상 금액</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="referralReward"
                      type="number"
                      value={formData.referralReward}
                      onChange={(e) => handleInputChange('referralReward', Number(e.target.value))}
                      min={0}
                      step={100}
                    />
                    <span className="text-sm text-muted-foreground">원</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    추천한 사용자에게 지급되는 마일리지 금액
                  </p>
                </div>
              </div>
            </PolicyCard>

            <PolicyCard
              title="가입 보너스 정책"
              description="신규 가입자에게 지급되는 환영 보너스를 설정합니다."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="signupBonusDefault">기본 가입 보너스</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="signupBonusDefault"
                      type="number"
                      value={formData.signupBonusDefault}
                      onChange={(e) => handleInputChange('signupBonusDefault', Number(e.target.value))}
                      min={0}
                      step={100}
                    />
                    <span className="text-sm text-muted-foreground">원</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="signupBonusReferral">리퍼럴 가입 보너스</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="signupBonusReferral"
                      type="number"
                      value={formData.signupBonusReferral}
                      onChange={(e) => handleInputChange('signupBonusReferral', Number(e.target.value))}
                      min={0}
                      step={100}
                    />
                    <span className="text-sm text-muted-foreground">원</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    추천을 통해 가입한 사용자에게 추가 지급되는 보너스
                  </p>
                </div>
              </div>
            </PolicyCard>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PolicyCard
              title="기본 쿠폰 정책"
              description="일반 할인 쿠폰의 기본 설정을 관리합니다."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="basicCouponAmount">기본 쿠폰 할인 금액</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="basicCouponAmount"
                      type="number"
                      value={formData.basicCouponAmount}
                      onChange={(e) => handleInputChange('basicCouponAmount', Number(e.target.value))}
                      min={0}
                      step={100}
                    />
                    <span className="text-sm text-muted-foreground">원</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="basicCouponPercentage">기본 쿠폰 할인율</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="basicCouponPercentage"
                      type="number"
                      value={formData.basicCouponPercentage}
                      onChange={(e) => handleInputChange('basicCouponPercentage', Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    퍼센트 할인 쿠폰의 기본 할인율
                  </p>
                </div>
              </div>
            </PolicyCard>

            <PolicyCard
              title="이벤트 쿠폰 정책"
              description="특별 이벤트 쿠폰의 설정을 관리합니다."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="eventCouponPercentage">이벤트 쿠폰 할인율</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="eventCouponPercentage"
                      type="number"
                      value={formData.eventCouponPercentage}
                      onChange={(e) => handleInputChange('eventCouponPercentage', Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="eventCouponGovernmentRatio">정부 지원 비율</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="eventCouponGovernmentRatio"
                      type="number"
                      value={formData.eventCouponGovernmentRatio}
                      onChange={(e) => handleInputChange('eventCouponGovernmentRatio', Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    이벤트 쿠폰 할인액 중 정부가 지원하는 비율
                  </p>
                </div>
              </div>
            </PolicyCard>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <PolicyCard
              title="진행 중인 이벤트"
              description="현재 활성화된 이벤트들을 확인하고 관리합니다."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">봄맞이 가입 이벤트</h4>
                    <p className="text-sm text-muted-foreground">신규 가입시 추가 마일리지 1,000원 지급</p>
                    <p className="text-xs text-muted-foreground mt-1">2024.03.01 - 2024.03.31</p>
                  </div>
                  <Badge variant="default">진행중</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">친구 추천 보상 이벤트</h4>
                    <p className="text-sm text-muted-foreground">추천 보상 2배 지급 (500원 → 1,000원)</p>
                    <p className="text-xs text-muted-foreground mt-1">2024.03.15 - 2024.04.14</p>
                  </div>
                  <Badge variant="secondary">예정</Badge>
                </div>

                <Button className="w-full" variant="outline">
                  새 이벤트 만들기
                </Button>
              </div>
            </PolicyCard>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PolicyCard
              title="시스템 설정"
              description="전반적인 시스템 동작과 관련된 설정들입니다."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>사업자 자동 승인</Label>
                    <p className="text-sm text-muted-foreground">신규 매장 등록을 자동으로 승인합니다</p>
                  </div>
                  <Button variant="outline" size="sm">비활성화</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>마일리지 만료 설정</Label>
                    <p className="text-sm text-muted-foreground">마일리지 자동 만료 기간을 설정합니다</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input type="number" value={365} className="w-20" />
                    <span className="text-sm">일</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>정산 자동 처리</Label>
                    <p className="text-sm text-muted-foreground">정산 요청을 자동으로 승인합니다</p>
                  </div>
                  <Button variant="outline" size="sm">활성화</Button>
                </div>
              </div>
            </PolicyCard>

            <PolicyCard
              title="알림 설정"
              description="관리자에게 전송되는 알림을 설정합니다."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>신규 매장 등록 알림</Label>
                  <Button variant="outline" size="sm">활성화</Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label>정산 요청 알림</Label>
                  <Button variant="outline" size="sm">활성화</Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label>시스템 오류 알림</Label>
                  <Button variant="outline" size="sm">활성화</Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label>일일 보고서</Label>
                  <Button variant="outline" size="sm">활성화</Button>
                </div>
              </div>
            </PolicyCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};