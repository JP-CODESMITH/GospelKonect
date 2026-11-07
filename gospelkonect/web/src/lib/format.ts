/** Small display helpers shared by the feed, alerts and profile screens. */

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 45) return 'Just now'
  if (seconds < 90) return '1m ago'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: days > 365 ? 'numeric' : undefined,
  })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return `${parts[0]!.charAt(0)}${parts.at(-1)!.charAt(0)}`.toUpperCase()
}

export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
