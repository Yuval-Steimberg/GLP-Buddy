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
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </div>
  )
}
