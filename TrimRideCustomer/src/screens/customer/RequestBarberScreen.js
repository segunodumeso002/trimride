import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const STYLE_PRESETS = [
  'Low Skin Fade',
  'Mid Taper Fade',
  'Buzz & Shape-Up',
  '360 Waves',
  'Beard Sculpt',
  'Textured Crop',
];

export default function RequestBarberScreen({ route, navigation }) {
  const { barber, serviceType } = route?.params || {};
  const resolvedBarberId = Number(barber?.barberId || barber?.id || barber?.barber_id || 0);
  const [service] = useState(serviceType || 'Premium Fade');
  const [loading, setLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [waitingClients, setWaitingClients] = useState(Number(barber?.queue || 0));
  const [selectedPreset, setSelectedPreset] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { token } = useAppMode();
  const invalidBarber = !barber || !barber.name || !Number.isFinite(resolvedBarberId) || resolvedBarberId <= 0;

  useEffect(() => {
    const loadQueue = async () => {
      if (invalidBarber) {
        setQueueLoading(false);
        return;
      }

      try {
        const queueEntries = await apiClient.getBarberQueue(resolvedBarberId);
        setWaitingClients(Array.isArray(queueEntries) ? queueEntries.length : 0);
      } catch (_error) {
        setWaitingClients(Number(barber?.queue || 0));
      } finally {
        setQueueLoading(false);
      }
    };

    loadQueue();
  }, [barber?.queue, invalidBarber, resolvedBarberId]);

  const handlePickPhoto = async () => {
    try {
      ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    } catch (_) {}

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1080,
        maxHeight: 1080,
      });

      if (result.didCancel) return;
      if (result.errorMessage) {
        Alert.alert('Image selection error', result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({
          uri: asset.uri,
          fileName: asset.fileName || 'haircut-reference.jpg',
          type: asset.type || 'image/jpeg',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open photo gallery.');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
  };

  const requestNow = async () => {
    if (invalidBarber) {
      Alert.alert('Invalid barber', 'Please go back and select a barber again.');
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Please sign in again to request a barber.');
      return;
    }

    setLoading(true);
    try {
      let uploadedPhotoUrl = null;
      if (selectedPhoto) {
        setUploadingPhoto(true);
        try {
          const uploadRes = await apiClient.uploadStylePhoto(token, selectedPhoto.uri, selectedPhoto.fileName);
          uploadedPhotoUrl = uploadRes?.photoUrl || null;
        } catch (uploadErr) {
          console.warn('Photo upload warning:', uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }

      const combinedNotes = [selectedPreset, notes.trim()].filter(Boolean).join(' • ');

      const bookingPayload = {
        barberId: resolvedBarberId,
        serviceId: null,
        bookingType: 'queue',
        referencePhoto: uploadedPhotoUrl,
        notes: combinedNotes || null,
      };

      const booking = await apiClient.createBooking(token, bookingPayload);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      const queuePosition = Number(booking.queue_position || waitingClients + 1);
      const clientsAhead = Math.max(queuePosition - 1, 0);

      navigation.navigate('TrackBarber', {
        barber,
        service,
        bookingId: booking.id,
        queuePosition,
        clientsAhead,
        verificationPin: booking.verification_pin,
        referencePhoto: booking.reference_photo || uploadedPhotoUrl,
        notes: booking.notes || combinedNotes,
      });
    } catch (error) {
      Alert.alert('Request failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (invalidBarber) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request unavailable</Text>
        <Text style={styles.info}>We could not load the selected barber details.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Request {barber.name}</Text>
      <Text style={styles.info}>Live booking dispatch with style reference & PIN security.</Text>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Before you confirm</Text>
        <Text style={styles.noticeText}>We will generate a 4-digit verification PIN and show live queue updates right after your request is placed.</Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Service</Text>
        <Text style={styles.optionValue}>{service}</Text>
      </View>

      {/* Haircut Style Presets */}
      <View style={styles.customCard}>
        <Text style={styles.customCardTitle}>✂️ Haircut Style Preset (Optional)</Text>
        <Text style={styles.customCardSubtitle}>Select a trending style to let your barber prepare:</Text>
        <View style={styles.presetChipsRow}>
          {STYLE_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => {
                  try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (_) {}
                  setSelectedPreset(isSelected ? '' : preset);
                }}
              >
                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Haircut Reference Photo Upload */}
      <View style={styles.customCard}>
        <Text style={styles.customCardTitle}>📸 Haircut Reference Photo (Optional)</Text>
        <Text style={styles.customCardSubtitle}>Show your barber the exact cut or taper look you want:</Text>
        {selectedPhoto ? (
          <View style={styles.photoPreviewCard}>
            <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
            <View style={styles.photoInfoWrap}>
              <Text style={styles.photoTitle}>Attached Photo</Text>
              <Text style={styles.photoSubtitle}>Ready for your barber</Text>
              <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
                <Text style={styles.removePhotoText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadPhotoButton} onPress={handlePickPhoto}>
            <Text style={styles.uploadPhotoIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadPhotoTitle}>Choose Photo from Gallery</Text>
              <Text style={styles.uploadPhotoSubtitle}>Attach style inspiration photo</Text>
            </View>
            <Text style={styles.uploadPhotoArrow}>➔</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Haircut Notes Input */}
      <View style={styles.customCard}>
        <Text style={styles.customCardTitle}>📝 Barber Notes & Instructions</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. Skin fade sides, keep length on top, crisp beard line..."
          placeholderTextColor="#94A3B8"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          maxLength={200}
        />
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Estimated Price</Text>
        <Text style={styles.optionValue}>$18 - $25</Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Current waiting list</Text>
        <Text style={styles.optionValue}>
          {queueLoading ? 'Checking the latest queue...' : `${waitingClients} client${waitingClients === 1 ? '' : 's'} waiting`}
        </Text>
      </View>

      <View style={[styles.optionCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1 }]}>
        <Text style={[styles.optionTitle, { color: '#166534' }]}>🗺️ Demand Radar Routing</Text>
        <Text style={[styles.optionValue, { color: '#15803D' }]}>Active Hotspot GPS Lock (1.2x Peak Demand)</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (loading || uploadingPhoto) && { opacity: 0.7 }]}
        onPress={requestNow}
        disabled={loading || uploadingPhoto}
      >
        {loading || uploadingPhoto ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>{uploadingPhoto ? 'Uploading style photo...' : 'Requesting...'}</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Request Now</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  scrollContainer: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { padding: spacing.lg, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal },
  info: { marginTop: spacing.xs, color: colors.steel, marginBottom: spacing.md },
  noticeCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  noticeTitle: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.steel,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionTitle: { color: colors.steel, fontSize: 13, marginBottom: spacing.xs },
  optionValue: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    opacity: 1,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  customCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  customCardTitle: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
  },
  customCardSubtitle: {
    color: colors.steel,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
    marginBottom: 8,
  },
  presetChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  presetChipText: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
  },
  uploadPhotoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  uploadPhotoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
  },
  uploadPhotoSubtitle: {
    fontSize: 12,
    color: colors.steel,
    marginTop: 2,
  },
  uploadPhotoArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.steel,
  },
  photoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  photoInfoWrap: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
  },
  photoSubtitle: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  removePhotoButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: colors.charcoal,
    minHeight: 56,
    textAlignVertical: 'top',
  },
});
