export const NOTIFICATION_CATEGORIES = {
  BILLING: 'billing',
  SYSTEM: 'system',
  SECURITY: 'security',
} as const;

export interface NotificationEventDef {
  key: string;
  label: string;
  defaultEmail?: boolean;
  defaultInApp?: boolean;
}

export const NOTIFICATION_EVENTS: Record<string, NotificationEventDef[]> = {
  [NOTIFICATION_CATEGORIES.BILLING]: [
    { key: 'billing.subscription_created', label: 'New Subscription Added', defaultEmail: false, defaultInApp: true },
    { key: 'billing.renewal_upcoming', label: 'Subscription Renewal Reminder', defaultEmail: true, defaultInApp: true },
    { key: 'billing.payment_success', label: 'Payment Success', defaultEmail: false, defaultInApp: true },
    { key: 'billing.budget_exceeded', label: 'Budget Exceeded', defaultEmail: true, defaultInApp: true },
    { key: 'billing.pending_reminder', label: 'Overdue Bill Reminder', defaultEmail: true, defaultInApp: true },
  ],
  [NOTIFICATION_CATEGORIES.SYSTEM]: [
    { key: 'system.account_update', label: 'Account Updates', defaultEmail: true, defaultInApp: true },
  ],
  [NOTIFICATION_CATEGORIES.SECURITY]: [
    { key: 'security.password_change', label: 'Password Changed', defaultEmail: true, defaultInApp: true },
  ]
};

// Helper to get all valid keys
export const ALL_NOTIFICATION_KEYS = Object.values(NOTIFICATION_EVENTS)
  .flat()
  .map(e => e.key)
  .concat(Object.values(NOTIFICATION_CATEGORIES));
