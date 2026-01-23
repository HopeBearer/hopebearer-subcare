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
