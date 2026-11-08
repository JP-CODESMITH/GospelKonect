import { useEffect, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronDown,
  Download,
  Ellipsis,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { formatDuration } from '../data/mock'
import { usePlayer } from '../store/player'
import { Artwork, BottomSheet, IconButton, Slider, useToast } from './ui'
import { cn } from '../lib/cn'

const LYRICS = [
  'You are the way, the truth, the life',
  'The One who holds the stars in place',
  'Your mercy meets me where I am',
  'And leads me home by grace',
  'I will lift my voice to sing',
  'Of the goodness of my King',
  'Every breath a song of praise',
  'For the rest of all my days',
]

export function MiniPlayer() {
  const { current, isPlaying, progress, duration, togglePlay, next, openFull } = usePlayer()
  if (!current || (!isPlaying && progress === 0)) return null

  return (
    <div className="fixed inset-x-2 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 overflow-hidden rounded-lg border border-border bg-surface/95 shadow-player backdrop-blur-xl md:inset-x-0 md:bottom-0 md:rounded-none md:border-x-0 md:border-b-0">
      <div className="relative h-0.5 w-full bg-border" aria-hidden="true">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%` }}
        />
      </div>
      <div className="flex h-16 items-center gap-3 px-3 md:mx-auto md:max-w-[1120px] md:px-6">
        <button
          type="button"
          onClick={openFull}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          aria-label="Open full player"
        >
          <Artwork gradient={current.gradient} size={48} icon={<Music2 size={18} />} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[14px] font-semibold text-text">{current.title}</span>
            <span className="block truncate font-body text-[12px] text-text-muted">{current.artist}</span>
          </span>
        </button>
        <IconButton label={isPlaying ? 'Pause' : 'Play'} variant="primary" onClick={togglePlay}>
          {isPlaying ? <Pause size={18} className="fill-current" aria-hidden="true" /> : <Play size={18} className="fill-current" aria-hidden="true" />}
        </IconButton>
        <IconButton label="Next track" onClick={next}>
          <SkipForward size={18} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

export function FullPlayer() {
  const {
    current,
    isPlaying,
    progress,
    duration,
    queue,
    index,
    fullOpen,
    closeFull,
    togglePlay,
    next,
    previous,
    seek,
    isLiked,
    toggleLike,
    lyricsOpen,
    toggleLyrics,
    queueOpen,
    setQueueOpen,
    playSong,
  } = usePlayer()
  const { push } = useToast()

  useEffect(() => {
    if (!fullOpen) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        seek(progress + 5)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        seek(progress - 5)
      } else if (event.key === 'Escape') {
        closeFull()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullOpen, togglePlay, seek, progress, closeFull])

  if (!fullOpen || !current) return null

  const liked = isLiked(current.id)
  const activeLine = duration > 0 ? Math.min(LYRICS.length - 1, Math.floor((progress / duration) * LYRICS.length)) : 0

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Now playing">
      <div
        className="fixed inset-0"
        style={{ backgroundImage: `linear-gradient(135deg, ${current.gradient[0]}, ${current.gradient[1]})` }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 bg-black/55 backdrop-blur-2xl" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-8 pt-3 text-white">
        <div className="flex items-center justify-between">
          <IconButton label="Close player" variant="ghost" onClick={closeFull}>
            <ChevronDown size={22} aria-hidden="true" />
          </IconButton>
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Now playing
          </span>
          <IconButton label="Player options" variant="ghost" onClick={() => push('Player options coming soon')}>
            <Ellipsis size={22} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="mt-6 flex justify-center">
          <Artwork
            gradient={current.gradient}
            className={cn(
              'aspect-square w-full max-w-[340px] shadow-2xl transition-transform duration-500',
              isPlaying ? 'scale-100' : 'scale-[0.94]',
            )}
            rounded="lg"
            icon={<Music2 size={54} />}
          />
        </div>

        <div className="mt-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[24px] font-bold leading-tight">{current.title}</h1>
            <p className="mt-1 truncate font-body text-[16px] text-white/75">{current.artist}</p>
          </div>
          <IconButton
            label={liked ? 'Unlike track' : 'Like track'}
            variant="ghost"
            onClick={() => {
              toggleLike(current.id)
              push(liked ? 'Removed from liked' : 'Added to liked', 'success')
            }}
          >
            <Heart size={22} className={liked ? 'fill-accent text-accent' : ''} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="mt-5">
          <Slider
            value={progress}
            max={duration || 1}
            onChange={seek}
            label="Seek"
            className="bg-white/25"
          />
          <div className="mt-1.5 flex justify-between font-body text-[12px] text-white/70">
            <span>{formatDuration(progress)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <ControlButton label="Shuffle" onClick={() => push('Shuffle on')}>
            <Shuffle size={20} />
          </ControlButton>
          <ControlButton label="Previous track" onClick={previous}>
            <SkipBack size={26} className="fill-current" />
          </ControlButton>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="inline-flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-[0_0_40px_rgba(240,188,90,0.35)] transition-transform active:scale-95"
          >
            {isPlaying ? <Pause size={30} className="fill-current" /> : <Play size={30} className="ml-1 fill-current" />}
          </button>
          <ControlButton label="Next track" onClick={next}>
            <SkipForward size={26} className="fill-current" />
          </ControlButton>
          <ControlButton label="Repeat" onClick={() => push('Repeat on')}>
            <Repeat size={20} />
          </ControlButton>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          <FeatureButton label="Lyrics" active={lyricsOpen} onClick={toggleLyrics}>
            <BookOpen size={18} />
          </FeatureButton>
          <FeatureButton label="Queue" active={queueOpen} onClick={() => setQueueOpen(true)}>
            <ListMusic size={18} />
          </FeatureButton>
          <FeatureButton label="Share" onClick={() => push('Track shared', 'success')}>
            <Share2 size={18} />
          </FeatureButton>
          <FeatureButton label="Download" onClick={() => push('Saved for offline', 'success')}>
            <Download size={18} />
          </FeatureButton>
        </div>

        {lyricsOpen ? (
          <div className="mt-6 flex-1 overflow-y-auto rounded-lg bg-black/20 p-4">
            <div className="space-y-4">
              {LYRICS.map((line, lineIndex) => (
                <p
                  key={line}
                  className={cn(
                    'font-display leading-[32px] transition-all',
                    lineIndex === activeLine ? 'text-[22px] text-white' : 'text-[20px] text-white/45',
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <BottomSheet open={queueOpen} onClose={() => setQueueOpen(false)} title="Up next">
        <ul className="space-y-1">
          {queue.map((song, songIndex) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => {
                  playSong(song)
                  setQueueOpen(false)
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-surface-2',
                  songIndex === index && 'bg-primary-soft',
                )}
              >
                <Artwork gradient={song.gradient} size={44} icon={<Music2 size={16} />} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate font-body text-[14px] font-semibold', songIndex === index ? 'text-primary' : 'text-text')}>
                    {song.title}
                  </span>
                  <span className="block truncate font-body text-[12px] text-text-muted">{song.artist}</span>
                </span>
                {songIndex === index ? <span className="font-body text-[11px] font-semibold text-primary">Playing</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  )
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function FeatureButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 font-body text-[11px] transition-colors',
        active ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
      {label}
    </button>
  )
}
