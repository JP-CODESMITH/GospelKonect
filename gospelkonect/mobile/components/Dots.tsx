import { StyleSheet, View } from 'react-native';
import { TokenColors } from '../constants/theme';

/** Onboarding page dots — active 22x8 pill, inactive 8x8. */
export function Dots({ activeIndex, total = 3 }: { activeIndex: number; total?: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="adjustable" accessibilityLabel={`Page ${activeIndex + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex ? styles.active : styles.inactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 9999, marginHorizontal: 4 },
  active: { width: 22, backgroundColor: TokenColors.primary },
  inactive: { width: 8, backgroundColor: TokenColors.surfaceContainerHighest },
});
