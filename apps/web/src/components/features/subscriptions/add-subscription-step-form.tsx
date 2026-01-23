'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Check, Upload, Calendar as CalendarIcon, Bell, CreditCard, Tag, Link as LinkIcon, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { SubscriptionCard, Subscription } from './subscription-card';
import { CreateSubscriptionDTO } from '@subcare/types';
// --- Validation Schemas ---

const step1Schema = z.object({
  name: z.string().min(1, 'required'),
  price: z.coerce.number().min(0, 'invalid_price'),
  currency: z.string().default('CNY'),
  cycle: z.enum(['Monthly', 'Yearly']).default('Monthly'),
  logo: z.any().optional(), // File or string URL
});

const step2Schema = z.object({
  category: z.string().optional(),
  startDate: z.string().min(1, 'required'), // Date string YYYY-MM-DD
  paymentMethod: z.string().optional(),
  autoRenewal: z.boolean().default(true),
});

const step3Schema = z.object({
  enableNotification: z.boolean().default(false),
  notifyDaysBefore: z.coerce.number().optional(),
  notes: z.string().optional(),
  url: z.string().url('invalid_url').optional().or(z.literal('')),
});

const formSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type FormData = z.infer<typeof formSchema>;

// --- Components ---

interface AddSubscriptionStepFormProps {
  onCancel: () => void;
  onSubmit: (data: FormData) => void;
}

const STEPS = [
  { id: 1, title: 'core_info', icon: CreditCard },
  { id: 2, title: 'payment_category', icon: Tag },
  { id: 3, title: 'notification_notes', icon: Bell },
];

export function AddSubscriptionStepForm({ onCancel, onSubmit }: AddSubscriptionStepFormProps) {
  const { t } = useTranslation(['subscription', 'common']);
  const [step, setStep] = useState(1);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: 'CNY',
      cycle: 'Monthly',
      autoRenewal: true,
      enableNotification: false,
      notifyDaysBefore: 1,
      category: 'Entertainment', // Default category
    },
    mode: 'onChange',
  });

  const { control, register, handleSubmit, watch, trigger, setValue, formState: { errors, isValid } } = form;
  const formData = watch();

  // Watch fields for preview
  const previewSubscription: Subscription = {
    id: 'preview',
    name: formData.name || t('preview_name', { defaultValue: 'Subscription Name' }),
    cost: formData.price || 0,
    currency: formData.currency,
    cycle: formData.cycle,
    nextRenewalDate: formData.startDate || new Date().toISOString(),
    status: 'Active',
    category: formData.category || 'Uncategorized',
    logoUrl: logoPreview,
  };

  const handleNext = async () => {
    let isStepValid = false;
    if (step === 1) {
      isStepValid = await trigger(['name', 'price', 'currency', 'cycle']);
    } else if (step === 2) {
      isStepValid = await trigger(['category', 'startDate', 'paymentMethod', 'autoRenewal']);
    }

    if (isStepValid) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setValue('logo', file);
    }
  };

