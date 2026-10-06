import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChatMessage as ChatMessageType } from '../types/chat';

export function ChatMessage({
  message,
  isOwnMessage,
  senderName,
}: {
  message: ChatMessageType;
  isOwnMessage: boolean;
  senderName?: string;
}) {
  return (
    <View style={[styles.bubble, isOwnMessage ? styles.own : styles.other]}>
      {!isOwnMessage && senderName ? (
        <Text style={styles.sender}>{senderName}</Text>
      ) : null}
      <Text style={styles.text}>{message.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  own: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    color: '#374151',
  },
  text: {
    fontSize: 15,
    color: '#111827',
  },
});
