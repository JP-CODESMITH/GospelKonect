import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Button({
  children,
  variant = 'primary',
  href,
  className,
}: {
  children: ReactNode
  variant?: 'primary' | 'amber' | 'ghost'
  href?: string
  className?: string
}) {
  const base =
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 font-display text-[15px] font-semibold leading-5 transition-all duration-200 active:scale-[0.98] cursor-pointer'
  const styles = {
    primary: 'bg-cerulean text-white shadow-warm hover:opacity-90',
    amber: 'bg-sungold text-white shadow-warm hover:opacity-90',
    ghost: 'border border-line bg-transparent text-ink hover:bg-sunken',
  } as const
  if (href) {
    return (
      <a href={href} className={cn(base, styles[variant], className)}>
        {children}
      </a>
    )
  }
  return <button className={cn(base, styles[variant], className)}>{children}</button>
}

export function Chip({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center rounded-full px-4 font-display text-[13px] font-semibold',
        active ? 'bg-cerulean text-white shadow-warm' : 'bg-sunken text-muted',
      )}
    >
      {children}
    </span>
  )
}

export function PrayerBadge({ count }: { count: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-prayer-line bg-prayer-bg px-3 py-1 font-display text-[13px] font-semibold text-prayer-ink">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 21c-4.5-2.2-8-5.4-8-10a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 4.6-3.5 7.8-8 10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {count} praying
    </span>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-white shadow-card', className)}>
      {children}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy?: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-sungold">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {copy ? <p className="mt-4 text-[17px] leading-7 text-muted">{copy}</p> : null}
    </div>
  )
}
