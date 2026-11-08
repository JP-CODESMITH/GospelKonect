import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { songs, type Song } from '../data/mock'

interface PlayerValue {
  queue: Song[]
  index: number
  current: Song | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  liked: Set<string>
  fullOpen: boolean
  queueOpen: boolean
  lyricsOpen: boolean
  playSong: (song: Song, nextQueue?: Song[]) => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  toggleLike: (id: string) => void
  isLiked: (id: string) => boolean
  openFull: () => void
  closeFull: () => void
  setQueueOpen: (open: boolean) => void
  toggleLyrics: () => void
}

const PlayerContext = createContext<PlayerValue | null>(null)

/**
 * Builds a short, gentle chord bed as a WAV blob so the player has real audio
 * to play offline. It is intentionally a sample — swap `src` for a CDN track
 * when the media service is ready.
 */
function createSampleTrack(): string {
  const sampleRate = 22050
  const seconds = 24
  const frames = sampleRate * seconds
  const channels = 1
  const bytesPerSample = 2
  const dataSize = frames * channels * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }

  write(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, dataSize, true)

  const chords = [
    [261.63, 329.63, 392.0],
    [196.0, 246.94, 392.0],
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
  ]

  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate
    const chord = chords[Math.floor((t / 6) % chords.length)] ?? chords[0]!
    let sample = 0
    for (const freq of chord) {
      sample += Math.sin(2 * Math.PI * freq * t) * 0.14
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.04
    }
    const tremolo = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.12 * t)
    const envelope = Math.max(0, Math.min(1, t / 2, (seconds - t) / 2))
    const value = Math.max(-1, Math.min(1, sample * tremolo * envelope))
    view.setInt16(44 + i * bytesPerSample, Math.round(value * 0x7fff), true)
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Song[]>(songs)
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(24)
  const [volume, setVolumeState] = useState(0.9)
  const [liked, setLiked] = useState<Set<string>>(new Set([songs[0]!.id, songs[2]!.id]))
  const [fullOpen, setFullOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sampleUrlRef = useRef<string | null>(null)
  const queueRef = useRef(queue)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume
    audioRef.current = audio

    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
    }
    const onEnded = () => {
      const length = queueRef.current.length
      if (length > 0) setIndex((current) => (current + 1) % length)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('ended', onEnded)
      if (sampleUrlRef.current) URL.revokeObjectURL(sampleUrlRef.current)
      audioRef.current = null
    }
    // Volume is applied in its own effect; the element is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!isPlaying) {
      audio.pause()
      return
    }
    if (!audio.src) {
      const url = createSampleTrack()
      sampleUrlRef.current = url
      audio.src = url
    }
    void audio.play().catch(() => setIsPlaying(false))
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setProgress(0)
    if (isPlayingRef.current) void audio.play().catch(() => setIsPlaying(false))
  }, [index])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const current = queue[index] ?? null

  const playSong = useCallback(
    (song: Song, nextQueue?: Song[]) => {
      const list = nextQueue ?? (queue.some((item) => item.id === song.id) ? queue : [song, ...queue])
      const nextIndex = Math.max(0, list.findIndex((item) => item.id === song.id))
      setQueue(list)
      setIndex(nextIndex)
      setProgress(0)
      setIsPlaying(true)
    },
    [queue],
  )

  const togglePlay = useCallback(() => setIsPlaying((value) => !value), [])

  const next = useCallback(() => {
    setIndex((value) => (queueRef.current.length ? (value + 1) % queueRef.current.length : 0))
  }, [])

  const previous = useCallback(() => {
    setIndex((value) => {
      const length = queueRef.current.length
      return length ? (value - 1 + length) % length : 0
    })
  }, [])

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio) return
      const clamped = Math.max(0, Math.min(seconds, duration || 0))
      audio.currentTime = clamped
      setProgress(clamped)
    },
    [duration],
  )

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.max(0, Math.min(1, value)))
  }, [])

  const toggleLike = useCallback((id: string) => {
    setLiked((prev) => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }, [])

  const isLiked = useCallback((id: string) => liked.has(id), [liked])

  const value = useMemo<PlayerValue>(
    () => ({
      queue,
      index,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      liked,
      fullOpen,
      queueOpen,
      lyricsOpen,
      playSong,
      togglePlay,
      next,
      previous,
      seek,
      setVolume,
      toggleLike,
      isLiked,
      openFull: () => setFullOpen(true),
      closeFull: () => setFullOpen(false),
      setQueueOpen,
      toggleLyrics: () => setLyricsOpen((value) => !value),
    }),
    [
      queue,
      index,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      liked,
      fullOpen,
      queueOpen,
      lyricsOpen,
      playSong,
      togglePlay,
      next,
      previous,
      seek,
      setVolume,
      toggleLike,
      isLiked,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerValue {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside <PlayerProvider>')
  return context
}
