import { useState, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { events, formatCount, formatFullDate } from '../data/mock'
import {
  Artwork,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  EmptyState,
  IconButton,
  useToast,
} from '../components/ui'

export const Route = createFileRoute('/_app/events_/$id')({
  component: EventDetailPage,
})

const ATTENDEES = [
  { name: 'Chiamaka O.', gradient: ['#4B2E83', '#D9A441'] as [string, string] },
  { name: 'Emeka N.', gradient: ['#2F6FB3', '#4B2E83'] as [string, string] },
  { name: 'Aisha B.', gradient: ['#2E8B57', '#D9A441'] as [string, string] },
  { name: 'Tunde A.', gradient: ['#C8412F', '#D9A441'] as [string, string] },
  { name: 'Blessing E.', gradient: ['#7B4FC4', '#2F6FB3'] as [string, string] },
]

function EventDetailPage() {
  const { id } = Route.useParams()
  const { push } = useToast()
  const event = events.find((item) => item.id === id)
  const [going, setGoing] = useState(event?.going ?? false)

  if (!event) {
    return (
      <EmptyState
        title="Event not found"
        description="This gathering may have ended or moved."
        action={
          <Link
            to="/events"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-body text-[14px] font-semibold text-on-primary"
          >
            Browse events
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <div className="relative -mx-4 -mt-4 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-lg">
        <Artwork gradient={event.gradient} className="h-56 w-full sm:h-64" icon={<CalendarDays size={48} />} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
        <div className="absolute left-3 top-3">
          <IconButton label="Go back" variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="absolute right-3 top-3">
          <IconButton label="Share event" variant="ghost" onClick={() => push('Event link copied', 'success')}>
            <Share2 size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <Badge tone="accent">{event.price}</Badge>
          <h1 className="mt-2 font-display text-[24px] font-bold leading-7">{event.title}</h1>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-card">
          <Avatar name={event.church} gradient={event.gradient} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-[14px] font-semibold text-text">{event.church}</p>
            <p className="truncate font-body text-[12px] text-text-muted">Organiser</p>
          </div>
          <FollowButton name={event.church} />
        </div>

        <section>
          <h2 className="font-display text-[18px] font-semibold text-text">About</h2>
          <p className="mt-1.5 font-body text-[14px] leading-[22px] text-text-muted">{event.description}</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={<CalendarDays size={16} aria-hidden="true" />} label="Date" value={formatFullDate(event.date)} />
          <InfoCard icon={<Clock size={16} aria-hidden="true" />} label="Time" value={event.time} />
          <InfoCard icon={<MapPin size={16} aria-hidden="true" />} label="Venue" value={event.venue} />
          <InfoCard icon={<Users size={16} aria-hidden="true" />} label="Going" value={`${formatCount(event.attendees)} people`} />
        </div>

        <div className="relative h-40 overflow-hidden rounded-lg border border-border bg-surface-2">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 30%, var(--primary-soft), transparent 60%), radial-gradient(circle at 70% 70%, var(--accent-soft), transparent 60%)',
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
            <MapPin size={28} aria-hidden="true" />
            <span className="mt-1 px-4 text-center font-body text-[12px] font-semibold">
              {event.venue}, {event.city}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AvatarStack people={ATTENDEES} size={28} max={5} />
          <span className="font-body text-[12px] text-text-muted">
            {formatCount(event.attendees)} people are going
          </span>
        </div>
      </div>

      <div className="sticky bottom-20 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-lg md:border">
        <div>
          <p className="font-body text-[11px] text-text-muted">Ticket</p>
          <p className="font-display text-[18px] font-bold text-text">{event.price}</p>
        </div>
        <Button
          variant={going ? 'soft' : 'primary'}
          leftIcon={going ? <Check size={16} aria-hidden="true" /> : undefined}
          onClick={() => {
            setGoing((value) => !value)
            push(going ? 'RSVP removed' : 'You are going', 'success')
          }}
        >
          {going ? 'Going' : 'Get ticket'}
        </Button>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="font-body text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-body text-[13px] font-medium text-text">{value}</p>
    </div>
  )
}

function FollowButton({ name }: { name: string }) {
  const [following, setFollowing] = useState(false)
  const { push } = useToast()
  return (
    <Button
      size="sm"
      variant={following ? 'soft' : 'secondary'}
      leftIcon={
        following ? (
          <UserCheck size={14} aria-hidden="true" />
        ) : (
          <UserPlus size={14} aria-hidden="true" />
        )
      }
      onClick={() => {
        setFollowing((value) => !value)
        push(following ? `Unfollowed ${name}` : `Following ${name}`, 'success')
      }}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}
