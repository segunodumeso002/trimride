import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

export default function GrowthEngineScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Promotions</Text>
      <View style={styles.card}>
        <Text style={styles.metric}>+31%</Text>
        <Text style={styles.label}>Projected weekly bookings when you stay available in busy areas.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metric}>Referral boost</Text>
        <Text style={styles.label}>Invite 5 customers and unlock stronger placement for 3 days.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metric}>Off-peak promo</Text>
        <Text style={styles.label}>Offer a quiet-hours discount to keep your chair full.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal, marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  metric: { fontSize: 20, fontWeight: '800', color: colors.charcoal },
  label: { marginTop: spacing.xs, color: colors.steel, lineHeight: 20 },
});
