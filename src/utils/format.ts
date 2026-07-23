// On-brand "sage" avatar palette — varied for distinguishing people, but cohesive
// eucalyptus / sky-blue / warm-sand wellness tones.
// Warm, wellness-first initials palette — sage / teal / clay / sand / olive.
// Kept deliberately in-family so avatars never clash with the app canvas
// (also used by the share-card exports).
const AVATAR_COLORS = [
  '#4f8265', // eucalyptus sage
  '#5f8497', // soft sky blue
  '#c07a52', // warm clay
  '#6f9a86', // muted green
  '#4d7c8a', // deep teal
  '#b5893f', // amber ochre
  '#7f9a68', // olive
  '#c2895e', // terracotta sand
]

export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Compact absolute date + time for a single line, e.g. "Jul 12, 3:45 PM".
export function stamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Friendly day heading for grouping: "Today" / "Yesterday" / "Fri, Jul 12"
// (adds the year for entries from a previous year).
export function dayHeading(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
