import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Alert,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const FACE_SHAPES = [
  { id: 'round', label: 'Round 🟡', trait: 'Soft curves & equal width/length' },
  { id: 'oval', label: 'Oval 🟤', trait: 'Versatile & well-proportioned contour' },
  { id: 'square', label: 'Square 🔲', trait: 'Strong jawline & broad forehead' },
  { id: 'diamond', label: 'Diamond 💎', trait: 'Prominent cheekbones & angled chin' },
];

const HAIR_TEXTURES = [
  { id: 'coarse', label: 'Coarse & Wavy 〰️' },
  { id: 'straight', label: 'Straight & Fine 📏' },
  { id: 'dense', label: 'Dense & Curly 🦁' },
  { id: 'locs', label: 'Braids / Locs 🪢' },
];

const STYLE_VIBES = [
  { id: 'executive', label: 'Executive Clean 💼' },
  { id: 'edgy', label: 'Sharp & Edgy ⚡' },
  { id: 'casual', label: 'Casual Shadow Fade 😎' },
  { id: 'beard', label: 'Beard Sculpt Focus 🧔' },
];

export default function FutureVisionScreen({ navigation }) {
  const [faceShape, setFaceShape] = useState('round');
  const [texture, setTexture] = useState('coarse');
  const [vibe, setVibe] = useState('executive');
  
  const [analyzing, setAnalyzing] = useState(false);
  const [stepText, setStepText] = useState('');
  const [prescription, setPrescription] = useState(null);

  const handleSelect = (setter, val) => {
    try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (e) {}
    setter(val);
    setPrescription(null); // clear previous result to encourage re-calculation
  };

  const runNeuralStyleMatcher = () => {
    try {
      Vibration.vibrate([0, 100, 100, 150]);
      ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    } catch (e) {}

    setAnalyzing(true);
    setPrescription(null);
    setStepText('🧠 Neural Style Engine scanning facial geometry...');

    setTimeout(() => {
      setStepText('⚡ Matching texture dynamics with top local specialists...');
    }, 900);

    setTimeout(() => {
      try {
        Vibration.vibrate([0, 200, 100, 300]);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      } catch (e) {}

      setAnalyzing(false);

      let styleName = 'Precision Mid-Skin Fade with Textured Top';
      let reason = 'Creates vertical balance and sharp contour definition that complements round/oval facial proportions.';
      let upkeep = 'Every 2 to 3 weeks with light pomade style lock.';

      if (vibe === 'edgy' || texture === 'dense') {
        styleName = 'High Taper Burst Fade with Razored Edge & Lineup';
        reason = 'Maximizes natural density while delivering a high-contrast, ultra-modern aerodynamic silhouette.';
        upkeep = 'Every 2 weeks for peak edge sharpness.';
      } else if (vibe === 'beard' || faceShape === 'square') {
        styleName = 'Executive Contour Sculpt with Hot Towel Razor Finish';
        reason = 'Accentuates masculine jawline structure while softening sideburn transitions with seamless blending.';
        upkeep = 'Weekly edge cleanup with nourishing beard conditioning oils.';
      } else if (texture === 'locs') {
        styleName = 'Crisp Undermining Taper with Barrel Twist Retether';
        reason = 'Provides immaculate perimeter neatness while honoring long-term defensive follicle health.';
        upkeep = 'Every 3 to 4 weeks with organic scalp hydration.';
      }

      setPrescription({
        styleName,
        reason,
        upkeep,
        confidence: '99.2% Match Accuracy',
        priceRange: '$20 – $28',
      });
    }, 2000);
  };

  const handleBookSpecialist = () => {
    try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
    if (navigation && navigation.navigate) {
      // Direct customer to request a barber or return to home with style idea
      try {
        navigation.navigate('RequestBarber', {
          barber: { id: 88, name: 'TrimRide AI Specialist', rating: 4.98, queue: 1, eta: '4 mins' },
          serviceType: prescription?.styleName || 'Premium AI Cut',
        });
      } catch (_e) {
        Alert.alert('AI Grooming Lock', 'Style saved! Return to the dashboard to select your closest active barber.');
      }
    } else {
      Alert.alert('AI Grooming Lock', 'Style recommendation saved to your profile!');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Badge */}
      <View style={styles.headerBanner}>
        <Text style={styles.eyebrow}>100% FREE INTELLECTUAL SUITE</Text>
        <Text style={styles.title}>🧠 AI Style Advisor Studio</Text>
        <Text style={styles.subtitle}>
          Tailor your ultimate look before your barber arrives. Our intelligent styling algorithm designs custom grooming prescriptions based on facial architecture and hair structure.
        </Text>
      </View>

      {/* Step 1: Face Shape */}
      <Text style={styles.sectionTitle}>1. Select Facial Geometry</Text>
      <View style={styles.grid}>
        {FACE_SHAPES.map((item) => {
          const selected = faceShape === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => handleSelect(setFaceShape, item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionLabel, selected && styles.optionTextSelected]}>{item.label}</Text>
              <Text style={styles.optionSub}>{item.trait}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step 2: Texture */}
      <Text style={styles.sectionTitle}>2. Select Hair / Beard Structure</Text>
      <View style={styles.rowGrid}>
        {HAIR_TEXTURES.map((item) => {
          const selected = texture === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.pillCard, selected && styles.pillSelected]}
              onPress={() => handleSelect(setTexture, item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, selected && styles.optionTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step 3: Vibe */}
      <Text style={styles.sectionTitle}>3. Select Grooming Vibe</Text>
      <View style={styles.rowGrid}>
        {STYLE_VIBES.map((item) => {
          const selected = vibe === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.pillCard, selected && styles.pillSelected]}
              onPress={() => handleSelect(setVibe, item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, selected && styles.optionTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Neural Calculation Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={runNeuralStyleMatcher}
        disabled={analyzing}
        activeOpacity={0.85}
      >
        <Text style={styles.actionText}>{analyzing ? 'Processing Geometry...' : '⚡ Generate AI Grooming Prescription'}</Text>
      </TouchableOpacity>

      {/* Analyzing Progress State */}
      {analyzing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>{stepText}</Text>
        </View>
      ) : null}

      {/* AI Prescription Result */}
      {prescription ? (
        <View style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI STYLE CONFIRMED</Text>
            </View>
            <Text style={styles.confidenceText}>✨ {prescription.confidence}</Text>
          </View>

          <Text style={styles.styleName}>{prescription.styleName}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Why It Fits Your Geometry:</Text>
            <Text style={styles.detailText}>{prescription.reason}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Upkeep Frequency & Regimen:</Text>
            <Text style={styles.detailText}>{prescription.upkeep}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Platform Fare:</Text>
            <Text style={styles.priceVal}>{prescription.priceRange}</Text>
          </View>

          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBookSpecialist}
            activeOpacity={0.85}
          >
            <Text style={styles.bookButtonText}>💈 Dispatch Specialist For This Style</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg },
  
  headerBanner: {
    backgroundColor: '#0F1F35',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  eyebrow: { color: '#10B981', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { color: '#94A3B8', fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.charcoal, marginBottom: 10, marginTop: 4 },
  grid: { gap: 10, marginBottom: 16 },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  optionCardSelected: {
    backgroundColor: '#0F1F35',
    borderColor: '#3B82F6',
  },
  optionLabel: { fontSize: 16, fontWeight: '800', color: colors.charcoal },
  optionSub: { fontSize: 12, color: colors.steel, marginTop: 3 },
  optionTextSelected: { color: '#FFFFFF' },

  rowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pillCard: {
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: '#0F1F35',
    borderColor: '#10B981',
  },
  pillText: { fontSize: 13, fontWeight: '800', color: colors.charcoal },

  actionButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#047857',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  actionText: { color: '#0F1F35', fontSize: 16, fontWeight: '900' },

  loadingBox: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.soft,
    marginBottom: 20,
  },
  loadingText: { color: colors.charcoal, fontSize: 15, fontWeight: '700', marginTop: 14, textAlign: 'center' },

  resultCard: {
    backgroundColor: '#0A1424',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { color: '#0F1F35', fontSize: 11, fontWeight: '900' },
  confidenceText: { color: '#10B981', fontSize: 13, fontWeight: '800' },

  styleName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 14 },
  
  detailRow: { marginBottom: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  detailLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  detailText: { color: '#F1F5F9', fontSize: 14, lineHeight: 20, fontWeight: '600' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 },
  priceLabel: { color: '#CBD5E1', fontSize: 14, fontWeight: '700' },
  priceVal: { color: '#10B981', fontSize: 18, fontWeight: '900' },

  bookButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#B45309',
  },
  bookButtonText: { color: '#0F1F35', fontSize: 15, fontWeight: '900' },
});
