import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const FALLBACK_HOTZONES = [
  {
    id: 'sandton',
    name: 'Sandton Central Hub',
    surge: '+25% Surge Boost (1.25x)',
    estBonus: '+$15.00/hr',
    demandLevel: 'HIGH DEMAND 🔥',
    requestsCount: 24,
    barbersCount: 4,
    coordinate: { latitude: -26.1076, longitude: 28.0567 },
    radius: 1800,
    color: 'rgba(239, 68, 68, 0.35)',
    stroke: '#EF4444',
    royaltyBonusMessage: 'Surge pricing boosts Gross Fares by 25%, simultaneously raising TrimRide owner 20% commission yields!'
  },
  {
    id: 'rosebank',
    name: 'Rosebank Commerce District',
    surge: '+15% Surge Boost (1.15x)',
    estBonus: '+$9.00/hr',
    demandLevel: 'MEDIUM DEMAND ⚡',
    requestsCount: 14,
    barbersCount: 5,
    coordinate: { latitude: -26.1458, longitude: 28.0436 },
    radius: 1500,
    color: 'rgba(198, 146, 20, 0.35)',
    stroke: '#C69214',
    royaltyBonusMessage: 'Active merchant center with steady tip frequency.'
  },
  {
    id: 'braamfontein',
    name: 'Braamfontein University Hub',
    surge: '+10% Surge Boost (1.10x)',
    estBonus: '+$6.00/hr',
    demandLevel: 'BUILDING DEMAND 📈',
    requestsCount: 11,
    barbersCount: 3,
    coordinate: { latitude: -26.1924, longitude: 28.0345 },
    radius: 1200,
    color: 'rgba(31, 157, 85, 0.35)',
    stroke: '#1F9D55',
    royaltyBonusMessage: 'High student foot traffic volume.'
  },
];

export default function HotzoneScreen() {
  const mapRef = useRef(null);
  const [zones, setZones] = useState(FALLBACK_HOTZONES);
  const [selectedZone, setSelectedZone] = useState(FALLBACK_HOTZONES[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncHotzones = async () => {
      try {
        const data = await apiClient.getActiveHotzones();
        if (data && Array.isArray(data.hotzones) && data.hotzones.length > 0) {
          setZones(data.hotzones);
          setSelectedZone(data.hotzones[0]);
        }
      } catch (e) {
        // use fallback gracefully
      } finally {
        setLoading(false);
      }
    };
    syncHotzones();
  }, []);

  const handleSelectZone = (zone) => {
    try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (e) {}
    setSelectedZone(zone);
    mapRef.current?.animateToRegion(
      {
        latitude: zone.coordinate.latitude,
        longitude: zone.coordinate.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      800
    );
  };

  const handleNavigateToZone = () => {
    try {
      Vibration.vibrate([0, 150, 100, 250]);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
    } catch (e) {}

    Alert.alert(
      '⚡ Hotzone Surge Locked In!',
      `You are routed to ${selectedZone.name}. Your active dispatch rate is locked at ${selectedZone.surge} with an estimated +$15.00/hr income boost.\n\nTrimRide Platform Fee: 20% applies to base & surge fare. You keep 100% of all client tips!`,
      [{ text: 'Start Turn-by-Turn Navigation', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Interactive Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: selectedZone.coordinate.latitude,
          longitude: selectedZone.coordinate.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      >
        {zones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={zone.coordinate}
              radius={zone.radius}
              strokeWidth={2.5}
              strokeColor={zone.stroke}
              fillColor={zone.color}
            />
            <Marker
              coordinate={zone.coordinate}
              title={zone.name}
              description={`${zone.surge} • ${zone.requestsCount} client requests`}
              onPress={() => handleSelectZone(zone)}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* Floating Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>🔥 Live Demand Radar</Text>
          <View style={styles.liveSurgeBadge}>
            <Text style={styles.liveSurgeBadgeText}>SURGE ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Position near glowing circles to capture surge fares & higher payouts</Text>
        
        <View style={styles.royaltyBox}>
          <Text style={styles.royaltyHeader}>👑 TRIMRIDE OWNER ROYALTY ENGINE (20%)</Text>
          <Text style={styles.royaltyText}>{selectedZone.royaltyBonusMessage || 'Surge pricing increases Gross Revenue, driving higher 20% platform commissions!'}</Text>
        </View>
      </View>

      {/* Bottom Floating Hotzone Selector Cards */}
      <View style={styles.bottomOverlay}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScroll}
        >
          {zones.map((zone) => {
            const isSelected = selectedZone.id === zone.id;
            return (
              <TouchableOpacity
                key={zone.id}
                style={[styles.zoneCard, isSelected && styles.selectedZoneCard]}
                onPress={() => handleSelectZone(zone)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTopRow}>
                  <Text style={[styles.demandBadge, { color: zone.stroke }]}>
                    {zone.demandLevel}
                  </Text>
                  <View style={[styles.surgePill, { backgroundColor: zone.stroke }]}>
                    <Text style={styles.surgeText}>{zone.surge}</Text>
                  </View>
                </View>

                <Text style={styles.zoneName}>{zone.name}</Text>

                <View style={styles.bonusRow}>
                  <Text style={styles.bonusLabel}>Est. Surge Income Boost:</Text>
                  <Text style={styles.bonusVal}>{zone.estBonus}</Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statText}>⚡ {zone.requestsCount} Requests</Text>
                  <Text style={styles.statDot}>•</Text>
                  <Text style={styles.statText}>💈 {zone.barbersCount} Barbers</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={handleNavigateToZone}
          activeOpacity={0.85}
        >
          <Text style={styles.navigateButtonText}>
            ⚡ Lock In Surge Rate & Navigate
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  map: { flex: 1 },

  headerBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#0F1F35',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  liveSurgeBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveSurgeBadgeText: { color: '#064E3B', fontSize: 10, fontWeight: '800' },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  royaltyBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  royaltyHeader: { color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  royaltyText: { color: '#E2E8F0', fontSize: 12, lineHeight: 16 },

  bottomOverlay: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
  },
  cardsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  zoneCard: {
    width: 280,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedZoneCard: {
    borderColor: '#0F1F35',
    backgroundColor: '#FFFDF9',
    shadowOpacity: 0.15,
    elevation: 6,
    borderWidth: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  demandBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  surgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  surgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  zoneName: { fontSize: 17, fontWeight: '800', color: colors.charcoal, marginBottom: 6 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, marginBottom: spacing.xs, borderWidth: 1, borderColor: '#BBF7D0' },
  bonusLabel: { fontSize: 11, color: '#166534', fontWeight: '700' },
  bonusVal: { fontSize: 13, color: '#15803D', fontWeight: '900' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 12, color: colors.steel, fontWeight: '700' },
  statDot: { color: colors.steel, fontSize: 12 },

  navigateButton: {
    backgroundColor: '#10B981',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#047857',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  navigateButtonText: { color: '#0F1F35', fontSize: 16, fontWeight: '900' },
});
