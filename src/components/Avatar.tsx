import { avatarColor, initials } from '../utils/format'
import { safeImageSrc } from '../lib/image'

// Shows the uploaded profile picture when `src` is set, otherwise a coloured
// circle with the person's initials.
export function Avatar({ name, size = 44, src }: { name: string; size?: number; src?: string }) {
  const safe = safeImageSrc(src)
  if (safe) {
    return (
      <img
        className="avatar"
        src={safe}
        alt={name}
        style={{ width: size, height: size, objectFit: 'cover' }}
      />
    )
  }
  const base = avatarColor(name)
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        // Subtle two-tone fill (lighter top-left → deeper bottom-right) so
        // initials avatars read with depth instead of a flat disc.
        background: `linear-gradient(145deg, color-mix(in srgb, ${base} 88%, #fff), ${base} 52%, color-mix(in srgb, ${base} 82%, #000))`,
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </div>
  )
}
