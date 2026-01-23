'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleApiError } from '@/lib/error-helper';
import { useTranslation } from '@/lib/i18n/hooks';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('auth:form.email.invalid'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useTranslation('auth');

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);

    try {
      await authService.forgotPassword(data);
      setIsSuccess(true);
      toast.success(t('forgot_password.success_message'));
    } catch (err: unknown) {
      handleApiError(err, form);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('forgot_password.check_email')}</h1>
        <p className="mt-4 text-gray-600 mb-8">
          {t('forgot_password.email_sent_desc')}
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            {t('forgot_password.back_to_login')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center lg:text-left">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('forgot_password.title')}</h1>
        <p className="mt-2 text-base text-gray-600">
          {t('forgot_password.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Input
          id="email"
          label={t('form.email.label')}
          type="email"
          placeholder={t('form.email.placeholder')}
          error={errors.email?.message}
          {...register('email', { required: 'auth:form.email.required' })}
        />

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20" isLoading={isLoading}>
          {t('forgot_password.submit')}
        </Button>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            {t('forgot_password.back_to_login')}
          </Link>
        </div>
      </form>
    </>
  );
}
