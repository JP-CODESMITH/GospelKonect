import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Radio } from 'lucide-react'
import {
  artists,
  churches,
  genres,
  playlists,
  sermons,
  songs,
  type Gradient,
} from '../data/mock'
import {
  ArtistCircle,
  ChurchCard,
  PlaylistCard,
  SermonRow,
  SongCard,
  SongRow,
} from '../components/cards'
import { Artwork, Chip, EmptyState, SearchField, SectionHeader } from '../components/ui'

export const Route = createFileRoute('/_app/discover')({
  component: DiscoverPage,
})

type Filter = 'all' | 'songs' | 'artists' | 'sermons' | 'churches' | 'playlists' | 'podcasts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'songs', label: 'Songs' },
  { value: 'artists', label: 'Artists' },
  { value: 'sermons', label: 'Sermons' },
  { value: 'churches', label: 'Churches' },
  { value: 'playlists', label: 'Playlists' },
  { value: 'podcasts', label: 'Podcasts' },
]

function DiscoverPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  return (
    <div className="space-y-6">
      <SearchField
        value=""
        readOnly
        onClick={() => void navigate({ to: '/search' })}
        className="sticky top-14 z-30 -mx-4 bg-bg/90 px-4 py-2 backdrop-blur-xl md:top-0 md:mx-0 md:px-0"
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((item) => (
          <Chip key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {filter === 'all' ? (
        <>
          <section>
            <SectionHeader title="Browse by mood" subtitle="Find the sound for this moment" />
            <div className="grid grid-cols-2 gap-3">
              {genres.map((genre) => (
                <GenreTile
                  key={genre.name}
                  name={genre.name}
                  gradient={genre.gradient}
                  onClick={() => void navigate({ to: '/search' })}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Top artists"
              action={
                <button
                  type="button"
                  onClick={() => setFilter('artists')}
                  className="cursor-pointer font-body text-[13px] font-semibold text-primary"
                >
                  See all
                </button>
              }
            />
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {artists.slice(0, 6).map((artist) => (
                <ArtistCircle key={artist.id} artist={artist} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="New releases"
              action={
                <button
                  type="button"
                  onClick={() => setFilter('songs')}
                  className="cursor-pointer font-body text-[13px] font-semibold text-primary"
                >
                  See all
                </button>
              }
            />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {songs.slice(5, 11).map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Playlists for you"
              action={
                <button
                  type="button"
                  onClick={() => setFilter('playlists')}
                  className="cursor-pointer font-body text-[13px] font-semibold text-primary"
                >
                  See all
                </button>
              }
            />
            <div className="grid grid-cols-2 gap-3">
              {playlists.slice(0, 4).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {filter === 'songs' ? (
        <section>
          <SectionHeader title="Songs" subtitle={`${songs.length} tracks`} />
          <div>
            {songs.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === 'artists' ? (
        <section>
          <SectionHeader title="Artists" subtitle={`${artists.length} gospel artists`} />
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {artists.map((artist) => (
              <ArtistCircle key={artist.id} artist={artist} size={80} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === 'sermons' ? (
        <section>
          <SectionHeader title="Sermons" subtitle="Messages to strengthen your walk" />
          <div>
            {sermons.map((sermon) => (
              <SermonRow key={sermon.id} sermon={sermon} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === 'churches' ? (
        <section>
          <SectionHeader title="Churches" subtitle="Find your church family" />
          <div className="space-y-2.5">
            {churches.map((church) => (
              <ChurchCard key={church.id} church={church} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === 'playlists' ? (
        <section>
          <SectionHeader title="Playlists" subtitle="Curated for every moment" />
          <div className="grid grid-cols-2 gap-3">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === 'podcasts' ? (
        <EmptyState
          icon={<Radio size={38} aria-hidden="true" />}
          title="Podcasts are on the way"
          description="We are preparing conversations on faith, worship and everyday life. Check back soon."
        />
      ) : null}
    </div>
  )
}

function GenreTile({
  name,
  gradient,
  onClick,
}: {
  name: string
  gradient: Gradient
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-24 cursor-pointer overflow-hidden rounded-lg text-left shadow-card transition-transform active:scale-[0.98]"
      style={{ backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      <span className="absolute left-3 top-2.5 font-display text-[17px] font-bold text-white">{name}</span>
      <span className="absolute -bottom-2 -right-2 rotate-12 opacity-80">
        <Artwork gradient={gradient} size={56} rounded="sm" />
      </span>
    </button>
  )
}
