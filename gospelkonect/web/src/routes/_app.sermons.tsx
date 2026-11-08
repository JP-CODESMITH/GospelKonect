import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Play } from 'lucide-react'
import { sermons, type Sermon, type Song } from '../data/mock'
import { usePlayer } from '../store/player'
import { SermonRow } from '../components/cards'
import { Artwork, Avatar, Button, Chip, EmptyState, SearchField } from '../components/ui'

export const Route = createFileRoute('/_app/sermons')({
  component: SermonsPage,
})

const CHURCH_FILTERS = [
  'All',
  'RCCG',
  'The King Is Here',
  'Living Faith Church',
  'The Elevation Church',
  'House on the Rock',
  'The Presence',
]

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

function SermonsPage() {
  const { playSong } = usePlayer()
  const [query, setQuery] = useState('')
  const [church, setChurch] = useState('All')

  const featured = sermons[0]!
  const filtered = sermons.filter((sermon) => {
    const matchesChurch = church === 'All' || sermon.church === church
    const haystack = `${sermon.title} ${sermon.preacher} ${sermon.church}`.toLowerCase()
    return matchesChurch && haystack.includes(query.trim().toLowerCase())
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Sermons</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          Messages that steady the heart, from pulpits across Nigeria.
        </p>
      </div>

      <SearchField value={query} onChange={setQuery} placeholder="Search sermons or preachers…" />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {CHURCH_FILTERS.map((name) => (
          <Chip key={name} active={church === name} onClick={() => setChurch(name)}>
            {name}
          </Chip>
        ))}
      </div>

      <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <div className="relative">
          <Artwork gradient={featured.gradient} className="h-48 w-full" icon={<BookOpen size={44} />} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
          <div className="absolute bottom-3 left-3 right-14 text-white">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
              Featured this week
            </p>
            <h2 className="mt-1 font-display text-[20px] font-bold leading-6">{featured.title}</h2>
            <p className="mt-1 font-body text-[12px] text-white/80">
              {featured.preacher} · {featured.duration}
            </p>
          </div>
          <button
            type="button"
            onClick={() => playSong(toSong(featured))}
            aria-label={`Play ${featured.title}`}
            className="absolute bottom-3 right-3 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent text-[#241a06] shadow-raised transition-transform active:scale-95"
          >
            <Play size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={featured.preacher} gradient={featured.gradient} size={28} />
            <span className="truncate font-body text-[12px] text-text-muted">{featured.church}</span>
          </div>
          <Button size="sm" leftIcon={<Play size={14} aria-hidden="true" />} onClick={() => playSong(toSong(featured))}>
            Listen
          </Button>
        </div>
      </article>

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-[18px] font-semibold text-text">All sermons</h2>
          <span className="font-body text-[12px] text-text-muted">{filtered.length} messages</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={38} aria-hidden="true" />}
            title="No sermons found"
            description="Try another preacher, church or phrase."
          />
        ) : (
          <div>
            {filtered.map((sermon) => (
              <SermonRow key={sermon.id} sermon={sermon} onPlay={() => playSong(toSong(sermon))} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
