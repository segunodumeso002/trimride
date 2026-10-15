import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Vibration } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function PaymentCheckoutScreen({ route, navigation }) {
  const { bookingId = 1, barberId = 1, barberName = 'Featured Barber', service = 'Premium Fade', baseAmount = 25.00 } = route?.params || {};
  const [tip, setTip] = useState(5.00);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleTipSelect = (amount) => {
    try {
      Vibration.vibrate([0, 50]);
      ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    } catch (e) {}
    setTip(amount);
  };

  const handleMethodSelect = (method) => {
    try {
      ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
    } catch (e) {}
    setPaymentMethod(method);
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    } catch (e) {}

    try {
      await apiClient.processPayment(Number(bookingId), Number(baseAmount), paymentMethod, tip);
      setCompleted(true);
      try {
        Vibration.vibrate([0, 200, 100, 300]);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      } catch (e) {}
    } catch (error) {
      Alert.alert('Payment processing error', error.message || 'Could not process transaction.');
    } finally {
      setProcessing(false);
    }
  };

  const totalCharge = Math.round((Number(baseAmount) + Number(tip)) * 100) / 100;
  const platformOwnerCut = Math.round((Number(baseAmount) * 0.20) * 100) / 100;
  const barberNetShare = Math.round(((Number(baseAmount) - platformOwnerCut) + Number(tip)) * 100) / 100;

  if (completed) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>Thank you for choosing TrimRide and supporting {barberName}.</Text>

          <View style={styles.receiptBox}>
            <Text style={styles.receiptHeader}>TRIMRIDE OFFICIAL RECEIPT</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Service Fare</Text>
              <Text style={styles.receiptValue}>${baseAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Barber Tip (100% to barber)</Text>
              <Text style={styles.receiptValue}>+${tip.toFixed(2)}</Text>
            </View>
            <View style={[styles.receiptRow, styles.receiptTotalRow]}>
              <Text style={styles.receiptTotalLabel}>Total Paid</Text>
              <Text style={styles.receiptTotalValue}>${totalCharge.toFixed(2)}</Text>
            </View>
            <Text style={styles.commissionFootnote}>
              🛡️ TrimRide verified transaction • Platform dispatch commission (${platformOwnerCut.toFixed(2)}) safely reserved for creator equity & maintenance.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => {
              try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
              navigation.navigate('ReviewBarber', {
                bookingId,
                barberId,
                barberName,
                service,
              });
            }}
          >
            <Text style={styles.reviewButtonText}>⭐ Rate Barber & Leave Compliments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('CustomerHome')}
          >
            <Text style={styles.homeButtonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Secure TrimRide Checkout</Text>
        <Text style={styles.title}>Complete & Tip</Text>
        <Text style={styles.subtitle}>You received a quality {service} from {barberName}. Add a tip to show appreciation!</Text>

        <View style={styles.fareBox}>
          <Text style={styles.fareLabel}>Base Service Fare</Text>
          <Text style={styles.fareAmount}>${Number(baseAmount).toFixed(2)} USD</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a Tip (100% Goes to {barberName})</Text>
        <View style={styles.tipGrid}>
          {[3.00, 5.00, 10.00, 15.00, 0.00].map((amount) => {
            const isSelected = tip === amount;
            return (
              <TouchableOpacity
                key={amount}
                style={[styles.tipButton, isSelected && styles.tipButtonSelected]}
                onPress={() => handleTipSelect(amount)}
              >
                <Text style={[styles.tipText, isSelected && styles.tipTextSelected]}>
                  {amount > 0 ? `$${amount.toFixed(0)}` : 'No Tip'}
                </Text>
                {amount === 5.00 && <Text style={styles.tipBadge}>Popular</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'card' && styles.methodCardSelected]}
            onPress={() => handleMethodSelect('card')}
          >
            <Text style={[styles.methodTitle, paymentMethod === 'card' && styles.methodTextSelected]}>💳 Credit / Debit Card</Text>
            <Text style={styles.methodSubtitle}>Visa ending in •••• 4242</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'cash' && styles.methodCardSelected]}
            onPress={() => handleMethodSelect('cash')}
          >
            <Text style={[styles.methodTitle, paymentMethod === 'cash' && styles.methodTextSelected]}>💵 Cash on Arrival</Text>
            <Text style={styles.methodSubtitle}>Pay directly in shop</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Uber-Style Marketplace Payout Breakdown</Text>
        <Text style={styles.summaryDescription}>
          Just like Uber, TrimRide aligns incentives: you receive premium styling, barbers keep 80% fare + 100% tips (${barberNetShare.toFixed(2)}), and TrimRide retains a 20% commission (${platformOwnerCut.toFixed(2)}) for platform growth & scaling.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.payButton, processing && styles.payButtonDisabled]}
        onPress={handleConfirmPayment}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.payButtonText}>Pay ${totalCharge.toFixed(2)} & Complete</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: 60 },
  heroCard: {
    backgroundColor: '#0F1F35',
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', marginTop: spacing.xs },
  subtitle: { color: '#D1D5DB', fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  fareBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: { color: '#C7CDD6', fontSize: 14, fontWeight: '700' },
  fareAmount: { color: colors.white, fontSize: 20, fontWeight: '800' },
  section: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.charcoal, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  tipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    minWidth: 72,
  },
  tipButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  tipText: { color: colors.charcoal, fontSize: 16, fontWeight: '700' },
  tipTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  tipBadge: { fontSize: 10, color: colors.accent, fontWeight: '800', marginTop: 2 },
  methodRow: { gap: 10 },
  methodCard: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  methodTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoal },
  methodTextSelected: { color: '#1E3A8A' },
  methodSubtitle: { fontSize: 13, color: colors.steel, marginTop: 4 },
  summaryCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#0369A1', marginBottom: 4 },
  summaryDescription: { fontSize: 13, color: '#0C4A6E', lineHeight: 18 },
  payButton: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: colors.white, fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  completedContainer: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg, justifyContent: 'center' },
  successCard: { backgroundColor: colors.white, borderRadius: 24, padding: spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  successIcon: { fontSize: 50, marginBottom: spacing.sm },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.charcoal },
  successSubtitle: { fontSize: 14, color: colors.steel, textAlign: 'center', marginTop: 4, marginBottom: spacing.md },
  receiptBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: spacing.lg },
  receiptHeader: { fontSize: 11, fontWeight: '800', color: colors.steel, letterSpacing: 1, marginBottom: spacing.sm, textAlign: 'center' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptLabel: { fontSize: 14, color: colors.charcoal },
  receiptValue: { fontSize: 14, fontWeight: '700', color: colors.charcoal },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: '#CBD5E1', marginTop: 8, paddingTop: 10 },
  receiptTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.charcoal },
  receiptTotalValue: { fontSize: 18, fontWeight: '800', color: '#10B981' },
  commissionFootnote: { fontSize: 12, color: '#059669', marginTop: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center', backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8 },
  reviewButton: { backgroundColor: '#F59E0B', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 12, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  reviewButtonText: { color: '#0F1F35', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  homeButton: { backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center' },
  homeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
