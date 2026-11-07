import { useEffect, useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, Home, LogOut, User, Users } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getUnreadCount, mediaUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { initials } from '../lib/format'

type NavPath = '/feed' | '/people' | '/notifications'

const NAV: { to: NavPath; label: string; icon: typeof Home }[] = [
  { to: '/feed', label: 'Feed', icon: Home },
  { to: '/people', label: 'People', icon: Users },
  { to: '/notifications', label: 'Alerts', icon: Bell },
]

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  to: NavPath
  label: string
  icon: typeof Home
  active: boolean
  badge?: number
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center gap-3 rounded-full px-4 py-3 font-display text-[15px] font-semibold transition-colors',
        active ? 'bg-cerulean text-white shadow-warm' : 'text-ink/80 hover:bg-sunken',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-rose px-1.5 py-0.5 text-[11px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

function ProfileNavItem({
  username,
  active,
  onNavigate,
}: {
  username: string
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      to="/u/$username"
      params={{ username }}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-full px-4 py-3 font-display text-[15px] font-semibold transition-colors',
        active ? 'bg-cerulean text-white shadow-warm' : 'text-ink/80 hover:bg-sunken',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <User size={19} aria-hidden="true" />
      <span>Profile</span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    const load = () => {
      getUnreadCount()
        .then((res) => {
          if (!cancelled) setUnread(res.count)
        })
        .catch(() => {
          /* badge is best-effort */
        })
    }
    load()
    const timer = window.setInterval(load, 45_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [status, pathname])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-alabaster">
        <p className="font-body text-[15px] text-muted">Loading your fellowship…</p>
      </div>
    )
  }

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-alabaster px-4">
        <div className="w-full max-w-md rounded-hero border border-line bg-surface-lowest p-8 text-center shadow-card">
          <p className="font-display text-[13px] font-semibold tracking-[0.14em] text-sungold uppercase">
            GospelKonect
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">Sign in to continue</h1>
          <p className="mt-2 text-[15px] text-muted">
            Your feed, circles and alerts live behind a quiet sign-in.
          </p>
          <Link
            to="/"
            hash="join"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-cerulean px-6 font-display text-[15px] font-semibold text-white shadow-warm transition-opacity hover:opacity-90"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  const profileActive = pathname === `/u/${user.username}`

  return (
    <div className="min-h-screen bg-alabaster">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface-lowest px-4 py-6 md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2" aria-label="GospelKonect home">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-[17px] font-bold tracking-tight text-ink">
            GospelKonect
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5" aria-label="Primary">
          {NAV.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
              badge={item.to === '/notifications' ? unread : undefined}
            />
          ))}
          <ProfileNavItem username={user.username} active={profileActive} />
        </nav>

        <div className="mt-4 rounded-card border border-line bg-alabaster p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} avatar={user.avatar} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[14px] font-semibold text-ink">
                {user.name}
              </p>
              <p className="truncate font-body text-[12px] text-muted">@{user.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-outline-variant px-3 py-2 font-display text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-sunken"
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-alabaster/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link to="/feed" className="flex items-center gap-2" aria-label="GospelKonect feed">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-display text-[16px] font-bold text-ink">GospelKonect</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-lowest text-ink"
            aria-label={`Alerts${unread > 0 ? `, ${unread} unread` : ''}`}
          >
            <Bell size={18} aria-hidden="true" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface-lowest px-3 text-ink"
            aria-expanded={menuOpen}
          >
            <Avatar name={user.name} avatar={user.avatar} size={24} />
            <span className="max-w-[7rem] truncate font-display text-[13px] font-semibold">
              {user.name}
            </span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="sticky top-[57px] z-30 border-b border-line bg-surface-lowest px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1.5">
            {NAV.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                badge={item.to === '/notifications' ? unread : undefined}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            <ProfileNavItem
              username={user.username}
              active={profileActive}
              onNavigate={() => setMenuOpen(false)}
            />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-3 rounded-full px-4 py-3 font-display text-[15px] font-semibold text-error hover:bg-sunken"
            >
              <LogOut size={19} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <main className="pb-24 md:pl-64 md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-alabaster/95 px-2 py-2 backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        <BottomLink to="/feed" label="Feed" icon={Home} active={pathname === '/feed'} />
        <BottomLink to="/people" label="People" icon={Users} active={pathname === '/people'} />
        <BottomLink
          to="/notifications"
          label="Alerts"
          icon={Bell}
          active={pathname === '/notifications'}
          badge={unread}
        />
        <ProfileBottomLink username={user.username} active={profileActive} />
      </nav>
    </div>
  )
}

function BottomLink({
  to,
  label,
  icon: Icon,
  active,
  badge,
}: {
  to: NavPath
  label: string
  icon: typeof Home
  active: boolean
  badge?: number
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-display text-[11px] font-semibold',
        active ? 'text-cerulean' : 'text-muted',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative">
        <Icon size={21} aria-hidden="true" />
        {badge && badge > 0 ? (
          <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  )
}

function ProfileBottomLink({ username, active }: { username: string; active: boolean }) {
  return (
    <Link
      to="/u/$username"
      params={{ username }}
      className={cn(
        'flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-display text-[11px] font-semibold',
        active ? 'text-cerulean' : 'text-muted',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <User size={21} aria-hidden="true" />
      Profile
    </Link>
  )
}

export function Avatar({
  name,
  avatar,
  size = 40,
  className,
}: {
  name: string
  avatar?: string | null
  size?: number
  className?: string
}) {
  if (avatar) {
    return (
      <img
        src={mediaUrl(avatar)}
        alt={`${name}'s profile picture`}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full bg-sunken object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-cerulean font-display font-bold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4) }}
    >
      {initials(name)}
    </span>
  )
}
