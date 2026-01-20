'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForgotPasswordParams } from '@subcare/types';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordParams>();

  const onSubmit = async (data: ForgotPasswordParams) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.forgotPassword(data);
      setSuccessMessage('If an account exists with this email, you will receive a password reset link.');
    } catch (err: unknown) {
      console.error('Forgot password request failed', err);
      let message = 'Failed to send reset link. Please try again.';
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
      {/* Header */}
      <div className="text-center lg:text-left">
        <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>
        <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-white font-bold text-2xl">S</span>
            </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password?</h1>
        <p className="mt-2 text-base text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        {successMessage && (
           <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
            <Input
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
            />
        </div>

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20 mt-4" isLoading={isLoading}>
          Send Reset Link
        </Button>

      </form>
    </>
  );
}
