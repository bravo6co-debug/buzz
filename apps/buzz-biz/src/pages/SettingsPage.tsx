import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Bell, 
  Shield, 
  User, 
  CreditCard,
  Smartphone,
  HelpCircle,
  LogOut,
  Save
} from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: {
      qr_scan: true,
      settlement: true,
      push: true,
      email: false
    },
    display: {
      sound_enabled: true,
      vibration_enabled: true,
      dark_mode: false
    },
    business: {
      auto_settlement: false,
      receipt_email: 'business@example.com'
    }
  });

  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "설정 저장 완료",
        description: "모든 설정이 저장되었습니다."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: "설정을 저장할 수 없습니다."
      });
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-600">앱 설정과 알림을 관리하세요.</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          설정 저장
        </Button>
      </div>

      {/* 사용자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            사용자 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">맛있는 한식당</h3>
              <p className="text-sm text-gray-500">business@restaurant.com</p>
              <p className="text-sm text-gray-500">사업자등록번호: 123-45-67890</p>
            </div>
            <Button variant="outline" size="sm">
              정보 수정
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>QR 스캔 알림</Label>
              <p className="text-sm text-gray-500">QR 코드 스캔 시 소리와 진동</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.qr_scan}
              onChange={(e) => updateSetting('notifications', 'qr_scan', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>정산 알림</Label>
              <p className="text-sm text-gray-500">정산 요청 결과 알림</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.settlement}
              onChange={(e) => updateSetting('notifications', 'settlement', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>푸시 알림</Label>
              <p className="text-sm text-gray-500">앱 외부에서도 알림 받기</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => updateSetting('notifications', 'push', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>이메일 알림</Label>
              <p className="text-sm text-gray-500">중요한 알림을 이메일로 받기</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => updateSetting('notifications', 'email', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 앱 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            앱 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>사운드</Label>
              <p className="text-sm text-gray-500">버튼 클릭 및 알림 소리</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.sound_enabled}
              onChange={(e) => updateSetting('display', 'sound_enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>진동</Label>
              <p className="text-sm text-gray-500">터치 피드백 진동</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.vibration_enabled}
              onChange={(e) => updateSetting('display', 'vibration_enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>다크 모드</Label>
              <p className="text-sm text-gray-500">어두운 테마 사용</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.dark_mode}
              onChange={(e) => updateSetting('display', 'dark_mode', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 정산 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            정산 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>자동 정산</Label>
              <p className="text-sm text-gray-500">주간 단위로 자동 정산 요청</p>
            </div>
            <input
              type="checkbox"
              checked={settings.business.auto_settlement}
              onChange={(e) => updateSetting('business', 'auto_settlement', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div>
            <Label>정산 영수증 이메일</Label>
            <Input
              type="email"
              value={settings.business.receipt_email}
              onChange={(e) => updateSetting('business', 'receipt_email', e.target.value)}
              placeholder="receipts@example.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* 보안 및 기타 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              보안
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="w-full justify-start">
              비밀번호 변경
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              2단계 인증 설정
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              로그인 기록 확인
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              지원
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="w-full justify-start">
              도움말 센터
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              고객 지원 채팅
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              앱 정보
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 로그아웃 */}
      <Card>
        <CardContent className="p-4">
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </CardContent>
      </Card>

      {/* 앱 정보 */}
      <Card>
        <CardContent className="p-4 text-center text-sm text-gray-500">
          <p>Buzz비즈 v1.0.0</p>
          <p>© 2024 Buzz Platform. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              이용약관
            </Button>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              개인정보 처리방침
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}