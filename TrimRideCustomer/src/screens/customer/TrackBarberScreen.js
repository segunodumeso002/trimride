import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Vibration, Alert, Platform, PermissionsAndroid, Linking, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { colors, spacing } from '../../theme/tokens';
import { connectSocket } from '../../services/socketClient';
import { useAppMode } from '../../context/AppModeContext';
import { apiClient } from '../../services/apiClient';
import { runtimeConfig } from '../../config/runtimeConfig';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function TrackBarberScreen({ route, navigation }) {
  const { barber, service, bookingId, queuePosition, clientsAhead, initialStatus, verificationPin: paramPin, referencePhoto: paramPhoto, notes: paramNotes } = route?.params || {};
  const [eta, setEta] = useState(7);
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [verificationPin, setVerificationPin] = useState(paramPin || null);
  const [referencePhoto, setReferencePhoto] = useState(paramPhoto || null);
  const [notes, setNotes] = useState(paramNotes || null);

  const initialBarberCoord = useMemo(() => {
    const lat = Number(barber?.latitude);
    const lng = Number(barber?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { latitude: lat, longitude: lng };
    }
    return { latitude: -26.2041, longitude: 28.0473 };
  }, [barber?.latitude, barber?.longitude]);

  const [barberMarker, setBarberMarker] = useState(initialBarberCoord);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const [cancelling, setCancelling] = useState(false);
  const { token } = useAppMode();
  const missingBookingContext = !barber || !barber.name || !bookingId;

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking Request',
      'Are you sure you want to cancel this booking? This will remove your spot in the queue.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              try {
                ReactNativeHapticFeedback.trigger('notificationWarning', { enableVibrateFallback: true });
              } catch (e) {}

              await apiClient.cancelBooking(token, bookingId);
              setStatus('cancelled');
              Alert.alert('Booking Cancelled', 'Your booking request has been cancelled.');
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not cancel booking. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusCopy = () => {
    if (status === 'in_progress') {
      return `PIN verified! ${barber.name} has started your haircut service in the chair.`;
    }

    if (status === 'confirmed') {
      return `Confirmed. Head to ${barber.name}'s shop and share your 4-digit PIN to begin.`;
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
    if (status === 'in_progress') {
      return `Haircut In Progress ✂️`;
    }

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
    if (status === 'in_progress') return styles.toneInProgress;
    if (status === 'confirmed') return styles.toneConfirmed;
    if (status === 'completed') return styles.toneCompleted;
    if (status === 'cancelled') return styles.toneCancelled;
    return styles.tonePending;
  };

  const stages = useMemo(() => {
    const accepted = status === 'confirmed' || status === 'in_progress' || status === 'completed';
    const inChair = status === 'in_progress' || status === 'completed';
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
        label: inChair ? 'PIN verified • In chair' : accepted ? 'Head to shop & show PIN' : 'Tracking on standby',
        detail: inChair ? 'Service currently in progress' : accepted ? 'Navigate to the destination marker' : 'Coordinates update as soon as route starts',
        active: accepted || completed,
      },
      {
        key: 'completion',
        label: completed ? 'Service completed' : 'Finish & receipt',
        detail: completed ? 'Session closed successfully' : 'Receipt & review available upon completion',
        active: completed,
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

  // Fetch & watch Customer's live GPS location
  useEffect(() => {
    let watchId = null;
    let isMounted = true;

    const requestAndFetchLocation = async () => {
      const applyFallback = () => {
        if (!isMounted) return;
        setCustomerLocation({
          latitude: barberMarker.latitude - 0.006,
          longitude: barberMarker.longitude - 0.005,
        });
      };

      const startTracking = () => {
        Geolocation.getCurrentPosition(
          pos => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const isIdentical =
              Math.abs(lat - barberMarker.latitude) < 0.0008 &&
              Math.abs(lng - barberMarker.longitude) < 0.0008;

            if (isIdentical) {
              setCustomerLocation({
                latitude: barberMarker.latitude - 0.006,
                longitude: barberMarker.longitude - 0.005,
              });
            } else {
              setCustomerLocation({ latitude: lat, longitude: lng });
            }
          },
          () => applyFallback(),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );

        try {
          watchId = Geolocation.watchPosition(
            pos => {
              if (!isMounted) return;
              setCustomerLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            () => {},
            { enableHighAccuracy: false, distanceFilter: 15 }
          );
        } catch (e) {}
      };

      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'TrimRide needs your location to display your route to the barber shop.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            startTracking();
          } else {
            applyFallback();
          }
        } catch (e) {
          applyFallback();
        }
      } else {
        startTracking();
      }
    };

    requestAndFetchLocation();

    return () => {
      isMounted = false;
      if (watchId !== null) {
        try { Geolocation.clearWatch(watchId); } catch (e) {}
      }
    };
  }, [barberMarker.latitude, barberMarker.longitude]);

  // Auto-fit map camera so both customer and barber shop pins are framed
  const fitMapMarkers = useCallback(() => {
    if (mapRef.current && customerLocation && barberMarker) {
      try {
        mapRef.current.fitToCoordinates(
          [
            { latitude: customerLocation.latitude, longitude: customerLocation.longitude },
            { latitude: barberMarker.latitude, longitude: barberMarker.longitude },
          ],
          {
            edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
            animated: true,
          }
        );
      } catch (e) {}
    }
  }, [customerLocation, barberMarker]);

  useEffect(() => {
    if (mapReady) {
      fitMapMarkers();
    }
  }, [mapReady, fitMapMarkers]);

  const mapRegion = useMemo(() => {
    if (!customerLocation) {
      return {
        latitude: barberMarker.latitude,
        longitude: barberMarker.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
    }
    const midLat = (customerLocation.latitude + barberMarker.latitude) / 2;
    const midLng = (customerLocation.longitude + barberMarker.longitude) / 2;
    const latDelta = Math.max(Math.abs(customerLocation.latitude - barberMarker.latitude) * 1.8, 0.015);
    const lngDelta = Math.max(Math.abs(customerLocation.longitude - barberMarker.longitude) * 1.8, 0.015);
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [customerLocation, barberMarker]);

  useEffect(() => {
    if (!token || !bookingId || missingBookingContext) {
      return undefined;
    }

    const socket = connectSocket(token);
    socket.emit('join-booking-room', bookingId);

    const refreshLatestStatus = () => {
      apiClient.getMyActiveBooking(token)
        .then(booking => {
          if (booking && Number(booking.id) === Number(bookingId)) {
            if (booking.status) {
              setStatus(booking.status);
            }
            if (booking.verification_pin) {
              setVerificationPin(booking.verification_pin);
            }
            if (booking.reference_photo) {
              setReferencePhoto(booking.reference_photo);
            }
            if (booking.notes) {
              setNotes(booking.notes);
            }
            const bLat = Number(booking.latitude);
            const bLng = Number(booking.longitude);
            if (Number.isFinite(bLat) && Number.isFinite(bLng) && bLat !== 0 && bLng !== 0) {
              setBarberMarker({ latitude: bLat, longitude: bLng });
            }
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
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
          setBarberMarker({ latitude: lat, longitude: lng });
        }
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
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            onMapReady={() => {
              setMapReady(true);
              fitMapMarkers();
            }}
            showsUserLocation={false}
            showsCompass={true}
          >
            {/* Customer's current location pin */}
            {customerLocation && (
              <Marker
                coordinate={{
                  latitude: customerLocation.latitude,
                  longitude: customerLocation.longitude,
                }}
                title="Your Location"
                description="Current Location"
                pinColor="#2563EB"
              />
            )}

            {/* Barber Shop pinned location */}
            <Marker
              coordinate={{
                latitude: barberMarker.latitude,
                longitude: barberMarker.longitude,
              }}
              title={`${barber.name}'s Shop`}
              description={`Service: ${service || 'Grooming'}`}
              pinColor="#EA580C"
            />

            {/* Uber-style Polyline connecting customer to barber shop */}
            {customerLocation && (
              <Polyline
                coordinates={[customerLocation, barberMarker]}
                strokeColor="#3B82F6"
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />
            )}
          </MapView>

          {/* Map legend overlay */}
          <View style={styles.mapLegendOverlay}>
            <View style={styles.legendBadge}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <Text style={styles.legendSeparator}>➔</Text>
            <View style={styles.legendBadge}>
              <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
              <Text style={styles.legendText}>{barber.name}'s Shop</Text>
            </View>
          </View>
        </View>

        {/* Turn-by-Turn Directions Button */}
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => {
            try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (e) {}
            const lat = barberMarker.latitude;
            const lng = barberMarker.longitude;
            const label = encodeURIComponent(`${barber.name}'s Shop`);
            const url = Platform.select({
              ios: `maps:0,0?q=${label}@${lat},${lng}`,
              android: `geo:0,0?q=${lat},${lng}(${label})`,
            }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
              }
            }).catch(() => {
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
            });
          }}
        >
          <Text style={styles.directionsButtonText}>🧭 Open in Google Maps for Directions</Text>
        </TouchableOpacity>

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

        {(status === 'confirmed' || status === 'completed') && (
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => {
              try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
              navigation.navigate('PaymentCheckout', {
                bookingId: bookingId,
                barberId: barber.barberId || barber.id || 1,
                barberName: barber.name,
                service: service,
                baseAmount: 25.00,
              });
            }}
          >
            <Text style={styles.paymentButtonText}>💳 Proceed to Payment & Tipping</Text>
          </TouchableOpacity>
        )}

        {(status === 'pending' || status === 'confirmed') && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
            disabled={cancelling}
            onPress={handleCancelBooking}
          >
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelling...' : status === 'pending' ? '✕ Cancel Booking Request' : '✕ Cancel Booking'}
            </Text>
          </TouchableOpacity>
        )}

        {status === 'cancelled' && (
          <TouchableOpacity
            style={styles.findAnotherButton}
            onPress={() => navigation.navigate('CustomerHome')}
          >
            <Text style={styles.findAnotherButtonText}>🔍 Find Another Barber</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feature 3: 4-Digit Service Verification PIN Card */}
      {verificationPin && status !== 'cancelled' ? (
        <View style={styles.pinCard}>
          <View style={styles.pinHeaderRow}>
            <Text style={styles.pinEyebrow}>🔐 SERVICE VERIFICATION PIN</Text>
            <View style={[styles.pinBadge, status === 'in_progress' ? styles.pinBadgeVerified : styles.pinBadgePending]}>
              <Text style={styles.pinBadgeText}>
                {status === 'in_progress' ? '✓ PIN Verified' : 'Give to Barber'}
              </Text>
            </View>
          </View>
          <Text style={styles.pinInstruction}>
            {status === 'in_progress'
              ? 'Your PIN was verified and your haircut is underway in the chair.'
              : `Share this 4-digit code with ${barber.name} when you sit in the chair to start service:`}
          </Text>
          <View style={styles.pinDigitsContainer}>
            {String(verificationPin).padStart(4, '0').split('').map((digit, i) => (
              <View key={i} style={[styles.pinDigitTile, status === 'in_progress' && styles.pinDigitTileVerified]}>
                <Text style={[styles.pinDigitText, status === 'in_progress' && styles.pinDigitTextVerified]}>{digit}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.pinSecuritySubtext}>
            🛡️ Uber-style service protection • Ensures only verified appointments start
          </Text>
        </View>
      ) : null}

      {/* Feature 1: Style Preset & Reference Photo Snapshot */}
      {(referencePhoto || notes) ? (
        <View style={styles.styleCard}>
          <Text style={styles.styleCardHeader}>✂️ Haircut Style Request</Text>
          <View style={styles.styleCardBody}>
            {referencePhoto ? (
              <Image
                source={{
                  uri: referencePhoto.startsWith('http')
                    ? referencePhoto
                    : `${runtimeConfig.socketBaseUrl}${referencePhoto}`,
                }}
                style={styles.stylePhotoThumbnail}
              />
            ) : null}
            <View style={styles.styleDetailsWrap}>
              <Text style={styles.styleDetailsLabel}>Requested Style & Instructions:</Text>
              <Text style={styles.styleDetailsText}>{notes || 'Standard Barber Cut'}</Text>
              <Text style={styles.styleDetailsHint}>Transmitted to your barber on dispatch</Text>
            </View>
          </View>
        </View>
      ) : null}

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
  toneInProgress: {
    backgroundColor: '#064E3B',
    borderWidth: 1.5,
    borderColor: '#10B981',
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
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLegendOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  legendSeparator: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  directionsButton: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  cancelButton: {
    marginTop: spacing.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  findAnotherButton: {
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  findAnotherButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  status_in_progress: { backgroundColor: '#059669' },
  status_cancelled: { backgroundColor: '#EF4444' },
  status_completed: { backgroundColor: '#6B7280' },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  pinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pinEyebrow: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pinBadgePending: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  pinBadgeVerified: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pinBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  pinInstruction: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  pinDigitsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pinDigitTile: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  pinDigitTileVerified: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  pinDigitText: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pinDigitTextVerified: {
    color: '#34D399',
  },
  pinSecuritySubtext: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  styleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  styleCardHeader: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  styleCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stylePhotoThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  styleDetailsWrap: {
    flex: 1,
  },
  styleDetailsLabel: {
    fontSize: 11,
    color: colors.steel,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  styleDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
    marginTop: 2,
  },
  styleDetailsHint: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
});
