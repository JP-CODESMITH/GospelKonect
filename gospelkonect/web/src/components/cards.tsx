import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Download,
  Ellipsis,
  HandCoins,
  HandHeart,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Quote,
  Radio,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  formatCount,
  formatDate,
  formatFullDate,
  dayLabel,
  monthLabel,
  quickActions,
  type AppNotification,
  type Artist,
  type Church,
  type CommunityPost,
  type EventItem,
  type Group,
  type Person,
  type Playlist,
  type PrayerRequest,
  type Sermon,
  type Song,
  type Verse,
} from '../data/mock'
import { usePlayer } from '../store/player'
import { Artwork, Avatar, AvatarStack, Badge, Button, IconButton, useToast } from './ui'
import { cn } from '../lib/cn'

/* ------------------------------------------------------------------ */
/*  Songs                                                              */
/* ------------------------------------------------------------------ */

export function SongRow({ song, showDivider = true }: { song: Song; showDivider?: boolean }) {
  const { current, isPlaying, playSong, togglePlay, isLiked, toggleLike } = usePlayer()
  const { push } = useToast()
  const active = current?.id === song.id
  const liked = isLiked(song.id)

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 py-3',
        showDivider && 'border-b border-border last:border-0',
      )}
    >
      <button
        type="button"
        onClick={() => (active ? togglePlay() : playSong(song))}
        aria-label={active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
        className="relative cursor-pointer overflow-hidden rounded-md"
      >
        <Artwork gradient={song.gradient} size={56} icon={<Music2 size={20} />} />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/35 text-white transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
          aria-hidden="true"
        >
          {active && isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-body text-[14px] font-semibold', active ? 'text-primary' : 'text-text')}>
          {song.title}
        </p>
        <p className="truncate font-body text-[12px] text-text-muted">{song.artist}</p>
        <p className="font-body text-[11px] text-text-muted">{formatCount(song.plays)} plays</p>
      </div>

      <IconButton
        label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
        size="sm"
        onClick={() => {
          toggleLike(song.id)
          push(liked ? 'Removed from liked' : 'Added to liked', 'success')
        }}
      >
        <Heart size={18} className={liked ? 'fill-accent text-accent' : 'text-text-muted'} aria-hidden="true" />
      </IconButton>
      <IconButton label="More options" size="sm" onClick={() => push('More options coming soon')}>
        <Ellipsis size={18} className="text-text-muted" aria-hidden="true" />
      </IconButton>
    </div>
  )
}

