import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상 입력하세요'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => authApi.login(data),
    onSuccess: () => {
      toast({
        title: "로그인 성공!",
        description: "환영합니다.",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "로그인 실패",
        description: error.response?.data?.message || '이메일 또는 비밀번호를 확인하세요.',
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
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

        {/* 로그인 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 회원가입 링크 */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            아직 계정이 없으신가요?
          </p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-primary"
            onClick={() => setLocation('/signup')}
          >
            회원가입하기
          </Button>
        </div>

        {/* 혜택 안내 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg text-center">
          <h3 className="font-semibold text-sm mb-2">가입하고 혜택 받기</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• 가입 즉시 1,000 마일리지 지급</p>
            <p>• 친구 추천시 500 마일리지 추가</p>
            <p>• 다양한 할인 쿠폰 제공</p>
          </div>
        </div>
      </div>
    </div>
  );
}