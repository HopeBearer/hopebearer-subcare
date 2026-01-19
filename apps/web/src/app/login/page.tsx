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
import { Globe, Music, CreditCard, Cloud, RefreshCw } from 'lucide-react'; // Using icons as placeholders

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
    <div className="min-h-screen flex w-full">
      {/* Left Brand Area - 40% */}
      <div className="hidden lg:flex lg:w-40pct bg-gradient-to-br from-[#FDFDFF] to-[#EAEAFE] relative overflow-hidden flex-col justify-center z-10">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
             <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
             <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Decorative Transition Overlay - Smooths the edge between left/right panels */}
        <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white/80 to-transparent z-0 pointer-events-none"></div>
        {/* Decorative Circle overlapping the edge */}
        <div className="absolute top-1/2 -right-16 transform -translate-y-1/2 w-32 h-32 bg-white/20 backdrop-blur-md rounded-full z-20"></div>

        {/* 3D Icons Composition (Simulated with standard icons and CSS effects) */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
             <div className="relative w-full h-full flex items-center justify-center">
                {/* Central Card */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center border border-white/50 animate-float z-20">
                    <CreditCard className="w-12 h-12 text-primary" />
                </div>
                
                {/* Floating Icons */}
                <div className="absolute top-0 right-10 w-20 h-20 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                    <Music className="w-8 h-8 text-pink-400" />
                </div>
                <div className="absolute bottom-10 left-0 w-24 h-24 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '3s' }}>
                    <Cloud className="w-10 h-10 text-blue-400" />
                </div>
                 <div className="absolute top-20 left-10 w-16 h-16 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '1.5s' }}>
                    <Globe className="w-6 h-6 text-green-400" />
                </div>
             </div>
        </div>

        {/* Slogan */}
        <div className="p-12 bottom-12 left-12 right-12 z-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Master Your Subscriptions</h2>
          <p className="text-lg text-gray-600">Take control of every subscription, organize your life.</p>
        </div>
      </div>

      {/* Right Form Area - 60% */}
      <div className="w-full lg:w-60pct bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FF] flex flex-col justify-center items-center overflow-y-auto p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-10 my-auto">
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
                    <label className="block text-base font-medium text-secondary mb-2.5">
                        Security Code
                    </label>
                    <div className="flex space-x-2">
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
        </div>
      </div>
    </div>
  );
}
