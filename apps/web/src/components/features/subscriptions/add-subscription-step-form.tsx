'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Check, Upload, Calendar as CalendarIcon, Bell, CreditCard, Tag, Link as LinkIcon, StickyNote, Save, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { SubscriptionCard, Subscription } from './subscription-card';
import { CreateSubscriptionDTO, SubscriptionDTO, SubscriptionUsage } from '@subcare/types';
import { AutocompleteInput, AutocompleteOption } from '@/components/ui/autocomplete-input';
import { subscriptionService } from '@/services/subscription.service';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/store/modal.store';
import { calculateNextPayment } from '@subcare/utils';
import { isBefore, isFuture, isToday, format } from 'date-fns';

// --- Validation Schemas ---

const step1Schema = z.object({
  name: z.string().min(1, 'required'),
  price: z.coerce.number().min(0, 'invalid_price'),
  currency: z.string().default('CNY'),
  cycle: z.enum(['Monthly', 'Yearly']).default('Monthly'),
  startDate: z.string().min(1, 'required'), // Date string YYYY-MM-DD
  logo: z.any().optional(), // File or string URL
});

const step2Schema = z.object({
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  autoRenewal: z.boolean().default(true),
  usage: z.string().default('Normally'),
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
  initialValues?: SubscriptionDTO | null;
}

const STEPS = [
  { id: 1, title: 'core_info', icon: CreditCard },
  { id: 2, title: 'payment_category', icon: Tag },
  { id: 3, title: 'notification_notes', icon: Bell },
];

export function AddSubscriptionStepForm({ onCancel, onSubmit, initialValues }: AddSubscriptionStepFormProps) {
  const { t } = useTranslation(['subscription', 'common']);
  const [step, setStep] = useState(1);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(initialValues?.icon || undefined);
  const router = useRouter();
  const { closeAddSubscription, openAddSubscription } = useModalStore();

  const [conflictModal, setConflictModal] = useState<{ 
    isOpen: boolean; 
    name: string; 
    existing: any | null;
    onContinue?: () => void;
  }>({
    isOpen: false,
    name: '',
    existing: null
  });

  const [confirmedConflictName, setConfirmedConflictName] = useState<string | null>(null);

  const { data: existingNames = [] } = useQuery({ // Use default value instead of initialData
    queryKey: ['subscription-names'],
    queryFn: async () => {
        const names = await subscriptionService.getNames();
        console.log('[DEBUG] Fetched existing names:', names);
        return names;
    },
  });

  const autocompleteOptions: AutocompleteOption[] = existingNames.map(item => ({
      name: item.name,
      icon: item.icon
  }));
  
  console.log('[DEBUG] Autocomplete options:', autocompleteOptions);

  const defaultStartDate = initialValues?.startDate ? new Date(initialValues.startDate).toISOString().split('T')[0] : '';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || '',
      price: initialValues?.price || undefined,
      currency: initialValues?.currency || 'CNY',
      cycle: (initialValues?.billingCycle as 'Monthly' | 'Yearly') || 'Monthly',
      startDate: defaultStartDate,
      category: initialValues?.category || 'Entertainment',
      paymentMethod: initialValues?.paymentMethod || 'Credit Card',
      autoRenewal: initialValues?.autoRenewal ?? true,
      usage: initialValues?.usage || 'Normally',
      enableNotification: initialValues?.enableNotification ?? false,
      notifyDaysBefore: initialValues?.notifyDaysBefore || 1,
      notes: initialValues?.notes || '',
      url: initialValues?.website || '',
    },
    mode: 'onChange',
  });

  const { control, register, handleSubmit, watch, trigger, setValue, formState: { errors, isValid } } = form;
  const formData = watch();
  const isEditMode = !!initialValues;

  // Watch fields for preview
  const previewSubscription: Subscription = {
    id: initialValues?.id || 'preview',
    name: formData.name || t('preview_name', { defaultValue: 'Subscription Name' }),
    price: formData.price || 0,
    currency: formData.currency,
    billingCycle: formData.cycle,
    startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
    nextPayment: formData.startDate ? calculateNextPayment(formData.startDate, formData.cycle) : new Date(),
    status: initialValues?.status || 'Active',
    category: formData.category || 'Uncategorized',
    usage: formData.usage,
    icon: logoPreview,
    autoRenewal: formData.autoRenewal,
    enableNotification: formData.enableNotification,
    userId: initialValues?.userId || 'preview',
    createdAt: initialValues?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  const handleNext = async () => {
    let isStepValid = false;
    if (step === 1) {
      isStepValid = await trigger(['name', 'price', 'currency', 'cycle', 'startDate']);
      
      if (isStepValid && !isEditMode) {
         const name = formData.name;
         if (!name) return; 

         try {
             console.log('[DEBUG] Checking conflict for:', name);
             const result = await subscriptionService.checkConflict(name);
             console.log('[DEBUG] Check conflict result:', result);
             
             if (result.conflict && result.existingSubscription) {
                 console.log('[DEBUG] Conflict detected, opening modal');
                 setConflictModal({ 
                     isOpen: true, 
                     name, 
                     existing: result.existingSubscription,
                     onContinue: () => {
                        setConfirmedConflictName(name);
                        setStep((prev) => Math.min(prev + 1, 3));
                     }
                 });
                 return; 
             } else {
                 console.log('[DEBUG] No conflict found');
             }
         } catch (e) {
             console.error("Check conflict failed", e);
         }
      }
    } else if (step === 2) {
      isStepValid = await trigger(['category', 'paymentMethod', 'autoRenewal', 'usage']);
    }

    if (isStepValid) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };
  
  const handleResolveConflict = (action: 'use_existing' | 'create_new') => {
      setConflictModal(prev => ({ ...prev, isOpen: false }));
      if (action === 'create_new') {
          if (conflictModal.onContinue) {
              conflictModal.onContinue();
          } else {
             setStep((prev) => Math.min(prev + 1, 3));
          }
      } else {
          // Use existing: Open edit for the existing one?
          // We need to close current modal and open edit modal.
          // Assuming useModalStore has openEditSubscription or we just set subscriptionToEdit
          if (conflictModal.existing) {
              // This is a bit hacky depending on how the store works, 
              // but typically we'd call openAddSubscription with the existing item to edit it.
              // Let's assume openAddSubscription(existing) works or similar.
              // Actually useModalStore usually has `openAddSubscription(subscriptionToEdit?)`.
              // Let's check imports. `useModalStore` is imported.
              
              closeAddSubscription();
              // Small timeout to allow close animation or state reset
              setTimeout(() => {
                  openAddSubscription(conflictModal.existing);
              }, 100);
          }
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

  const onFormSubmit = async (data: FormData) => {
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
      usage: data.usage as SubscriptionUsage,
      enableNotification: data.enableNotification,
      notifyDaysBefore: data.notifyDaysBefore,
      notes: data.notes,
      website: data.url ? data.url : undefined, // Map url to website
      userId: '', // This will be handled by the backend from the token
      // TODO: Handle Logo Upload separately if needed, or pass as base64/url if API supports it
      // For now, we are skipping the file object as it can't be JSON serialized directly in the DTO
    };

    // Check conflict if creating new and not already confirmed
    if (!isEditMode && data.name && data.name !== confirmedConflictName) {
         try {
             const result = await subscriptionService.checkConflict(data.name);
             if (result.conflict && result.existingSubscription) {
                 setConflictModal({ 
                     isOpen: true, 
                     name: data.name, 
                     existing: result.existingSubscription,
                     onContinue: () => {
                         setConfirmedConflictName(data.name);
                         onSubmit(payload as any);
                     }
                 });
                 return; 
             }
         } catch (e) {
             console.error("Check conflict failed during save", e);
         }
    }
    
    onSubmit(payload as any); // Type assertion needed because userId is required in DTO but injected by backend
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Stepper */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
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
                  isCompleted ? "bg-green-500 text-white border-green-500" : "bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium transition-colors duration-300",
                isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-gray-400 dark:text-gray-500"
              )}>
                {t(`steps.${s.title}`)}
              </span>
              
              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="absolute top-5 left-1/2 w-[calc(100%+4rem)] h-[2px] -z-10 bg-gray-100 dark:bg-gray-800">
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
                    <label className="block w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary cursor-pointer flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:text-primary transition-colors bg-gray-50 dark:bg-gray-800/50">
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
                     <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                           <AutocompleteInput
                              label={t('name', { ns: 'subscription' })}
                              placeholder="e.g. Netflix"
                              options={autocompleteOptions}
                              value={field.value}
                              onChange={field.onChange}
                              error={errors.name?.message}
                           />
                        )}
                     />
                   </div>
                </div>

                {/* Price & Currency & Cycle */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="block text-base font-medium text-secondary dark:text-gray-300 mb-1">{t('cost', { ns: 'subscription' })}</label>
                      <div className="flex gap-2">
                        <Controller
                           control={control}
                           name="currency"
                           render={({ field }) => (
                             <Select 
                               {...field}
                               className="w-32"
                               options={[
                                 { label: 'CNY', value: 'CNY' },
                                 { label: 'USD', value: 'USD' },
                                 { label: 'EUR', value: 'EUR' },
                                 { label: 'JPY', value: 'JPY' },
                               ]}
                             />
                           )}
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
                     <label className="block text-base font-medium text-secondary dark:text-gray-300 mb-1">{t('cycle', { ns: 'subscription' })}</label>
                     <div className="flex items-center gap-3 h-[3rem] px-1">
                        <span className={cn("text-sm transition-colors", formData.cycle === 'Monthly' ? "text-primary font-bold" : "text-gray-500 dark:text-gray-400")}>
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
                        <span className={cn("text-sm transition-colors", formData.cycle === 'Yearly' ? "text-primary font-bold" : "text-gray-500 dark:text-gray-400")}>
                          {t('cycle_options.Yearly', { ns: 'subscription' })}
                        </span>
                     </div>
                   </div>
                </div>

                {/* First Payment Date */}
                <div>
                   <Input 
                     type="date" 
                     label={t('first_payment', { ns: 'subscription' })}
                     {...register('startDate')}
                     error={errors.startDate?.message}
                   />
                </div>
                
                {/* Info message about dates */}
                {formData.startDate && (() => {
                  const date = new Date(formData.startDate);
                  const isDateToday = isToday(date);
                  const isDateFuture = isFuture(date);
                  const isDatePast = isBefore(date, new Date()) && !isDateToday;

                  return (
                    <div className={cn(
                      "flex gap-2 p-3 text-xs sm:text-sm rounded-lg animate-in fade-in duration-300",
                      isDateToday ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" :
                      isDateFuture ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    )}>
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        {isDateToday && (
                          <p>{t('date_info.today', { defaultValue: 'Since it starts today, a bill will be generated immediately for you to confirm.' })}</p>
                        )}
                        {isDatePast && (
                          <p>
                            {t('past_date_info', { 
                              defaultValue: 'Past date selected. The system will assume previous cycles are paid. The next bill will be generated for the upcoming cycle.' 
                            })}
                          </p>
                        )}
                        {isDateFuture && (
                          <p>
                            {t('date_info.future', { 
                              defaultValue: 'Future start date. Your first bill will appear on {{date}}.',
                              date: format(date, 'MMM d, yyyy')
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Live Preview */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('preview', { ns: 'common' })}</h4>
                  <div className="max-w-sm mx-auto transform hover:scale-105 transition-transform duration-300">
                    <SubscriptionCard subscription={previewSubscription} readonly={true} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div
                key="step2"
                className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300"
              >
                 <div className="grid grid-cols-1 gap-4">
                   <Controller
                     control={control}
                     name="category"
                     render={({ field }) => (
                       <Select
                         label={t('category', { ns: 'subscription' })}
                         {...field}
                         options={[
                           { label: t('categories.entertainment', { ns: 'subscription' }), value: 'Entertainment' },
                           { label: t('categories.productivity', { ns: 'subscription' }), value: 'Productivity' },
                           { label: t('categories.tools', { ns: 'subscription' }), value: 'Tools' },
                           { label: t('categories.social', { ns: 'subscription' }), value: 'Social' },
                           { label: t('categories.utilities', { ns: 'subscription' }), value: 'Utilities' },
                           { label: t('categories.other', { ns: 'subscription' }), value: 'Other' },
                         ]}
                       />
                     )}
                   />
                 </div>

                 {/* Usage Level */}
                 <div className="space-y-2">
                   <label className="block text-base font-medium text-secondary dark:text-gray-300">{t('usage_level', { ns: 'subscription' })}</label>
                   <div className="flex flex-wrap gap-2">
                     {['Almost Never', 'Occasionally', 'Normally', 'Frequently', 'Heavily'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setValue('usage', level)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                            formData.usage === level 
                              ? "bg-primary text-white border-primary shadow-sm" 
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-700"
                          )}
                        >
                          {t(`usage_options.${level}`, { ns: 'subscription' })}
                        </button>
                     ))}
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <Controller
                      control={control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <Select
                          label={t('payment_method', { ns: 'subscription' })}
                          {...field}
                          options={[
                            { label: t('payment_methods.credit_card', { defaultValue: 'Credit Card' }), value: 'Credit Card' },
                            { label: t('payment_methods.alipay', { defaultValue: 'Alipay' }), value: 'Alipay' },
                            { label: t('payment_methods.wechat', { defaultValue: 'WeChat' }), value: 'WeChat' },
                            { label: t('payment_methods.paypal', { defaultValue: 'PayPal' }), value: 'PayPal' },
                            { label: t('payment_methods.other', { defaultValue: 'Other' }), value: 'Other' },
                          ]}
                        />
                      )}
                   />
                   <div className="space-y-2">
                     <label className="block text-base font-medium text-secondary dark:text-gray-300">{t('auto_renewal', { ns: 'subscription' })}</label>
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
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formData.autoRenewal ? t('yes', { ns: 'common' }) : t('no', { ns: 'common' })}</span>
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
                 <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                         <span className="font-medium text-gray-900 dark:text-white">{t('enable_notification', { ns: 'subscription' })}</span>
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
                           <span className="text-sm text-gray-600 dark:text-gray-300">{t('notify_me', { ns: 'subscription' })}</span>
                           <Input 
                             type="number" 
                             className="w-20 text-center"
                             {...register('notifyDaysBefore')}
                           />
                           <span className="text-sm text-gray-600 dark:text-gray-300">{t('days_before', { ns: 'subscription' })}</span>
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
      <div className="px-8 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
         {step === 1 ? (
           <Button 
             variant="ghost" 
             onClick={onCancel} 
             className={cn(
               "transition-all duration-200 ease group text-gray-500 dark:text-gray-400",
               "hover:bg-red-50 hover:text-red-500",
               "dark:hover:bg-red-900/10 dark:hover:text-red-400"
             )}
           >
             {t('button.cancel', { ns: 'common' })}
           </Button>
         ) : (
           <Button variant="outline" onClick={handleBack} className="gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
             <ChevronLeft className="w-4 h-4" /> {t('button.back', { ns: 'common' })}
           </Button>
         )}

         <div className="flex gap-3">
           {/* If editing, show Save button on any step. If creating, only show Save Now on step 1 */}
           {(isEditMode || step === 1) && (
             <Button 
                variant="outline" 
                onClick={handleSubmit(onFormSubmit)}
                className="border-primary text-primary hover:bg-primary-pale dark:hover:bg-primary-pale/10"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('button.save', { ns: 'common', defaultValue: 'Save' })}
              </Button>
           )}
           
           {step < 3 ? (
             <Button onClick={handleNext} className="gap-2 bg-primary hover:bg-primary-hover text-white">
               {t('button.next', { ns: 'common' })} <ChevronRight className="w-4 h-4" />
             </Button>
           ) : (
             <Button onClick={handleSubmit(onFormSubmit)} className="gap-2 bg-primary hover:bg-primary-hover text-white">
               <Check className="w-4 h-4" /> {t('button.complete', { ns: 'common' })}
             </Button>
           )}
         </div>
      </div>

      <Modal
        isOpen={conflictModal.isOpen}
        onClose={() => setConflictModal(prev => ({ ...prev, isOpen: false }))}
        title={t('duplicate_warning', { defaultValue: 'Duplicate Subscription Detected' })}
        className="z-[70] max-w-md"
      >
         <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
               {t('duplicate_message', { 
                   defaultValue: 'You already have a subscription named "{{name}}". Do you want to use the existing one or create a new one?',
                   name: conflictModal.name
               })}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
               <Button 
                 variant="outline"
                 onClick={() => handleResolveConflict('use_existing')}
                 className="h-12 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-300 group font-medium text-base"
               >
                 <span className="group-hover:text-primary transition-colors">{t('edit', { ns: 'common', defaultValue: 'Edit' })}</span>
               </Button>
               
               <Button 
                 onClick={() => handleResolveConflict('create_new')}
                 className="h-12 bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-medium text-base"
               >
                 {t('create', { ns: 'common', defaultValue: 'Create' })}
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
