import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  LoaderCircle,
  Mic,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { initials } from '../lib/format'
import type { Gradient } from '../data/mock'

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-13 px-6 text-[15px]',
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-card hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  accent: 'bg-accent text-[#2b1a00] shadow-card hover:brightness-95',
  danger: 'bg-danger text-white hover:brightness-95',
  soft: 'bg-primary-soft text-primary hover:brightness-95',
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  type = 'button',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-body font-semibold leading-5 transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    fullWidth && 'w-full',
    className,
  )
  if (href) {
    return (
      <a href={href} className={classes}>
        {leftIcon}
        {children}
        {rightIcon}
      </a>
    )
  }
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

export function IconButton({
  label,
  children,
  onClick,
  variant = 'plain',
  size = 'md',
  className,
  type = 'button',
  disabled,
  pressed,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  variant?: 'plain' | 'surface' | 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  pressed?: boolean
}) {
  const dimensions = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'
  const variants = {
    plain: 'text-text hover:bg-surface-2',
    surface: 'border border-border bg-surface text-text hover:bg-surface-2',
    primary: 'bg-primary text-on-primary hover:bg-primary-hover',
    ghost: 'bg-white/15 text-white backdrop-blur-md hover:bg-white/25',
  } as const
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-45',
        dimensions,
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Chips, tabs, segmented control                                     */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  active = false,
  onClick,
  className,
  icon,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  icon?: ReactNode
}) {
  const classes = cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 font-body text-[13px] font-medium transition-colors',
    active
      ? 'bg-primary text-on-primary shadow-card'
      : 'bg-surface-2 text-text-muted hover:bg-border',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'cursor-pointer')} aria-pressed={active}>
        {icon}
        {children}
      </button>
    )
  }
  return (
    <span className={classes}>
      {icon}
      {children}
    </span>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-1 rounded-full bg-surface-2 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 font-body text-[13px] font-semibold transition-all',
              active ? 'bg-surface text-primary shadow-card' : 'text-text-muted hover:text-text',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('no-scrollbar flex gap-5 overflow-x-auto border-b border-border', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative shrink-0 cursor-pointer pb-3 pt-1 font-body text-[14px] font-semibold transition-colors',
              active ? 'text-primary' : 'text-text-muted hover:text-text',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span className="ml-1 text-[12px] text-text-muted">{option.count}</span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Form fields                                                        */
/* ------------------------------------------------------------------ */

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label?: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={htmlFor} className="font-body text-[13px] font-semibold text-text">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 font-body text-[12px] text-danger" role="alert">
          <TriangleAlert size={13} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="font-body text-[12px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

const FIELD_CLASSES =
  'w-full rounded-md border border-border bg-surface-2 px-4 font-body text-[15px] text-text placeholder:text-text-muted transition-shadow focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60'

export function TextField({
  label,
  error,
  hint,
  icon,
  rightSlot,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  rightSlot?: ReactNode
  className?: string
}) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint}>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn(
            FIELD_CLASSES,
            'h-13',
            icon ? 'pl-11' : undefined,
            rightSlot ? 'pr-12' : undefined,
            error ? 'border-danger' : undefined,
            className,
          )}
          {...rest}
        />
        {rightSlot ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>
    </FieldShell>
  )
}

