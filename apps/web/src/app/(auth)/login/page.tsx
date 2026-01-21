'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoginParams } from '@subcare/types';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { handleApiError } from '@/lib/error-helper';

const loginSchema = z.object({
  email: z.string().email('auth:form.email.invalid'),
  password: z.string().min(1, 'auth:form.password.required'),
  captchaCode: z.string().min(1, 'auth:form.security_code.required'),
  captchaId: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const { t } = useTranslation('auth');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const fetchCaptcha = useCallback(async () => {
    try {
      const response = await authService.getCaptcha();
      if (response.data) {
        setCaptchaImage(response.data.captchaImage);
        setValue('captchaId', response.data.captchaId);
      }
    } catch (err) {
      console.error('Failed to fetch captcha', err);
    }
  }, [setValue]);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const handleRefreshCaptcha = () => {
    fetchCaptcha();
    setRotation((prev) => prev + 360);
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await authService.login(data);
      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login failed', err);
      // 使用统一的错误处理函数，并传入 form 实例以拦截表单错误
      handleApiError(err, form);

      // Refresh captcha on failure
      fetchCaptcha();
      setValue('captchaCode', '');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="text-center lg:text-left">
        <div className="flex justify-center lg:justify-start mb-6">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('login.title')}</h1>
        <p className="mt-2 text-base text-gray-600">
          {t('login.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>

        <div className="space-y-6">
          <Input
            id="email"
            label={t('form.email.label')}
            type="email"
            placeholder={t('form.email.placeholder')}
            error={errors.email?.message}
            {...register('email', { required: 'auth:form.email.required' })}
          />

          <div className="relative">
            <Input
              id="password"
              label={t('form.password.label')}
              type="password"
              placeholder={t('form.password.placeholder')}
              error={errors.password?.message}
              {...register('password', { required: 'auth:form.password.required' })}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="block text-base font-medium text-secondary mb-1">
              {t('form.security_code.label')}
            </label>
            <div className="flex space-x-2 mb-2">
              <div className="relative flex-1 mr-2">
                <Input
                  id="captchaCode"
                  placeholder={t('form.security_code.placeholder')}
                  className={`mt-0 ${errors.captchaCode ? 'error' : ''}`}
                  error={errors.captchaCode?.message}
                  {...register('captchaCode', { required: 'auth:form.security_code.required' })}
                />
              </div>
              <div className={`flex items-center space-x-2 ${errors.captchaCode ? 'mb-6' : ''}`}>
                {captchaImage ? (
                  <div
                    className="h-12 w-32 bg-gray-100 rounded overflow-hidden border border-gray-200 flex items-center justify-center cursor-pointer"
                    onClick={handleRefreshCaptcha}
                    title="Click to refresh"
                    dangerouslySetInnerHTML={{ __html: captchaImage }}
                  />
                ) : (
                  <div className="h-12 w-32 bg-gray-100 rounded animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={handleRefreshCaptcha}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <RefreshCw
                    className="w-5 h-5"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.5s ease'
                    }}
                  />
                </button>
              </div>
            </div>
            <input type="hidden" {...register('captchaId')} />
          </div>
        </div>

        <div className="flex items-center justify-end py-1">
          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-hover">
              {t('login.forgot_password')}
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20 mt-4" isLoading={isLoading}>
          {t('login.submit')}
        </Button>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">{t('login.no_account')} </span>
          <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
            {t('login.sign_up_link')}
          </Link>
        </div>

      </form>
    </>
  );
}
