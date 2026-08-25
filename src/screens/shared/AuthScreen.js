import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { apiClient } from '../../services/apiClient';
import { useAppMode } from '../../context/AppModeContext';
import { colors, spacing } from '../../theme/tokens';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { establishSession } = useAppMode();

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
    }

    setLoading(true);
    try {
      const payload =
        mode === 'login'
          ? await apiClient.login(email.trim(), password)
          : await apiClient.register({
              email: email.trim(),
              password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              userType: 'barber',
            });

      await establishSession({ token: payload.token, user: payload.user });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
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
              placeholderTextColor="#5a5a5a"
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dlamini"
              placeholderTextColor="#5a5a5a"
              value={lastName}
              onChangeText={setLastName}
            />
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="+27 71 234 5678"
              placeholderTextColor="#5a5a5a"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </>
        )}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#5a5a5a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
          placeholderTextColor="#5a5a5a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.xl },
  brand: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSub: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    marginBottom: 2,
    letterSpacing: 1,
  },
  headline: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sub: {
    color: '#777',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnText: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchLabel: { color: '#666', fontSize: 14 },
  switchLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
