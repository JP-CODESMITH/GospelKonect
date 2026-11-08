import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Download, Heart, History, ListMusic, Plus } from 'lucide-react'
import { usePlayer } from '../store/player'
import {
  playlists,
  sermons,
  songs,
  type Gradient,
  type Playlist,
} from '../data/mock'
import { PlaylistCard, SermonRow, SongRow } from '../components/cards'
import {
  BottomSheet,
  Button,
  EmptyState,
  SegmentedControl,
  TextField,
  useToast,
} from '../components/ui'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/library')({
  component: LibraryPage,
})

type LibraryTab = 'downloads' | 'liked' | 'playlists' | 'history'

const COVERS: Gradient[] = [
  ['#4B2E83', '#D9A441'],
  ['#2F6FB3', '#4B2E83'],
  ['#2E8B57', '#D9A441'],
  ['#C8412F', '#D9A441'],
  ['#6A44B0', '#2F6FB3'],
]

function LibraryPage() {
  const { isLiked } = usePlayer()
  const { push } = useToast()
  const [tab, setTab] = useState<LibraryTab>('downloads')
  const [list, setList] = useState<Playlist[]>(playlists)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [cover, setCover] = useState<Gradient>(COVERS[0]!)

  const likedSongs = songs.filter((song) => isLiked(song.id))

  function createPlaylist() {
    const trimmed = name.trim()
    if (!trimmed) return
    setList((prev) => [{ id: `pl-${Date.now()}`, name: trimmed, songCount: 0, gradient: cover }, ...prev])
    setName('')
    setCover(COVERS[0]!)
    setOpen(false)
    push('Playlist created', 'success')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Library</h1>
          <p className="mt-0.5 font-body text-[13px] text-text-muted">Everything you have saved, liked and downloaded.</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={() => setOpen(true)}>
          Playlist
        </Button>
      </div>

      <SegmentedControl
        options={[
          { value: 'downloads', label: 'Downloads' },
          { value: 'liked', label: 'Liked' },
          { value: 'playlists', label: 'Playlists' },
          { value: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
        label="Library sections"
      />

      {tab === 'downloads' ? (
        <section>
          <h2 className="mb-2 font-display text-[18px] font-semibold text-text">Saved sermons</h2>
          <div>
            {sermons.slice(0, 4).map((sermon) => (
              <SermonRow key={sermon.id} sermon={sermon} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-body text-[12px] text-text-muted">
            <Download size={14} aria-hidden="true" /> Downloads stay playable when you are offline.
          </p>
        </section>
      ) : null}

      {tab === 'liked' ? (
        <section>
          <h2 className="mb-2 font-display text-[18px] font-semibold text-text">Liked songs</h2>
          {likedSongs.length === 0 ? (
            <EmptyState
              icon={<Heart size={38} aria-hidden="true" />}
              title="No liked songs yet"
              description="Tap the heart on a song and it will meet you here."
              action={
                <Link
                  to="/discover"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-body text-[14px] font-semibold text-on-primary"
                >
                  Browse songs
                </Link>
              }
            />
          ) : (
            <div>
              {likedSongs.map((song) => (
                <SongRow key={song.id} song={song} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'playlists' ? (
        <section>
          <h2 className="mb-2 font-display text-[18px] font-semibold text-text">Your playlists</h2>
          <div className="grid grid-cols-2 gap-3">
            {list.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'history' ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-[18px] font-semibold text-text">
            <History size={18} className="text-primary" aria-hidden="true" /> Recently played
          </h2>
          <div>
            {songs.slice(0, 6).map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </div>
        </section>
      ) : null}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="New playlist"
        footer={
          <Button fullWidth disabled={!name.trim()} onClick={createPlaylist}>
            Create playlist
          </Button>
        }
      >
        <TextField
          label="Playlist name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sunday morning praise"
          maxLength={60}
        />
        <div className="mt-4">
          <p className="mb-2 font-body text-[13px] font-semibold text-text">Cover</p>
          <div className="flex gap-2">
            {COVERS.map((gradient, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Cover ${index + 1}`}
                aria-pressed={cover === gradient}
                onClick={() => setCover(gradient)}
                className={cn(
                  'h-12 w-12 cursor-pointer rounded-md border-2 transition-transform active:scale-95',
                  cover === gradient ? 'border-primary' : 'border-transparent',
                )}
                style={{ backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 font-body text-[12px] text-text-muted">
          <ListMusic size={14} aria-hidden="true" /> You can add songs from any track menu.
        </p>
      </BottomSheet>
    </div>
  )
}
