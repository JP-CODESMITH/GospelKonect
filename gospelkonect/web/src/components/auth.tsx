import { useId, type ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * Auth primitives, ported 1:1 from the mobile fellowship flow
 * (mobile/app/(auth)/login.tsx and register.tsx).
 *
 * Mobile -> web mapping:
 *   height: 52            -> h-13            (3.25rem)
 *   borderRadius: 16      -> rounded-input   (--radius-input)
 *   height: 52 pill       -> h-13 rounded-full
 *   borderRadius: 9999    -> rounded-full
 *   borderWidth: 2 focus  -> focus:border-2
 */

const controlBase =
  'h-13 w-full rounded-input border border-line bg-alabaster px-4 font-body text-[15px] text-ink transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-faint hover:border-outline-variant focus:border-2 focus:border-cerulean-deep focus:bg-surface-lowest focus:shadow-[0_0_0_4px_rgb(30_58_138/0.10)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export function AuthField({
  label,
  type = 'text',
  placeholder,
  autoComplete,
  value,
  onChange,
  invalid,
}: {
  label: string
  type?: 'text' | 'email' | 'password'
  placeholder: string
  autoComplete: string
  value: string
  onChange: (next: string) => void
  invalid?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 ml-1 block font-display text-[13px] leading-4 font-semibold text-on-surface"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(controlBase, invalid && 'border-error focus:border-error')}
      />
      {invalid ? (
        <p id={`${id}-error`} className="mt-1.5 ml-1 text-[13px] text-error">
          {label} is required.
        </p>
      ) : null}
    </div>
  )
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-xl bg-error-container px-3 py-2.5 text-center text-[13px] leading-[18px] text-error"
    >
      {message}
    </p>
  )
}

export function AuthPrimaryButton({
  children,
  type,
  busy,
  className,
}: {
  children: ReactNode
  type?: 'submit' | 'button'
  busy?: boolean
  className?: string
}) {
  return (
    <button
      type={type ?? 'submit'}
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn(
        'h-13 w-full cursor-pointer rounded-full bg-on-surface px-6 font-display text-[15px] leading-5 font-bold tracking-[0.02em] text-on-primary transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {busy ? 'Please wait…' : children}
    </button>
  )
}

export function OrDivider() {
  return (
    <div className="my-3 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-outline-variant" />
      <span className="font-body text-[13px] text-outline">or</span>
      <span className="h-px flex-1 bg-outline-variant" />
    </div>
  )
}

export function AuthAlternate({
  options,
}: {
  options: Array<{ label: string; onPick: () => void }>
}) {
  return (
    <div className="grid gap-3">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={o.onPick}
          className="h-13 w-full cursor-pointer rounded-full border border-outline-variant bg-surface-lowest px-6 font-display text-[15px] leading-5 font-semibold text-on-surface transition-colors duration-200 hover:bg-sunken active:scale-[0.98]"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function AuthNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-xl border border-prayer-line bg-prayer-bg px-3 py-2.5 text-center text-[13px] leading-[18px] text-prayer-ink"
    >
      {message}
    </p>
  )
}