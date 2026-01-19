'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForgotPasswordParams } from '@subcare/types';
import { Globe, Music, CreditCard, Cloud, ArrowLeft } from 'lucide-react';

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
        </div>
      </div>
    </div>
  );
}
