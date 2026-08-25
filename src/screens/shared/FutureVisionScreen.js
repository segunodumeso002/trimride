import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

const items = [
  'Instant barber request like Uber ride request',
  'Smart dispatch ranking by ETA, rating, and queue health',
  'Heatmap for demand zones and barber surge incentives',
  'Live arrival tracking and queue timeline for customers',
  'Loyalty passes and referral growth engine',
  'Enterprise tools for barbershop chains',
];

export default function FutureVisionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Future-Ready Blueprint</Text>
      {items.map(item => (
        <View key={item} style={styles.card}>
          <Text style={styles.cardText}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.md,
    color: colors.charcoal,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  cardText: {
    color: colors.charcoal,
    fontSize: 15,
    lineHeight: 22,
  },
});
