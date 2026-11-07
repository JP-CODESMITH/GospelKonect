import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, UserCheck, UserPlus } from 'lucide-react'
import { Avatar } from '../components/app-shell'
import { PostCard } from '../components/post-card'
import { useAuth } from '../lib/auth'
import { followUser, getProfile, getUserPosts, unfollowUser } from '../lib/api'
import { errorText } from '../lib/format'
import type { Post, UserProfile } from '../lib/types'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/u/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [postTotal, setPostTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyFollow, setBusyFollow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextProfile, nextPosts] = await Promise.all([
        getProfile(username),
        getUserPosts(username, { limit: 20 }),
      ])
      setProfile(nextProfile)
      setPosts(nextPosts.items)
      setPostTotal(nextPosts.meta.total)
    } catch (err) {
      setError(errorText(err, 'Could not load this profile.'))
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleFollow() {
    if (!profile || busyFollow) return
    const next = !profile.isFollowing
    setBusyFollow(true)
    setError(null)
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: next,
            counts: {
              ...prev.counts,
              followers: Math.max(0, prev.counts.followers + (next ? 1 : -1)),
            },
          }
        : prev,
    )
    try {
      if (next) await followUser(profile.id)
      else await unfollowUser(profile.id)
    } catch (err) {
      setProfile(profile)
      setError(errorText(err, 'Could not update that follow.'))
    } finally {
      setBusyFollow(false)
    }
  }

  const isSelf = user?.id === profile?.id

  if (loading && !profile) {
    return <p className="py-16 text-center font-body text-[14px] text-muted">Loading profile…</p>
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-lowest px-6 py-16 text-center shadow-card">
        <p className="font-display text-lg font-bold text-ink">Profile unavailable</p>
        <p className="font-body text-[14px] text-muted">{error ?? 'This account could not be found.'}</p>
        <Link
          to="/feed"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 font-display text-[13px] font-semibold text-ink hover:bg-sunken"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col items-center rounded-hero border border-line bg-surface-lowest px-6 py-8 text-center shadow-card">
        <Avatar name={profile.name} avatar={profile.avatar} size={88} />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">{profile.name}</h1>
        <p className="mt-0.5 font-body text-[14px] text-muted">@{profile.username}</p>
        {profile.bio ? (
          <p className="mt-2 max-w-md font-body text-[15px] leading-7 text-on-surface-variant">
            {profile.bio}
          </p>
        ) : null}

        <div className="mt-5 grid w-full max-w-sm grid-cols-3 divide-x divide-line rounded-card border border-line bg-alabaster py-3">
          <Stat label="Posts" value={postTotal} />
          <Stat label="Followers" value={profile.counts.followers} />
          <Stat label="Following" value={profile.counts.following} />
        </div>

        {!isSelf ? (
          <button
            type="button"
            onClick={() => void toggleFollow()}
            disabled={busyFollow}
            aria-pressed={profile.isFollowing}
            className={cn(
              'mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-6 font-display text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              profile.isFollowing
                ? 'border border-line bg-transparent text-on-surface-variant hover:bg-sunken'
                : 'bg-cerulean text-white shadow-warm hover:opacity-90',
            )}
          >
            {profile.isFollowing ? (
              <>
                <UserCheck size={16} aria-hidden="true" />
                Following
              </>
            ) : (
              <>
                <UserPlus size={16} aria-hidden="true" />
                Follow
              </>
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 w-full cursor-pointer rounded-xl bg-error-container px-3 py-2.5 text-center font-body text-[13px] text-error"
          role="alert"
        >
          {error} Tap to retry.
        </button>
      ) : null}

      <h2 className="mt-6 mb-3 font-display text-lg font-bold text-ink">
        {isSelf ? 'Your posts' : `Posts by ${profile.name}`}
      </h2>

      {posts.length === 0 ? (
        <p className="rounded-card border border-line bg-surface-lowest px-6 py-12 text-center font-body text-[14px] text-muted shadow-card">
          No posts yet.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => {
                setPosts((prev) => prev.filter((item) => item.id !== id))
                setPostTotal((prev) => Math.max(0, prev - 1))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-xl font-extrabold text-ink">{value}</span>
      <span className="mt-0.5 font-body text-[12px] text-muted">{label}</span>
    </div>
  )
}
