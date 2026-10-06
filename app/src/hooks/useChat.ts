import { useCallback, useEffect, useState } from 'react';
import { listenToMessages, sendMessage as sendMessageService } from '../services/chatService';
import { notifyNewMessage } from '../services/notificationService';
import { ChatMessage, MessageTarget } from '../types/chat';

export function useChat(conversationId: string, conversationType: 'direct' | 'group') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToMessages(conversationId, setMessages);
    return unsubscribe;
  }, [conversationId]);

  const sendMessage = useCallback(
    async (
      senderId: string,
      text: string,
      target: MessageTarget = { type: 'conversation' },
      mentionedUserIds: string[] = []
    ) => {
      setSending(true);
      setError(null);

      try {
        const messageId = await sendMessageService(
          conversationId,
          conversationType,
          senderId,
          text,
          target,
          mentionedUserIds
        );
        await notifyNewMessage(conversationId, messageId);
      } catch (err) {
        setError('Não foi possível enviar a mensagem');
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType]
  );

  return { messages, sendMessage, sending, error };
}
