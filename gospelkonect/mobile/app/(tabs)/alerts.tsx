import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { listNotifications, markNotificationsRead, mediaUrl } from '../../lib/api';
import { errorText, initials, timeAgo } from '../../lib/format';
import type { Notification } from '../../lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

function describe(notification: Notification): string {
  const actor = notification.actor.name;
  switch (notification.type) {
    case 'NEW_FOLLOWER':
      return `${actor} started following you.`;
    case 'COMMENT':
      return `${actor} commented on your post.`;
    case 'REPLY':
      return `${actor} replied to your comment.`;
    case 'MENTION':
      return `${actor} mentioned you.`;
    case 'REACTION':
      return `${actor} reacted to your post.`;
    default:
      return `${actor} interacted with you.`;
  }
}

function iconFor(type: Notification['type']): IconName {
  switch (type) {
    case 'NEW_FOLLOWER':
      return 'person-add-outline';
    case 'COMMENT':
      return 'chatbubble-outline';
    case 'REPLY':
      return 'return-down-forward-outline';
    case 'MENTION':
      return 'at-outline';
    case 'REACTION':
      return 'heart-outline';
    default:
      return 'notifications-outline';
  }
}

export default function Alerts() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const page = await listNotifications({ limit: 50 });
      setNotifications(page.items);
    } catch (err) {
      setError(errorText(err, 'Could not load your alerts.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = notifications.filter((item) => !item.readAt);

  const markAll = async () => {
    if (marking || unread.length === 0) return;
    setMarking(true);
    try {
      await markNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
      );
    } catch (err) {
      setError(errorText(err, 'Could not mark your alerts as read.'));
    } finally {
      setMarking(false);
    }
  };

  const markOne = async (notification: Notification) => {
    if (notification.readAt) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)),
    );
    try {
      await markNotificationsRead([notification.id]);
    } catch {
      // Leave it visually read; the next load will reconcile.
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={TokenColors.primary}
          />
        }
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>Alerts</Text>
            <Text style={styles.sub}>
              {unread.length > 0 ? `${unread.length} unread` : 'What you missed'}
            </Text>
          </View>
          {unread.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all alerts as read"
              accessibilityState={{ disabled: marking, busy: marking }}
              disabled={marking}
              hitSlop={8}
              onPress={() => void markAll()}
              style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
            >
              <Text style={styles.markAllLabel}>{marking ? 'Marking…' : 'Mark all read'}</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading alerts"
            onPress={() => void load()}
            style={styles.errorBanner}
          >
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading && notifications.length === 0 ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={TokenColors.primary} />
            <Text style={styles.stateText}>Loading your alerts…</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="notifications-outline" size={28} color={TokenColors.outline} />
            <Text style={styles.stateTitle}>No alerts yet</Text>
            <Text style={styles.stateText}>
              Follows, comments and mentions will show up here.
            </Text>
          </View>
        ) : (
          notifications.map((alert) => (
            <Pressable
              key={alert.id}
              onPress={() => void markOne(alert)}
              accessibilityRole="button"
              accessibilityLabel={`${describe(alert)}. ${alert.readAt ? 'Read' : 'Unread'}.`}
              accessibilityState={{ selected: !alert.readAt }}
              style={({ pressed }) => [
                styles.card,
                !alert.readAt && styles.cardUnread,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.row}>
                {alert.actor.avatar ? (
                  <Image
                    source={{ uri: mediaUrl(alert.actor.avatar) }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(alert.actor.name)}</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.text}>{describe(alert)}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name={iconFor(alert.type)}
                      size={13}
                      color={TokenColors.outline}
                    />
                    <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
                    {!alert.readAt ? <View style={styles.dot} /> : null}
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  titleCol: { flex: 1 },
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
  markAll: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 4,
  },
  markAllLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.primary,
  },
  pressed: { opacity: 0.85 },
  errorBanner: {
    backgroundColor: TokenColors.errorContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.error,
    textAlign: 'center',
  },
  stateBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  stateTitle: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineSm.fontSize,
    fontWeight: '700',
    color: TokenColors.onSurface,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    lineHeight: TypeScale.bodySm.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
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
  cardUnread: { borderColor: TokenColors.primaryFixedDim },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TokenColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: TokenColors.surfaceContainer,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: TokenColors.onPrimary,
  },
  info: { flex: 1 },
  text: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  time: { fontFamily: Fonts.body, fontSize: 12, color: TokenColors.outline },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TokenColors.primary, marginLeft: 4 },
});