// ... other code ...

  const onFormSubmit = (data: FormData) => {
    // Transform FormData to CreateSubscriptionDTO
    const payload: CreateSubscriptionDTO = {
      name: data.name,
      price: data.price,
      currency: data.currency,
      billingCycle: data.cycle,
      startDate: new Date(data.startDate), // Convert string to Date
      category: data.category,
      paymentMethod: data.paymentMethod,
      autoRenewal: data.autoRenewal,
      enableNotification: data.enableNotification,
      notifyDaysBefore: data.notifyDaysBefore,
      notes: data.notes,
      website: data.url ? data.url : undefined, // Map url to website
      userId: '', // This will be handled by the backend from the token
      // TODO: Handle Logo Upload separately if needed, or pass as base64/url if API supports it
      // For now, we are skipping the file object as it can't be JSON serialized directly in the DTO
    };
    
    onSubmit(payload as any); // Type assertion needed because userId is required in DTO but injected by backend
  };

  return (
// ... rest of the file ...
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Stepper */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
        {STEPS.map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = s.id < step;
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex flex-col items-center relative z-10">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isActive ? "bg-primary text-white border-primary shadow-lg scale-110" : 
                  isCompleted ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-400 border-gray-200"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium transition-colors duration-300",
                isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-gray-400"
              )}>
                {t(`steps.${s.title}`)}
              </span>
              
              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="absolute top-5 left-1/2 w-[calc(100%+4rem)] h-[2px] -z-10 bg-gray-100">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {step === 1 && (
              <div
                key="step1"
                className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300"
              >
                {/* Logo Upload & Name */}
                <div className="flex items-start gap-4">
                   <div className="shrink-0">
                    <label className="block w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-primary transition-colors bg-gray-50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                    <span className="text-[10px] text-gray-400 text-center block mt-1">Logo</span>
                   </div>
                   <div className="flex-1 space-y-4">
                     <Input 
                        label={t('name', { ns: 'subscription' })} 
                        placeholder="e.g. Netflix" 
                        {...register('name')} 
                        error={errors.name?.message}
                      />
                   </div>
                </div>

                {/* Price & Currency & Cycle */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="block text-base font-medium text-secondary mb-1">{t('cost', { ns: 'subscription' })}</label>
                      <div className="flex gap-2">
                        <Select 
                           {...register('currency')}
                           className="w-24"
                           options={[
                             { label: 'CNY', value: 'CNY' },
                             { label: 'USD', value: 'USD' },
                             { label: 'EUR', value: 'EUR' },
                             { label: 'JPY', value: 'JPY' },
                           ]}
                        />
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          step="0.01"
                          {...register('price')} 
                          error={errors.price?.message}
                        />
                      </div>
                   </div>
                   <div className="space-y-1">
                     <label className="block text-base font-medium text-secondary mb-1">{t('cycle', { ns: 'subscription' })}</label>
                     <div className="flex items-center gap-3 h-[3rem] px-1">
                        <span className={cn("text-sm transition-colors", formData.cycle === 'Monthly' ? "text-primary font-bold" : "text-gray-500")}>
                          {t('cycle_options.Monthly', { ns: 'subscription' })}
                        </span>
                        <Controller
                          control={control}
                          name="cycle"
                          render={({ field }) => (
                            <Switch 
                              checked={field.value === 'Yearly'}
                              onCheckedChange={(checked) => field.onChange(checked ? 'Yearly' : 'Monthly')}
                            />
                          )}
                        />
                        <span className={cn("text-sm transition-colors", formData.cycle === 'Yearly' ? "text-primary font-bold" : "text-gray-500")}>
                          {t('cycle_options.Yearly', { ns: 'subscription' })}
                        </span>
                     </div>
                   </div>
                </div>

                {/* Live Preview */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('preview', { ns: 'common' })}</h4>
                  <div className="max-w-sm mx-auto transform hover:scale-105 transition-transform duration-300">
                    <SubscriptionCard subscription={previewSubscription} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div
                key="step2"
                className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300"
              >
                 <div className="grid grid-cols-2 gap-4">
                   <Select
                     label={t('category', { ns: 'subscription' })}
                     {...register('category')}
                     options={[
                       { label: t('categories.entertainment', { ns: 'subscription' }), value: 'Entertainment' },
                       { label: t('categories.productivity', { ns: 'subscription' }), value: 'Productivity' },
                       { label: t('categories.tools', { ns: 'subscription' }), value: 'Tools' },
                       { label: t('categories.social', { ns: 'subscription' }), value: 'Social' },
                       { label: t('categories.utilities', { ns: 'subscription' }), value: 'Utilities' },
                       { label: t('categories.other', { ns: 'subscription' }), value: 'Other' },
                     ]}
                   />
                   <Input 
                     type="date" 
                     label={t('first_payment', { ns: 'subscription' })}
                     {...register('startDate')}
                     error={errors.startDate?.message}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <Select
                      label={t('payment_method', { ns: 'subscription' })}
                      {...register('paymentMethod')}
                      options={[
                        { label: t('payment_methods.credit_card', { defaultValue: 'Credit Card' }), value: 'Credit Card' },
                        { label: t('payment_methods.alipay', { defaultValue: 'Alipay' }), value: 'Alipay' },
                        { label: t('payment_methods.wechat', { defaultValue: 'WeChat' }), value: 'WeChat' },
                        { label: t('payment_methods.paypal', { defaultValue: 'PayPal' }), value: 'PayPal' },
                      ]}
                   />
                   <div className="space-y-2">
                     <label className="block text-base font-medium text-secondary">{t('auto_renewal', { ns: 'subscription' })}</label>
                     <div className="flex items-center gap-3 h-10">
                       <Controller
                          control={control}
                          name="autoRenewal"
                          render={({ field }) => (
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span className="text-sm text-gray-500">{formData.autoRenewal ? t('yes', { ns: 'common' }) : t('no', { ns: 'common' })}</span>
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {step === 3 && (
              <div
                key="step3"
                className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300"
              >
                 <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Bell className="w-5 h-5 text-gray-500" />
                         <span className="font-medium text-gray-900">{t('enable_notification', { ns: 'subscription' })}</span>
                       </div>
                       <Controller
                          control={control}
                          name="enableNotification"
                          render={({ field }) => (
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                    </div>
                    
                    {formData.enableNotification && (
                      <div 
                        className="pl-7 animate-in slide-in-from-top-2 fade-in duration-200"
                      >
                         <div className="flex items-center gap-2">
                           <span className="text-sm text-gray-600">{t('notify_me', { ns: 'subscription' })}</span>
                           <Input 
                             type="number" 
                             className="w-20 text-center"
                             {...register('notifyDaysBefore')}
                           />
                           <span className="text-sm text-gray-600">{t('days_before', { ns: 'subscription' })}</span>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    <div className="relative">
                      <StickyNote className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                      <Input 
                        className="pl-10"
                        placeholder={t('notes_placeholder', { ns: 'subscription', defaultValue: 'Add some notes...' })}
                        {...register('notes')}
                      />
                    </div>
                    <div className="relative">
                      <LinkIcon className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                      <Input 
                        className="pl-10"
                        placeholder="https://..."
                        {...register('url')}
                        error={errors.url?.message}
                      />
                    </div>
                 </div>
              </div>
            )}
        </form>
      </div>

      {/* Footer Actions */}
      <div className="px-8 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-xl">
         {step === 1 ? (
           <Button variant="ghost" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
             {t('button.cancel', { ns: 'common' })}
           </Button>
         ) : (
           <Button variant="outline" onClick={handleBack} className="gap-2">
             <ChevronLeft className="w-4 h-4" /> {t('back', { ns: 'common' })}
           </Button>
         )}

         <div className="flex gap-3">
           {step === 1 && (
             <Button 
                variant="outline" 
                onClick={handleSubmit(onFormSubmit)}
                className="border-primary text-primary hover:bg-primary-pale"
              >
                {t('save_now', { ns: 'subscription' })}
             </Button>
           )}
           
           {step < 3 ? (
             <Button onClick={handleNext} className="gap-2 bg-primary hover:bg-primary-hover text-white">
               {t('next', { ns: 'common' })} <ChevronRight className="w-4 h-4" />
             </Button>
           ) : (
             <Button onClick={handleSubmit(onFormSubmit)} className="gap-2 bg-primary hover:bg-primary-hover text-white">
               <Check className="w-4 h-4" /> {t('complete', { ns: 'common' })}
             </Button>
           )}
         </div>
      </div>
    </div>
  );
}
