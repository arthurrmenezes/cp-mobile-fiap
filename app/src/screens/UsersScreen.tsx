import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../services/userService';
import { findOrCreateDirectConversation } from '../services/chatService';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { ChatUser } from '../types/user';

export function UsersScreen({ navigation, route }: any) {
  const { chatUser } = useAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const selectMode: boolean = route?.params?.selectMode ?? false;
  const onSelectUser = route?.params?.onSelectUser;

  useEffect(() => {
    getAllUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) => u.uid !== chatUser?.uid && u.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search, chatUser]);

  async function handlePress(user: ChatUser) {
    if (selectMode && onSelectUser) {
      onSelectUser(user);
      navigation.goBack();
      return;
    }

    if (!chatUser) return;
    const conversation = await findOrCreateDirectConversation(chatUser.uid, user.uid);
    navigation.navigate('Chat', { conversationId: conversation.id, conversationType: 'direct' });
  }

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar usuário"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <GroupMemberItem user={item} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário encontrado</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    margin: 12,
    padding: 10,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
});
