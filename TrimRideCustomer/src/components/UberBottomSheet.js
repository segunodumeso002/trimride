import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { colors, spacing } from '../theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Adjustable settings
const MIN_HEIGHT = 100;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

export default function UberBottomSheet({ 
  children, 
  snapPoints = [MIN_HEIGHT, SCREEN_HEIGHT * 0.4, MAX_HEIGHT],
  initialSnapIndex = 1
}) {
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT - snapPoints[initialSnapIndex])).current;
  
  const resetPositionAnim = Animated.spring(panY, {
    toValue: SCREEN_HEIGHT - snapPoints[initialSnapIndex],
    useNativeDriver: true,
    bounciness: 4,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on vertical drag
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        panY.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false, // PanResponder doesn't support native driver for dy directly without Animated.event workarounds, but extracting offset makes it smooth enough
      }),
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        
        const currentY = panY._value;
        const currentHeight = SCREEN_HEIGHT - currentY;
        
        // Find nearest snap point based on velocity and current position
        let targetHeight = snapPoints[0];
        
        if (gestureState.vy < -0.5) {
          // Fast swipe up
          targetHeight = snapPoints[snapPoints.length - 1];
        } else if (gestureState.vy > 0.5) {
          // Fast swipe down
          targetHeight = snapPoints[0];
        } else {
          // Snap to closest point
          targetHeight = snapPoints.reduce((prev, curr) => 
            Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
          );
        }

        Animated.spring(panY, {
          toValue: SCREEN_HEIGHT - targetHeight,
          useNativeDriver: true,
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
          transform: [{ translateY: panY }],
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
    top: 0, // Let translateY push it down
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT, // Full height to allow large snap points
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
