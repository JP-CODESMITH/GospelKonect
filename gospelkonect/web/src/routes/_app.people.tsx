import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Search, Users } from 'lucide-react'
import { Avatar } from '../components/app-shell'
import { followUser, searchUsers, unfollowUser } from '../lib/api'
import { errorText } from '../lib/format'
import type { DiscoverUser } from '../lib/types'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/people')({
  component: PeoplePage,
})

function PeoplePage() {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<DiscoverUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const page = await searchUsers({ search: search.trim() || undefined, limit: 30 })
      setPeople(page.items)
    } catch (err) {
      setError(errorText(err, 'Could not load people.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [load, query])

  async function toggleFollow(person: DiscoverUser) {
    if (busyId) return
    const next = !person.isFollowing
    setBusyId(person.id)
    setError(null)
    setPeople((prev) =>
      prev.map((item) => (item.id === person.id ? { ...item, isFollowing: next } : item)),
    )
    try {
      if (next) await followUser(person.id)
      else await unfollowUser(person.id)
    } catch (err) {
      setPeople((prev) =>
        prev.map((item) =>
          item.id === person.id ? { ...item, isFollowing: person.isFollowing } : item,
        ),
      )
      setError(errorText(err, 'Could not update that follow.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">People</h1>
      <p className="mt-1 font-body text-[14px] text-muted">Find your circle</p>

      <div className="mt-4 flex h-12 items-center gap-2 rounded-full border border-line bg-surface-lowest px-4">
        <Search size={18} className="text-outline" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or @handle"
          autoCapitalize="none"
          autoCorrect="off"
          className="h-full flex-1 bg-transparent font-body text-[15px] text-ink placeholder:text-faint focus:outline-none"
          aria-label="Search people"
        />
      </div>

      {error ? (
        <button
          type="button"
          onClick={() => void load(query)}
          className="mt-4 w-full cursor-pointer rounded-xl bg-error-container px-3 py-2.5 text-center font-body text-[13px] text-error"
          role="alert"
        >
          {error} Tap to retry.
        </button>
      ) : null}

      {loading && people.length === 0 ? (
        <p className="py-16 text-center font-body text-[14px] text-muted">Finding people…</p>
      ) : people.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-line bg-surface-lowest px-6 py-16 text-center shadow-card">
          <Users size={28} className="text-outline" aria-hidden="true" />
          <p className="font-display text-lg font-bold text-ink">No one found</p>
          <p className="font-body text-[14px] text-muted">Try a different name or handle.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {people.map((person) => (
            <li
              key={person.id}
              className="rounded-card border border-line bg-surface-lowest p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <Link
                  to="/u/$username"
                  params={{ username: person.username }}
                  aria-label={`View ${person.name}'s profile`}
                >
                  <Avatar name={person.name} avatar={person.avatar} size={44} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$username"
                    params={{ username: person.username }}
                    className="block truncate font-display text-[15px] font-semibold text-ink hover:underline"
                  >
                    {person.name}
                  </Link>
                  <p className="truncate font-body text-[13px] text-muted">
                    @{person.username}
                    {person.isFollowedBy ? ' · follows you' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleFollow(person)}
                  disabled={busyId === person.id}
                  aria-pressed={person.isFollowing}
                  className={cn(
                    'inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-full px-4 font-display text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    person.isFollowing
                      ? 'border border-line bg-transparent text-on-surface-variant hover:bg-sunken'
                      : 'bg-on-surface text-white hover:opacity-90',
                  )}
                >
                  {person.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
              {person.bio ? (
                <p className="mt-3 line-clamp-2 font-body text-[14px] leading-6 text-on-surface-variant">
                  {person.bio}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
