import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import UberBottomSheet from '../../components/UberBottomSheet';
import Geolocation from 'react-native-geolocation-service';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../../theme/tokens';
import { useAppMode } from '../../context/AppModeContext';
import { apiClient } from '../../services/apiClient';
import { connectSocket } from '../../services/socketClient';
import { BarberListSkeleton } from '../../components/skeletons/BarberListSkeleton';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { getCountryCoordinates } from '../../utils/countryLocation';

const DEMO_COORDS = { latitude: -26.2041, longitude: 28.0473 };

export default function CustomerHomeScreen({ navigation }) {
  const { signOut, user, token, isFirstLoginSession, consumeFirstLoginSession } = useAppMode();
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedService, setSelectedService] = useState('fade');
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);

  const userCountryCoords = useMemo(() => {
    return getCountryCoordinates(user?.country, user?.phone);
  }, [user?.country, user?.phone]);

  const serviceFilters = ['fade', 'beard', 'braids'];
  const featuredBarber = barbers[0] || null;
  const remainingBarbers = featuredBarber ? barbers.slice(1) : [];

  const getCurrentLocation = useCallback(() => new Promise(resolve => {
    const fallback = () => resolve(userCountryCoords);
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TrimRide needs your location to find nearby barbers.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      ).then(granted => {
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return fallback();
        }
        Geolocation.getCurrentPosition(
          pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          fallback,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      }).catch(fallback);
    } else {
      Geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        fallback,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    }
  }), [userCountryCoords]);

  // On first login on a user (both new or old), center default map view on registration country
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const applyRegistrationCountryMapLocation = async () => {
      try {
        const key = `@trimride_first_login_map_centered_${user.id}`;
        const alreadyCentered = await AsyncStorage.getItem(key);

        if (!alreadyCentered || isFirstLoginSession) {
          if (mapRef.current && isMounted) {
            mapRef.current.animateToRegion({
              latitude: userCountryCoords.latitude,
              longitude: userCountryCoords.longitude,
              latitudeDelta: userCountryCoords.latitudeDelta,
              longitudeDelta: userCountryCoords.longitudeDelta,
            }, 1000);
          }
          await AsyncStorage.setItem(key, 'true');
          if (isFirstLoginSession && consumeFirstLoginSession) {
            consumeFirstLoginSession();
          }
        }
      } catch (_e) {}
    };

    const timer = setTimeout(applyRegistrationCountryMapLocation, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user?.id, userCountryCoords, isFirstLoginSession, consumeFirstLoginSession]);

  const loadDispatch = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const coords = await getCurrentLocation();
      let data = await apiClient.getDispatchBarbers(
        coords.latitude,
        coords.longitude,
        8,
        selectedService,
        user?.id || null
      );

      // Emulator GPS is often far from demo barbers; fallback keeps live demos reliable.
      if ((!Array.isArray(data) || data.length === 0) && __DEV__) {
        data = await apiClient.getDispatchBarbers(
          DEMO_COORDS.latitude,
          DEMO_COORDS.longitude,
          8,
          selectedService,
          user?.id || null
        );
      }

      const normalized = data.map(item => {
        const distanceKm = Number(item.distance);
        return {
          id: String(item.id),
          barberId: Number(item.id),
          name: item.shop_name,
          distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          hasServiceMatch: item.has_service_match !== false,
          rating: Number(item.rating || 0).toFixed(1),
          queue: item.queue_count || 0,
          serviceType: selectedService,
        };
      });

      setBarbers(normalized);
      setLastUpdated(new Date());
    } catch (error) {
      setLoadError(error?.message || 'Unable to load nearby barbers right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentLocation, selectedService, user?.id]);

  const loadCustomerBookings = useCallback(() => {
    if (!token) {
      setActiveBooking(null);
      setBookingHistory([]);
      return;
    }

    apiClient.getMyActiveBooking(token)
      .then(booking => setActiveBooking(booking || null))
      .catch(() => setActiveBooking(null));

    apiClient.getMyBookingHistory(token, 6)
      .then(history => setBookingHistory(Array.isArray(history) ? history : []))
      .catch(() => setBookingHistory([]));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadCustomerBookings();
      loadDispatch(false);
    }, [token, loadDispatch, loadCustomerBookings])
  );

  // Auto-refresh barbers list when service filter changes
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setBarbers([]);
    setLoadError('');
    if (token) {
      loadDispatch(false);
    }
  }, [selectedService]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: update banner instantly when barber accepts/declines
  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const onStatusUpdate = () => {
      loadCustomerBookings();
    };
    const onConnect = () => {
      loadCustomerBookings();
      loadDispatch(true);
    };
    const onAvailabilityUpdated = () => loadDispatch(true);
    socket.on('booking-status-updated', onStatusUpdate);
    socket.on('barber-availability-updated', onAvailabilityUpdated);
    
    const onQueueUpdated = ({ barberId, queue_count }) => {
      setBarbers(prev => prev.map(b => 
        b.barberId === barberId ? { ...b, queue: queue_count } : b
      ));
    };
    socket.on('queue-updated', onQueueUpdated);

    socket.on('connect', onConnect);
    socket.on('reconnect', onConnect);
    return () => {
      socket.off('booking-status-updated', onStatusUpdate);
      socket.off('barber-availability-updated', onAvailabilityUpdated);
      socket.off('queue-updated', onQueueUpdated);
      socket.off('connect', onConnect);
      socket.off('reconnect', onConnect);
    };
  }, [token, loadCustomerBookings, loadDispatch]);

  // Fallback polling so status still updates if a socket event is missed.
  useEffect(() => {
    if (!token || !activeBooking?.id) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadCustomerBookings();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [token, activeBooking?.id, loadCustomerBookings]);

  const formatStatusLabel = status => {
    if (status === 'confirmed') return 'Accepted';
    if (status === 'cancelled') return 'Declined';
    if (status === 'completed') return 'Completed';
    return 'Pending';
  };

  const statusBadgeStyle = status => {
    if (status === 'confirmed') return styles.historyConfirmed;
    if (status === 'cancelled') return styles.historyDeclined;
    if (status === 'completed') return styles.historyCompleted;
    return styles.historyPending;
  };

  const getActiveBookingMessage = () => {
    if (activeBooking?.status === 'confirmed') {
      return 'Confirmed. Tap to open live tracking.';
    }

    if (activeBooking?.status === 'cancelled') {
      return 'This request was declined. Tap to review the latest update.';
    }

    if (activeBooking?.status === 'completed') {
      return 'This booking is complete. Tap to review the summary.';
    }

    return 'We are still matching your request. Tap to resume and check progress.';
  };

  const renderHeader = () => (
    <>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>
            TrimRide{userCountryCoords.name ? ` • ${userCountryCoords.flag || ''} ${userCountryCoords.name}` : ''}
          </Text>
          <Text style={styles.title}>Book your next barber</Text>
          <Text style={styles.subtitle}>See nearby availability, request fast, and track every step live.</Text>
        </View>
        <TouchableOpacity style={styles.ghostButton} onPress={signOut}>
          <Text style={styles.ghostText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{ backgroundColor: '#0F1F35', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderWidth: 1.2, borderColor: '#3B82F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
        onPress={() => {
          try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
          navigation.navigate('NotificationHub');
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>REAL-TIME DISPATCH RADAR</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>🔔 Notification Command Center</Text>
        </View>
        <Text style={{ color: '#3B82F6', fontWeight: '900', fontSize: 14 }}>Simulate ➔</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: '#0A1424', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderWidth: 1.2, borderColor: '#10B981', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
        onPress={() => {
          try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
          navigation.navigate('FutureVision');
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>100% FREE AI CONSULTATION</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>🧠 AI Style Advisor Studio</Text>
        </View>
        <Text style={{ color: '#10B981', fontWeight: '900', fontSize: 14 }}>Consult ➔</Text>
      </TouchableOpacity>

      {activeBooking ? (
        <TouchableOpacity
          style={[styles.resumeBanner, activeBooking.status === 'confirmed' ? styles.resumeConfirmed : styles.resumePending]}
          onPress={() => navigation.navigate('TrackBarber', {
            barber: {
              name: activeBooking.shop_name,
              barberId: activeBooking.barber_id,
              latitude: Number(activeBooking.latitude),
              longitude: Number(activeBooking.longitude),
            },
            service: activeBooking.service_name || 'General Grooming',
            bookingId: activeBooking.id,
            queuePosition: activeBooking.queue_position,
            clientsAhead: Math.max(0, (activeBooking.queue_position || 1) - 1),
            initialStatus: activeBooking.status,
          })}
        >
          <Text style={styles.resumeLabel}>Current booking</Text>
          <Text style={styles.resumeHeadline}>{activeBooking.shop_name || 'Your barber is on the move'}</Text>
          <Text style={styles.resumeText}>{getActiveBookingMessage()}</Text>
        </TouchableOpacity>
      ) : null}

      {!activeBooking ? (
        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>Start with the best available match</Text>
          <Text style={styles.guidanceText}>Choose a service, compare online barbers by distance, and request in a few taps.</Text>
        </View>
      ) : null}

      {bookingHistory.length > 0 ? (
        <View style={styles.historyPanel}>
          <Text style={styles.historyTitle}>Recent Request Updates</Text>
          {bookingHistory.slice(0, 4).map(item => (
            <View key={String(item.id)} style={styles.historyRow}>
              <View style={styles.historyCopyWrap}>
                <Text style={styles.historyShop}>{item.shop_name}</Text>
                <Text style={styles.historyMeta}>
                  {(item.service_name || 'General Grooming')} • #{item.id}
                </Text>
              </View>
              <View style={[styles.historyBadge, statusBadgeStyle(item.status)]}>
                <Text style={styles.historyBadgeText}>{formatStatusLabel(item.status)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Service</Text>
      <View style={styles.actionsRow}>
        {serviceFilters.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.ghostButton, selectedService === filter && styles.activeFilter]}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              setSelectedService(filter);
            }}
          >
            <Text style={[styles.ghostText, selectedService === filter && styles.activeFilterText]}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.ghostButton} onPress={() => loadDispatch(true)}>
          <Text style={styles.ghostText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <BarberListSkeleton />
      ) : null}
      {!loading && loadError && barbers.length === 0 ? (
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

      {featuredBarber ? (
        <>
            <Text style={styles.sectionLabel}>Best available match</Text>
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => navigation.navigate('RequestBarber', { barber: featuredBarber, serviceType: selectedService })}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredCopy}>
                <Text style={styles.featuredTitle}>{featuredBarber.name}</Text>
                <Text style={styles.featuredSubtitle}>
                  {featuredBarber.hasServiceMatch ? `Available for ${selectedService}` : 'Online; requested service not listed'}
                </Text>
              </View>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>
                  {Number.isFinite(featuredBarber.distanceKm) ? `${featuredBarber.distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
                </Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Rating</Text>
                <Text style={styles.metricValue}>★ {featuredBarber.rating}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Queue</Text>
                <Text style={styles.metricValue}>{featuredBarber.queue}</Text>
              </View>
              <View style={[styles.metricPill, { backgroundColor: '#DC2626', borderColor: '#B91C1C' }]}>
                <Text style={[styles.metricLabel, { color: '#FEE2E2' }]}>Radar Status</Text>
                <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>🔥 Hotzone 1.2x</Text>
              </View>
            </View>
          </TouchableOpacity>
        </>
      ) : null}

      {remainingBarbers.length > 0 ? <Text style={styles.sectionLabel}>More nearby options</Text> : null}
    </>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userCountryCoords.latitude,
          longitude: userCountryCoords.longitude,
          latitudeDelta: userCountryCoords.latitudeDelta,
          longitudeDelta: userCountryCoords.longitudeDelta,
        }}
      >
        {barbers.map(barber => (
          <Marker
            key={barber.id}
            coordinate={{
              latitude: Number.isFinite(barber.latitude) ? barber.latitude : userCountryCoords.latitude,
              longitude: Number.isFinite(barber.longitude) ? barber.longitude : userCountryCoords.longitude,
            }}
            title={barber.name}
            description={barber.eta}
          >
             <View style={styles.markerContainer}>
                <View style={styles.markerDot} />
             </View>
          </Marker>
        ))}
      </MapView>

      {/* Floating country badge & re-center button */}
      <View style={styles.mapControlOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.countryPill}
          activeOpacity={0.85}
          onPress={() => {
            try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (_) {}
            mapRef.current?.animateToRegion({
              latitude: userCountryCoords.latitude,
              longitude: userCountryCoords.longitude,
              latitudeDelta: userCountryCoords.latitudeDelta,
              longitudeDelta: userCountryCoords.longitudeDelta,
            }, 800);
          }}
          accessibilityLabel={`Center map on ${userCountryCoords.name || 'Registration Country'}`}
        >
          <Text style={styles.countryPillFlag}>{userCountryCoords.flag || '📍'}</Text>
          <Text style={styles.countryPillText}>{userCountryCoords.name || 'Registered Country'}</Text>
        </TouchableOpacity>
      </View>

      <UberBottomSheet initialSnapIndex={2}>
        <FlatList
          data={remainingBarbers}
          refreshing={refreshing}
          onRefresh={() => loadDispatch(true)}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: spacing.lg }}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('RequestBarber', { barber: item, serviceType: selectedService })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <View style={styles.cardEtaBadge}>
                  <Text style={styles.cardEta}>
                    {Number.isFinite(item.distanceKm) ? `${item.distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubcopy}>
                {item.hasServiceMatch ? `Available for ${selectedService}` : 'Online; requested service not listed'}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={[styles.cardMetaPill, styles.ratingPill]}>★ {item.rating}</Text>
                <Text style={styles.cardMetaPill}>{item.queue} in queue</Text>
                <Text style={[styles.cardMetaPill, { backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A', borderWidth: 1, fontWeight: '800' }]}>🔥 Demand Hotspot</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!loading && !featuredBarber ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No online barbers found for {selectedService}</Text>
              <Text style={styles.emptyBody}>Try refreshing or switching the service filter.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadDispatch(true)}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      </UberBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: colors.steel,
    width: 40,
  },
  markerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
  },
  container: { flex: 1, backgroundColor: colors.paper },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.md, color: colors.steel },
  resumeBanner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  resumePending: { backgroundColor: '#F59E0B' },
  resumeConfirmed: { backgroundColor: '#10B981' },
  resumeLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  resumeHeadline: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  resumeText: { color: colors.white, fontWeight: '600', fontSize: 13, marginTop: spacing.xs },
  guidanceCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  guidanceTitle: {
    color: colors.charcoal,
    fontSize: 17,
    fontWeight: '800',
  },
  guidanceText: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  sectionLabel: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
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
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  loadingTitle: {
    color: colors.charcoal,
    fontWeight: '800',
    marginTop: spacing.sm,
    fontSize: 16,
  },
  loadingText: {
    color: colors.steel,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  lastUpdated: {
    color: colors.steel,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
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
  emptyBody: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  featuredCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8.00,
    elevation: 4,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredCopy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  featuredTitle: {
    color: colors.charcoal,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  featuredSubtitle: {
    color: colors.steel,
    marginTop: spacing.xs,
  },
  featuredBadge: {
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  featuredBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricPill: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 92,
  },
  metricLabel: {
    color: colors.steel,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  historyPanel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyCopyWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  historyShop: {
    color: colors.charcoal,
    fontWeight: '700',
    fontSize: 13,
  },
  historyMeta: {
    marginTop: 2,
    color: colors.steel,
    fontSize: 12,
  },
  historyBadge: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  historyPending: { backgroundColor: '#F59E0B' },
  historyConfirmed: { backgroundColor: '#10B981' },
  historyDeclined: { backgroundColor: '#EF4444' },
  historyCompleted: { backgroundColor: '#2563EB' },
  historyBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6.00,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: { 
    flex: 1,
    fontSize: 18, 
    fontWeight: '900', 
    color: colors.charcoal,
    letterSpacing: -0.3,
    marginRight: spacing.xs,
  },
  cardEtaBadge: {
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  cardEta: {
    color: colors.charcoal,
    fontWeight: '800',
    fontSize: 12,
  },
  cardSubcopy: {
    marginTop: spacing.xs,
    color: colors.steel,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardMetaPill: {
    color: colors.charcoal,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
    fontSize: 12,
  },
  ratingPill: {
    backgroundColor: '#FEF3C7', // subtle yellow for rating
    color: '#92400E',
  },
  meta: { marginTop: spacing.xs, color: colors.steel },
  mapControlOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    right: spacing.lg,
    zIndex: 10,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  countryPillFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  countryPillText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
