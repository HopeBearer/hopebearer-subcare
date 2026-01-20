'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoginParams } from '@subcare/types';
import { RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginParams>();

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

  const onSubmit = async (data: LoginParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);
      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login failed', err);
      let message = 'Failed to login. Please check your credentials.';
      if (err instanceof AxiosError && err.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
        <p className="mt-2 text-base text-gray-600">
          Please enter your details to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
            {error}
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

            <div className="relative">
                <Input
                id="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password', { required: 'Password is required' })}
                />
            </div>

            <div className="flex flex-col space-y-2">
                <label className="block text-base font-medium text-secondary mb-1">
                    Security Code
                </label>
                <div className="flex space-x-2 mb-2">
                    <div className="relative flex-1 mr-2">
                        <Input
                        id="captchaCode"
                        placeholder="Enter code"
                        error={errors.captchaCode?.message}
                        className="mt-0"
                        {...register('captchaCode', { required: 'Code is required' })}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
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

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer accent-primary"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-hover">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-primary/20 mt-4" isLoading={isLoading}>
          Sign in
        </Button>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Don&apos;t have an account? </span>
          <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
            Sign up
          </Link>
        </div>

      </form>
    </>
  );
}
