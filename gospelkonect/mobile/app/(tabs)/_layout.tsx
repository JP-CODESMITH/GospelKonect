import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { AppColors, Radii, Shadows, TokenColors } from '../../constants/theme';


type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, outline: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? name : outline} size={24} color={color} />
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
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: TokenColors.primary,
        tabBarInactiveTintColor: AppColors.neutralMuted,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.glass}
          />
        ),
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
    left: '10%',
    right: '10%',
    marginLeft: '10%',
    bottom: 24,
    height: 61,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: Radii.hero,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 12,
    ...Shadows.sheet,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 44,
  },
  glass: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: Radii.hero,
    backgroundColor: AppColors.tabBarGlass,
  },
});
