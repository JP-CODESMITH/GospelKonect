import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { StyleSheet,type ColorValue } from 'react-native';
import { AppColors, Shadows, TokenColors } from '../../constants/theme';


type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, outline: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? name : outline} size={size} color={color} />
  );
}

/**
 * Main tabs — feeds, communities, alerts, profile.
 * Floating glass card bar: icon-only items over a blurred translucent card.
 * Screens are placeholders; no backend wiring yet.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: TokenColors.primary,
        tabBarInactiveTintColor: "black",
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarBackground: () => <BlurView intensity={90} style={styles.glass} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Feeds', tabBarIcon: icon('newspaper', 'newspaper-outline') }}
      />
      <Tabs.Screen
        name="communities"
        options={{ title: 'Communities', tabBarIcon: icon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: icon('notifications', 'notifications-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    width: '80%',
    marginLeft:'10%',
    overflow: 'hidden',
    left: 20,
    right: 20,
    bottom: 30,
    borderRadius: 28,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    ...Shadows.sheet,
  },
  item: { padding: 4 },
  glass: {
    // borderRadius: 28,
    overflow: 'hidden',
    // backgroundColor: 'rgba(249,249,255,0.85)',
  },
});
