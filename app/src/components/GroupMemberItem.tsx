import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatUser } from '../types/user';

const DEFAULT_PHOTO = 'https://ui-avatars.com/api/?name=User';

export function GroupMemberItem({
  user,
  onPress,
  selected,
}: {
  user: ChatUser;
  onPress?: () => void;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: user.photoUrl || DEFAULT_PHOTO }} style={styles.photo} />
      <Text style={styles.name}>{user.name}</Text>
      {selected ? <Text style={styles.selected}>✓</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  name: {
    flex: 1,
    fontSize: 15,
  },
  selected: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 16,
  },
});
