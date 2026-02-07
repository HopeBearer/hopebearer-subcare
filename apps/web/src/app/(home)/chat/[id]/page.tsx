'use client';

import { use } from 'react';
import { ChatContainer } from '@/components/features/chat';

interface ChatConversationPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatConversationPage({ params }: ChatConversationPageProps) {
  const { id } = use(params);
  // 使用负 margin 抵消 layout 的 p-8，并填满整个可用高度 (100vh - header h-20)
  return (
    <div className="-m-8 h-[calc(100vh-5rem)]">
      <ChatContainer conversationId={id} />
    </div>
  );
}
