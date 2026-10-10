import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { AppColors, Fonts, TokenColors, TypeScale } from '../constants/theme';

/** Create account — mock nav to /home, parity with Flutter registration_screen. */
export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const createAccount = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.title}>Join GospelKonect</Text>
        <Text style={styles.sub}>Create your account to get started</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={AppColors.placeholder}
          returnKeyType="next"
          accessibilityLabel="Full name"
          style={styles.input}
        />
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
          onSubmitEditing={createAccount}
          accessibilityLabel="Password"
          style={styles.input}
        />

        <View style={{ height: 24 }} />
        <PillButton label="Create Account" onPress={createAccount} />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account?</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            hitSlop={8}
          >
            <Text style={styles.link}>Sign In</Text>
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
