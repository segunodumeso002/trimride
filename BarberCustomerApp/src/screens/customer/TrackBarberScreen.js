import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Vibration } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, spacing } from '../../theme/tokens';
import { connectSocket } from '../../services/socketClient';
import { useAppMode } from '../../context/AppModeContext';
import { apiClient } from '../../services/apiClient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function TrackBarberScreen({ route, navigation }) {
  const { barber, service, bookingId, queuePosition, clientsAhead, initialStatus } = route?.params || {};
  const [eta, setEta] = useState(7);
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [barberMarker, setBarberMarker] = useState({ latitude: -26.2041, longitude: 28.0473 });
  const { token } = useAppMode();
  const missingBookingContext = !barber || !barber.name || !bookingId;

  const getStatusCopy = () => {
    if (status === 'confirmed') {
      return `Confirmed. Head to ${barber.name}'s shop for your session.`;
    }

    if (status === 'cancelled') {
      return 'This request was declined. You can go back and request another barber.';
    }

    if (status === 'completed') {
      return 'This booking is complete. Thanks for using TrimRide.';
    }

    return 'We are still waiting for the barber to respond to your request.';
  };

  const getHeadline = () => {
    if (status === 'confirmed') {
      return `Head to ${barber.name}'s shop`;
    }

    if (status === 'completed') {
      return `${barber.name} completed your booking`;
    }

    if (status === 'cancelled') {
      return `${barber.name} could not take this request`;
    }

    return `Waiting on ${barber.name}`;
  };

  const getStatusToneStyle = () => {
    if (status === 'confirmed') return styles.toneConfirmed;
    if (status === 'completed') return styles.toneCompleted;
    if (status === 'cancelled') return styles.toneCancelled;
    return styles.tonePending;
  };

  const stages = useMemo(() => {
    const accepted = status === 'confirmed' || status === 'completed';
    const completed = status === 'completed';
    const cancelled = status === 'cancelled';

    return [
      {
        key: 'request',
        label: 'Request placed',
        detail: `Booking #${bookingId}`,
        active: true,
      },
      {
        key: 'response',
        label: cancelled ? 'Barber declined' : accepted ? 'Barber accepted' : 'Awaiting response',
        detail: cancelled ? 'Customer can request another barber' : accepted ? 'Dispatch confirmed' : 'Waiting for confirmation',
        active: accepted || cancelled,
      },
      {
        key: 'arrival',
        label: completed ? 'Service completed' : accepted ? 'Head to shop' : 'Tracking on standby',
        detail: completed ? 'Session closed successfully' : accepted ? 'Navigate to the destination marker' : 'Coordinates update as soon as route starts',
        active: accepted || completed,
      },
    ];
  }, [bookingId, status]);

  useEffect(() => {
    const id = setInterval(() => {
      setEta(prev => (prev > 2 ? prev - 1 : prev));
    }, 5000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status === 'confirmed') {
      try { Vibration.vibrate([0, 250, 150, 250]); } catch (e) {}
      try { ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true }); } catch (e) {}
    } else if (status === 'cancelled') {
      try { Vibration.vibrate([0, 400]); } catch (e) {}
      try { ReactNativeHapticFeedback.trigger('notificationError', { enableVibrateFallback: true }); } catch (e) {}
    }
  }, [status]);

  useEffect(() => {
    if (!token || !bookingId || missingBookingContext) {
      return undefined;
    }

    const socket = connectSocket(token);
    socket.emit('join-booking-room', bookingId);

    const refreshLatestStatus = () => {
      apiClient.getMyActiveBooking(token)
        .then(booking => {
          if (booking && Number(booking.id) === Number(bookingId) && booking.status) {
            setStatus(booking.status);
          }
        })
        .catch(() => {});
    };

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

    const onConnect = () => {
      socket.emit('join-booking-room', bookingId);
      refreshLatestStatus();
    };

    socket.on('booking-status-updated', onStatus);
    socket.on('barber-location-updated', onLocation);
    socket.on('connect', onConnect);
    socket.on('reconnect', onConnect);

    const intervalId = setInterval(() => {
      refreshLatestStatus();
    }, 6000);

    return () => {
      clearInterval(intervalId);
      socket.off('booking-status-updated', onStatus);
      socket.off('barber-location-updated', onLocation);
      socket.off('connect', onConnect);
      socket.off('reconnect', onConnect);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, getStatusToneStyle()]}>
        <Text style={styles.heroEyebrow}>TrimRide Live Dispatch</Text>
        <Text style={styles.heroTitle}>{getHeadline()}</Text>
        <Text style={styles.heroText}>{getStatusCopy()}</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>{eta} min</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Queue</Text>
            <Text style={styles.metricValue}>{Number.isFinite(Number(queuePosition)) ? Number(queuePosition) : 'N/A'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Ahead</Text>
            <Text style={styles.metricValue}>{Number.isFinite(Number(clientsAhead)) ? Number(clientsAhead) : 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: barberMarker.latitude,
              longitude: barberMarker.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={{
              latitude: barberMarker.latitude,
              longitude: barberMarker.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: barberMarker.latitude,
                longitude: barberMarker.longitude,
              }}
              title={`${barber.name}'s Shop`}
              description={service}
            />
          </MapView>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => {
            try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
            navigation.navigate('LiveChat', {
              bookingId: bookingId,
              peerName: barber.name,
              senderType: 'customer',
              service: service,
            });
          }}
        >
          <Text style={styles.chatButtonText}>💬 Live Chat & En-Route Contact</Text>
        </TouchableOpacity>

        {(status === 'confirmed' || status === 'completed' || status === 'pending') && (
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => {
              try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
              navigation.navigate('PaymentCheckout', {
                bookingId: bookingId,
                barberName: barber.name,
                service: service,
                baseAmount: 25.00,
              });
            }}
          >
            <Text style={styles.paymentButtonText}>💳 Proceed to Payment & Tipping</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Route status</Text>
        {stages.map((stage, index) => (
          <View key={stage.key} style={styles.stageRow}>
            <View style={styles.stageRail}>
              <View style={[styles.stageDot, stage.active && styles.stageDotActive]} />
              {index < stages.length - 1 ? <View style={[styles.stageLine, stage.active && styles.stageLineActive]} /> : null}
            </View>
            <View style={styles.stageCopy}>
              <Text style={[styles.stageTitle, stage.active && styles.stageTitleActive]}>{stage.label}</Text>
              <Text style={styles.stageDetail}>{stage.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Booking snapshot</Text>
        <Text style={styles.meta}>Barber: {barber.name}</Text>
        <Text style={styles.meta}>Service: {service}</Text>
        <Text style={styles.meta}>Booking id: #{bookingId}</Text>
        <Text style={styles.meta}>Location stream: active</Text>
        <Text style={styles.meta}>Investor demo mode: reliable live data view</Text>
        <View style={[styles.statusBadge, styles[`status_${status}`] || styles.status_pending]}>
          <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tonePending: {
    backgroundColor: '#271B04',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  toneConfirmed: {
    backgroundColor: '#102A1D',
  },
  toneCompleted: {
    backgroundColor: '#0F1F35',
  },
  toneCancelled: {
    backgroundColor: '#331919',
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroText: {
    color: '#D1D5DB',
    marginTop: spacing.sm,
    lineHeight: 22,
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: spacing.sm,
  },
  metricLabel: {
    color: '#C7CDD6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  mapContainer: {
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  chatButton: {
    marginTop: spacing.md,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentButton: {
    marginTop: spacing.md,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  panelTitle: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
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
  stageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 72,
  },
  stageRail: {
    width: 24,
    alignItems: 'center',
  },
  stageDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#D6D3D1',
    marginTop: 4,
  },
  stageDotActive: {
    backgroundColor: colors.accent,
  },
  stageLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 6,
    marginBottom: 2,
  },
  stageLineActive: {
    backgroundColor: '#E1B44F',
  },
  stageCopy: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  stageTitle: {
    color: colors.steel,
    fontSize: 16,
    fontWeight: '700',
  },
  stageTitleActive: {
    color: colors.charcoal,
  },
  stageDetail: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
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
