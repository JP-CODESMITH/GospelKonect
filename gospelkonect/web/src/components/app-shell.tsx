import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Compass,
  Flame,
  BookOpen,
  Headphones,
  HeartHandshake,
  House,
  Megaphone,
  Search,
  User,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { mediaUrl } from '../lib/api'
import {
  dayLabel,
  events,
  guestUser,
  monthLabel,
  notifications,
  people,
} from '../data/mock'
import { Avatar, Button, IconButton } from './ui'
import { PersonRow } from './cards'
import { FullPlayer, MiniPlayer } from './player'
import { cn } from '../lib/cn'

type NavPath =
  | '/home'
  | '/discover'
  | '/connect'
  | '/events'
  | '/library'
  | '/sermons'
  | '/profile'

const SIDEBAR: { to: NavPath; label: string; icon: typeof House }[] = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/connect', label: 'Connect', icon: HeartHandshake },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/library', label: 'Library', icon: Headphones },
  { to: '/sermons', label: 'Sermons', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: User },
]

const TITLES: Record<string, string> = {
  '/home': 'Home',
  '/discover': 'Discover',
  '/connect': 'Connect',
  '/events': 'Events',
  '/profile': 'Profile',
  '/library': 'Library',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/sermons': 'Sermons',
  '/search': 'Search',
  '/give': 'Give',
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/u/')) return 'Profile'
  if (pathname.startsWith('/events/')) return 'Event'
  if (pathname.startsWith('/church/')) return 'Church'
  return TITLES[pathname] ?? 'GospelKonect'
}

function isActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [scrolled, setScrolled] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const name = user?.name ?? guestUser.name
  const username = user?.username ?? guestUser.username
  const avatar = user?.avatar ? mediaUrl(user.avatar) : null
  const unread = notifications.filter((item) => item.unread).length
  const isTab = pathname === '/connect' || ['/home', '/discover', '/events', '/profile'].includes(pathname)
  const title = titleFor(pathname)

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Desktop sidebar: full at lg, icon rail at md */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface px-3 py-5 md:flex md:w-[72px] lg:w-60 lg:px-4">
        <Link to="/home" className="flex items-center gap-2.5 px-1.5" aria-label="GospelKonect home">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-signature text-white">
            <Flame size={18} aria-hidden="true" />
          </span>
          <span className="hidden font-display text-[17px] font-bold tracking-[-0.01em] lg:block">
            <span className="text-text">Gospel</span>
            <span className="text-primary">Konect</span>
          </span>
        </Link>

        <nav className="mt-7 flex flex-1 flex-col gap-1" aria-label="Primary">
          {SIDEBAR.map((item) => (
            <SideItem key={item.to} {...item} active={isActive(pathname, item.to)} />
          ))}
        </nav>

        <div className="mt-4 border-t border-border pt-3">
          <Button
            size="sm"
            fullWidth
            className="hidden lg:inline-flex"
            leftIcon={<Megaphone size={15} aria-hidden="true" />}
            onClick={() => void navigate({ to: '/connect' })}
          >
            Share a testimony
          </Button>
          <Link
            to="/profile"
            className="mt-3 flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-2 md:justify-center lg:justify-start"
            aria-label="Your profile"
          >
            <Avatar name={name} src={avatar} gradient={guestUser.gradient} size={34} />
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate font-body text-[13px] font-semibold text-text">{name}</span>
              <span className="block truncate font-body text-[11px] text-text-muted">@{username}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top app bar */}
      <header
        className={cn(
          'sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-bg/85 px-4 backdrop-blur-xl transition-colors md:hidden',
          scrolled ? 'border-border' : 'border-transparent',
        )}
      >
        {isTab ? (
          <Link to="/home" className="flex items-center gap-2" aria-label="GospelKonect home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-signature text-white">
              <Flame size={16} aria-hidden="true" />
            </span>
            <span className="font-display text-[16px] font-bold tracking-[-0.01em]">
              <span className="text-text">Gospel</span>
              <span className="text-primary">Konect</span>
            </span>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <IconButton label="Go back" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft size={20} aria-hidden="true" />
            </IconButton>
            <h1 className="truncate font-display text-[17px] font-semibold text-text">{title}</h1>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <Link
            to="/search"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-2"
          >
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link
            to="/notifications"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-2"
          >
            <Bell size={20} aria-hidden="true" />
            {unread > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />
            ) : null}
          </Link>
        </div>
      </header>

      <main className="md:pl-[72px] lg:pl-60">
        <div className="mx-auto flex max-w-[1120px] gap-6 px-4 pb-40 pt-4 sm:px-6 md:pb-28 lg:px-8">
          <div className="min-w-0 flex-1">
            {offline ? <OfflineBanner /> : null}
            <div key={pathname} className="animate-fade-rise">
              {children}
            </div>
          </div>
          <aside className="hidden w-80 shrink-0 lg:block" aria-label="Highlights">
            <RightRail />
          </aside>
        </div>
      </main>

      {/* Mobile bottom tab bar with raised Connect */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        <div className="safe-bottom mx-auto flex max-w-md items-end justify-around px-2 pt-2">
          <TabLink to="/home" label="Home" icon={House} active={pathname === '/home'} />
          <TabLink to="/discover" label="Discover" icon={Compass} active={pathname === '/discover'} />
          <div className="relative -mt-7 flex flex-1 flex-col items-center">
            <Link
              to="/connect"
              aria-label="Connect"
              aria-current={pathname === '/connect' ? 'page' : undefined}
              className="flex h-14 w-14 items-center justify-center rounded-full gradient-signature text-white shadow-raised ring-4 ring-accent-soft transition-transform active:scale-95"
            >
              <HeartHandshake size={24} aria-hidden="true" />
            </Link>
            <span
              className={cn(
                'mt-1 font-body text-[11px] font-medium',
                pathname === '/connect' ? 'text-primary' : 'text-text-muted',
              )}
            >
              Connect
            </span>
          </div>
          <TabLink to="/events" label="Events" icon={CalendarDays} active={pathname === '/events'} />
          <TabLink to="/profile" label="Profile" icon={User} active={pathname === '/profile'} />
        </div>
      </nav>

      <MiniPlayer />
      <FullPlayer />
    </div>
  )
}

function SideItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: NavPath
  label: string
  icon: typeof House
  active: boolean
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-11 items-center gap-3 rounded-md px-3 font-body text-[14px] font-medium transition-colors md:justify-center lg:justify-start',
        active ? 'bg-primary-soft text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text',
      )}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  )
}

function TabLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: NavPath
  label: string
  icon: typeof House
  active: boolean
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 transition-colors',
        active ? 'text-primary' : 'text-text-muted',
      )}
    >
      <span className="relative">
        {active ? (
          <span className="absolute -top-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />
        ) : null}
        <Icon size={22} className={active ? 'fill-primary/10' : ''} aria-hidden="true" />
      </span>
      <span className="font-body text-[11px] font-medium">{label}</span>
    </Link>
  )
}

function OfflineBanner() {
  return (
    <div
      className="mb-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 font-body text-[12px] text-warning"
      role="status"
    >
      <WifiOff size={14} aria-hidden="true" />
      You&apos;re offline — showing saved content.
    </div>
  )
}

function RightRail() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-text">Upcoming events</h2>
          <Link to="/events" className="font-body text-[12px] font-semibold text-primary">
            See all
          </Link>
        </div>
        <ul className="mt-3 space-y-1">
          {events.slice(0, 3).map((event) => (
            <li key={event.id}>
              <Link
                to="/events/$id"
                params={{ id: event.id }}
                className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-surface-2"
              >
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-primary-soft text-primary">
                  <span className="font-body text-[9px] font-bold uppercase">{monthLabel(event.date)}</span>
                  <span className="font-display text-[16px] font-bold leading-none">{dayLabel(event.date)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-body text-[13px] font-semibold text-text">{event.title}</span>
                  <span className="block truncate font-body text-[11px] text-text-muted">{event.venue}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-text">Suggested people</h2>
          <Link to="/connect" className="font-body text-[12px] font-semibold text-primary">
            See all
          </Link>
        </div>
        <div className="mt-1">
          {people.slice(0, 3).map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </div>
      </section>

      <Link
        to="/give"
        className="block rounded-lg gradient-signature p-4 text-white shadow-raised"
      >
        <p className="font-display text-[16px] font-semibold">Give with a cheerful heart</p>
        <p className="mt-0.5 font-body text-[12px] text-white/80">
          Support your church, a ministry or an artist.
        </p>
      </Link>
    </div>
  )
}