export function TextArea({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  hint?: string
  className?: string
}) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_CLASSES, 'min-h-28 resize-y py-3', error && 'border-danger', className)}
        {...rest}
      />
    </FieldShell>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search songs, sermons, churches…',
  onClick,
  readOnly,
  autoFocus,
  onSubmit,
  className,
}: {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  onClick?: () => void
  readOnly?: boolean
  autoFocus?: boolean
  onSubmit?: () => void
  className?: string
}) {
  return (
    <form
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
      role="search"
    >
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onClick={onClick}
        readOnly={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-full border border-border bg-surface-2 pl-11 pr-12 font-body text-[14px] text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <Mic size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
    </form>
  )
}

export function Select({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
  className?: string
}) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint}>
      <div className="relative">
        <select
          id={fieldId}
          className={cn(FIELD_CLASSES, 'h-13 cursor-pointer appearance-none pr-10', error && 'border-danger', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      </div>
    </FieldShell>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
}) {
  const generated = useId()
  const toggleId = id ?? generated
  return (
    <button
      id={toggleId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 font-body text-[13px] leading-5 text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
      />
      <span>{label}</span>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Avatars, badges, artwork                                           */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  src,
  gradient,
  size = 40,
  ring = false,
  badge,
  className,
}: {
  name: string
  src?: string | null
  gradient?: Gradient
  size?: number
  ring?: boolean
  badge?: ReactNode
  className?: string
}) {
  const [loaded, setLoaded] = useState(!src)
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <>
          {!loaded ? (
            <span
              className="skeleton absolute inset-0 rounded-full"
              aria-hidden="true"
            />
          ) : null}
          <img
            src={src}
            alt={`${name}'s profile picture`}
            width={size}
            height={size}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn('h-full w-full rounded-full object-cover', ring && 'ring-2 ring-accent ring-offset-2 ring-offset-bg')}
          />
        </>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-full w-full items-center justify-center rounded-full font-body font-semibold text-white',
            ring && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
          )}
          style={{
            fontSize: Math.max(11, size * 0.38),
            backgroundImage: gradient
              ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
              : 'linear-gradient(135deg, var(--primary), var(--accent))',
          }}
        >
          {initials(name)}
        </span>
      )}
      {badge ? <span className="absolute -bottom-0.5 -right-0.5">{badge}</span> : null}
    </span>
  )
}

export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: { name: string; src?: string | null; gradient?: Gradient }[]
  size?: number
  max?: number
}) {
  const visible = people.slice(0, max)
  const extra = people.length - visible.length
  return (
    <div className="flex items-center">
      {visible.map((person, index) => (
        <span
          key={`${person.name}-${index}`}
          className="rounded-full ring-2 ring-surface"
          style={{ marginLeft: index === 0 ? 0 : -size * 0.3 }}
        >
          <Avatar name={person.name} src={person.src} gradient={person.gradient} size={size} />
        </span>
      ))}
      {extra > 0 ? (
        <span
          className="inline-flex items-center justify-center rounded-full bg-surface-2 font-body text-[11px] font-semibold text-text-muted ring-2 ring-surface"
          style={{ width: size, height: size, marginLeft: -size * 0.3 }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'primary',
  className,
}: {
  children: ReactNode
  tone?: 'primary' | 'accent' | 'success' | 'danger' | 'neutral'
  className?: string
}) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
    neutral: 'bg-surface-2 text-text-muted',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Artwork({
  gradient,
  size,
  rounded = 'md',
  icon,
  label,
  src,
  alt,
  className,
}: {
  gradient: Gradient
  size?: number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  icon?: ReactNode
  label?: string
  src?: string | null
  alt?: string
  className?: string
}) {
  const [loaded, setLoaded] = useState(!src)
  const radius = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded]
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden', radius, className)}
      style={{ width: size, height: size, backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {src ? (
        <>
          {!loaded ? <span className="skeleton absolute inset-0" aria-hidden="true" /> : null}
          <img
            src={src}
            alt={alt ?? label ?? ''}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="h-full w-full object-cover"
          />
        </>
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/85">
          {icon}
          {label && !icon ? (
            <span className="font-display text-lg font-bold">{label.charAt(0)}</span>
          ) : null}
        </span>
      )}
      <span
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 75% 80%, rgba(0,0,0,0.25), transparent 50%)',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return (
    <Tag className={cn('rounded-lg border border-border bg-surface shadow-card', className)}>
      {children}
    </Tag>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-[20px] font-semibold leading-[26px] tracking-[-0.01em] text-text">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 font-body text-[13px] text-text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onClick,
  href,
  chevron = true,
  danger = false,
  className,
  rightSlot,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  value?: string
  onClick?: () => void
  href?: string
  chevron?: boolean
  danger?: boolean
  className?: string
  rightSlot?: ReactNode
}) {
  const content = (
    <>
      {icon ? (
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            danger ? 'bg-danger/12 text-danger' : 'bg-primary-soft text-primary',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate font-body text-[15px] font-medium', danger ? 'text-danger' : 'text-text')}>
          {title}
        </span>
        {subtitle ? <span className="block truncate font-body text-[12px] text-text-muted">{subtitle}</span> : null}
      </span>
      {value ? <span className="shrink-0 font-body text-[13px] text-text-muted">{value}</span> : null}
      {rightSlot}
      {chevron ? <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden="true" /> : null}
    </>
  )
  const classes = cn(
    'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
    (onClick || href) && 'cursor-pointer hover:bg-surface-2',
    className,
  )
  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }
  return <div className={classes}>{content}</div>
}

/* ------------------------------------------------------------------ */
/*  States                                                             */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <Skeleton className="h-14 w-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-primary/70">
        {icon ?? <Info size={38} aria-hidden="true" />}
      </div>
      <h3 className="mt-4 font-display text-[18px] font-semibold text-text">{title}</h3>
      {description ? <p className="mt-1.5 max-w-xs font-body text-[14px] leading-6 text-text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went off-key.',
  description = 'Please try again in a moment.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-danger/12 text-danger">
        <TriangleAlert size={38} aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-[18px] font-semibold text-text">{title}</h3>
      <p className="mt-1.5 max-w-xs font-body text-[14px] leading-6 text-text-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function ProgressBar({
  value,
  className,
  tone = 'accent',
}: {
  value: number
  className?: string
  tone?: 'accent' | 'primary'
}) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-border', className)}>
      <div
        className={cn('h-full rounded-full', tone === 'accent' ? 'bg-accent' : 'bg-primary')}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}

export function Slider({
  value,
  max,
  onChange,
  label,
  className,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
  className?: string
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <input
      type="range"
      min={0}
      max={max || 1}
      step={0.1}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={label}
      className={cn('gk-range h-1 w-full cursor-pointer appearance-none rounded-full', className)}
      style={{ background: `linear-gradient(to right, var(--accent) ${percent}%, var(--border) ${percent}%)` }}
    />
  )
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={cn('animate-spin', className)} aria-hidden="true" />
}

/* ------------------------------------------------------------------ */
/*  Overlays                                                           */
/* ------------------------------------------------------------------ */

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
}

