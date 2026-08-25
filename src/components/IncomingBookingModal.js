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

  const onDeclineRef = useRef(onDecline);
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  useEffect(() => {
    if (visible && request) {
      setTimeLeft(countdownSeconds);
      
      // Reset animations
      slideAnim.setValue(300);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Pulsing effect
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
            if (onDeclineRef.current) {
              onDeclineRef.current(); // Auto-decline when time expires
            }
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
  }, [visible, request, countdownSeconds, slideAnim, pulseAnim]);

  if (!visible || !request) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.topSection}>
            <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.timerText}>{timeLeft}</Text>
              <Text style={styles.timerSubtext}>sec</Text>
            </Animated.View>
            
            <Text style={styles.eyebrow}>NEW REQUEST</Text>
            <Text style={styles.customerName}>{request.customer}</Text>
            
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{request.service}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Waitlist</Text>
                <Text style={styles.detailValue}>{request.eta}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>ACCEPT</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: spacing.xl,
  },
  topSection: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.charcoal,
    borderWidth: 4,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  timerSubtext: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  customerName: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.lg,
    textAlign: 'center',
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
  },
  detailLabel: {
    color: colors.steel,
    fontSize: 15,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSection: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.steel,
  },
  declineButtonText: {
    color: colors.steel,
    fontSize: 16,
    fontWeight: '700',
  },
});
