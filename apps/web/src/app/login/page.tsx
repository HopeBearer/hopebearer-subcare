'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LoginParams } from '@subcare/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginParams>();

  const onSubmit = async (data: LoginParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);
      // Ensure we are accessing the correct structure based on API response
      // The service returns response.data directly due to interceptor?
      // Let's check api.ts again.
      // api.ts: response => response.data
      // authService.ts: returns api.post<...>
      // So here response should be the body.
      // Body structure from AuthController: { status: 'success', code: 200, data: { accessToken, refreshToken, user } }
      
      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login failed', err);
      // Handle axios error or other errors
      let message = 'Failed to login. Please check your credentials.';
      if (err instanceof AxiosError && err.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SubCare</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back! Please login to your account.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}

            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Don&apos;t have an account? </span>
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