export function SongCard({ song, progress = 0 }: { song: Song; progress?: number }) {
  const { current, isPlaying, playSong, togglePlay } = usePlayer()
  const active = current?.id === song.id

  return (
    <button
      type="button"
      onClick={() => (active ? togglePlay() : playSong(song))}
      className="group w-[140px] shrink-0 cursor-pointer text-left"
      aria-label={active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      <div className="relative">
        <Artwork gradient={song.gradient} className="aspect-square w-full" icon={<Music2 size={28} />} />
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-raised">
            {active && isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </span>
        </span>
        {progress > 0 ? (
          <span className="absolute inset-x-2 bottom-2 h-[3px] overflow-hidden rounded-full bg-black/30">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 truncate font-body text-[14px] font-semibold text-text">{song.title}</p>
      <p className="truncate font-body text-[12px] text-text-muted">{song.artist}</p>
    </button>
  )
}

export function ArtistCircle({ artist, size = 96 }: { artist: Artist; size?: number }) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center text-center">
      <Avatar name={artist.name} gradient={artist.gradient} size={size} />
      <p className="mt-2 w-full truncate font-body text-[13px] font-semibold text-text">{artist.name}</p>
      <p className="w-full truncate font-body text-[11px] text-text-muted">
        {formatCount(artist.followers)} followers
      </p>
    </div>
  )
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const [a, b] = playlist.gradient
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="grid aspect-square w-full grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              backgroundImage: `linear-gradient(${135 + index * 35}deg, ${a}, ${b})`,
              filter: `brightness(${0.86 + index * 0.07})`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="p-3">
        <p className="truncate font-body text-[14px] font-semibold text-text">{playlist.name}</p>
        <p className="font-body text-[11px] text-text-muted">{playlist.songCount} songs</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sermons                                                            */
/* ------------------------------------------------------------------ */

export function SermonCard({ sermon }: { sermon: Sermon }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="relative">
        <Artwork gradient={sermon.gradient} className="aspect-video w-full" icon={<BookOpen size={30} />} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 font-body text-[11px] font-medium text-white">
          {sermon.duration}
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 font-body text-[11px] text-white">
          <Play size={11} aria-hidden="true" /> Play
        </span>
        <span className="absolute -bottom-3.5 left-3 rounded-full ring-4 ring-surface">
          <Avatar name={sermon.preacher} size={28} />
        </span>
      </div>
      <div className="px-3 pb-3 pt-5">
        <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-6 text-text">{sermon.title}</h3>
        <p className="mt-1 truncate font-body text-[12px] font-medium text-text">{sermon.preacher}</p>
        <p className="truncate font-body text-[11px] text-text-muted">
          {formatDate(sermon.date)} · {sermon.church}
        </p>
      </div>
    </article>
  )
}

export function SermonRow({ sermon, onPlay }: { sermon: Sermon; onPlay?: () => void }) {
  const { push } = useToast()
  const [downloaded, setDownloaded] = useState(false)
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      {onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play ${sermon.title}`}
          className="group relative shrink-0 cursor-pointer"
        >
          <Artwork gradient={sermon.gradient} className="aspect-video w-24" icon={<BookOpen size={20} />} />
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary">
              <Play size={14} aria-hidden="true" />
            </span>
          </span>
        </button>
      ) : (
        <Artwork gradient={sermon.gradient} className="aspect-video w-24 shrink-0" icon={<BookOpen size={20} />} />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-body text-[14px] font-semibold text-text">{sermon.title}</h3>
        <p className="truncate font-body text-[12px] text-text-muted">{sermon.preacher}</p>
        <p className="font-body text-[11px] text-text-muted">
          {formatDate(sermon.date)} · {sermon.duration}
        </p>
      </div>
      <IconButton
        label={downloaded ? `Remove download of ${sermon.title}` : `Download ${sermon.title}`}
        size="sm"
        onClick={() => {
          setDownloaded((value) => !value)
          push(downloaded ? 'Removed download' : 'Sermon saved for offline', 'success')
        }}
      >
        {downloaded ? (
          <Check size={18} className="text-success" aria-hidden="true" />
        ) : (
          <Download size={18} className="text-text-muted" aria-hidden="true" />
        )}
      </IconButton>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

const ATTENDEES = [
  { name: 'Chiamaka O.', gradient: ['#4B2E83', '#D9A441'] as [string, string] },
  { name: 'Emeka N.', gradient: ['#2F6FB3', '#4B2E83'] as [string, string] },
  { name: 'Aisha B.', gradient: ['#2E8B57', '#D9A441'] as [string, string] },
  { name: 'Tunde A.', gradient: ['#C8412F', '#D9A441'] as [string, string] },
]

export function EventCard({ event }: { event: EventItem }) {
  const [going, setGoing] = useState(event.going)
  const { push } = useToast()

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <Link to="/events/$id" params={{ id: event.id }} className="group block" aria-label={`View ${event.title}`}>
        <div className="relative">
          <Artwork gradient={event.gradient} className="aspect-video w-full" icon={<CalendarDays size={32} />} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />
          <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 font-body text-[11px] text-white">
            <MapPin size={11} aria-hidden="true" /> {event.city}
          </span>
        </div>
      </Link>
      <div className="flex gap-3 p-4">
        <div className="flex w-12 shrink-0 flex-col items-center">
          <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-primary">
            {monthLabel(event.date)}
          </span>
          <span className="font-display text-[22px] font-bold leading-none text-text">{dayLabel(event.date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <Link to="/events/$id" params={{ id: event.id }}>
            <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-6 text-text">{event.title}</h3>
          </Link>
          <p className="mt-1 flex items-center gap-1 font-body text-[12px] text-text-muted">
            <MapPin size={12} aria-hidden="true" /> {event.venue}
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-body text-[12px] text-text-muted">
            <Clock size={12} aria-hidden="true" /> {formatFullDate(event.date)} · {event.time}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AvatarStack people={ATTENDEES} size={24} max={3} />
              <span className="font-body text-[11px] text-text-muted">
                +{formatCount(event.attendees)} going
              </span>
            </div>
            <Button
              size="sm"
              variant={going ? 'soft' : 'primary'}
              leftIcon={going ? <Check size={14} aria-hidden="true" /> : undefined}
              onClick={() => {
                setGoing((value) => !value)
                push(going ? 'RSVP removed' : 'You are going', 'success')
              }}
            >
              {going ? 'Going' : 'RSVP'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Community                                                          */
/* ------------------------------------------------------------------ */

export function PostCard({
  post,
  onAmen,
  onSave,
  onComment,
}: {
  post: CommunityPost
  onAmen?: () => void
  onSave?: () => void
  onComment?: () => void
}) {
  const [amened, setAmened] = useState(post.amened)
  const [amenCount, setAmenCount] = useState(post.amen)
  const [saved, setSaved] = useState(post.saved)
  const [expanded, setExpanded] = useState(false)
  const { push } = useToast()

  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <header className="flex items-start gap-3">
        <Avatar name={post.author} gradient={post.gradient} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-body text-[15px] font-semibold text-text">
            {post.author}
            {post.verified ? <BadgeCheck size={15} className="text-info" aria-label="Verified" /> : null}
          </p>
          <p className="truncate font-body text-[12px] text-text-muted">
            {post.church} · {post.time}
          </p>
        </div>
        <IconButton label="Post options" size="sm" onClick={() => push('Post options coming soon')}>
          <Ellipsis size={18} className="text-text-muted" aria-hidden="true" />
        </IconButton>
      </header>

      <p className={cn('mt-3 whitespace-pre-line font-body text-[15px] leading-[22px] text-text', !expanded && 'line-clamp-4')}>
        {post.content}
      </p>
      {post.content.length > 180 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 cursor-pointer font-body text-[13px] font-semibold text-primary"
        >
          Read more
        </button>
      ) : null}

      {post.media ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-surface-2 p-2.5">
          <Artwork
            gradient={post.media.gradient}
            size={52}
            icon={
              post.media.kind === 'song' ? (
                <Music2 size={20} />
              ) : post.media.kind === 'sermon' ? (
                <BookOpen size={20} />
              ) : (
                <CalendarDays size={20} />
              )
            }
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-[13px] font-semibold text-text">{post.media.title}</p>
            <p className="truncate font-body text-[11px] text-text-muted">{post.media.subtitle}</p>
          </div>
          <IconButton
            label={`Play ${post.media.title}`}
            variant="primary"
            size="sm"
            onClick={() => push('Playback coming soon')}
          >
            <Play size={16} aria-hidden="true" />
          </IconButton>
        </div>
      ) : null}

      <footer className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <ActionButton
            label="Amen"
            active={amened}
            count={amenCount}
            onClick={() => {
              const next = !amened
              setAmened(next)
              setAmenCount((value) => Math.max(0, value + (next ? 1 : -1)))
              onAmen?.()
              if (next) push('Amen — standing with you', 'success')
            }}
            icon={<HandHeart size={18} className={amened ? 'fill-accent text-accent animate-pop' : ''} aria-hidden="true" />}
          />
          <ActionButton
            label="Comment"
            count={post.comments}
            onClick={() => {
              onComment?.()
              push('Comments coming soon')
            }}
            icon={<MessageCircle size={18} aria-hidden="true" />}
          />
          <ActionButton
            label="Share"
            count={post.shares}
            onClick={() => push('Share link copied', 'success')}
            icon={<Share2 size={18} aria-hidden="true" />}
          />
        </div>
        <IconButton
          label={saved ? 'Remove from saved' : 'Save post'}
          size="sm"
          onClick={() => {
            setSaved((value) => !value)
            onSave?.()
            push(saved ? 'Removed from saved' : 'Saved to your library', 'success')
          }}
        >
          <Bookmark size={18} className={saved ? 'fill-primary text-primary' : 'text-text-muted'} aria-hidden="true" />
        </IconButton>
      </footer>
    </article>
  )
}

function ActionButton({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string
  icon: ReactNode
  count: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}, ${count}`}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-body text-[13px] font-medium transition-colors',
        active ? 'text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text',
      )}
    >
      {icon}
      <span>{formatCount(count)}</span>
    </button>
  )
}

