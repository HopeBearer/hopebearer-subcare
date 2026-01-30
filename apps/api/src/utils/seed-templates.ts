import { prisma } from '@subcare/database';
import { logger } from '../infrastructure/logger/logger';

export async function seedTemplates() {
  const templates = [
    {
      key: 'welcome-email',
      title: 'Welcome to SubCare!',
      content: '<h1>Welcome, {{name}}!</h1><p>Thanks for joining SubCare. Start tracking your subscriptions now.</p>',
      channel: 'email'
    },
    {
      key: 'subscription-added',
      title: 'New Subscription: {{subscriptionName}}',
      content: 'You have successfully added <strong>{{subscriptionName}}</strong> to your dashboard.',
      channel: 'in-app'
    },
    {
      key: 'payment-reminder',
      title: 'Payment Reminder: {{subscriptionName}}',
      content: 'Your subscription for {{subscriptionName}} is due on {{dueDate}}. Amount: {{currency}} {{price}}.',
      channel: 'email'
    },
    {
      key: 'notification.sub.renewal_reminder',
      title: 'Upcoming Renewal Reminder: {{name}}',
      content: '<p>Hello,</p><p>This is a reminder that your subscription for <strong>{{name}}</strong> is set to renew in {{days}} days on {{date}}.</p><p>Amount: {{currency}} {{amount}}</p><p>Please ensure your payment method is up to date.</p><p>Best regards,<br/>SubCare Team</p>',
      channel: 'email'
    },
    {
      key: 'notification.bill.pending_reminder',
      title: 'Action Required: Pending Bill for {{name}}',
      content: '<p>Hello,</p><p>You have a pending bill for <strong>{{name}}</strong> that was generated {{days}} days ago.</p><p>Amount: {{currency}} {{amount}}</p><p>Please log in to your dashboard to confirm or manage this bill.</p><p>Best regards,<br/>SubCare Team</p>',
      channel: 'email'
    },
    {
      key: 'notification.budget.exceeded',
      title: 'Alert: Budget Limit Exceeded for {{category}}',
      content: '<p>Warning,</p><p>Your spending in the <strong>{{category}}</strong> category has exceeded your monthly budget.</p><p>Total Spent: {{currency}} {{current}}</p><p>Budget Limit: {{currency}} {{limit}}</p><p>Please review your expenses.</p>',
      channel: 'email'
    }
  ];

  for (const t of templates) {
    const existing = await prisma.messageTemplate.findUnique({ where: { key: t.key } });
    if (!existing) {
      await prisma.messageTemplate.create({ data: t });
      logger.info({ domain: 'SYSTEM', action: 'seed_template', metadata: { key: t.key } });
    }
  }
}
