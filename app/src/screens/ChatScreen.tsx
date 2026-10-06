import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { getGroupById } from '../services/groupService';
import { getUserById } from '../services/userService';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { ChatUser } from '../types/user';

export function ChatScreen({ route, navigation }: any) {
  const { conversationId, conversationType } = route.params;
  const { chatUser } = useAuth();
  const { messages, sendMessage, sending, error } = useChat(conversationId, conversationType);
  const [title, setTitle] = useState('');
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInfo() {
      if (conversationType === 'group') {
        const group = await getGroupById(conversationId);
        if (!group) return;

        setTitle(group.name);

        const memberUsers = await Promise.all(group.memberIds.map((id) => getUserById(id)));
        setMembers(memberUsers.filter(Boolean) as ChatUser[]);
      } else {
        const [uidA, uidB] = conversationId.split('_');
        const otherUid = uidA === chatUser?.uid ? uidB : uidA;
        const otherUser = await getUserById(otherUid);
        setTitle(otherUser?.name || 'Conversa');
        setOtherUserId(otherUid);
      }
    }

    loadInfo();
  }, [conversationId, conversationType, chatUser]);

  useEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <TouchableOpacity onPress={handleOpenProfile}>
          <Text style={styles.profileLink}>Perfil</Text>
        </TouchableOpacity>
      ),
    });
  }, [title, navigation, otherUserId, members]);

  function handleOpenProfile() {
    if (conversationType === 'direct' && otherUserId) {
      navigation.navigate('Profile', { uid: otherUserId });
    } else if (conversationType === 'group' && members.length > 0) {
      navigation.navigate('GroupMembers', { members });
    }
  }

  function findSenderName(senderId: string): string {
    const member = members.find((m) => m.uid === senderId);
    return member?.name || 'Usuário';
  }

  async function handleSend(text: string) {
    if (!chatUser) return;
    await sendMessage(chatUser.uid, text);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isOwnMessage={item.senderId === chatUser?.uid}
            senderName={
              conversationType === 'group' ? findSenderName(item.senderId) : undefined
            }
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma mensagem ainda</Text>}
      />

      {error ? <ErrorMessage message={error} /> : null}

      <ChatInput onSend={handleSend} sending={sending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
  profileLink: {
    color: '#2563eb',
    marginRight: 12,
    fontWeight: '600',
  },
});
