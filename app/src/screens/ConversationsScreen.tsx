import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { useNotifications } from '../hooks/useNotifications';
import { getUserDirectConversations } from '../services/chatService';
import { getUserById } from '../services/userService';
import { logoutUser } from '../services/authService';
import { ConversationItem } from '../components/ConversationItem';
import { Loading } from '../components/Loading';
import { ConversationListItem, DirectConversation } from '../types/chat';

export function ConversationsScreen({ navigation }: any) {
  const { chatUser } = useAuth();
  const { groups, loading: loadingGroups, reloadGroups } = useGroups(chatUser?.uid);
  const [directs, setDirects] = useState<ConversationListItem[]>([]);
  const [loadingDirects, setLoadingDirects] = useState(true);

  useNotifications(chatUser?.uid);

  const loadDirects = useCallback(async () => {
    if (!chatUser) return;
    setLoadingDirects(true);

    const conversations = await getUserDirectConversations(chatUser.uid);
    const items = await Promise.all(
      conversations.map(async (conversation: DirectConversation) => {
        const otherUid = conversation.participants.find((id) => id !== chatUser.uid)!;
        const otherUser = await getUserById(otherUid);

        return {
          id: conversation.id,
          type: 'direct' as const,
          title: otherUser?.name || 'Usuário',
          photoUrl: otherUser?.photoUrl || '',
        };
      })
    );

    setDirects(items);
    setLoadingDirects(false);
  }, [chatUser]);

  useEffect(() => {
    loadDirects();
  }, [loadDirects]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDirects();
      reloadGroups();
    });
    return unsubscribe;
  }, [navigation, loadDirects, reloadGroups]);

  const allConversations: ConversationListItem[] = useMemo(() => {
    const groupItems: ConversationListItem[] = groups.map((group) => ({
      id: group.id,
      type: 'group',
      title: group.name,
      photoUrl: group.photoUrl,
    }));

    return [...directs, ...groupItems];
  }, [directs, groups]);

  function openConversation(item: ConversationListItem) {
    navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type });
  }

  async function handleLogout() {
    await logoutUser();
  }

  if (loadingDirects || loadingGroups) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={allConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem conversation={item} onPress={() => openConversation(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma conversa ainda</Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Users')}>
          <Text style={styles.actionText}>Nova conversa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('GroupForm')}
        >
          <Text style={styles.actionText}>Novo grupo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  logout: {
    color: '#dc2626',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
