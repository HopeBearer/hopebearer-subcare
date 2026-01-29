'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/hooks';
import { Lock, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';
import JSEncrypt from 'jsencrypt';

export function AccountSettings() {
  const { t } = useTranslation('settings');
  const { user } = useAuthStore();
  
  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!user?.email) return;
    setIsSendingCode(true);
    try {
      await authService.sendVerificationCode(user.email);
      setCountdown(60);
      toast.success(t('account.code_sent', 'Verification code sent to your email'));
    } catch (error) {
      toast.error(t('account.send_failed', 'Failed to send verification code'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword || !verificationCode) {
      toast.error(t('messages.fill_all_fields', 'Please fill in all fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('messages.passwords_mismatch', 'New passwords do not match'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('messages.password_too_short', 'Password must be at least 8 characters'));
      return;
    }

    setIsUpdating(true);
    try {
      // Fetch public key
      const { data } = await authService.getPublicKey();
      const encryptor = new JSEncrypt();
      encryptor.setPublicKey(data.publicKey);

      const encryptedCurrentPassword = encryptor.encrypt(currentPassword);
      const encryptedNewPassword = encryptor.encrypt(newPassword);

      if (!encryptedCurrentPassword || !encryptedNewPassword) {
        throw new Error('Encryption failed');
      }

      await authService.changePassword({
        currentPassword: encryptedCurrentPassword,
        newPassword: encryptedNewPassword,
        verificationCode
      });
      
      toast.success(t('messages.password_updated', 'Password updated successfully'));
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
    } catch (error) {
      toast.error(t('messages.update_failed', 'Failed to update password'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('account.title', 'Account Security')}
        </h2>
        <p className="text-secondary text-sm">
          {t('account.description', 'Manage your account security and preferences')}
        </p>
      </div>

      <Card className="space-y-8">
        {/* Password Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('account.password', 'Change Password')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4 max-w-xl">
            <Input
              type="password"
              label={t('account.current_password', 'Current Password')}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              label={t('account.new_password', 'New Password')}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              label={t('account.confirm_password', 'Confirm New Password')}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            
            <div className="flex gap-4 items-end">
              <Input
                label={t('account.verification_code', 'Verification Code')}
                placeholder="123456"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleSendCode}
                disabled={isSendingCode || countdown > 0}
                className="mb-[2px] w-32"
              >
                {countdown > 0 ? `${countdown}s` : t('account.send_code', 'Send Code')}
              </Button>
            </div>
            <p className="text-xs text-secondary">
              {t('account.code_hint', 'For your security, please verify your email to change password.')}
            </p>
          </div>

          <div className="mt-4">
            <Button 
              onClick={handleUpdatePassword}
              disabled={isUpdating}
            >
              {isUpdating ? t('common.updating', 'Updating...') : t('account.update_password', 'Update Password')}
            </Button>
          </div>
        </div>

        <div className="border-t border-base my-6" />

        <div className="border-t border-base my-6" />

        {/* Delete Account */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-error" />
            <h3 className="text-lg font-semibold text-error">
              {t('account.danger_zone', 'Danger Zone')}
            </h3>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('account.delete_account', 'Delete Account')}
              </p>
              <p className="text-xs text-secondary mt-1">
                {t('account.delete_warning', 'Permanently remove your account and all of its data.')}
              </p>
            </div>
            <Button variant="ghost" className="text-error hover:bg-red-100 hover:text-error dark:hover:bg-red-900/30">
              {t('account.delete_confirm', 'Delete Account')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
