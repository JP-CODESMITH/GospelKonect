import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw, Sparkles } from 'lucide-react'
import { Composer } from '../components/composer'
import { PostCard } from '../components/post-card'
import { getFeed } from '../lib/api'
import { errorText } from '../lib/format'
import type { Post } from '../lib/types'

export const Route = createFileRoute('/_app/feed')({
  component: FeedPage,
})

const PAGE_SIZE = 20

function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFirst = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await getFeed({ limit: PAGE_SIZE })
      setPosts(page.items)
      setCursor(page.meta.nextCursor)
    } catch (err) {
      setError(errorText(err, 'Could not load your feed.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const page = await getFeed({ cursor, limit: PAGE_SIZE })
      setPosts((prev) => {
        const seen = new Set(prev.map((post) => post.id))
        return [...prev, ...page.items.filter((post) => !seen.has(post.id))]
      })
      setCursor(page.meta.nextCursor)
    } catch (err) {
      setError(errorText(err, 'Could not load more posts.'))
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loading, loadingMore])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Feeds</h1>
          <p className="mt-1 font-body text-[14px] text-muted">Latest from your circles</p>
        </div>
        <button
          type="button"
          onClick={() => void loadFirst()}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-lowest text-ink transition-colors hover:bg-sunken"
          aria-label="Refresh feed"
        >
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <Composer onCreated={(post) => setPosts((prev) => [post, ...prev])} />

      {error ? (
        <button
          type="button"
          onClick={() => void loadFirst()}
          className="mt-4 w-full cursor-pointer rounded-xl bg-error-container px-3 py-2.5 text-center font-body text-[13px] text-error"
          role="alert"
        >
          {error} Tap to retry.
        </button>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-body text-[14px] text-muted">Loading your feed…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface-lowest px-6 py-16 text-center shadow-card">
          <Sparkles size={28} className="text-outline" aria-hidden="true" />
          <p className="font-display text-lg font-bold text-ink">Your feed is quiet</p>
          <p className="max-w-sm font-body text-[14px] text-muted">
            Follow people in People or share the first post to get things moving.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => setPosts((prev) => prev.filter((item) => item.id !== id))}
            />
          ))}
        </div>
      )}

      {cursor && !loading ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface-lowest px-6 font-display text-[14px] font-semibold text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
