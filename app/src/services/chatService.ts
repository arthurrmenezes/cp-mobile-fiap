import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { onValue, push, ref, off, set } from 'firebase/database';
import { db, rtdb } from './firebase';
import { DirectConversation, ChatMessage, MessageTarget } from '../types/chat';
import { getDirectConversationId } from '../utils/conversationId';

export async function findOrCreateDirectConversation(
  uidA: string,
  uidB: string
): Promise<DirectConversation> {
  const id = getDirectConversationId(uidA, uidB);
  const ref = doc(db, 'directConversations', id);

  const conversation: DirectConversation = {
    id,
    type: 'direct',
    participants: [uidA, uidB].sort() as [string, string],
    createdAt: Date.now(),
  };

  await setDoc(ref, conversation, { merge: true });
  return conversation;
}

export async function getUserDirectConversations(uid: string): Promise<DirectConversation[]> {
  const snap = await getDocs(
    query(collection(db, 'directConversations'), where('participants', 'array-contains', uid))
  );
  return snap.docs.map((d) => d.data() as DirectConversation);
}

export async function sendMessage(
  conversationId: string,
  conversationType: 'direct' | 'group',
  senderId: string,
  text: string,
  target: MessageTarget,
  mentionedUserIds: string[] = []
): Promise<string> {
  const messagesRef = ref(rtdb, `messages/${conversationId}`);
  const newMessageRef = push(messagesRef);

  const message: Omit<ChatMessage, 'id'> = {
    conversationId,
    conversationType,
    senderId,
    text,
    target,
    mentionedUserIds,
    createdAt: Date.now(),
  };

  await set(newMessageRef, message);

  return newMessageRef.key as string;
}

export function listenToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = ref(rtdb, `messages/${conversationId}`);

  const handler = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const messages: ChatMessage[] = Object.keys(data).map((id) => ({
      id,
      ...data[id],
    }));
    messages.sort((a, b) => a.createdAt - b.createdAt);
    callback(messages);
  });

  return () => off(messagesRef, 'value', handler);
}
