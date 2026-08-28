import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Vibration,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { useNotifications } from '../../context/NotificationContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function NotificationHubScreen({ navigation }) {
  const {
    history,
    addNotification,
    clearHistory,
    soundEnabled,
    setSoundEnabled,
    vibrationEnabled,
    setVibrationEnabled,
  } = useNotifications();

  const handleSimulateAlert = (title, message, type, icon) => {
    try {
      Vibration.vibrate([0, 200, 100, 250]);
      ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    } catch (e) {}

    addNotification({ title, message, type, icon });
  };

  const toggleSound = (val) => {
    try { ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true }); } catch (e) {}
    setSoundEnabled(val);
  };

  const toggleVibration = (val) => {
    try {
      if (val) Vibration.vibrate([0, 100]);
      ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
    } catch (e) {}
    setVibrationEnabled(val);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.eyebrow}>TRIMRIDE DISPATCH ENGINE</Text>
        <Text style={styles.headerTitle}>Notification Command Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.simCard}>
          <Text style={styles.cardSectionTitle}>⚡ Real-Time Alert & Booking Simulators</Text>
          <Text style={styles.cardHint}>Tap any simulator below to test automated haptic vibrations, custom sounds, and live floating banners!</Text>
          
          <TouchableOpacity
            style={[styles.simButton, { borderLeftColor: '#F59E0B' }]}
            onPress={() =>
              handleSimulateAlert(
                '🚨 Barber Match Confirmed!',
                'Segun Odumeso has accepted your booking and is en route to your pin location!',
                'booking',
                '🚨'
              )
            }
          >
            <Text style={styles.simButtonIcon}>🚨</Text>
            <View style={styles.simButtonTextWrap}>
              <Text style={styles.simButtonTitle}>Simulate Match Confirmed</Text>
              <Text style={styles.simButtonSub}>Notifies customer when barber accepts booking</Text>
            </View>
            <Text style={styles.simButtonArrow}>Test ➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.simButton, { borderLeftColor: '#3B82F6' }]}
            onPress={() =>
              handleSimulateAlert(
                '💈 Your Barber is Arriving!',
                'Segun is pulling up to your location right now. Please prepare your chair or step outside!',
                'booking',
                '💈'
              )
            }
          >
            <Text style={styles.simButtonIcon}>💈</Text>
            <View style={styles.simButtonTextWrap}>
              <Text style={styles.simButtonTitle}>Simulate Curb Arrival Alarm</Text>
              <Text style={styles.simButtonSub}>Broadcasts instant arrival notice to phone screen</Text>
            </View>
            <Text style={styles.simButtonArrow}>Test ➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.simButton, { borderLeftColor: '#10B981' }]}
            onPress={() =>
              handleSimulateAlert(
                '💳 Payment Checkout Complete',
                'Receipt: $35.00 Base Fare + $9.00 Tip processed seamlessly via TrimRide Pay.',
                'payout',
                '💳'
              )
            }
          >
            <Text style={styles.simButtonIcon}>💳</Text>
            <View style={styles.simButtonTextWrap}>
              <Text style={styles.simButtonTitle}>Simulate Payment Receipt</Text>
              <Text style={styles.simButtonSub}>Confirms total payment charges with tipping badge</Text>
            </View>
            <Text style={styles.simButtonArrow}>Test ➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.simButton, { borderLeftColor: '#A855F7' }]}
            onPress={() =>
              handleSimulateAlert(
                '💬 Urgent En-Route Chat Message',
                'Barber Segun: "I am turning onto your street now! See you in 1 minute!"',
                'chat',
                '💬'
              )
            }
          >
            <Text style={styles.simButtonIcon}>💬</Text>
            <View style={styles.simButtonTextWrap}>
              <Text style={styles.simButtonTitle}>Simulate Live Chat Dispatch</Text>
              <Text style={styles.simButtonSub}>Previews real-time socket messaging notifications</Text>
            </View>
            <Text style={styles.simButtonArrow}>Test ➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.prefCard}>
          <Text style={styles.cardSectionTitle}>🎛️ Alert Preference Channels</Text>
          
          <View style={styles.prefRow}>
            <View style={styles.prefTextColumn}>
              <Text style={styles.prefTitle}>Vibration Haptic Bursts</Text>
              <Text style={styles.prefSub}>Tactile phone pulses on match arrival and chat updates</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={toggleVibration}
              trackColor={{ false: '#64748B', true: '#10B981' }}
              thumbColor={vibrationEnabled ? '#FFFFFF' : '#E2E8F0'}
            />
          </View>

          <View style={styles.prefRow}>
            <View style={styles.prefTextColumn}>
              <Text style={styles.prefTitle}>Audio Arrival & Chimes</Text>
              <Text style={styles.prefSub}>Play auditory dispatch chimes when backgrounded</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: '#64748B', true: '#10B981' }}
              thumbColor={soundEnabled ? '#FFFFFF' : '#E2E8F0'}
            />
          </View>
        </View>

        <View style={styles.historyHeaderRow}>
          <Text style={styles.sectionHeader}>📋 Notification Receipt History ({history.length})</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>🗑️ Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No notifications logged in this session yet.</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <Text style={styles.historyIcon}>{item.icon || '🔔'}</Text>
              <View style={styles.historyContent}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyTime}>{item.time || 'Recent'}</Text>
                </View>
                <Text style={styles.historyMsg}>{item.message}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    backgroundColor: '#0F1F35',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  eyebrow: { color: '#F59E0B', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  scrollContent: { padding: spacing.md, flexGrow: 1 },
  simCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSectionTitle: { fontSize: 16, fontWeight: '800', color: colors.charcoal, marginBottom: 4 },
  cardHint: { fontSize: 12, color: colors.steel, marginBottom: 16, lineHeight: 18 },
  simButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#334155',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simButtonIcon: { fontSize: 24, marginRight: 12 },
  simButtonTextWrap: { flex: 1, paddingRight: 6 },
  simButtonTitle: { fontSize: 14, fontWeight: '800', color: colors.charcoal },
  simButtonSub: { fontSize: 11, fontWeight: '600', color: colors.steel, marginTop: 2 },
  simButtonArrow: { fontSize: 14, fontWeight: '900', color: colors.charcoal },
  prefCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  prefTextColumn: { flex: 1, paddingRight: 12 },
  prefTitle: { fontSize: 15, fontWeight: '700', color: colors.charcoal },
  prefSub: { fontSize: 12, color: colors.steel, marginTop: 2 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: colors.charcoal },
  clearBtn: { backgroundColor: '#FEE2E2', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#FECACA' },
  clearBtnText: { color: '#B91C1C', fontSize: 12, fontWeight: '800' },
  emptyBox: { padding: 20, backgroundColor: colors.white, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { color: colors.steel, fontWeight: '600', fontSize: 14 },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyIcon: { fontSize: 24, marginRight: 12, alignSelf: 'center' },
  historyContent: { flex: 1 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  historyTitle: { fontSize: 14, fontWeight: '800', color: colors.charcoal },
  historyTime: { fontSize: 11, fontWeight: '700', color: colors.steel },
  historyMsg: { fontSize: 13, color: '#475569', lineHeight: 18 },
});
