import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';

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
    <View style={styles.container}>
      <Text style={styles.title}>Request {barber.name}</Text>
      <Text style={styles.info}>Fast dispatch + live arrival tracking</Text>

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
          {queueLoading ? 'Checking queue...' : `${waitingClients} client${waitingClients === 1 ? '' : 's'} waiting`}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={requestNow}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Requesting...' : 'Request Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal },
  info: { marginTop: spacing.xs, color: colors.steel, marginBottom: spacing.md },
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
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
