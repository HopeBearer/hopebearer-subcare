'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleApiError } from '@/lib/error-helper';
import { useTranslation } from '@/lib/i18n/hooks';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'auth:form.password.min_length'),
  confirmPassword: z.string().min(8, 'auth:form.password.min_length'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth:form.password.mismatch',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation('auth');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        return;
      }

      try {
        const res = await authService.verifyResetToken(token);
        if (res.data?.valid) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;
    setIsLoading(true);

    try {
      await authService.resetPassword(token, data.password);
      toast.success(t('reset_password.success_message'));
      router.push('/login');
    } catch (err: unknown) {
      handleApiError(err, form);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reset_password.invalid_token_title')}</h1>
        <p className="mt-4 text-gray-600 mb-8">
          {t('reset_password.invalid_token_desc')}
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            {t('reset_password.request_new_link')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center lg:text-left">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('reset_password.title')}</h1>
        <p className="mt-2 text-base text-gray-600">
          {t('reset_password.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Input
          id="password"
          label={t('form.new_password.label')}
          type="password"
          placeholder={t('form.password.placeholder')}
          error={errors.password?.message}
          {...register('password', { required: 'auth:form.password.required' })}
        />

        <Input
          id="confirmPassword"
          label={t('form.confirm_password.label')}
          type="password"
          placeholder={t('form.password.placeholder')}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', { required: 'auth:form.password.required' })}
        />

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20" isLoading={isLoading}>
          {t('reset_password.submit')}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
