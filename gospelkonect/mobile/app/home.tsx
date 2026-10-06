import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, TokenColors, TypeScale } from '../constants/theme';

/** Home placeholder — parity with Flutter empty MyHomePage. Feed comes in v2. */
export default function Home() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title}>GospelKonect</Text>
        <Text style={styles.sub}>Home feed lands here in v2.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineMd.fontSize,
    fontWeight: TypeScale.headlineMd.weight,
    color: TokenColors.onSurface,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: AppColors.neutralMuted,
    marginTop: 8,
  },
});
