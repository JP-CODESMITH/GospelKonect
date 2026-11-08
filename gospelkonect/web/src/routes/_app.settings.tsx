import { useState, type ReactNode } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Bell,
  Check,
  CreditCard,
  Download,
  Globe,
  Headphones,
  Info,
  Languages,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Sun,
  User,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme, type ThemeMode } from '../store/theme'
import { Card, ListRow, Select, Toggle, useToast } from '../components/ui'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function SettingsPage() {
  const { status, signOut } = useAuth()
  const { mode, setMode } = useTheme()
  const { push } = useToast()
  const navigate = useNavigate()

  const [pushNotifications, setPushNotifications] = useState(true)
  const [followAlerts, setFollowAlerts] = useState(true)
  const [prayerReminders, setPrayerReminders] = useState(true)
  const [eventReminders, setEventReminders] = useState(true)
  const [wifiOnly, setWifiOnly] = useState(true)
  const [quality, setQuality] = useState('normal')
  const [language, setLanguage] = useState('english')

  async function handleSignOut() {
    if (status === 'authenticated') {
      await signOut()
    }
    push('Signed out', 'success')
    void navigate({ to: '/' })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Settings</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          Make GospelKonect feel like home.
        </p>
      </div>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Account
        </h2>
        <Card className="overflow-hidden">
          <ListRow
            icon={<User size={18} aria-hidden="true" />}
            title="Profile"
            subtitle="Name, photo and bio"
            onClick={() => void navigate({ to: '/profile' })}
          />
          <ListRow
            icon={<Lock size={18} aria-hidden="true" />}
            title="Privacy"
            subtitle="Blocked accounts and visibility"
            onClick={() => push('Privacy settings coming soon')}
          />
          <ListRow
            icon={<CreditCard size={18} aria-hidden="true" />}
            title="Giving history"
            subtitle="Receipts and recurring gifts"
            onClick={() => push('Giving history coming soon')}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Notifications
        </h2>
        <Card className="overflow-hidden">
          <ToggleRow
            icon={<Bell size={18} aria-hidden="true" />}
            title="Push notifications"
            subtitle="Gentle nudges, never noise"
            checked={pushNotifications}
            onChange={setPushNotifications}
          />
          <ToggleRow
            icon={<User size={18} aria-hidden="true" />}
            title="New followers"
            checked={followAlerts}
            onChange={setFollowAlerts}
          />
          <ToggleRow
            icon={<Bell size={18} aria-hidden="true" />}
            title="Prayer reminders"
            checked={prayerReminders}
            onChange={setPrayerReminders}
          />
          <ToggleRow
            icon={<Bell size={18} aria-hidden="true" />}
            title="Event reminders"
            checked={eventReminders}
            onChange={setEventReminders}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Appearance
        </h2>
        <Card className="p-4">
          <p className="font-body text-[13px] font-semibold text-text">Theme</p>
          <p className="font-body text-[12px] text-text-muted">Choose light, dark or match your device.</p>
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
            {THEMES.map((theme) => {
              const Icon = theme.icon
              const active = mode === theme.value
              return (
                <button
                  key={theme.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(theme.value)}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center gap-2 rounded-md border p-3 font-body text-[12px] font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-surface text-text-muted hover:bg-surface-2',
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {theme.label}
                  {active ? (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Check size={10} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Playback &amp; downloads
        </h2>
        <Card className="space-y-3 p-4">
          <Select label="Playback quality" value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="low">Low — saves data</option>
            <option value="normal">Normal — balanced</option>
            <option value="high">High — best sound</option>
          </Select>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-body text-[14px] font-medium text-text">
              <Download size={18} className="text-primary" aria-hidden="true" />
              Download over Wi-Fi only
            </span>
            <Toggle checked={wifiOnly} onChange={setWifiOnly} label="Download over Wi-Fi only" />
          </div>
          <ListRow
            icon={<Headphones size={18} aria-hidden="true" />}
            title="Downloaded content"
            subtitle="Manage offline sermons and songs"
            onClick={() => push('Download manager coming soon')}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Language &amp; region
        </h2>
        <Card className="p-4">
          <Select label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="english">English</option>
            <option value="pidgin">Nigerian Pidgin</option>
            <option value="yoruba">Yoruba</option>
            <option value="igbo">Igbo</option>
            <option value="hausa">Hausa</option>
          </Select>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Support
        </h2>
        <Card className="overflow-hidden">
          <ListRow
            icon={<Globe size={18} aria-hidden="true" />}
            title="Help &amp; support"
            onClick={() => push('Support centre coming soon')}
          />
          <ListRow
            icon={<Languages size={18} aria-hidden="true" />}
            title="Community guidelines"
            onClick={() => push('Guidelines coming soon')}
          />
          <ListRow
            icon={<Info size={18} aria-hidden="true" />}
            title="About GospelKonect"
            value="v1.0.0"
            onClick={() => push('Built for worship, prayer and community')}
          />
        </Card>
      </section>

      <Card className="overflow-hidden">
        <ListRow
          icon={<LogOut size={18} aria-hidden="true" />}
          title="Log out"
          danger
          chevron={false}
          onClick={() => void handleSignOut()}
        />
      </Card>
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-body text-[15px] font-medium text-text">{title}</span>
        {subtitle ? <span className="block font-body text-[12px] text-text-muted">{subtitle}</span> : null}
      </span>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
