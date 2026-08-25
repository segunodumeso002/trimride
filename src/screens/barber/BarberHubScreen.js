import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Vibration, View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import { colors, spacing } from '../../theme/tokens';
import { useAppMode } from '../../context/AppModeContext';
import { apiClient } from '../../services/apiClient';
import { connectSocket } from '../../services/socketClient';
import IncomingBookingModal from '../../components/IncomingBookingModal';

export default function BarberHubScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeSimulationBookingId, setActiveSimulationBookingId] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [refreshingRequests, setRefreshingRequests] = useState(false);
  const [newRequestAlert, setNewRequestAlert] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const { signOut, token, user } = useAppMode();
  const appStateRef = useRef(AppState.currentState);

  const playBookingPing = useCallback(() => {
    // Make playback deterministic on Android: prefer native sound file in /res/raw.
    try {
      SoundPlayer.setVolume(1.0);
      SoundPlayer.playSoundFile('booking_ping', 'wav');
      return;
    } catch (_androidErr) {
      // Fallback to JS asset path for compatibility across environments.
    }

    try {
      SoundPlayer.playAsset(require('../../assets/sounds/booking_ping.wav'));
    } catch (_assetErr) {
      // Keep vibration/banner as fallback if audio playback is unavailable.
    }
  }, []);

  const vibrateBookingAlert = useCallback(() => {
    try {
      Vibration.vibrate([0, 250, 120, 250]);
    } catch (_vibrationErr) {
      // Keep the audio/banner alert if Android denies vibration permission.
    }
  }, []);

  const handleSignOut = () => {
    setRequests([]);
    setActiveSimulationBookingId(null);
    setSimulating(false);
    setIsOnline(false);
    signOut();
  };

  const loadOnlineStatus = useCallback(async () => {
    if (!token) {
      setIsOnline(false);
      return;
    }

    try {
      const result = await apiClient.getBarberOnlineStatus(token);
      setIsOnline(!!result?.isOnline);
    } catch (_error) {
      setIsOnline(false);
    }
  }, [token]);

  const loadRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      return;
    }

    try {
      const data = await apiClient.getBarberRequests(token);
      const normalized = data.map(item => ({
        id: String(item.id),
        customer: `${item.first_name} ${item.last_name}`,
        service: item.service_name || 'General Grooming',
        eta: `Queue #${item.queue_position || '-'}`,
      }));
      setRequests(normalized);
    } catch (_error) {
      setRequests([]);
    }
  }, [token]);

  const refreshRequests = useCallback(async ({ showSpinner = false } = {}) => {
    if (!token || (showSpinner && refreshingRequests)) {
      return;
    }

    if (showSpinner) {
      setRefreshingRequests(true);
    }

    try {
      await loadRequests();
    } finally {
      if (showSpinner) {
        setRefreshingRequests(false);
      }
    }
  }, [loadRequests, refreshingRequests, token]);

  useEffect(() => {
    loadRequests();
    loadOnlineStatus();
  }, [loadRequests, loadOnlineStatus]);

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
      loadOnlineStatus();
    }, [refreshRequests, loadOnlineStatus])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasBackgrounded = /inactive|background/.test(appStateRef.current);
      if (wasBackgrounded && nextAppState === 'active') {
        refreshRequests();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshRequests]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);
    const onRequested = async () => {
      // Fetch the latest requests to get the new one
      if (!token) return;
      try {
        const data = await apiClient.getBarberRequests(token);
        if (data.length > 0) {
          const latest = data[data.length - 1]; // or the most recent pending
          const newRequest = {
            id: String(latest.id),
            customer: `${latest.first_name} ${latest.last_name}`,
            service: latest.service_name || 'General Grooming',
            eta: `Queue #${latest.queue_position || '-'}`,
          };
          setIncomingRequest(newRequest);
        }
        await loadRequests();
      } catch (err) {
        // Fallback to just loading requests
        await loadRequests();
      }

      // Vibrate device: two short pulses to alert the barber
      vibrateBookingAlert();
      playBookingPing();
      setNewRequestAlert(true);
      setTimeout(() => setNewRequestAlert(false), 4000);
    };
    const onConnect = () => loadRequests();

    socket.on('booking-requested', onRequested);
    socket.on('connect', onConnect);
    socket.on('reconnect', onConnect);

    return () => {
      socket.off('booking-requested', onRequested);
      socket.off('connect', onConnect);
      socket.off('reconnect', onConnect);
    };
  }, [token, loadRequests, playBookingPing, vibrateBookingAlert]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadRequests();
    }, 8000);

    return () => clearInterval(intervalId);
  }, [token, loadRequests]);

  const toggleOnlineStatus = async () => {
    if (!token || togglingStatus) {
      return;
    }
    setTogglingStatus(true);
    const next = !isOnline;
    try {
      await apiClient.setBarberOnlineStatus(token, next);
      setIsOnline(next);
    } catch (err) {
      Alert.alert('Status update failed', err.message || 'Could not update online status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const respondToRequest = async (bookingId, action) => {
    if (!token) {
      return;
    }

    try {
      // Optimistically hide the modal
      if (incomingRequest && incomingRequest.id === String(bookingId)) {
        setIncomingRequest(null);
      }

      await apiClient.respondToBooking(token, bookingId, action);

      if (action === 'accept') {
        setActiveSimulationBookingId(Number(bookingId));
        await apiClient.sendBarberLocation(token, bookingId, -26.2041, 28.0473);
      }

      await loadRequests();
    } catch (err) {
      Alert.alert(
        'Action failed',
        err.message || 'Could not process the booking action. Please try again.'
      );
    }
  };

  const simulateRoute = async () => {
    if (!token || !activeSimulationBookingId || simulating) {
      return;
    }

    setSimulating(true);

    const points = [
      { latitude: -26.2041, longitude: 28.0473 },
      { latitude: -26.203, longitude: 28.046 },
      { latitude: -26.2017, longitude: 28.0449 },
      { latitude: -26.2003, longitude: 28.0438 },
    ];

    try {
      for (const point of points) {
        await apiClient.sendBarberLocation(
          token,
          activeSimulationBookingId,
          point.latitude,
          point.longitude
        );
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      Alert.alert(
        'Simulation error',
        err.message || 'Location update failed. Simulation stopped.'
      );
    } finally {
      setSimulating(false);
    }
  };

  return (
    <View style={styles.container}>
      <IncomingBookingModal
        visible={!!incomingRequest}
        request={incomingRequest}
        onAccept={() => respondToRequest(incomingRequest.id, 'accept')}
        onDecline={() => respondToRequest(incomingRequest.id, 'decline')}
        countdownSeconds={30}
      />
      {newRequestAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>🔔  New booking request received!</Text>
        </View>
      )}
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TrimRide Barber</Text>
          <Text style={styles.title}>Barber Dashboard</Text>
          {user?.email ? <Text style={styles.accountHint}>Signed in as {user.email}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.statusPill, isOnline ? styles.online : styles.offline]}
          onPress={toggleOnlineStatus}
          disabled={togglingStatus}
        >
          <Text style={styles.statusText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{isOnline ? 'You are visible for new requests' : 'You are paused right now'}</Text>
        <Text style={styles.summaryText}>
          {isOnline
            ? 'Stay online to receive nearby bookings and respond quickly.'
            : 'Switch online when you are ready to receive new customers.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.hotzoneButton} onPress={() => navigation.navigate('Hotzones')}>
        <Text style={styles.hotzoneText}>View Busy Areas</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('GrowthEngine')}>
          <Text style={styles.secondaryText}>Promotions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => refreshRequests({ showSpinner: true })}
          disabled={refreshingRequests}
        >
          <Text style={styles.secondaryText}>
            {refreshingRequests ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={simulateRoute}
          disabled={!activeSimulationBookingId || simulating}
        >
          <Text style={styles.secondaryText}>
            {simulating ? 'Simulating...' : 'Simulate Route'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            vibrateBookingAlert();
            playBookingPing();
          }}
        >
          <Text style={styles.secondaryText}>Test Ping</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
          <Text style={styles.secondaryText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Incoming Requests</Text>
      {refreshingRequests ? (
        <View style={styles.inlineStatus}>
          <ActivityIndicator size="small" color={colors.charcoal} />
          <Text style={styles.inlineStatusText}>Refreshing your latest requests...</Text>
        </View>
      ) : null}
      <FlatList
        data={requests}
        refreshing={refreshingRequests}
        onRefresh={() => refreshRequests({ showSpinner: true })}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.customer}</Text>
              <Text style={styles.queueBadge}>{item.eta}</Text>
            </View>
            <Text style={styles.meta}>{item.service}</Text>
            <View style={styles.responseRow}>
              <TouchableOpacity
                style={[styles.responseButton, styles.acceptButton]}
                onPress={() => respondToRequest(item.id, 'accept')}
              >
                <Text style={styles.responseText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.declineButton]}
                onPress={() => respondToRequest(item.id, 'decline')}
              >
                <Text style={styles.responseText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No incoming requests yet</Text>
            <Text style={styles.emptyText}>Stay online and new nearby bookings will appear here automatically.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  alertBanner: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  alertBannerText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { flex: 1, paddingRight: spacing.md },
  eyebrow: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  title: { fontSize: 29, fontWeight: '800', color: colors.charcoal },
  accountHint: {
    marginTop: spacing.xs,
    color: colors.steel,
    fontSize: 12,
  },
  statusPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  online: { backgroundColor: colors.success },
  offline: { backgroundColor: colors.danger },
  statusText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryTitle: {
    color: colors.charcoal,
    fontSize: 17,
    fontWeight: '800',
  },
  summaryText: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  hotzoneButton: {
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hotzoneText: { color: colors.white, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: colors.charcoal,
    fontWeight: '700',
    fontSize: 12,
  },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 16, fontWeight: '700', color: colors.charcoal },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inlineStatusText: {
    color: colors.steel,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoal },
  queueBadge: {
    backgroundColor: colors.paper,
    color: colors.charcoal,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  meta: { marginTop: spacing.xs, color: colors.steel },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontWeight: '800',
    fontSize: 16,
  },
  emptyText: { marginTop: spacing.xs, color: colors.steel, lineHeight: 20 },
  responseRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  responseButton: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    backgroundColor: colors.danger,
  },
  responseText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
