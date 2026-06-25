import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, spacing } from '../../theme/tokens';
import { connectSocket } from '../../services/socketClient';
import { useAppMode } from '../../context/AppModeContext';

export default function TrackBarberScreen({ route, navigation }) {
  const { barber, service, bookingId, queuePosition, clientsAhead, initialStatus } = route?.params || {};
  const [eta, setEta] = useState(7);
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [barberMarker, setBarberMarker] = useState({ latitude: -26.2041, longitude: 28.0473 });
  const { token } = useAppMode();
  const missingBookingContext = !barber || !barber.name || !bookingId;

  useEffect(() => {
    const id = setInterval(() => {
      setEta(prev => (prev > 2 ? prev - 1 : prev));
    }, 5000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token || !bookingId || missingBookingContext) {
      return undefined;
    }

    const socket = connectSocket(token);
    socket.emit('join-booking-room', bookingId);

    const onStatus = data => {
      if (Number(data.bookingId) === Number(bookingId)) {
        setStatus(data.status);
      }
    };

    const onLocation = data => {
      if (Number(data.bookingId) === Number(bookingId)) {
        setBarberMarker({ latitude: data.latitude, longitude: data.longitude });
      }
    };

    socket.on('booking-status-updated', onStatus);
    socket.on('barber-location-updated', onLocation);

    return () => {
      socket.off('booking-status-updated', onStatus);
      socket.off('barber-location-updated', onLocation);
    };
  }, [token, bookingId, missingBookingContext]);

  if (missingBookingContext) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.headline}>Tracking unavailable</Text>
        <Text style={styles.meta}>We could not load this booking. Please request again.</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.fallbackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.headline}>Session required</Text>
        <Text style={styles.meta}>Please sign in again to continue tracking.</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.navigate('Landing')}>
          <Text style={styles.fallbackButtonText}>Back To Landing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -26.2041,
          longitude: 28.0473,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        <Marker coordinate={barberMarker} title={barber.name} />
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.headline}>{barber.name} is on the way</Text>
        <Text style={styles.meta}>Service: {service}</Text>
        <Text style={styles.meta}>Live ETA: {eta} min</Text>
        <Text style={styles.meta}>Clients ahead: {Number.isFinite(Number(clientsAhead)) ? Number(clientsAhead) : 'N/A'}</Text>
        <Text style={styles.meta}>Your queue number: {Number.isFinite(Number(queuePosition)) ? Number(queuePosition) : 'N/A'}</Text>
        <View style={[styles.statusBadge, styles[`status_${status}`] || styles.status_pending]}>
          <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  fallbackButton: {
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
  },
  headline: { fontSize: 20, fontWeight: '800', color: colors.charcoal },
  meta: { marginTop: spacing.xs, color: colors.steel },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  status_pending: { backgroundColor: '#F59E0B' },
  status_confirmed: { backgroundColor: '#10B981' },
  status_cancelled: { backgroundColor: '#EF4444' },
  status_completed: { backgroundColor: '#6B7280' },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});
