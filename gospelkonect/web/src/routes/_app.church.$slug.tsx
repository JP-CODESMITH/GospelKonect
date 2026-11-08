import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  HandCoins,
  MapPin,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { churches, events, sermons, formatCount, type Sermon, type Song } from '../data/mock'
import { usePlayer } from '../store/player'
import { EventCard, SermonRow } from '../components/cards'
import {
  Artwork,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  useToast,
} from '../components/ui'

export const Route = createFileRoute('/_app/church/$slug')({
  component: ChurchPage,
})

function toSong(sermon: Sermon): Song {
  const minutes = Number.parseInt(sermon.duration, 10) || 40
  return {
    id: sermon.id,
    title: sermon.title,
    artist: sermon.preacher,
    artistId: sermon.preacherId,
    album: sermon.church,
    duration: minutes * 60,
    plays: 0,
    gradient: sermon.gradient,
  }
}

function ChurchPage() {
  const { slug } = Route.useParams()
  const { push } = useToast()
  const navigate = useNavigate()
  const { playSong } = usePlayer()
  const church = churches.find((item) => item.slug === slug)

  if (!church) {
    return (
      <EmptyState
        title="Church not found"
        description="This page may have moved or the church is not listed yet."
        action={
          <Link
            to="/discover"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-body text-[14px] font-semibold text-on-primary"
          >
            Discover churches
          </Link>
        }
      />
    )
  }

  const relatedEvents = events.filter((event) => {
    const a = event.church.toLowerCase()
    const b = church.name.toLowerCase()
    return a === b || a.includes(b) || b.includes(a)
  })
  const churchSermons = sermons.filter((sermon) => {
    const a = sermon.church.toLowerCase()
    const b = church.name.toLowerCase()
    return a === b || a.includes(b) || b.includes(a)
  })

  return (
    <div>
      <div className="relative -mx-4 -mt-4 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-lg">
        <Artwork gradient={church.gradient} className="h-44 w-full sm:h-56" icon={<Users size={46} />} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
        <div className="absolute left-3 top-3">
          <IconButton label="Go back" variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="absolute right-3 top-3">
          <IconButton label="Share church" variant="ghost" onClick={() => push('Church link copied', 'success')}>
            <Share2 size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <Badge tone="accent">{church.denomination}</Badge>
          <h1 className="mt-2 font-display text-[24px] font-bold leading-7">{church.name}</h1>
          <p className="mt-1 flex items-center gap-1 font-body text-[12px] text-white/85">
            <MapPin size={12} aria-hidden="true" /> {church.city}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <FollowChurch name={church.name} />
        <Button
          variant="soft"
          fullWidth
          className="flex-1"
          leftIcon={<HandCoins size={16} aria-hidden="true" />}
          onClick={() => void navigate({ to: '/give' })}
        >
          Give
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface py-3 shadow-card">
        <Stat label="Members" value={formatCount(church.members)} />
        <Stat label="Events" value={String(church.events)} />
        <Stat label="Sermons" value={String(church.sermons)} />
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <h2 className="font-display text-[18px] font-semibold text-text">About</h2>
          <p className="mt-1.5 font-body text-[14px] leading-[22px] text-text-muted">{church.about}</p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-[18px] font-semibold text-text">Service times</h2>
          <Card className="divide-y divide-border overflow-hidden">
            {church.serviceTimes.map((service) => (
              <div key={service.day} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Clock size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[14px] font-semibold text-text">{service.day}</p>
                  <p className="font-body text-[12px] text-text-muted">{service.times}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[18px] font-semibold text-text">Upcoming events</h2>
            <Link to="/events" className="font-body text-[12px] font-semibold text-primary">
              See all
            </Link>
          </div>
          {relatedEvents.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-5 font-body text-[13px] text-text-muted">
              <CalendarDays size={16} aria-hidden="true" /> No events scheduled right now.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-1 font-display text-[18px] font-semibold text-text">Recent sermons</h2>
          {churchSermons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-5 font-body text-[13px] text-text-muted">
              Sermons from this church will appear here soon.
            </p>
          ) : (
            <div>
              {churchSermons.map((sermon) => (
                <SermonRow key={sermon.id} sermon={sermon} onPlay={() => playSong(toSong(sermon))} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[18px] font-bold text-text">{value}</span>
      <span className="mt-0.5 font-body text-[11px] text-text-muted">{label}</span>
    </div>
  )
}

function FollowChurch({ name }: { name: string }) {
  const [following, setFollowing] = useState(false)
  const { push } = useToast()
  return (
    <Button
      variant={following ? 'soft' : 'primary'}
      fullWidth
      leftIcon={
        following ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />
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
