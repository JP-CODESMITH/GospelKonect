import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, Check, ChevronDown, MapPin } from 'lucide-react'
import {
  MONTHS,
  WEEKDAYS,
  events,
  formatDate,
  type EventItem,
} from '../data/mock'
import { EventCard } from '../components/cards'
import {
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Skeleton,
} from '../components/ui'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/events')({
  component: EventsPage,
})

const CITIES = ['Abuja', 'Lagos', 'Port Harcourt', 'Kaduna'] as const
type City = (typeof CITIES)[number]

interface DayCell {
  iso: string
  weekday: string
  day: string
  hasEvent: boolean
}

interface CalendarCell {
  iso: string
  day: number
  inMonth: boolean
  hasEvent: boolean
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function EventsPage() {
  const [city, setCity] = useState<City>('Abuja')
  const [cityOpen, setCityOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [days, setDays] = useState<DayCell[]>([])
  const [calendar, setCalendar] = useState<CalendarCell[]>([])
  const [monthIndex, setMonthIndex] = useState(0)
  const [year, setYear] = useState(0)

  useEffect(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    const strip: DayCell[] = []
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(base)
      date.setDate(base.getDate() + index)
      const iso = toIso(date)
      strip.push({
        iso,
        weekday: WEEKDAYS[date.getDay()] ?? '',
        day: String(date.getDate()).padStart(2, '0'),
        hasEvent: events.some((event) => event.city === city && event.date === iso),
      })
    }
    setDays(strip)

    const now = new Date()
    const month = now.getMonth()
    const currentYear = now.getFullYear()
    setMonthIndex(month)
    setYear(currentYear)
    const first = new Date(currentYear, month, 1)
    const start = new Date(currentYear, month, 1 - first.getDay())
    const cells: CalendarCell[] = []
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const iso = toIso(date)
      cells.push({
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        hasEvent: events.some((event) => event.city === city && event.date === iso),
      })
    }
    setCalendar(cells)
  }, [city])

  const filtered = events.filter(
    (event) => event.city === city && (!selectedDate || event.date === selectedDate),
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCityOpen(true)}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-4 font-body text-[13px] font-semibold text-text transition-colors hover:bg-surface-2"
        >
          <MapPin size={15} className="text-primary" aria-hidden="true" />
          {city}, Nigeria
          <ChevronDown size={15} className="text-text-muted" aria-hidden="true" />
        </button>
        <IconButton
          label={view === 'list' ? 'Show calendar view' : 'Show list view'}
          variant="surface"
          pressed={view === 'calendar'}
          onClick={() => setView((value) => (value === 'list' ? 'calendar' : 'list'))}
        >
          <CalendarDays size={18} aria-hidden="true" />
        </IconButton>
      </div>

      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Events</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          Gatherings and worship nights near you.
        </p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {days.length === 0
          ? Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-[72px] w-14 shrink-0 rounded-md" />
            ))
          : days.map((day) => {
              const active = selectedDate === day.iso
              return (
                <button
                  key={day.iso}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${day.weekday} ${day.day}${day.hasEvent ? ', events' : ''}`}
                  onClick={() => setSelectedDate((current) => (current === day.iso ? null : day.iso))}
                  className={cn(
                    'relative flex h-[72px] w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border transition-colors',
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-border bg-surface text-text hover:bg-surface-2',
                  )}
                >
                  <span className={cn('font-body text-[11px] font-semibold uppercase', active ? 'text-white/80' : 'text-text-muted')}>
                    {day.weekday}
                  </span>
                  <span className="font-display text-[18px] font-bold">{day.day}</span>
                  {day.hasEvent ? (
                    <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
      </div>

      {view === 'calendar' ? (
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <p className="mb-3 text-center font-display text-[16px] font-semibold text-text">
            {MONTHS[monthIndex]} {year}
          </p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="font-body text-[10px] font-semibold uppercase text-text-muted">
                {weekday.slice(0, 2)}
              </span>
            ))}
            {calendar.map((cell) => {
              const active = selectedDate === cell.iso
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!cell.inMonth}
                  aria-pressed={active}
                  aria-label={`${cell.day}${cell.hasEvent ? ', events' : ''}`}
                  onClick={() => setSelectedDate((current) => (current === cell.iso ? null : cell.iso))}
                  className={cn(
                    'relative flex aspect-square cursor-pointer items-center justify-center rounded-md font-body text-[13px] transition-colors',
                    !cell.inMonth && 'pointer-events-none opacity-30',
                    active ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-2',
                  )}
                >
                  {cell.day}
                  {cell.hasEvent ? (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {selectedDate ? (
        <div className="flex items-center gap-2">
          <Chip active onClick={() => setSelectedDate(null)}>
            {formatDate(selectedDate)} · clear
          </Chip>
          <span className="font-body text-[12px] text-text-muted">{filtered.length} event(s)</span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={38} aria-hidden="true" />}
          title="No events here yet"
          description="Try another day or city — new gatherings are added often."
          action={
            selectedDate ? (
              <Button variant="secondary" onClick={() => setSelectedDate(null)}>
                Show all events
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((event: EventItem) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <BottomSheet open={cityOpen} onClose={() => setCityOpen(false)} title="Choose a city">
        <div className="space-y-2">
          {CITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setCity(option)
                setSelectedDate(null)
                setCityOpen(false)
              }}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-md border px-4 py-3 font-body text-[14px] transition-colors',
                city === option
                  ? 'border-primary bg-primary-soft font-semibold text-primary'
                  : 'border-border text-text hover:bg-surface-2',
              )}
            >
              {option}, Nigeria
              {city === option ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
