import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing } from '../../theme/tokens';

const BarberCardSkeleton = () => (
  <View style={{ marginBottom: spacing.sm, backgroundColor: colors.white, borderRadius: 16, padding: spacing.md }}>
    <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center">
      <SkeletonPlaceholder.Item width={'60%'} height={20} borderRadius={4} />
      <SkeletonPlaceholder.Item width={60} height={20} borderRadius={4} />
    </SkeletonPlaceholder.Item>
    <SkeletonPlaceholder.Item width={'40%'} height={15} borderRadius={4} marginTop={spacing.xs} />
    <SkeletonPlaceholder.Item flexDirection="row" gap={spacing.sm} marginTop={spacing.sm}>
      <SkeletonPlaceholder.Item width={80} height={30} borderRadius={999} />
      <SkeletonPlaceholder.Item width={80} height={30} borderRadius={999} />
    </SkeletonPlaceholder.Item>
  </View>
);

const FeaturedBarberSkeleton = () => (
  <View style={{ backgroundColor: colors.white, borderRadius: 18, padding: spacing.md, marginBottom: spacing.md }}>
    <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="flex-start">
      <SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width={200} height={24} borderRadius={4} />
        <SkeletonPlaceholder.Item width={150} height={18} borderRadius={4} marginTop={spacing.xs} />
      </SkeletonPlaceholder.Item>
      <SkeletonPlaceholder.Item width={70} height={28} borderRadius={999} />
    </SkeletonPlaceholder.Item>
    <SkeletonPlaceholder.Item flexDirection="row" gap={spacing.sm} marginTop={spacing.md}>
      <SkeletonPlaceholder.Item width={92} height={50} borderRadius={14} />
      <SkeletonPlaceholder.Item width={92} height={50} borderRadius={14} />
      <SkeletonPlaceholder.Item width={92} height={50} borderRadius={14} />
    </SkeletonPlaceholder.Item>
  </View>
);


export const BarberListSkeleton = () => (
  <SkeletonPlaceholder backgroundColor={colors.soft} highlightColor="#E7E7E7">
    <View>
      {/* Section Label */}
      <SkeletonPlaceholder.Item width={150} height={15} borderRadius={4} marginBottom={spacing.sm} />
      {/* Featured Card */}
      <FeaturedBarberSkeleton />

      {/* Section Label */}
      <SkeletonPlaceholder.Item width={180} height={15} borderRadius={4} marginBottom={spacing.sm} />

      {/* List Cards */}
      <BarberCardSkeleton />
      <BarberCardSkeleton />
    </View>
  </SkeletonPlaceholder>
);
