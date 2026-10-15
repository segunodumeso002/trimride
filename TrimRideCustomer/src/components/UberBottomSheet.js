import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { spacing } from '../theme/tokens';

export default function UberBottomSheet({ 
  children, 
  snapPoints: propSnapPoints,
  initialSnapIndex = 2
}) {
  const { height: screenHeight } = useWindowDimensions();

  const snapPoints = useMemo(() => {
    const minHeight = 100;
    const maxHeight = Math.round(screenHeight * 0.92);
    return propSnapPoints || [minHeight, Math.round(screenHeight * 0.4), maxHeight];
  }, [propSnapPoints, screenHeight]);

  const maxSnap = snapPoints[snapPoints.length - 1];
  const initialOffset = Math.max(0, maxSnap - (snapPoints[initialSnapIndex] ?? maxSnap));
  const translateY = useRef(new Animated.Value(initialOffset)).current;

  const snapPointsRef = useRef(snapPoints);
  snapPointsRef.current = snapPoints;
  const maxSnapRef = useRef(maxSnap);
  maxSnapRef.current = maxSnap;

  useEffect(() => {
    const targetOffset = Math.max(0, maxSnap - (snapPoints[initialSnapIndex] ?? maxSnap));
    Animated.spring(translateY, {
      toValue: targetOffset,
      useNativeDriver: false,
      bounciness: 0,
      speed: 12,
    }).start();
  }, [screenHeight, maxSnap, initialSnapIndex, snapPoints, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on vertical drag
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        translateY.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dy: translateY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        
        const currentMaxSnap = maxSnapRef.current;
        const currentPoints = snapPointsRef.current;
        const currentOffset = translateY._value;
        const currentHeight = currentMaxSnap - currentOffset;
        
        // Find nearest snap point based on velocity and current position
        let targetHeight = currentPoints[0];
        
        if (gestureState.vy < -0.5) {
          // Fast swipe up
          targetHeight = currentMaxSnap;
        } else if (gestureState.vy > 0.5) {
          // Fast swipe down
          targetHeight = currentPoints[0];
        } else {
          // Snap to closest point
          targetHeight = currentPoints.reduce((prev, curr) => 
            Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
          );
        }

        const targetOffset = Math.max(0, currentMaxSnap - targetHeight);

        Animated.spring(translateY, {
          toValue: targetOffset,
          useNativeDriver: false,
          bounciness: 0,
          speed: 12,
        }).start();
      },
    })
  ).current;

  // Render
  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: maxSnap,
          transform: [{ translateY }],
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>
      
      <View style={styles.contentContainer}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 100,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
