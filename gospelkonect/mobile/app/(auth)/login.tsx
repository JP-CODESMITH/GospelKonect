import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { AppColors, Fonts, TokenColors, TypeScale } from '../constants/theme';

/** Sign in — mock nav to /home, parity with Flutter login_screen. */
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={AppColors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          accessibilityLabel="Email"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={AppColors.placeholder}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={signIn}
          accessibilityLabel="Password"
          style={styles.input}
        />

        <View style={{ height: 24 }} />
        <PillButton label="Sign In" onPress={signIn} />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  body: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 24 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: TypeScale.headlineLg.weight,
    color: TokenColors.onSurface,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: AppColors.neutralMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceAlabaster,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: AppColors.neutralDark,
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  switchText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurface,
  },
  link: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.bodyMd.fontSize,
    fontWeight: '600',
    color: AppColors.royalCerulean,
    padding: 8,
  },
});
