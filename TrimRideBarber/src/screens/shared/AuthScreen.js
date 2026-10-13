import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar, PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import { colors, spacing } from '../../theme/tokens';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import MapView, { Marker } from 'react-native-maps';
import CountryPicker from 'react-native-country-picker-modal';
import Country from 'country-state-city/lib/country';
import parsePhoneNumberFromString from 'libphonenumber-js/max';

const DEFAULT_COUNTRY_CODE = 'ZA';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [latitude, setLatitude] = useState(-26.2041);
  const [longitude, setLongitude] = useState(28.0473);
  const [profileImage, setProfileImage] = useState(null);
  const [shopImage, setShopImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { establishSession } = useAppMode();
  const selectedCountry = Country.getCountryByCode(countryCode);
  const callingCode = selectedCountry?.phonecode || '27';

  const pickProfileImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0]);
    }
  };

  const pickShopImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setShopImage(result.assets[0]);
    }
  };

  const locateMe = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission denied', 'Location permission is required to find your location.');
        return;
      }
    }
    Geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      (error) => Alert.alert('Error', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    let normalizedPhone;
    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim() || !address.trim() || !city.trim() || !stateName.trim()) {
        Alert.alert('Missing fields', 'Please enter all required fields.');
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
      normalizedPhone = parsedPhone.number;
    }

    setLoading(true);
    try {
      let payload;
      if (mode === 'login') {
        payload = await apiClient.login(email.trim(), password);
      } else {
        const formData = new FormData();
        formData.append('email', email.trim());
        formData.append('password', password);
        formData.append('firstName', firstName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('phone', normalizedPhone);
        formData.append('userType', 'barber');
        formData.append('address', address.trim());
        formData.append('city', city.trim());
        formData.append('state', stateName.trim());
        formData.append('country', selectedCountry?.name || '');
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
        if (profileImage) {
          formData.append('profile_image', {
            uri: profileImage.uri,
            type: profileImage.type,
            name: profileImage.fileName || 'profile.jpg',
          });
        }
        if (shopImage) {
          formData.append('shop_image', {
            uri: shopImage.uri,
            type: shopImage.type,
            name: shopImage.fileName || 'shop.jpg',
          });
        }
        payload = await apiClient.register(formData);
      }

      await establishSession({ token: payload.token, user: payload.user });
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
          <Text style={styles.brandSub}>Barber</Text>
        </View>

        <Text style={styles.headline}>
          {mode === 'login' ? 'Welcome back' : 'Join TrimRide'}
        </Text>
        <Text style={styles.sub}>
          {mode === 'login'
            ? 'Sign in to manage your queue and grow your business.'
            : 'Set up your barber profile and start taking bookings.'}
        </Text>

        {/* Signup-only fields */}
        {mode === 'signup' && (
          <>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mike"
              placeholderTextColor={colors.steel}
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dlamini"
              placeholderTextColor={colors.steel}
              value={lastName}
              onChangeText={setLastName}
            />
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
                const nextCountry = Country.getCountryByCode(selected.cca2);
                setCountryCode(selected.cca2);
                setCountryPickerVisible(false);
                const nextLatitude = Number(nextCountry?.latitude);
                const nextLongitude = Number(nextCountry?.longitude);
                if (Number.isFinite(nextLatitude) && Number.isFinite(nextLongitude)) {
                  setLatitude(nextLatitude);
                  setLongitude(nextLongitude);
                }
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
            
            <Text style={styles.label}>Shop Address</Text>
            <TextInput style={styles.input} placeholder="123 Main St" placeholderTextColor={colors.steel} value={address} onChangeText={setAddress} />
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} placeholder="Johannesburg" placeholderTextColor={colors.steel} value={city} onChangeText={setCity} />
              </View>
              <View style={{flex: 1, paddingLeft: 10}}>
                <Text style={styles.label}>State/Province</Text>
                <TextInput style={styles.input} placeholder="Gauteng" placeholderTextColor={colors.steel} value={stateName} onChangeText={setStateName} />
              </View>
            </View>
            <View style={styles.locationHeader}>
              <Text style={styles.label}>Shop Location (Pin on map)</Text>
              <TouchableOpacity onPress={locateMe} style={styles.locateBtn}>
                <Icon name="map-pin" size={14} color={colors.success} />
                <Text style={styles.locateBtnText}>Locate Me</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                region={{
                  latitude: latitude,
                  longitude: longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                onPress={(e) => {
                  setLatitude(e.nativeEvent.coordinate.latitude);
                  setLongitude(e.nativeEvent.coordinate.longitude);
                }}
              >
                <Marker
                  coordinate={{ latitude, longitude }}
                  draggable
                  onDragEnd={(e) => {
                    setLatitude(e.nativeEvent.coordinate.latitude);
                    setLongitude(e.nativeEvent.coordinate.longitude);
                  }}
                />
              </MapView>
            </View>

            <Text style={styles.label}>Profile Picture</Text>
            <TouchableOpacity style={styles.imageBtn} onPress={pickProfileImage}>
              <Text style={styles.imageBtnText}>{profileImage ? '✓ Image Selected' : 'Choose Profile Picture'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Shop Picture (Front)</Text>
            <TouchableOpacity style={styles.imageBtn} onPress={pickShopImage}>
              <Text style={styles.imageBtnText}>{shopImage ? '✓ Image Selected' : 'Choose Shop Picture'}</Text>
            </TouchableOpacity>
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
              <Text style={styles.switchLabel}>New barber? </Text>
              <TouchableOpacity onPress={() => setMode('signup')}>
                <Text style={styles.switchLink}>Create account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.switchLabel}>Already registered? </Text>
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
  imageBtn: {
    backgroundColor: colors.whisper,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  imageBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
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
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
