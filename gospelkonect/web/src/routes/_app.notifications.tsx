import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AtSign, Bell, CornerDownRight, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { Avatar } from '../components/app-shell'
import { listNotifications, markNotificationsRead } from '../lib/api'
import { errorText, timeAgo } from '../lib/format'
import type { Notification } from '../lib/types'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/notifications')({
  component: NotificationsPage,
})

function describe(notification: Notification): string {
  const actor = notification.actor.name
  switch (notification.type) {
    case 'NEW_FOLLOWER':
      return `${actor} started following you.`
    case 'COMMENT':
      return `${actor} commented on your post.`
    case 'REPLY':
      return `${actor} replied to your comment.`
    case 'MENTION':
      return `${actor} mentioned you.`
    case 'REACTION':
      return `${actor} reacted to your post.`
    default:
      return `${actor} interacted with you.`
  }
}

function iconFor(type: Notification['type']) {
  switch (type) {
    case 'NEW_FOLLOWER':
      return UserPlus
    case 'COMMENT':
      return MessageCircle
    case 'REPLY':
      return CornerDownRight
    case 'MENTION':
      return AtSign
    case 'REACTION':
      return Heart
    default:
      return Bell
  }
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await listNotifications({ limit: 50 })
      setNotifications(page.items)
    } catch (err) {
      setError(errorText(err, 'Could not load your alerts.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const unread = notifications.filter((item) => !item.readAt)

  async function markAll() {
    if (marking || unread.length === 0) return
    setMarking(true)
    try {
      await markNotificationsRead()
      const now = new Date().toISOString()
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
      )
    } catch (err) {
      setError(errorText(err, 'Could not mark your alerts as read.'))
    } finally {
      setMarking(false)
    }
  }

  async function markOne(notification: Notification) {
    if (notification.readAt) return
    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)),
    )
    try {
      await markNotificationsRead([notification.id])
    } catch {
      // Leave it visually read; the next load will reconcile.
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Alerts</h1>
          <p className="mt-1 font-body text-[14px] text-muted">
            {unread.length > 0 ? `${unread.length} unread` : 'What you missed'}
          </p>
        </div>
        {unread.length > 0 ? (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={marking}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line bg-surface-lowest px-4 font-display text-[13px] font-semibold text-cerulean transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60"
          >
            {marking ? 'Marking…' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {error ? (
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 w-full cursor-pointer rounded-xl bg-error-container px-3 py-2.5 text-center font-body text-[13px] text-error"
          role="alert"
        >
          {error} Tap to retry.
        </button>
      ) : null}

      {loading && notifications.length === 0 ? (
        <p className="py-16 text-center font-body text-[14px] text-muted">Loading your alerts…</p>
      ) : notifications.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-line bg-surface-lowest px-6 py-16 text-center shadow-card">
          <Bell size={28} className="text-outline" aria-hidden="true" />
          <p className="font-display text-lg font-bold text-ink">No alerts yet</p>
          <p className="font-body text-[14px] text-muted">
            Follows, comments and mentions will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {notifications.map((alert) => {
            const Icon = iconFor(alert.type)
            return (
              <li
                key={alert.id}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border bg-surface-lowest p-3.5 text-left shadow-card',
                  alert.readAt ? 'border-line' : 'border-cerulean/40',
                )}
              >
                <Link
                  to="/u/$username"
                  params={{ username: alert.actor.username }}
                  aria-label={`View ${alert.actor.name}'s profile`}
                >
                  <Avatar name={alert.actor.name} avatar={alert.actor.avatar} size={40} />
                </Link>
                <button
                  type="button"
                  onClick={() => void markOne(alert)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  aria-label={`${describe(alert)}. ${alert.readAt ? 'Read' : 'Unread'}.`}
                >
                  <span className="block font-body text-[14px] leading-6 text-ink">
                    {describe(alert)}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 font-body text-[12px] text-outline">
                    <Icon size={13} aria-hidden="true" />
                    {timeAgo(alert.createdAt)}
                    {!alert.readAt ? (
                      <span
                        className="ml-1 inline-block h-2 w-2 rounded-full bg-cerulean"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
