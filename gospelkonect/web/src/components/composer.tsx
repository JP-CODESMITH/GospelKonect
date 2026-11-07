import { useRef, useState } from 'react'
import { BookOpen, ImagePlus, Send, X } from 'lucide-react'
import { Avatar } from './app-shell'
import { useAuth } from '../lib/auth'
import { createPost, uploadMedia } from '../lib/api'
import type { Post } from '../lib/types'
import { errorText } from '../lib/format'
import { cn } from '../lib/cn'

export function Composer({ onCreated }: { onCreated: (post: Post) => void }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [scripture, setScripture] = useState('')
  const [showScripture, setShowScripture] = useState(false)
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [mediaNames, setMediaNames] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || mediaIds.length >= 4) return
    setUploading(true)
    setError(null)
    try {
      const media = await uploadMedia(file)
      setMediaIds((prev) => [...prev, media.id].slice(0, 4))
      setMediaNames((prev) => [...prev, file.name].slice(0, 4))
    } catch (err) {
      setError(errorText(err, 'Could not upload that file.'))
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = content.trim()
    if (!text || busy || uploading) return
    setBusy(true)
    setError(null)
    try {
      const body = scripture.trim() ? `${text}\n\n— ${scripture.trim()}` : text
      const created = await createPost(body, mediaIds.length ? mediaIds : undefined)
      onCreated(created)
      setContent('')
      setScripture('')
      setShowScripture(false)
      setMediaIds([])
      setMediaNames([])
    } catch (err) {
      setError(errorText(err, 'Could not publish your post.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-line bg-surface-lowest p-4 shadow-card"
    >
      <div className="flex gap-3">
        <Avatar name={user?.name ?? 'You'} avatar={user?.avatar} size={40} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share a testimony, prayer, or verse…"
          rows={3}
          maxLength={1000}
          className="min-h-[84px] flex-1 resize-y rounded-xl border border-line bg-alabaster p-3 font-body text-[15px] leading-7 text-ink placeholder:text-faint focus:border-cerulean focus:outline-none"
          aria-label="Post text"
        />
      </div>

      {showScripture ? (
        <input
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
          placeholder="Scripture citation, e.g. Psalm 46:10"
          maxLength={120}
          className="mt-3 h-11 w-full rounded-xl border border-line bg-alabaster px-3 font-body text-[14px] text-ink placeholder:text-faint focus:border-cerulean focus:outline-none"
          aria-label="Scripture citation"
        />
      ) : null}

      {mediaNames.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {mediaNames.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 font-body text-[12px] text-on-surface-variant"
            >
              {name}
              <button
                type="button"
                onClick={() => {
                  setMediaIds((prev) => prev.filter((_, i) => i !== index))
                  setMediaNames((prev) => prev.filter((_, i) => i !== index))
                }}
                className="cursor-pointer text-muted hover:text-error"
                aria-label={`Remove ${name}`}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-error-container px-3 py-2 text-[13px] text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowScripture((v) => !v)}
          className={cn(
            'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 font-display text-[13px] font-semibold transition-colors',
            showScripture
              ? 'bg-cerulean text-white'
              : 'bg-sunken text-on-surface-variant hover:bg-lavender',
          )}
          aria-pressed={showScripture}
        >
          <BookOpen size={15} aria-hidden="true" />
          Scripture
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || mediaIds.length >= 4}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-sunken px-3 font-display text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-lavender disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus size={15} aria-hidden="true" />
          {uploading ? 'Uploading…' : 'Photo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => void addFile(e)}
          className="hidden"
        />
        <span className="ml-auto font-body text-[12px] text-faint">{content.length}/1000</span>
        <button
          type="submit"
          disabled={busy || uploading || content.trim() === ''}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-cerulean px-4 font-display text-[13px] font-semibold text-white shadow-warm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={15} aria-hidden="true" />
          {busy ? 'Sharing…' : 'Share'}
        </button>
      </div>
    </form>
  )
}
