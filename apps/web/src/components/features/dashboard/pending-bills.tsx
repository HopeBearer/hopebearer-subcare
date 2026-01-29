'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { financialService } from '@/services/financial.service';
import { format, isBefore, subDays } from 'date-fns';
import { PaymentRecordDTO } from '@subcare/types';

export function PendingBills() {
  const { t } = useTranslation(['dashboard', 'common']);
  const queryClient = useQueryClient();
  
  const [selectedBill, setSelectedBill] = useState<PaymentRecordDTO | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<string>('');
  const [confirmDate, setConfirmDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: bills, isLoading } = useQuery({
    queryKey: ['pending-bills'],
    queryFn: () => financialService.getPendingBills(),
  });

  const confirmMutation = useMutation({
    mutationFn: (vars: { id: string, amount: number, date: Date }) => 
      financialService.confirmPayment(vars.id, { amount: vars.amount, date: vars.date }),
    onSuccess: () => {
      toast.success(t('pending_bills.confirmed_msg'));
      queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
      queryClient.invalidateQueries({ queryKey: ['financial-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      handleCloseModal();
    },
    onError: () => {
      toast.error(t('common.error') || 'Something went wrong');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => financialService.cancelRenewal(id),
    onSuccess: () => {
      toast.success(t('pending_bills.cancelled_msg'));
      queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => {
      toast.error(t('common.error') || 'Something went wrong');
    }
  });

  const handleOpenModal = (bill: PaymentRecordDTO) => {
    setSelectedBill(bill);
    setConfirmAmount(String(bill.amount));
    setConfirmDate(format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBill(null);
    setConfirmAmount('');
    setConfirmDate('');
  };

  const handleConfirm = () => {
    if (!selectedBill) return;
    const amount = parseFloat(confirmAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Invalid amount');
      return;
    }
    const date = new Date(confirmDate);
    if (isNaN(date.getTime())) {
      toast.error('Invalid date');
      return;
    }
    confirmMutation.mutate({ id: selectedBill.id, amount, date });
  };

  if (isLoading || !bills || bills.length === 0) return null;

  const isOverdue = (dateStr: string | Date) => {
    return isBefore(new Date(dateStr), subDays(new Date(), 7));
  };

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/30 dark:border-orange-900/50 dark:bg-orange-900/10">
        <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-orange-700 dark:text-orange-400">
          <AlertCircle className="h-5 w-5" />
          {t('pending_bills.title')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-orange-600/60 hover:text-orange-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-normal text-xs">
                  {t('pending_bills.explanation', { defaultValue: 'Bills due today or overdue. Confirm payment to update subscription status.' })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-4">
          {bills.map((bill) => {
            const overdue = isOverdue(bill.billingDate);
            return (
              <div key={bill.id} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${overdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} dark:bg-opacity-20`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{bill.subscription?.name || 'Unknown Subscription'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('pending_bills.due_date')}: {format(new Date(bill.billingDate), 'PP')}</span>
                      {overdue && (
                        <span className="text-red-600 font-medium text-xs border border-red-200 bg-red-50 px-1 rounded">
                          {t('pending_bills.overdue') || 'Overdue'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg ${overdue ? 'text-red-600' : ''}`}>
                    {bill.currency} {Number(bill.amount).toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if(confirm(t('pending_bills.confirm_cancel') || 'Are you sure you want to cancel this renewal? This will also cancel the subscription.')) {
                                cancelMutation.mutate(bill.id);
                            }
                        }}
                        disabled={cancelMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1 h-auto text-sm"
                    >
                        {t('pending_bills.cancel_btn') || 'Cancel'}
                    </Button>
                    <Button 
                        onClick={() => handleOpenModal(bill)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 h-auto text-sm"
                    >
                        <Check className="mr-1 h-4 w-4" />
                        {t('pending_bills.confirm_btn')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={t('pending_bills.confirm_title') || 'Confirm Payment'}
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t('pending_bills.confirm_desc') || 'Please verify the actual amount paid.'}
          </p>
          
          <Input
            label={t('pending_bills.amount_label') || 'Actual Amount'}
            type="number"
            value={confirmAmount}
            onChange={(e) => setConfirmAmount(e.target.value)}
          />

          <Input
            label={t('pending_bills.date_label') || 'Payment Date'}
            type="date"
            value={confirmDate}
            onChange={(e) => setConfirmDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={handleCloseModal}>
              {t('button.cancel', { ns: 'common' }) || 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirm}
              isLoading={confirmMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {t('button.confirm', { ns: 'common' }) || 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
