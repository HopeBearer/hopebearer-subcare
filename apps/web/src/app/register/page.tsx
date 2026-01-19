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
import { Card } from '@/components/ui/card';
import { RegisterParams } from '@subcare/types';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

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
      let message = 'Failed to register. Please try again.';
      if (err instanceof AxiosError && err.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FDFDFF] via-[#F2F3FF] to-[#EAEAFE] dark:bg-gray-900 relative">
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md my-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
            <p className="text-gray-600 dark:text-gray-400">Join SubCare to manage your subscriptions.</p>
          </div>

          <Card className="shadow-lg border-opacity-50 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
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
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />

              <div className="space-y-3">
                  <Input
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Create a password"
                    error={errors.password?.message}
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
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
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: (val) => val === password || 'Passwords do not match'
                })}
              />
              
              <Button type="submit" className="w-full py-3 mt-6 shadow-primary-sm" isLoading={isLoading}>
                Create Account
              </Button>

               <div className="text-center mt-4 text-sm">
                  <span className="text-gray-500">Already have an account? </span>
                  <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
                    Log in
                  </Link>
               </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