export function PrayerCard({ request }: { request: PrayerRequest }) {
  const [prayed, setPrayed] = useState(request.prayedByMe)
  const [count, setCount] = useState(request.prayed)
  const { push } = useToast()

  return (
    <article
      className="rounded-lg border border-border bg-surface p-4 shadow-card"
      style={{ borderLeft: '4px solid var(--accent)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={request.author} size={32} />
          <div className="min-w-0">
            <p className="truncate font-body text-[13px] font-semibold text-text">{request.author}</p>
            <p className="truncate font-body text-[11px] text-text-muted">
              {request.city} · {request.time}
            </p>
          </div>
        </div>
        <Badge tone="accent">{request.category}</Badge>
      </div>
      <p className="mt-3 font-body text-[14px] leading-[22px] text-text">{request.text}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-body text-[12px] text-text-muted">{formatCount(count)} have prayed</span>
        <Button
          size="sm"
          variant={prayed ? 'soft' : 'accent'}
          leftIcon={
            prayed ? (
              <Check size={14} className="animate-pop" aria-hidden="true" />
            ) : (
              <HandHeart size={14} aria-hidden="true" />
            )
          }
          onClick={() => {
            const next = !prayed
            setPrayed(next)
            setCount((value) => Math.max(0, value + (next ? 1 : -1)))
            if (next) push('Thank you for praying', 'success')
          }}
        >
          {prayed ? 'You prayed' : '🙏 I prayed'}
        </Button>
      </div>
    </article>
  )
}

export function GroupCard({ group }: { group: Group }) {
  const [joined, setJoined] = useState(group.joined)
  const { push } = useToast()
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <Artwork gradient={group.gradient} className="aspect-[16/9] w-full" icon={<Users size={28} />} />
      <div className="p-3">
        <h3 className="truncate font-body text-[14px] font-semibold text-text">{group.name}</h3>
        <p className="font-body text-[11px] text-text-muted">{formatCount(group.members)} members</p>
        <Button
          size="sm"
          variant={joined ? 'soft' : 'secondary'}
          fullWidth
          className="mt-2.5"
          onClick={() => {
            setJoined((value) => !value)
            push(joined ? 'Left group' : `Joined ${group.name}`, 'success')
          }}
        >
          {joined ? 'Joined' : 'Join'}
        </Button>
      </div>
    </article>
  )
}

export function PersonRow({ person }: { person: Person }) {
  const [following, setFollowing] = useState(person.following)
  const { push } = useToast()
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <Avatar name={person.name} gradient={person.gradient} size={44} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-body text-[14px] font-semibold text-text">
          {person.name}
          {person.verified ? <BadgeCheck size={14} className="text-info" aria-label="Verified" /> : null}
        </p>
        <p className="truncate font-body text-[12px] text-text-muted">
          {person.church} · {person.city}
        </p>
      </div>
      <Button
        size="sm"
        variant={following ? 'soft' : 'secondary'}
        onClick={() => {
          setFollowing((value) => !value)
          push(following ? 'Unfollowed' : `Following ${person.name}`, 'success')
        }}
      >
        {following ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}

export function ChurchCard({ church }: { church: Church }) {
  return (
    <Link
      to="/church/$slug"
      params={{ slug: church.slug }}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-card transition-colors hover:bg-surface-2"
    >
      <Avatar name={church.name} gradient={church.gradient} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-[14px] font-semibold text-text">{church.name}</p>
        <p className="truncate font-body text-[12px] text-text-muted">
          {church.denomination} · {church.city}
        </p>
        <p className="font-body text-[11px] text-text-muted">{formatCount(church.members)} members</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
    </Link>
  )
}

export function NotificationRow({ notification }: { notification: AppNotification }) {
  const map = {
    follow: { icon: <UserPlus size={16} />, tone: 'bg-primary-soft text-primary' },
    comment: { icon: <MessageCircle size={16} />, tone: 'bg-info/15 text-info' },
    reaction: { icon: <Heart size={16} />, tone: 'bg-accent-soft text-accent' },
    event: { icon: <CalendarDays size={16} />, tone: 'bg-success/15 text-success' },
    prayer: { icon: <HandHeart size={16} />, tone: 'bg-accent-soft text-accent' },
  }[notification.kind]

  return (
    <div className={cn('flex items-start gap-3 rounded-md p-3', notification.unread && 'bg-primary-soft')}>
      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full', map.tone)} aria-hidden="true">
        {map.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[13px] leading-5 text-text">
          <span className="font-semibold">{notification.actor}</span> {notification.text}
        </p>
        <p className="mt-0.5 font-body text-[11px] text-text-muted">{notification.time}</p>
      </div>
      {notification.unread ? (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Home modules                                                       */
/* ------------------------------------------------------------------ */

export function LiveBanner({ church, viewers }: { church: string; viewers: number }) {
  const { push } = useToast()
  return (
    <div className="relative overflow-hidden rounded-lg gradient-signature p-4 text-white shadow-raised">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-0.5 font-body text-[11px] font-bold uppercase tracking-wide text-white animate-live">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" /> Live
          </span>
          <p className="mt-2 truncate font-display text-[18px] font-semibold">{church}</p>
          <p className="font-body text-[12px] text-white/80">{formatCount(viewers)} watching now</p>
        </div>
        <button
          type="button"
          onClick={() => push('Live stream coming soon')}
          aria-label={`Watch ${church} live`}
          className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-colors hover:bg-white/30"
        >
          <Play size={22} className="fill-white text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function VerseCard({ verse }: { verse: Verse }) {
  const { push } = useToast()
  const ghost =
    'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/40 px-3 font-body text-[12px] font-medium text-white transition-colors hover:bg-white/15'
  return (
    <div className="relative overflow-hidden rounded-lg gradient-signature p-5 text-white shadow-raised">
      <Quote size={72} className="absolute -right-2 -top-3 text-white/10" aria-hidden="true" />
      <p className="relative font-display text-[18px] italic leading-[28px] text-white">{verse.text}</p>
      <p className="relative mt-3 font-body text-[13px] text-white/85">{verse.reference}</p>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <button type="button" className={ghost} onClick={() => push('Verse shared', 'success')}>
          <Share2 size={14} aria-hidden="true" /> Share
        </button>
        <button type="button" className={ghost} onClick={() => push('Verse saved', 'success')}>
          <Bookmark size={14} aria-hidden="true" /> Save
        </button>
        <button type="button" className={ghost} onClick={() => push('Reflection started')}>
          <BookOpen size={14} aria-hidden="true" /> Reflect
        </button>
      </div>
    </div>
  )
}

const QUICK_ICONS = {
  radio: Radio,
  hands: HandHeart,
  book: BookOpen,
  coins: HandCoins,
} as const

export function QuickActions({ onAction }: { onAction: (id: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {quickActions.map((action) => {
        const Icon = QUICK_ICONS[action.icon]
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95',
                action.tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary',
              )}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="text-center font-body text-[11px] font-medium text-text-muted">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
