import React from 'react';
import { StyleSheet, Text } from 'react-native';

export function ErrorMessage({ message }: { message: string }) {
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: '#dc2626',
    marginVertical: 8,
    textAlign: 'center',
  },
});
