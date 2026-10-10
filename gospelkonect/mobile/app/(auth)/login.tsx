import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { ApiError, loginUser } from '../../lib/api';
import { saveSession } from '../../lib/session';

const OnboardingBackground = require('../../assets/images/GospelKonect Community Splash Screen.png');

/** Sign in against the NestJS backend, session persisted to secure storage. */
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (loading) return;
    setError(null);
    if (email.trim().length === 0 || password.length === 0) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const session = await loginUser(email, password);
      await saveSession(session.accessToken, session.refreshToken);
      router.replace('/home');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password.'
          : err instanceof Error
            ? err.message
            : 'Sign in failed. Try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key: string) => [
    styles.input,
    focused === key && styles.inputFocused,
  ];

  return (
    <ImageBackground
      source={OnboardingBackground}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      accessibilityLabel="GospelKonect community gathering"
    >
      <StatusBar
        backgroundColor={TokenColors.surfaceContainerHigh}
        barStyle="dark-content"
        translucent={false}
      />
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Pressable
              onPress={() => router.replace('/onboarding')}
              accessibilityRole="button"
              accessibilityLabel="Back to onboarding"
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={styles.backLabel}>‹ Back</Text>
            </Pressable>

            <View style={{ height: 16 }} />

            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.sub}>Sign in to continue</Text>
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={AppColors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                accessibilityLabel="Email"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={inputStyle('email')}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={AppColors.placeholder}
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={signIn}
                accessibilityLabel="Password"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                style={inputStyle('password')}
              />

              <View style={{ height: 20 }} />
              <Pressable
                onPress={signIn}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityState={{ disabled: loading, busy: loading }}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.createBtn,
                  pressed && !loading && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.createLabel}>{loading ? 'Signing In…' : 'Sign In'}</Text>
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <View style={styles.socialRow}>
                <Pressable
                  onPress={() => setError('Google sign-in is not available yet.')}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  hitSlop={4}
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.socialG}>G</Text>
                </Pressable>
                <Pressable
                  onPress={() => setError('Apple sign-in is not available yet.')}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  hitSlop={4}
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.socialApple}>{'\uF8FF'}</Text>
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don&apos;t have an account?</Text>
                <Pressable
                  onPress={() => router.push('/register')}
                  accessibilityRole="button"
                  accessibilityLabel="Go to create account"
                  hitSlop={8}
                >
                  <Text style={styles.link}>Create Account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  backgroundImage: { width: '100%', height: '100%' },
  root: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },
  back: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  backLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.onSurfaceVariant,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  error: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    lineHeight: TypeScale.bodySm.lineHeight,
    color: TokenColors.error,
    backgroundColor: TokenColors.errorContainer,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    ...Shadows.card,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: '800',
    color: TokenColors.onSurface,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.onSurface,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceAlabaster,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: AppColors.neutralDark,
  },
  inputFocused: {
    borderColor: TokenColors.primary,
    borderWidth: 2,
    backgroundColor: TokenColors.surfaceContainerLowest,
  },
  createBtn: {
    height: 52,
    minHeight: 48,
    borderRadius: 9999,
    backgroundColor: TokenColors.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  createLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelLg.fontSize,
    lineHeight: TypeScale.labelLg.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: TokenColors.onPrimary,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: TokenColors.outlineVariant },
  orText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.outline,
    marginHorizontal: 12,
  },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: TokenColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialG: { fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', color: TokenColors.onSurface },
  socialApple: { fontSize: 24, fontWeight: '600', color: TokenColors.onSurface },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  switchText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurfaceVariant,
  },
  link: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.bodyMd.fontSize,
    fontWeight: '600',
    color: TokenColors.primary,
    textDecorationLine: 'underline',
    padding: 8,
  },
});
