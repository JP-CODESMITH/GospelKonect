import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Flame, Heart, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react'
import { Avatar } from './app-shell'
import { useAuth } from '../lib/auth'
import {
  createComment,
  deleteComment,
  deletePost,
  listComments,
  mediaUrl,
  removeReaction,
  setReaction,
} from '../lib/api'
import type { Comment, Post, ReactionType } from '../lib/types'
import { errorText, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'

const REACTIONS: { type: ReactionType; label: string; icon: typeof Heart }[] = [
  { type: 'LIKE', label: 'Like', icon: Heart },
  { type: 'AMEN', label: 'Amen', icon: Flame },
  { type: 'LOVE', label: 'Love', icon: Sparkles },
]

function withReaction(post: Post, next: ReactionType | null): Post {
  const reactions = { ...post.reactions }
  if (post.viewerReaction) {
    reactions[post.viewerReaction] = Math.max(0, reactions[post.viewerReaction] - 1)
  }
  if (next) reactions[next] += 1
  return { ...post, reactions, viewerReaction: next }
}

export function PostCard({
  post: initialPost,
  onDeleted,
}: {
  post: Post
  onDeleted?: (id: string) => void
}) {
  const { user } = useAuth()
  const [post, setPost] = useState(initialPost)
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  const react = useCallback(async (type: ReactionType) => {
    const previous = post
    const next: ReactionType | null = post.viewerReaction === type ? null : type
    setPost((current) => withReaction(current, next))
    try {
      const state = next
        ? await setReaction(post.id, next)
        : await removeReaction(post.id)
      setPost((current) => ({
        ...current,
        reactions: state.reactions,
        viewerReaction: state.viewerReaction,
      }))
    } catch (err) {
      setPost(previous)
      setError(errorText(err, 'Could not update your reaction.'))
    }
  }, [post])

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    setError(null)
    try {
      const page = await listComments(post.id, { limit: 50 })
      setComments(page.items)
    } catch (err) {
      setError(errorText(err, 'Could not load comments.'))
    } finally {
      setCommentsLoading(false)
    }
  }, [post.id])

  useEffect(() => {
    if (showComments) void loadComments()
  }, [showComments, loadComments])

  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = commentDraft.trim()
    if (!content || sending) return
    setSending(true)
    setError(null)
    try {
      const created = await createComment(post.id, content)
      setComments((prev) => [...prev, created])
      setPost((current) => ({ ...current, commentCount: current.commentCount + 1 }))
      setCommentDraft('')
    } catch (err) {
      setError(errorText(err, 'Could not post your comment.'))
    } finally {
      setSending(false)
    }
  }

  async function removeComment(comment: Comment) {
    setComments((prev) => prev.filter((item) => item.id !== comment.id))
    setPost((current) => ({ ...current, commentCount: Math.max(0, current.commentCount - 1) }))
    try {
      await deleteComment(comment.id)
    } catch (err) {
      setError(errorText(err, 'Could not delete that comment.'))
      void loadComments()
    }
  }

  async function removePost() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await deletePost(post.id)
      onDeleted?.(post.id)
    } catch (err) {
      setError(errorText(err, 'Could not delete that post.'))
    }
  }

  const isOwner = user?.id === post.author.id
  const long = post.content.length > 280

  return (
    <article className="rounded-card border border-line bg-surface-lowest p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <Link
          to="/u/$username"
          params={{ username: post.author.username }}
          aria-label={`View ${post.author.name}'s profile`}
        >
          <Avatar name={post.author.name} avatar={post.author.avatar} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: post.author.username }}
            className="block truncate font-display text-[15px] font-semibold text-ink hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="truncate font-body text-[12px] text-muted">
            @{post.author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {isOwner ? (
          <button
            type="button"
            onClick={() => void removePost()}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-error"
            aria-label="Delete this post"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p
        className={cn(
          'mt-3 whitespace-pre-wrap font-body text-[15px] leading-7 text-ink',
          !expanded && long && 'line-clamp-8',
        )}
      >
        {post.content}
      </p>
      {long && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 cursor-pointer font-display text-[13px] font-semibold text-cerulean hover:underline"
        >
          Read more
        </button>
      ) : null}

      {post.media.length > 0 ? (
        <div className="mt-3 space-y-2">
          {post.media.map((media) =>
            media.kind === 'IMAGE' ? (
              <img
                key={media.id}
                src={mediaUrl(media.url)}
                alt="Post attachment"
                className="max-h-96 w-full rounded-xl border border-line bg-sunken object-cover"
                loading="lazy"
              />
            ) : (
              <video
                key={media.id}
                src={mediaUrl(media.url)}
                controls
                className="max-h-96 w-full rounded-xl border border-line bg-black"
              />
            ),
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {REACTIONS.map((reaction) => {
          const active = post.viewerReaction === reaction.type
          const Icon = reaction.icon
          return (
            <button
              key={reaction.type}
              type="button"
              onClick={() => void react(reaction.type)}
              aria-pressed={active}
              aria-label={`${active ? 'Remove' : 'Add'} ${reaction.label} reaction`}
              className={cn(
                'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-display text-[12px] font-semibold transition-colors',
                active
                  ? 'bg-cerulean text-white'
                  : 'bg-sunken text-on-surface-variant hover:bg-lavender',
              )}
            >
              <Icon size={15} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
              {post.reactions[reaction.type]}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="ml-auto inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-body text-[12px] text-on-surface-variant transition-colors hover:bg-sunken"
        >
          <MessageCircle size={15} aria-hidden="true" />
          {post.commentCount}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-error-container px-3 py-2 text-[13px] text-error">
          {error}
        </p>
      ) : null}

      {showComments ? (
        <div className="mt-3 border-t border-line pt-3">
          {commentsLoading ? (
            <p className="py-2 text-center font-body text-[13px] text-muted">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center font-body text-[13px] text-muted">
              No comments yet. Start the conversation.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className={cn(
                    'flex items-start gap-2',
                    comment.parentId ? 'ml-8 border-l-2 border-line pl-3' : '',
                  )}
                >
                  <Avatar name={comment.author.name} avatar={comment.author.avatar} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13px] font-semibold text-ink">
                      {comment.author.name}{' '}
                      <span className="font-body font-normal text-muted">
                        @{comment.author.username} · {timeAgo(comment.createdAt)}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap font-body text-[14px] leading-6 text-ink">
                      {comment.content}
                    </p>
                  </div>
                  {user?.id === comment.author.id ? (
                    <button
                      type="button"
                      onClick={() => void removeComment(comment)}
                      className="mt-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-error"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submitComment} className="mt-3 flex items-center gap-2">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Write a comment…"
              maxLength={1000}
              className="h-10 flex-1 rounded-full border border-line bg-alabaster px-4 font-body text-[14px] text-ink placeholder:text-faint focus:border-cerulean focus:outline-none"
              aria-label="Write a comment"
            />
            <button
              type="submit"
              disabled={sending || commentDraft.trim() === ''}
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-cerulean text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Post comment"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : null}
    </article>
  )
}
