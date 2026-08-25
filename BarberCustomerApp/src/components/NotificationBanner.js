import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBanner() {
  const { items, removeNotification } = useNotifications();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {items.map(item => {
        let borderColor = '#D97706'; // Gold default
        if (item.type === 'booking' || item.type === 'payout') borderColor = '#10B981'; // Emerald
        if (item.type === 'chat') borderColor = '#3B82F6'; // Royal Blue
        if (item.type === 'alert') borderColor = '#EF4444'; // Red Crimson

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { borderLeftColor: borderColor }]}
            activeOpacity={0.85}
            onPress={() => removeNotification(item.id)}
          >
            <Text style={styles.icon}>{item.icon || '🔔'}</Text>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title || 'TrimRide Notice'}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            </View>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 45,
    left: 14,
    right: 14,
    zIndex: 9999,
    gap: 10,
  },
  card: {
    backgroundColor: '#0F1F35',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  icon: { fontSize: 24, marginRight: 12 },
  content: { flex: 1, paddingRight: 8 },
  title: { color: '#F59E0B', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  message: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 2, lineHeight: 18 },
  closeBtn: { color: '#94A3B8', fontSize: 17, fontWeight: '800', paddingLeft: 6 },
});
