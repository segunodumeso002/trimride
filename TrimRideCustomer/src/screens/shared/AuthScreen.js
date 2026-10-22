import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import { colors, spacing } from '../../theme/tokens';
import Icon from 'react-native-vector-icons/Feather';
import CountryPicker from 'react-native-country-picker-modal';
import Country from 'country-state-city/lib/cjs/country';
import parsePhoneNumberFromString from 'libphonenumber-js/max';

const DEFAULT_COUNTRY_CODE = 'ZA';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { establishSession } = useAppMode();
  const selectedCountry = Country.getCountryByCode(countryCode);
  const callingCode = selectedCountry?.phonecode || '27';

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Missing fields', 'Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Missing fields', 'Phone number is required.');
        return;
      }
      const parsedPhone = parsePhoneNumberFromString(phone, countryCode);
      if (!parsedPhone?.isValid()) {
        Alert.alert(
          'Invalid phone number',
          `Enter a valid phone number for ${selectedCountry?.name || 'the selected country'}.`
        );
        return;
      }

      setLoading(true);
      try {
        const countryName = selectedCountry?.name || '';
        const payload = await apiClient.register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: parsedPhone.number,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateName.trim() || null,
          country: countryName,
          userType: 'customer',
        });

        await establishSession({
          token: payload.token,
          user: {
            ...payload.user,
            country: payload.user?.country || countryName,
            phone: payload.user?.phone || parsedPhone.number,
          },
          isFirstLogin: true,
        });
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const payload = await apiClient.login(email.trim(), password);
      await establishSession({
        token: payload.token,
        user: payload.user,
        isFirstLogin: true,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brandRow}>
          <Text style={styles.brand}>TRIMRIDE</Text>
          <Text style={styles.brandSub}>Customer</Text>
        </View>

        <Text style={styles.headline}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.sub}>
          {mode === 'login'
            ? 'Sign in to book your barber in seconds.'
            : 'Book a barber on demand, like calling a ride.'}
        </Text>

        {/* Signup-only fields */}
        {mode === 'signup' && (
          <>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. James"
              placeholderTextColor={colors.steel}
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mokoena"
              placeholderTextColor={colors.steel}
              value={lastName}
              onChangeText={setLastName}
            />
            <Text style={styles.label}>Address (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor={colors.steel}
              value={address}
              onChangeText={setAddress}
            />
            <View style={styles.locationRow}>
              <View style={styles.locationField}>
                <Text style={styles.label}>City (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={colors.steel}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.locationField}>
                <Text style={styles.label}>State / Province (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State or province"
                  placeholderTextColor={colors.steel}
                  value={stateName}
                  onChangeText={setStateName}
                />
              </View>
            </View>
            <Text style={styles.label}>Country</Text>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => setCountryPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Select country, currently ${selectedCountry?.name || 'South Africa'}`}
            >
              <Text style={styles.countryName}>
                {selectedCountry?.flag || ''}  {selectedCountry?.name || 'South Africa'}
              </Text>
              <Text style={styles.countryDialCode}>+{callingCode}  ›</Text>
            </TouchableOpacity>
            <CountryPicker
              countryCode={countryCode}
              visible={countryPickerVisible}
              withFilter
              withCallingCode
              withFlagButton={false}
              onSelect={selected => {
                setCountryCode(selected.cca2);
                setCountryPickerVisible(false);
              }}
              onClose={() => setCountryPickerVisible(false)}
            />
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneDialCode}>+{callingCode}</Text>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Local phone number"
                placeholderTextColor={colors.steel}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.steel}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
            placeholderTextColor={colors.steel}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Icon name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.steel} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          {mode === 'login' ? (
            <>
              <Text style={styles.switchLabel}>New to TrimRide? </Text>
              <TouchableOpacity onPress={() => setMode('signup')}>
                <Text style={styles.switchLink}>Create account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.switchLabel}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.switchLink}>Sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.xl },
  brand: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  headline: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  sub: {
    color: colors.steel,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.whisper,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 4,
  },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationField: { flex: 1 },
  countryButton: {
    minHeight: 56,
    backgroundColor: colors.whisper,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryName: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '600' },
  countryDialCode: { color: colors.success, fontSize: 15, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phoneDialCode: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    backgroundColor: colors.whisper,
  },
  phoneInput: { flex: 1 },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  switchLabel: { color: colors.steel, fontSize: 15 },
  switchLink: { color: colors.success, fontSize: 15, fontWeight: '700' },
});
