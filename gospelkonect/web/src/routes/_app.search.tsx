import { useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Clock, Flame, Search, X } from 'lucide-react'
import {
  artists,
  churches,
  events,
  genres,
  people,
  recentSearches,
  sermons,
  songs,
  trendingSearches,
  type Sermon,
  type Song,
} from '../data/mock'
import { usePlayer } from '../store/player'
import {
  ArtistCircle,
  ChurchCard,
  EventCard,
  PersonRow,
  SermonRow,
  SongRow,
} from '../components/cards'
import { Chip, EmptyState, SearchField } from '../components/ui'

export const Route = createFileRoute('/_app/search')({
  component: SearchPage,
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

function SearchPage() {
  const { playSong } = usePlayer()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(recentSearches)
  const q = query.trim().toLowerCase()
  const active = q.length > 0

  const matchedSongs = active ? songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(q)) : []
  const matchedSermons = active
    ? sermons.filter((sermon) => `${sermon.title} ${sermon.preacher} ${sermon.church}`.toLowerCase().includes(q))
    : []
  const matchedEvents = active
    ? events.filter((event) => `${event.title} ${event.church} ${event.city} ${event.venue}`.toLowerCase().includes(q))
    : []
  const matchedChurches = active
    ? churches.filter((church) => `${church.name} ${church.denomination} ${church.city}`.toLowerCase().includes(q))
    : []
  const matchedPeople = active
    ? people.filter((person) => `${person.name} ${person.username} ${person.church}`.toLowerCase().includes(q))
    : []
  const matchedArtists = active ? artists.filter((artist) => `${artist.name} ${artist.city}`.toLowerCase().includes(q)) : []
  const total =
    matchedSongs.length +
    matchedSermons.length +
    matchedEvents.length +
    matchedChurches.length +
    matchedPeople.length +
    matchedArtists.length

  function runSearch(term: string) {
    setQuery(term)
    setRecent((prev) => [term, ...prev.filter((item) => item !== term)].slice(0, 6))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Search</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          Songs, sermons, churches, events and people — all in one place.
        </p>
      </div>

      <SearchField value={query} onChange={setQuery} autoFocus placeholder="What are you looking for?" />

      {!active ? (
        <div className="space-y-6">
          {recent.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-semibold text-text">Recent searches</h2>
                <button
                  type="button"
                  onClick={() => setRecent([])}
                  className="cursor-pointer font-body text-[12px] font-semibold text-primary"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <span key={term} className="inline-flex items-center rounded-full bg-surface-2 pl-1">
                    <button
                      type="button"
                      onClick={() => runSearch(term)}
                      className="inline-flex cursor-pointer items-center gap-1.5 py-1.5 pl-3 pr-1 font-body text-[13px] text-text"
                    >
                      <Clock size={13} className="text-text-muted" aria-hidden="true" />
                      {term}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${term} from recent searches`}
                      onClick={() => setRecent((prev) => prev.filter((item) => item !== term))}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-border"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 font-display text-[17px] font-semibold text-text">Trending now</h2>
            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
              {trendingSearches.map((term, index) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => runSearch(term)}
                  className="flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-2"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Flame size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-body text-[14px] font-medium text-text">{term}</span>
                  <span className="font-body text-[11px] text-text-muted">#{index + 1}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[17px] font-semibold text-text">Browse genres</h2>
            <div className="grid grid-cols-2 gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.name}
                  type="button"
                  onClick={() => runSearch(genre.name)}
                  className="relative h-24 cursor-pointer overflow-hidden rounded-lg p-3 text-left transition-transform active:scale-[0.98]"
                  style={{ backgroundImage: `linear-gradient(135deg, ${genre.gradient[0]}, ${genre.gradient[1]})` }}
                >
                  <span className="font-display text-[16px] font-semibold text-white">{genre.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<Search size={38} aria-hidden="true" />}
          title={`No results for “${query.trim()}”`}
          description="Check the spelling or try a broader word."
        />
      ) : (
        <div className="space-y-6">
          <ResultSection title="Songs" count={matchedSongs.length}>
            {matchedSongs.slice(0, 5).map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </ResultSection>

          <ResultSection title="Artists" count={matchedArtists.length}>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
              {matchedArtists.map((artist) => (
                <ArtistCircle key={artist.id} artist={artist} size={80} />
              ))}
            </div>
          </ResultSection>

          <ResultSection title="Sermons" count={matchedSermons.length}>
            {matchedSermons.map((sermon) => (
              <SermonRow key={sermon.id} sermon={sermon} onPlay={() => playSong(toSong(sermon))} />
            ))}
          </ResultSection>

          <ResultSection title="Churches" count={matchedChurches.length}>
            <div className="grid gap-2">
              {matchedChurches.map((church) => (
                <ChurchCard key={church.id} church={church} />
              ))}
            </div>
          </ResultSection>

          <ResultSection title="Events" count={matchedEvents.length}>
            <div className="grid gap-3 sm:grid-cols-2">
              {matchedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </ResultSection>

          <ResultSection title="People" count={matchedPeople.length}>
            {matchedPeople.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </ResultSection>
        </div>
      )}

      {!active ? (
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => runSearch('Worship')}>Worship</Chip>
          <Chip onClick={() => runSearch('Sermons')}>Sermons</Chip>
          <Chip onClick={() => runSearch('Lagos')}>Lagos</Chip>
        </div>
      ) : null}
    </div>
  )
}

function ResultSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-[17px] font-semibold text-text">{title}</h2>
        <span className="font-body text-[12px] text-text-muted">{count}</span>
      </div>
      {children}
    </section>
  )
}
