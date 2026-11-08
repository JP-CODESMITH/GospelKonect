import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { notifications as seed, type AppNotification } from '../data/mock'
import { NotificationRow } from '../components/cards'
import { Button, EmptyState, Tabs, useToast } from '../components/ui'

export const Route = createFileRoute('/_app/notifications')({
  component: NotificationsPage,
})

type AlertTab = 'all' | 'unread'

function NotificationsPage() {
  const { push } = useToast()
  const [items, setItems] = useState<AppNotification[]>(seed)
  const [tab, setTab] = useState<AlertTab>('all')
  const unread = items.filter((item) => item.unread).length
  const visible = tab === 'unread' ? items.filter((item) => item.unread) : items

  function markRead(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, unread: false } : item)))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">
            Notifications
          </h1>
          <p className="mt-0.5 font-body text-[13px] text-text-muted">
            {unread > 0 ? `${unread} new since your last visit` : 'You are all caught up'}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            size="sm"
            variant="soft"
            leftIcon={<CheckCheck size={15} aria-hidden="true" />}
            onClick={() => {
              setItems((prev) => prev.map((item) => ({ ...item, unread: false })))
              push('All notifications marked as read', 'success')
            }}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <Tabs
        options={[
          { value: 'all', label: 'All', count: items.length },
          { value: 'unread', label: 'Unread', count: unread },
        ]}
        value={tab}
        onChange={setTab}
        label="Notification filters"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell size={38} aria-hidden="true" />}
          title="No unread notifications"
          description="New follows, comments, prayers and event reminders will show up here."
          action={
            <Button variant="secondary" onClick={() => setTab('all')}>
              View all
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {visible.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => markRead(notification.id)}
              className="block w-full cursor-pointer border-b border-border text-left last:border-0"
            >
              <NotificationRow notification={notification} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
