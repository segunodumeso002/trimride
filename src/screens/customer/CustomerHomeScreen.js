import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../../theme/tokens';
import { useAppMode } from '../../context/AppModeContext';
import { apiClient } from '../../services/apiClient';
const DEFAULT_COORDS = { latitude: 40.7128, longitude: -74.0060 };

export default function CustomerHomeScreen({ navigation }) {
  const { signOut, user, token } = useAppMode();
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedService, setSelectedService] = useState('fade');
  const [activeBooking, setActiveBooking] = useState(null);

  const serviceFilters = ['fade', 'beard', 'braids'];

  const getCurrentLocation = useCallback(async () => DEFAULT_COORDS, []);

  const loadDispatch = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const coords = await getCurrentLocation();
      const data = await apiClient.getDispatchBarbers(
        coords.latitude,
        coords.longitude,
        8,
        selectedService,
        user?.id || null
      );

      const normalized = data.map(item => ({
        id: String(item.id),
        barberId: Number(item.id),
        name: item.shop_name,
        eta: `${Math.max(3, Math.round((item.distance || 1.2) * 2))} min`,
        rating: Number(item.rating || 0).toFixed(1),
        queue: item.queue_count || 0,
        serviceType: selectedService,
      }));

      setBarbers(normalized);
      setLastUpdated(new Date());
    } catch (error) {
      setLoadError(error?.message || 'Unable to load nearby barbers right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentLocation, selectedService, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      apiClient.getMyActiveBooking(token)
        .then(booking => setActiveBooking(booking || null))
        .catch(() => setActiveBooking(null));
      loadDispatch(true);
    }, [token, loadDispatch])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Barbers</Text>
      <Text style={styles.subtitle}>Request a barber in seconds like booking a ride.</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.navigate('FutureVision')}>
          <Text style={styles.ghostText}>Vision</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={signOut}>
          <Text style={styles.ghostText}>Switch Role</Text>
        </TouchableOpacity>
      </View>

      {activeBooking ? (
        <TouchableOpacity
          style={[styles.resumeBanner, activeBooking.status === 'confirmed' ? styles.resumeConfirmed : styles.resumePending]}
          onPress={() => navigation.navigate('TrackBarber', {
            barber: { name: activeBooking.shop_name, barberId: activeBooking.barber_id },
            service: activeBooking.service_name || 'General Grooming',
            bookingId: activeBooking.id,
            queuePosition: activeBooking.queue_position,
            clientsAhead: Math.max(0, (activeBooking.queue_position || 1) - 1),
            initialStatus: activeBooking.status,
          })}
        >
          <Text style={styles.resumeText}>
            {activeBooking.status === 'confirmed' ? '✓ Booking Confirmed — Tap to track' : '⏳ Active Booking — Tap to resume tracking'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.actionsRow}>
        {serviceFilters.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.ghostButton, selectedService === filter && styles.activeFilter]}
            onPress={() => setSelectedService(filter)}
          >
            <Text style={[styles.ghostText, selectedService === filter && styles.activeFilterText]}>{filter}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.ghostButton} onPress={() => loadDispatch(true)}>
          <Text style={styles.ghostText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? <Text style={styles.subtitle}>Loading dispatch...</Text> : null}
      {!loading && loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Dispatch temporarily unavailable</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDispatch(true)}>
            <Text style={styles.retryButtonText}>Retry Dispatch</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!loading && lastUpdated ? (
        <Text style={styles.lastUpdated}>Last updated: {lastUpdated.toLocaleTimeString()}</Text>
      ) : null}

      <FlatList
        data={barbers}
        refreshing={refreshing}
        onRefresh={() => loadDispatch(true)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RequestBarber', { barber: item, serviceType: selectedService })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>ETA {item.eta} • Rating {item.rating} • Queue {item.queue}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.subtitle}>No barbers found for this service in your zone yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.md, color: colors.steel },
  resumeBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  resumePending: { backgroundColor: '#F59E0B' },
  resumeConfirmed: { backgroundColor: '#10B981' },
  resumeText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostText: {
    color: colors.charcoal,
    fontWeight: '700',
    fontSize: 12,
  },
  activeFilter: {
    backgroundColor: colors.charcoal,
  },
  activeFilterText: {
    color: colors.white,
  },
  errorCard: {
    backgroundColor: '#fff4f4',
    borderColor: '#f5c2c2',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: '#8a1c1c',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  errorText: {
    color: '#8a1c1c',
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  lastUpdated: {
    color: colors.steel,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.charcoal },
  meta: { marginTop: spacing.xs, color: colors.steel },
});
