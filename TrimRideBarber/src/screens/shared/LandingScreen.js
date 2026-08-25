import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

export default function LandingScreen({ navigation }) {

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />
      <Text style={styles.brand}>TrimRide</Text>
      <Text style={styles.subtitle}>Manage your queue, track clients, and grow your business.</Text>

      <TouchableOpacity style={styles.barberButton} onPress={() => navigation.navigate('Auth', { role: 'barber' })}>
        <Text style={styles.barberText}>Sign In as Barber</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.ink,
  },
  brand: {
    color: colors.accent,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    fontSize: 16,
    lineHeight: 24,
  },
  customerButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  customerText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  barberButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.soft,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  barberText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
