import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing } from '../../theme/tokens';

export const RequestListSkeleton = () => (
  <View>
    {[1, 2, 3].map(key => (
      <View key={key} style={styles.card}>
        <SkeletonPlaceholder>
          <View style={styles.skeletonContent}>
            <View style={styles.headerRow}>
              <View style={styles.titleSkeleton} />
              <View style={styles.badgeSkeleton} />
            </View>
            <View style={styles.metaSkeleton} />
            <View style={styles.responseRow}>
              <View style={styles.buttonSkeleton} />
              <View style={styles.buttonSkeleton} />
            </View>
          </View>
        </SkeletonPlaceholder>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  skeletonContent: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleSkeleton: {
    width: 150,
    height: 20,
    borderRadius: 4,
  },
  badgeSkeleton: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  metaSkeleton: {
    width: 120,
    height: 16,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  responseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonSkeleton: {
    width: 80,
    height: 32,
    borderRadius: 16,
  },
});
