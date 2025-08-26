import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Eye, EyeOff, Gift, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상 입력하세요'),
  confirmPassword: z.string().min(6, '비밀번호 확인을 입력하세요'),
  name: z.string().min(2, '이름은 2자 이상 입력하세요'),
  phone: z.string().optional(),
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

  // URL에서 리퍼럴 코드 추출
  const referralCodeFromURL = new URLSearchParams(search).get('ref');

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      referralCode: referralCodeFromURL || '',
    },
  });

  // URL에서 리퍼럴 코드가 있으면 폼에 설정
  useEffect(() => {
    if (referralCodeFromURL) {
      form.setValue('referralCode', referralCodeFromURL);
    }
  }, [referralCodeFromURL, form]);

  const signupMutation = useMutation({
    mutationFn: (data: SignupForm) => authApi.signup(data),
    onSuccess: () => {
      toast({
        title: "회원가입 성공!",
        description: referralCodeFromURL 
          ? "리퍼럴 가입 보너스 3,000 마일리지가 지급되었습니다!" 
          : "가입 보너스 1,000 마일리지가 지급되었습니다!",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "회원가입 실패",
        description: error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

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
                리퍼럴 코드로 가입하면 <strong>3,000 마일리지</strong>를 받을 수 있어요!
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              <span className="font-semibold text-blue-600">1,000 마일리지</span>
            </div>
            {referralCodeFromURL ? (
              <div className="flex items-center justify-between">
                <span>리퍼럴 가입 보너스</span>
                <span className="font-semibold text-green-600">+2,000 마일리지</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-muted-foreground/70">
                <span>리퍼럴 가입 보너스</span>
                <span>+2,000 마일리지</span>
              </div>
            )}
            <div className="pt-2 border-t border-muted">
              <div className="flex items-center justify-between">
                <span>총 혜택</span>
                <span className="font-bold text-primary">
                  {referralCodeFromURL ? '3,000' : '1,000'} 마일리지
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}