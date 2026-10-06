import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConversationListItem } from '../types/chat';

const DEFAULT_PHOTO = 'https://ui-avatars.com/api/?name=Chat';

export function ConversationItem({
  conversation,
  onPress,
}: {
  conversation: ConversationListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image
        source={{ uri: conversation.photoUrl || DEFAULT_PHOTO }}
        style={styles.photo}
      />
      <View style={styles.info}>
        <Text style={styles.title}>{conversation.title}</Text>
        <Text style={styles.type}>
          {conversation.type === 'group' ? 'Grupo' : 'Conversa individual'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  type: {
    fontSize: 13,
    color: '#6b7280',
  },
});
