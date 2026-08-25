import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, spacing } from '../theme/tokens';

export default function IncomingBookingModal({
  visible,
  request,
  onAccept,
  onDecline,
  countdownSeconds = 30,
}) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  const onDeclineRef = useRef(onDecline);
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  useEffect(() => {
    if (visible && request) {
      setTimeLeft(countdownSeconds);

      // Slide in spring animation
      slideAnim.setValue(300);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Countdown Progress Bar animation
      timerBarAnim.setValue(1);
      Animated.timing(timerBarAnim, {
        toValue: 0,
        duration: countdownSeconds * 1000,
        useNativeDriver: false,
      }).start();

      // Pulsing effect for countdown circle
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        pulseLoop.stop();
      };
    }
  }, [visible, request, countdownSeconds, slideAnim, pulseAnim, timerBarAnim]);

  useEffect(() => {
    if (visible && timeLeft === 0) {
      if (onDeclineRef.current) {
        onDeclineRef.current();
      }
    }
  }, [timeLeft, visible]);

  if (!visible || !request) return null;

  const timerBarWidth = timerBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Visual Shrinking Progress Bar at the top of modal */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: timerBarWidth }]} />
          </View>

          <View style={styles.topSection}>
            <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.timerText}>{timeLeft}</Text>
              <Text style={styles.timerSubtext}>sec</Text>
            </Animated.View>

            <Text style={styles.eyebrow}>INCOMING REQUEST</Text>
            <Text style={styles.customerName}>{request.customer}</Text>

            {/* Travel & Distance Chip */}
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>
                📍 {request.distance || '2.4 km away'} • {request.travelTime || '~8 min travel'}
              </Text>
            </View>

            {/* Details Box */}
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{request.service}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Est. Payout</Text>
                <Text style={styles.payoutValue}>{request.price || '$25.00'}</Text>
              </View>
              <View style={[styles.detailRow, styles.lastDetailRow]}>
                <Text style={styles.detailLabel}>Waitlist</Text>
                <Text style={styles.detailValue}>{request.eta}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptButtonText}>ACCEPT REQUEST</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
              activeOpacity={0.6}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: spacing.lg,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  topSection: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timerCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.charcoal,
    borderWidth: 3.5,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  timerSubtext: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  customerName: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  distanceBadge: {
    backgroundColor: 'rgba(198,146,20,0.18)',
    borderColor: colors.accent,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  distanceBadgeText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: colors.steel,
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  payoutValue: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
  },
  actionSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.steel,
  },
  declineButtonText: {
    color: colors.steel,
    fontSize: 15,
    fontWeight: '700',
  },
});
