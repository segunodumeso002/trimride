import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Vibration } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const COMPLIMENT_OPTIONS = [
  '🔥 Cleanest Fade',
  '⚡ Punctual Dispatch',
  '💈 Great Shop Vibe',
  '✂️ Precision Detail',
  '🤝 Supreme Service',
  '🗣️ Awesome Conversation',
];

export default function ReviewBarberScreen({ route, navigation }) {
  const { bookingId = 1, barberName = 'Featured Barber', service = 'Premium Fade', barberId = 1 } = route?.params || {};
  const { token } = useAppMode();
  const [rating, setRating] = useState(5);
  const [selectedCompliments, setSelectedCompliments] = useState(['🔥 Cleanest Fade', '⚡ Punctual Dispatch']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarPress = (stars) => {
    try {
      Vibration.vibrate([0, 40]);
      ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    } catch (e) {}
    setRating(stars);
  };

  const handleToggleCompliment = (badge) => {
    try {
      ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
    } catch (e) {}
    if (selectedCompliments.includes(badge)) {
      setSelectedCompliments(selectedCompliments.filter(b => b !== badge));
    } else {
      setSelectedCompliments([...selectedCompliments, badge]);
    }
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    } catch (e) {}

    try {
      const payload = {
        bookingId: Number(bookingId) || 1,
        barberId: Number(barberId) || 1,
        rating: Number(rating),
        comment: comment.trim(),
        compliments: selectedCompliments,
      };
      await apiClient.submitReview(token, payload);
      setSubmitted(true);
      try {
        Vibration.vibrate([0, 200, 150, 300]);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      } catch (e) {}
    } catch (error) {
      Alert.alert('Submission Error', error.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🌟</Text>
          <Text style={styles.successTitle}>Reputation Boost Applied!</Text>
          <Text style={styles.successSubtitle}>
            Your review of ⭐ {rating}.0 stars and compliments have been posted to {barberName}'s public TrimRide scorecard.
          </Text>

          <View style={styles.badgeShowcase}>
            <Text style={styles.showcaseHeader}>AWARDED COMPLIMENT BADGES</Text>
            <View style={styles.showcaseGrid}>
              {selectedCompliments.map((badge, idx) => (
                <View key={idx} style={styles.showcasePill}>
                  <Text style={styles.showcaseText}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.navigate('CustomerHome')}
          >
            <Text style={styles.doneButtonText}>Return to Home Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>TrimRide Reputation System</Text>
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>How was your {service} with {barberName} today? Your feedback elevates quality across the marketplace.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tap to Score (1 to 5 Stars)</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((stars) => {
            const isFilled = stars <= rating;
            return (
              <TouchableOpacity
                key={stars}
                style={styles.starTouch}
                onPress={() => handleStarPress(stars)}
              >
                <Text style={[styles.starIcon, isFilled && styles.starIconActive]}>
                  {isFilled ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.ratingText}>
          {rating === 5 ? '⭐ 5.0 - Superior Styling & Service!' : `⭐ ${rating}.0 - Good Experience`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Award Compliment Badges</Text>
        <Text style={styles.sectionHelper}>Select all that apply to highlight {barberName}'s strengths:</Text>
        <View style={styles.badgeGrid}>
          {COMPLIMENT_OPTIONS.map((badge) => {
            const isSelected = selectedCompliments.includes(badge);
            return (
              <TouchableOpacity
                key={badge}
                style={[styles.badgeButton, isSelected && styles.badgeButtonSelected]}
                onPress={() => handleToggleCompliment(badge)}
              >
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  {badge}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Feedback (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Write a quick note about your haircut or experience..."
          placeholderTextColor={colors.steel}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmitReview}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit ⭐ {rating}.0 Review</Text>
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
  section: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.charcoal, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  sectionHelper: { color: colors.steel, fontSize: 13, marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 12 },
  starTouch: { padding: 4 },
  starIcon: { fontSize: 44, color: '#D1D5DB' },
  starIconActive: { color: '#F59E0B' },
  ratingText: { textAlign: 'center', color: '#B45309', fontSize: 15, fontWeight: '800', marginTop: 4 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  badgeButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  badgeText: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  badgeTextSelected: { color: '#059669', fontWeight: '800' },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: spacing.md,
    color: colors.charcoal,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
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
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  completedContainer: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg, justifyContent: 'center' },
  successCard: { backgroundColor: colors.white, borderRadius: 24, padding: spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  successIcon: { fontSize: 50, marginBottom: spacing.sm },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.charcoal },
  successSubtitle: { fontSize: 14, color: colors.steel, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg, lineHeight: 20 },
  badgeShowcase: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: spacing.lg },
  showcaseHeader: { fontSize: 11, fontWeight: '800', color: colors.steel, letterSpacing: 1, marginBottom: spacing.sm, textAlign: 'center' },
  showcaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  showcasePill: { backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#F59E0B' },
  showcaseText: { color: '#B45309', fontWeight: '700', fontSize: 13 },
  doneButton: { backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center' },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
