import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usePlayer } from '../store/player'
import {
  communityPosts,
  continueListening,
  events,
  guestUser,
  sermons,
  songs,
  verseOfTheDay,
} from '../data/mock'
import {
  EventCard,
  LiveBanner,
  PostCard,
  QuickActions,
  SermonCard,
  SongCard,
  SongRow,
  VerseCard,
} from '../components/cards'
import { Button, SectionHeader } from '../components/ui'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/home')({
  component: HomePage,
})

const QUICK_ROUTES = {
  live: '/events',
  prayer: '/connect',
  sermons: '/sermons',
  give: '/give',
} as const

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { current, progress, duration } = usePlayer()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  const name = user?.name ?? guestUser.name
  const firstName = name.split(' ')[0] ?? name
  const greeting = now ? greetingFor(now.getHours()) : 'Welcome back'
  const dateLabel = now
    ? now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="space-y-7">
      <section>
        <p className="font-body text-[13px] font-medium text-text-muted">{dateLabel || '\u00a0'}</p>
        <h1 className="mt-0.5 font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">
          {greeting}, {firstName} 🙏
        </h1>
      </section>

      <VerseCard verse={verseOfTheDay} />

      <QuickActions
        onAction={(id) => {
          const to = QUICK_ROUTES[id as keyof typeof QUICK_ROUTES]
          if (to) void navigate({ to })
        }}
      />

      <section>
        <SectionHeader
          title="Continue listening"
          action={
            <Link to="/library" className="font-body text-[13px] font-semibold text-primary">
              See all
            </Link>
          }
        />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {continueListening.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              progress={current?.id === song.id && duration > 0 ? progress / duration : 0}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Trending gospel songs"
          action={
            <Link to="/discover" className="font-body text-[13px] font-semibold text-primary">
              See all
            </Link>
          }
        />
        <div>
          {songs.slice(0, 5).map((song) => (
            <SongRow key={song.id} song={song} />
          ))}
        </div>
      </section>

      <LiveBanner church="House on the Rock Abuja" viewers={2480} />

      <section>
        <SectionHeader
          title="Featured sermons"
          action={
            <Link to="/sermons" className="font-body text-[13px] font-semibold text-primary">
              See all
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sermons.slice(0, 2).map((sermon) => (
            <SermonCard key={sermon.id} sermon={sermon} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Upcoming events"
          action={
            <Link to="/events" className="font-body text-[13px] font-semibold text-primary">
              See all
            </Link>
          }
        />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="w-[280px] shrink-0">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="From the community"
          action={
            <Link to="/connect" className="font-body text-[13px] font-semibold text-primary">
              Open community
            </Link>
          }
        />
        <div className="space-y-3">
          {communityPosts.slice(0, 3).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        <Button
          variant="secondary"
          fullWidth
          className="mt-3"
          rightIcon={<ArrowRight size={16} aria-hidden="true" />}
          onClick={() => void navigate({ to: '/connect' })}
        >
          Open community
        </Button>
      </section>
    </div>
  )
}
