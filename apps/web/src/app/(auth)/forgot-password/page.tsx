'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForgotPasswordParams } from '@subcare/types';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { handleApiError } from '@/lib/error-helper';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useTranslation('auth');

  const form = useForm<ForgotPasswordParams>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: ForgotPasswordParams) => {
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      await authService.forgotPassword(data);
      setSuccessMessage(t('status.reset_link_sent'));
    } catch (err: unknown) {
      console.error('Forgot password request failed', err);
      // 使用统一的错误处理函数
      handleApiError(err, form);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="text-center lg:text-left">
        <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('forgot_password.back_to_login')}
        </Link>
        <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-white font-bold text-2xl">S</span>
            </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('forgot_password.title')}</h1>
        <p className="mt-2 text-base text-gray-600">
          {t('forgot_password.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        
        {successMessage && (
           <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
            <Input
            id="email"
            label={t('form.email.label')}
            type="email"
            placeholder={t('form.email.placeholder')}
            error={errors.email?.message}
            {...register('email', { required: 'auth:form.email.required' })}
            />
        </div>

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20 mt-4" isLoading={isLoading}>
          {t('forgot_password.submit')}
        </Button>

      </form>
    </>
  );
}
