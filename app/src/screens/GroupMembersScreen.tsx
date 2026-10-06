import React from 'react';
import { FlatList, View } from 'react-native';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { ChatUser } from '../types/user';

export function GroupMembersScreen({ route, navigation }: any) {
  const members: ChatUser[] = route.params.members;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <GroupMemberItem
            user={item}
            onPress={() => navigation.navigate('Profile', { uid: item.uid })}
          />
        )}
      />
    </View>
  );
}
