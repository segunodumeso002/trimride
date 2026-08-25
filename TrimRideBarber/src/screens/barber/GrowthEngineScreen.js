import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Vibration,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function GrowthEngineScreen({ navigation }) {
  const [boostActive, setBoostActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [selectedHour, setSelectedHour] = useState('17:00');
  const referralCode = 'TRIM-PRO-88';

  const hourlyForecast = [
    { time: '08:00', level: 35, peak: false },
    { time: '10:00', level: 50, peak: false },
    { time: '12:00', level: 85, peak: true, label: 'Lunch Surge' },
    { time: '14:00', level: 60, peak: false },
    { time: '17:00', level: 95, peak: true, label: 'Evening Peak' },
    { time: '19:00', level: 75, peak: true, label: 'Night Shift' },
  ];

  const toggleBoost = (value) => {
    ReactNativeHapticFeedback.trigger(value ? 'notificationSuccess' : 'impactMedium', { enableVibrateFallback: true });
    setBoostActive(value);
    if (value) {
      Alert.alert(
        '🔥 Hotspot Boost Active',
        'Your profile will receive priority dispatching in high-demand zones for the next 2 hours.'
      );
    }
  };

  const toggleFlashPromotion = (value) => {
    try {
      Vibration.vibrate([0, 150, 100, 200]);
      ReactNativeHapticFeedback.trigger(value ? 'notificationSuccess' : 'impactMedium', { enableVibrateFallback: true });
    } catch (e) {}
    setFlashActive(value);
    if (value) {
      Alert.alert(
        '⚡ Happy Hour Flash Discount Broadcasted!',
        'A limited-time 15% promotional discount has been broadcasted to all active TrimRide customers within a 3-mile radius!\n\nExpect up to +300% incoming queue requests over the next 2 hours.'
      );
    }
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join TrimRide using my barber code ${referralCode} to get 15% off your first cut: https://trimride.app/invite/${referralCode}`,
      });
    } catch (_err) {
      // User cancelled or share not available
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Growth & Promotions</Text>
        <Text style={styles.subtitle}>100% free growth accelerators to maximize your chair occupancy</Text>
      </View>

      {/* AI Style Advisor Quick Launch Banner */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => {
          try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
          navigation.navigate('FutureVision');
        }}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.aiEyebrow}>100% FREE IN-CHAIR SUITE</Text>
          <Text style={styles.aiTitle}>🧠 AI Style Advisor Studio</Text>
          <Text style={styles.aiSubtitle}>Use our intelligent style consultant directly in your shop to prescribe custom haircuts to your clients.</Text>
        </View>
        <Text style={styles.aiArrow}>Open ➔</Text>
      </TouchableOpacity>

      {/* NEW: Happy Hour Flash Promotion Broadcaster */}
      <View style={[styles.card, flashActive && styles.flashActiveCard]}>
        <View style={styles.boostRow}>
          <View style={styles.boostTextGroup}>
            <View style={styles.badgeRow}>
              <Text style={styles.boostTitle}>⚡ Flash Happy Hour Broadcast</Text>
              {flashActive && <View style={[styles.activeBadge, { backgroundColor: '#10B981' }]}><Text style={[styles.activeBadgeText, { color: '#064E3B' }]}>LIVE NOW</Text></View>}
            </View>
            <Text style={styles.boostSubtext}>
              {flashActive
                ? 'Broadcasting 15% flash discount to clients within 3 miles. (+300% queue visibility active!)'
                : 'Broadcast a temporary 15% discount to fill empty calendar hours instantly.'}
            </Text>
          </View>
          <Switch
            value={flashActive}
            onValueChange={toggleFlashPromotion}
            trackColor={{ false: colors.soft, true: '#10B981' }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* NEW: Automated Client Loyalty Tracker */}
      <View style={[styles.card, { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFBF5' }]}>
        <Text style={[styles.cardEyebrow, { color: '#B45309' }]}>👑 CLIENT RETENTION ENGINE</Text>
        <Text style={styles.sectionTitle}>Automated 5-Cut Loyalty Card</Text>
        <Text style={styles.sectionSubtitle}>
          TrimRide automatically awards repeat clients a free VIP Hot Towel Scrub on their 5th booking, driving 84% client return rates without advertising expenses!
        </Text>

        <View style={styles.loyaltyStatsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>42</Text>
            <Text style={styles.statChipLabel}>Active Loyalty Cards</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>14</Text>
            <Text style={styles.statChipLabel}>Due For 5th Visit</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>84%</Text>
            <Text style={styles.statChipLabel}>Retention Rate</Text>
          </View>
        </View>
      </View>

      {/* Hotspot Boost Toggle Card */}
      <View style={[styles.card, boostActive && styles.boostActiveCard]}>
        <View style={styles.boostRow}>
          <View style={styles.boostTextGroup}>
            <View style={styles.badgeRow}>
              <Text style={styles.boostTitle}>Hotspot Priority Mode</Text>
              {boostActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>ACTIVE</Text></View>}
            </View>
            <Text style={styles.boostSubtext}>
              {boostActive
                ? '+25% higher request priority in active high-demand zones'
                : 'Enable priority dispatch when you are near demand clusters'}
            </Text>
          </View>
          <Switch
            value={boostActive}
            onValueChange={toggleBoost}
            trackColor={{ false: colors.soft, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Hourly Demand Forecast */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>TODAY'S DEMAND FORECAST</Text>
        <Text style={styles.sectionTitle}>Peak Booking Hours</Text>
        <Text style={styles.sectionSubtitle}>Tap a bar to see forecasted surge intensity</Text>
        
        <View style={styles.chartContainer}>
          {hourlyForecast.map((item) => {
            const isSelected = selectedHour === item.time;
            return (
              <TouchableOpacity
                key={item.time}
                style={styles.barColumn}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                  setSelectedHour(item.time);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${item.level}%` },
                      item.peak && styles.barFillPeak,
                      isSelected && styles.barFillSelected,
                    ]}
                  />
                </View>
                <Text style={[styles.barTimeText, isSelected && styles.barTimeTextSelected]}>
                  {item.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Hour Details */}
        {(() => {
          const active = hourlyForecast.find((f) => f.time === selectedHour);
          return (
            <View style={styles.selectedForecastBox}>
              <Text style={styles.selectedForecastTime}>{selectedHour} Slot</Text>
              <Text style={styles.selectedForecastDesc}>
                {active?.peak
                  ? `🔥 High Surge Expected (${active.label}). Be online for priority client matches.`
                  : `⚡ Steady volume (${active?.level}% average utilization).`}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Referral & VIP Placement Card */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>REFERRAL BOOST</Text>
        <Text style={styles.sectionTitle}>Invite Clients & Earn Top Rank</Text>
        <Text style={styles.sectionSubtitle}>
          Refer 5 clients to unlock VIP top placement in customer search for 7 days.
        </Text>

        <View style={styles.referralProgressRow}>
          <Text style={styles.referralProgressText}>Progress: 3 / 5 invited</Text>
          <View style={styles.miniProgressTrack}>
            <View style={[styles.miniProgressFill, styles.referralFillWidth]} />
          </View>
        </View>

        <View style={styles.codeContainer}>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR CODE</Text>
            <Text style={styles.codeText}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareReferral} activeOpacity={0.8}>
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.md, marginTop: spacing.xs },
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal },
  subtitle: { fontSize: 14, color: colors.steel, marginTop: 2 },

  aiBanner: {
    backgroundColor: '#0F1F35',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  aiEyebrow: { color: '#10B981', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  aiTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 },
  aiSubtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 17, marginTop: 4 },
  aiArrow: { color: '#3B82F6', fontWeight: '900', fontSize: 15 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  flashActiveCard: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  boostActiveCard: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#FFFDF5',
  },
  boostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boostTextGroup: { flex: 1, paddingRight: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  boostTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoal },
  activeBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  boostSubtext: { fontSize: 13, color: colors.steel, marginTop: 4, lineHeight: 18 },

  loyaltyStatsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  statChip: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  statChipVal: { fontSize: 18, fontWeight: '900', color: '#B45309' },
  statChipLabel: { fontSize: 10, fontWeight: '700', color: '#78350F', marginTop: 2, textAlign: 'center' },

  cardEyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.charcoal, marginTop: spacing.xs },
  sectionSubtitle: { fontSize: 13, color: colors.steel, marginTop: 2, marginBottom: spacing.md, lineHeight: 18 },

  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: { height: 90, width: 24, justifyContent: 'flex-end', backgroundColor: colors.paper, borderRadius: 6, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.steel, borderRadius: 6 },
  barFillPeak: { backgroundColor: colors.accent },
  barFillSelected: { backgroundColor: colors.ink },
  barTimeText: { fontSize: 11, color: colors.steel, marginTop: 6, fontWeight: '600' },
  barTimeTextSelected: { color: colors.ink, fontWeight: '800' },

  selectedForecastBox: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  selectedForecastTime: { fontSize: 14, fontWeight: '800', color: colors.charcoal },
  selectedForecastDesc: { fontSize: 13, color: colors.steel, marginTop: 2, lineHeight: 18 },

  referralProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  referralProgressText: { fontSize: 13, fontWeight: '700', color: colors.charcoal },
  miniProgressTrack: { width: 100, height: 6, backgroundColor: colors.paper, borderRadius: 3, overflow: 'hidden' },
  miniProgressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },

  codeContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeBox: { flex: 1, backgroundColor: colors.paper, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.soft },
  codeLabel: { fontSize: 10, fontWeight: '800', color: colors.steel, letterSpacing: 1 },
  codeText: { fontSize: 18, fontWeight: '800', color: colors.charcoal, marginTop: 2 },
  shareButton: { backgroundColor: colors.ink, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12 },
  shareButtonText: { color: colors.white, fontWeight: '800', fontSize: 14 },
});
