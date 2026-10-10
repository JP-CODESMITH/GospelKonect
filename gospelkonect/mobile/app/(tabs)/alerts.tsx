import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';

// Placeholder alerts — static mock data, no backend wiring yet.
const ALERTS = [
  { id: '1', text: 'Grace M. liked your testimony.', time: '10m ago', unread: true },
  { id: '2', text: 'Prayer Chain starts in 1 hour.', time: '1h ago', unread: true },
  { id: '3', text: 'David O. mentioned you in Worship Musicians.', time: '3h ago', unread: false },
  { id: '4', text: 'Welcome to GospelKonect! Complete your profile.', time: '1d ago', unread: false },
];

export default function Alerts() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.sub}>What you missed</Text>
        {ALERTS.map((alert) => (
          <View key={alert.id} style={styles.card}>
            <View style={styles.row}>
              {alert.unread && <View style={styles.dot} />}
              <View style={styles.info}>
                <Text style={styles.text}>{alert.text}</Text>
                <Text style={styles.time}>{alert.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: '800',
    color: TokenColors.onSurface,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TokenColors.primary, marginRight: 12 },
  info: { flex: 1 },
  text: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  time: { fontFamily: Fonts.body, fontSize: 12, color: TokenColors.outline, marginTop: 4 },
});
