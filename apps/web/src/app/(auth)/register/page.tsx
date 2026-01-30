'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store';
import { authService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/hooks';
import { handleApiError } from '@/lib/utils/error-helper';
import { PageMeta } from '@/components/common/page-meta';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  name: z.string().min(1, 'auth:form.name.required'),
  email: z.string().email('auth:form.email.invalid'),
  verificationCode: z.string().length(6, 'auth:form.verification_code.length'),
  password: z.string()
    .min(8, 'auth:form.password.min_length')
    .regex(/[A-Z]/, 'auth:form.password.uppercase_required')
    .regex(/[0-9]/, 'auth:form.password.number_required')
    .regex(/[^A-Za-z0-9]/, 'auth:form.password.special_char_required'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth:form.confirm_password.mismatch',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { t } = useTranslation(['auth', 'common']);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    getValues,
  } = form;

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendCode = async () => {
    const email = getValues('email');
    const isValid = await trigger('email');
    
    if (!isValid || !email) {
      toast.error(t('auth:form.email.invalid'));
      return;
    }

    setSendingCode(true);
    try {
      await authService.sendRegisterVerificationCode(email);
      setCooldown(60);
      toast.success(t('auth:verification_code_sent', { defaultValue: 'Verification code sent' }));
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = data;
      const response = await authService.register(registerData);

      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Registration failed', err);
      // 使用统一的错误处理函数，并传入 form 实例以拦截表单错误
      handleApiError(err, form);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta titleKey="metadata.register.title" descriptionKey="metadata.register.description" />
      <div className="text-center lg:text-left">
        <div className="flex justify-center lg:justify-start mb-6 items-center gap-3">
          <img src="/images/logo.png" alt="SubCare Logo" className="h-10 w-auto" />
          <span className="text-3xl text-gray-900 dark:text-white font-logo">
            {t('app_name', { ns: 'common' })}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('register.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" noValidate autoComplete="off">
        
        <Input
          id="name"
          label={t('form.name.label', { defaultValue: 'Username' })}
          type="text"
          placeholder={t('form.name.placeholder', { defaultValue: 'Enter your username' })}
          error={errors.name?.message}
          autoComplete="off"
          {...register('name', { required: 'auth:form.name.required' })}
        />

        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <Input
              id="email"
              label={t('form.email.label')}
              type="email"
              placeholder={t('form.email.placeholder')}
              error={errors.email?.message}
              autoComplete="off"
              {...register('email', {
                required: 'auth:form.email.required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'auth:form.email.invalid'
                }
              })}
            />
          </div>
          <div className="pt-7">
            <button
              type="button"
              onClick={handleSendCode}
              disabled={cooldown > 0 || sendingCode}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group w-32 border border-gray-200 dark:border-gray-600 hover:border-[#A5A6F6]/30",
                "bg-transparent hover:bg-primary-pale dark:hover:bg-white/5",
                (cooldown > 0 || sendingCode) && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary whitespace-nowrap">
                {sendingCode ? '...' : cooldown > 0 ? `${cooldown}s` : t('auth:send_code', { defaultValue: 'Send Code' })}
              </span>
            </button>
          </div>
        </div>

        <Input
          id="verificationCode"
          label={t('form.verification_code.label', { defaultValue: 'Verification Code' })}
          type="text"
          placeholder={t('form.verification_code.placeholder', { defaultValue: 'Enter 6-digit code' })}
          error={errors.verificationCode?.message}
          maxLength={6}
          autoComplete="off"
          {...register('verificationCode', { required: 'auth:form.verification_code.required' })}
        />

        <div className="space-y-3">
          <Input
            id="password"
            label={t('form.password.label')}
            type="password"
            placeholder={t('form.password.create_placeholder')}
            error={errors.password?.message}
            autoComplete="new-password"
            {...register('password', {
              required: 'auth:form.password.required',
              minLength: {
                value: 6,
                message: 'auth:form.password.min_length'
              }
            })}
          />

          {/* Password Strength Meter */}
          {password && (
            <div className="flex gap-1 h-1.5">
              <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordStrength >= 1 ? 'bg-red-400' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordStrength >= 2 ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordStrength >= 3 ? 'bg-purple-400' : 'bg-gray-200 dark:bg-gray-700'
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
          autoComplete="new-password"
          {...register('confirmPassword', {
            required: 'auth:form.confirm_password.required',
            validate: (val) => val === password || 'auth:form.confirm_password.mismatch'
          })}
        />

        <Button type="submit" className="w-full py-3 mt-4 shadow-primary-sm" isLoading={isLoading}>
          {t('register.submit')}
        </Button>

        <div className="text-center mt-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t('register.has_account')} </span>
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            {t('register.login_link')}
          </Link>
        </div>
      </form>
    </>
  );
}
