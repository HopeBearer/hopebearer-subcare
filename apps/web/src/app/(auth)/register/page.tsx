'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RegisterParams } from '@subcare/types';
import { useTranslation } from '@/lib/i18n/hooks';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { t } = useTranslation('auth');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterParams & { confirmPassword: string }>();

  const password = watch('password');

  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let score = 0;
    if (password.length > 5) score += 1;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Normalize to 0-3 range
    let strength = 0;
    if (score > 1) strength = 1;
    if (score > 3) strength = 2;
    if (score > 4) strength = 3;
    
    setPasswordStrength(strength);
  }, [password]);

  const onSubmit = async (data: RegisterParams & { confirmPassword: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authService.register(registerData);
      
      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Registration failed', err);
      let message = t('status.register_failed');
      if (err instanceof AxiosError && err.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center lg:text-left">
         <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-white font-bold text-2xl">S</span>
            </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('register.title')}</h1>
        <p className="text-gray-600">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        <Input
          id="email"
          label={t('form.email.label')}
          type="email"
          placeholder={t('form.email.placeholder')}
          error={errors.email?.message}
          {...register('email', { 
            required: t('form.email.required'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t('form.email.invalid')
            }
          })}
        />

        <div className="space-y-3">
            <Input
              id="password"
              label={t('form.password.label')}
              type="password"
              placeholder={t('form.password.create_placeholder')}
              error={errors.password?.message}
              {...register('password', { 
                required: t('form.password.required'),
                minLength: {
                  value: 6,
                  message: t('form.password.min_length')
                }
              })}
            />
            
            {/* Password Strength Meter */}
            {password && (
                <div className="flex gap-1 h-1.5 mt-2">
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${
                      passwordStrength >= 1 ? 'bg-red-400' : 'bg-gray-200'
                  }`} />
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${
                      passwordStrength >= 2 ? 'bg-yellow-400' : 'bg-gray-200'
                  }`} />
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${
                      passwordStrength >= 3 ? 'bg-purple-400' : 'bg-gray-200'
                  }`} />
                </div>
            )}
        </div>

        <Input
          id="confirmPassword"
          label={t('form.confirm_password.label')}
          type="password"
          placeholder={t('form.confirm_password.placeholder')}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', { 
            required: t('form.confirm_password.required'),
            validate: (val) => val === password || t('form.confirm_password.mismatch')
          })}
        />
        
        <Button type="submit" className="w-full py-3 mt-6 shadow-primary-sm" isLoading={isLoading}>
          {t('register.submit')}
        </Button>

         <div className="text-center mt-4 text-sm">
            <span className="text-gray-500">{t('register.has_account')} </span>
            <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
              {t('register.login_link')}
            </Link>
         </div>
      </form>
    </>
  );
}
