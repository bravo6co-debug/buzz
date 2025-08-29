import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Eye, EyeOff, Gift, Users } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../lib/api';
import { extractDeepLinkParams, getStoredDeepLinkParams, clearStoredDeepLinkParams } from '../utils/deeplink';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { logger } from '../../../../packages/shared/utils/logger';

// 마일리지 보상 상수
const MILEAGE_REWARDS = {
  BASIC_SIGNUP: 1000,
  REFERRAL_SIGNUP: 3000,
  REFERRAL_BONUS: 2000
} as const;

// 안전한 localStorage 접근 함수
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    logger.error('localStorage access failed', error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    logger.error('localStorage write failed', error);
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logger.error('localStorage remove failed', error);
  }
};

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력하세요'),
  password: z.string()
    .min(8, '비밀번호는 8자 이상 입력하세요')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
  confirmPassword: z.string().min(8, '비밀번호 확인을 입력하세요'),
  name: z.string().min(2, '이름은 2자 이상 입력하세요'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^01[0-9]-?\d{4}-?\d{4}$/.test(val), {
      message: '올바른 휴대폰 번호 형식을 입력하세요 (예: 010-1234-5678)'
    }),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  
  // URL에서 리퍼럴 코드 추출 (메모이제이션)
  const referralCodeFromURL = useMemo(() => {
    const urlParams = new URLSearchParams(search);
    return urlParams.get('ref');
  }, [search]);

  // 딥링크 파라미터 추출
  const deepLinkParams = extractDeepLinkParams();
  const storedDeepLinkParams = getStoredDeepLinkParams();
  
  // 리퍼럴 코드 우선순위: URL > 딥링크 > 저장된 파라미터 > localStorage
  const getInitialReferralCode = useCallback(() => {
    if (referralCodeFromURL) return referralCodeFromURL;
    if (deepLinkParams.referralCode) return deepLinkParams.referralCode;
    if (storedDeepLinkParams?.referralCode) return storedDeepLinkParams.referralCode;
    
    // 안전한 localStorage 접근
    const storedCode = safeGetItem('pendingReferralCode');
    return storedCode || '';
  }, [referralCodeFromURL, deepLinkParams.referralCode, storedDeepLinkParams]);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      referralCode: getInitialReferralCode(),
    },
  });

  // 딥링크 파라미터 처리 및 리퍼럴 코드 설정
  useEffect(() => {
    const referralCode = getInitialReferralCode();
    
    if (referralCode) {
      // 리퍼럴 코드를 폼에 설정
      form.setValue('referralCode', referralCode);
      
      // 안전한 localStorage 업데이트 (호환성)
      safeSetItem('pendingReferralCode', referralCode);
    }
    
    // UTM 파라미터 추적을 위한 분석 데이터 전송
    if (deepLinkParams.utm_source || storedDeepLinkParams?.utm_source) {
      const utmData = {
        utm_source: deepLinkParams.utm_source || storedDeepLinkParams?.utm_source,
        utm_medium: deepLinkParams.utm_medium || storedDeepLinkParams?.utm_medium,
        utm_campaign: deepLinkParams.utm_campaign || storedDeepLinkParams?.utm_campaign,
        utm_term: deepLinkParams.utm_term || storedDeepLinkParams?.utm_term,
        utm_content: deepLinkParams.utm_content || storedDeepLinkParams?.utm_content
      };
      
      // 분석 데이터 전송
      fetch('/api/deeplink/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'page_view',
          referralCode,
          userAgent: navigator.userAgent,
          ...utmData
        }),
        credentials: 'include'
      }).catch(error => logger.error('Failed to track signup page visit', error));
    }
  }, [form.setValue, deepLinkParams, storedDeepLinkParams, getInitialReferralCode]);

  const signupMutation = useMutation({
    mutationFn: (data: SignupForm) => authApi.signup(data),
    onSuccess: () => {
      // 회원가입 성공 시 모든 관련 데이터 정리
      safeRemoveItem('pendingReferralCode');
      clearStoredDeepLinkParams();
      
      const hasReferralCode = form.getValues('referralCode');
      
      // 전환 분석 데이터 전송
      if (hasReferralCode) {
        fetch('/api/deeplink/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'conversion',
            referralCode: hasReferralCode,
            converted: true,
            userAgent: navigator.userAgent
          }),
          credentials: 'include'
        }).catch(error => logger.error('Failed to track signup conversion', error));
      }
      
      toast({
        title: "회원가입 성공!",
        description: hasReferralCode 
          ? `리퍼럴 가입 보너스 ${MILEAGE_REWARDS.REFERRAL_SIGNUP.toLocaleString()} 마일리지가 지급되었습니다!` 
          : `가입 보너스 ${MILEAGE_REWARDS.BASIC_SIGNUP.toLocaleString()} 마일리지가 지급되었습니다!`,
      });
      setLocation('/');
    },
    onError: (error: any) => {
      const getErrorMessage = (error: any) => {
        if (error.code === 'NETWORK_ERROR') {
          return '네트워크 연결을 확인해주세요.';
        }
        if (error.response?.status === 409) {
          return '이미 존재하는 이메일입니다.';
        }
        if (error.response?.status === 400) {
          return '입력 정보를 다시 확인해주세요.';
        }
        return error.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
      };

      toast({
        title: "회원가입 실패",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: SignupForm) => {
    signupMutation.mutate(data);
  }, [signupMutation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고/헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Buzz</h1>
          <p className="text-muted-foreground">
            부산 남구 지역경제 활성화 플랫폼
          </p>
        </div>

        {/* 리퍼럴 보너스 안내 */}
        {referralCodeFromURL && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">친구 초대 가입</span>
              </div>
              <p className="text-sm text-green-700">
                리퍼럴 코드로 가입하면 <strong>{MILEAGE_REWARDS.REFERRAL_SIGNUP.toLocaleString()} 마일리지</strong>를 받을 수 있어요!
              </p>
            </CardContent>
          </Card>
        )}

        {/* 회원가입 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">휴대폰 번호 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="휴대폰 번호를 입력하세요"
                  {...form.register('phone')}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary focus:outline-none rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    {...form.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "비밀번호 확인 숨기기" : "비밀번호 확인 보이기"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary focus:outline-none rounded"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode">리퍼럴 코드 (선택)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="친구의 리퍼럴 코드를 입력하세요"
                  {...form.register('referralCode')}
                  disabled={!!referralCodeFromURL}
                />
                {form.formState.errors.referralCode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.referralCode.message}
                  </p>
                )}
                {referralCodeFromURL && (
                  <p className="text-sm text-green-600">
                    리퍼럴 코드가 자동으로 적용되었습니다!
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? '가입 중...' : '회원가입'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 로그인 링크 */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?
          </p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-primary"
            onClick={() => setLocation('/login')}
          >
            로그인하기
          </Button>
        </div>

        {/* 혜택 안내 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Gift className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm">가입 혜택</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>기본 가입 보너스</span>
              <span className="font-semibold text-blue-600">{MILEAGE_REWARDS.BASIC_SIGNUP.toLocaleString()} 마일리지</span>
            </div>
            {referralCodeFromURL ? (
              <div className="flex items-center justify-between">
                <span>리퍼럴 가입 보너스</span>
                <span className="font-semibold text-green-600">+{MILEAGE_REWARDS.REFERRAL_BONUS.toLocaleString()} 마일리지</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-muted-foreground/70">
                <span>리퍼럴 가입 보너스</span>
                <span>+{MILEAGE_REWARDS.REFERRAL_BONUS.toLocaleString()} 마일리지</span>
              </div>
            )}
            <div className="pt-2 border-t border-muted">
              <div className="flex items-center justify-between">
                <span>총 혜택</span>
                <span className="font-bold text-primary">
                  {referralCodeFromURL ? MILEAGE_REWARDS.REFERRAL_SIGNUP.toLocaleString() : MILEAGE_REWARDS.BASIC_SIGNUP.toLocaleString()} 마일리지
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}