function useDismiss(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const root = ref.current
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    window.setTimeout(() => ref.current?.focus(), 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose, ref])
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useDismiss(open, onClose, panelRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--gk-scrim)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Sheet'}
        tabIndex={-1}
        className={cn(
          'relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface px-5 pb-6 pt-3 shadow-raised animate-fade-rise',
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[20px] font-semibold text-text">{title}</h2>
            <IconButton label="Close" onClick={onClose} size="sm">
              <X size={18} aria-hidden="true" />
            </IconButton>
          </div>
        ) : null}
        {children}
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useDismiss(open, onClose, panelRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--gk-scrim)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-raised animate-fade-rise',
          className,
        )}
      >
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[20px] font-semibold text-text">{title}</h2>
            <IconButton label="Close" onClick={onClose} size="sm">
              <X size={18} aria-hidden="true" />
            </IconButton>
          </div>
        ) : null}
        {children}
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toasts                                                             */
/* ------------------------------------------------------------------ */

type ToastTone = 'info' | 'success' | 'error'
interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}
interface ToastValue {
  push: (message: string, tone?: ToastTone) => void
}
const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3000)
  }, [])

  const value = useMemo<ToastValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border px-4 py-2.5 font-body text-[13px] font-medium shadow-raised animate-fade-rise',
              toast.tone === 'success' && 'border-success/30 bg-success/15 text-success',
              toast.tone === 'error' && 'border-danger/30 bg-danger/15 text-danger',
              toast.tone === 'info' && 'border-border bg-surface text-text',
            )}
          >
            {toast.tone === 'success' ? (
              <Check size={15} aria-hidden="true" />
            ) : toast.tone === 'error' ? (
              <TriangleAlert size={15} aria-hidden="true" />
            ) : (
              <Info size={15} aria-hidden="true" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}

/* ------------------------------------------------------------------ */
/*  Landing-page compatibility exports                                 */
/* ------------------------------------------------------------------ */

export function PrayerBadge({ count }: { count: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent-soft px-3 py-1 font-body text-[13px] font-semibold text-success">
      <Check size={14} aria-hidden="true" />
      {count} praying
    </span>
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
      <p className="font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-[1.15] tracking-[-0.01em] text-text sm:text-4xl">
        {title}
      </h2>
      {copy ? <p className="mt-4 font-body text-[17px] leading-7 text-text-muted">{copy}</p> : null}
    </div>
  )
}
