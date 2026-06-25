import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBanner() {
  const { items } = useNotifications();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="none">
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.text}>{item.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    zIndex: 999,
    gap: 8,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#C69214',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
