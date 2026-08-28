import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function RequestBarberScreen({ route, navigation }) {
  const { barber, serviceType } = route?.params || {};
  const resolvedBarberId = Number(barber?.barberId || barber?.id || barber?.barber_id || 0);
  const [service] = useState(serviceType || 'Premium Fade');
  const [loading, setLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [waitingClients, setWaitingClients] = useState(Number(barber?.queue || 0));
  const { token } = useAppMode();
  const invalidBarber = !barber || !barber.name || !Number.isFinite(resolvedBarberId) || resolvedBarberId <= 0;

  useEffect(() => {
    const loadQueue = async () => {
      if (invalidBarber) {
        setQueueLoading(false);
        return;
      }

      try {
        const queueEntries = await apiClient.getBarberQueue(resolvedBarberId);
        setWaitingClients(Array.isArray(queueEntries) ? queueEntries.length : 0);
      } catch (_error) {
        setWaitingClients(Number(barber?.queue || 0));
      } finally {
        setQueueLoading(false);
      }
    };

    loadQueue();
  }, [barber?.queue, invalidBarber, resolvedBarberId]);

  const requestNow = async () => {
    if (invalidBarber) {
      Alert.alert('Invalid barber', 'Please go back and select a barber again.');
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Please sign in again to request a barber.');
      return;
    }

    setLoading(true);
    try {
      const bookingPayload = {
        barberId: resolvedBarberId,
        serviceId: null,
        bookingType: 'queue',
      };
      const booking = await apiClient.createBooking(token, bookingPayload);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      const queuePosition = Number(booking.queue_position || waitingClients + 1);
      const clientsAhead = Math.max(queuePosition - 1, 0);
      navigation.navigate('TrackBarber', {
        barber,
        service,
        bookingId: booking.id,
        queuePosition,
        clientsAhead,
      });
    } catch (error) {
      Alert.alert('Request failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (invalidBarber) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request unavailable</Text>
        <Text style={styles.info}>We could not load the selected barber details.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Request {barber.name}</Text>
      <Text style={styles.info}>Fast request flow with live status updates after booking.</Text>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Before you confirm</Text>
        <Text style={styles.noticeText}>We will show queue position, live progress, and the latest barber updates right after your request is placed.</Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Service</Text>
        <Text style={styles.optionValue}>{service}</Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Estimated Price</Text>
        <Text style={styles.optionValue}>$18 - $25</Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Current waiting list</Text>
        <Text style={styles.optionValue}>
          {queueLoading ? 'Checking the latest queue...' : `${waitingClients} client${waitingClients === 1 ? '' : 's'} waiting`}
        </Text>
      </View>

      <View style={[styles.optionCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1 }]}>
        <Text style={[styles.optionTitle, { color: '#166534' }]}>🗺️ Demand Radar Routing</Text>
        <Text style={[styles.optionValue, { color: '#15803D' }]}>Active Hotspot GPS Lock (1.2x Peak Demand)</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={requestNow}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Requesting...' : 'Request Now'}</Text>
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  scrollContainer: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { padding: spacing.lg, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal },
  info: { marginTop: spacing.xs, color: colors.steel, marginBottom: spacing.md },
  noticeCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  noticeTitle: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionTitle: { color: colors.steel, fontSize: 13, marginBottom: spacing.xs },
  optionValue: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    opacity: 1,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
