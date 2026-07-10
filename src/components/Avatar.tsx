import { avatarColor, initials } from '../utils/format'

// Shows the uploaded profile picture when `src` is set, otherwise a coloured
// circle with the person's initials.
export function Avatar({ name, size = 44, src }: { name: string; size?: number; src?: string }) {
  if (src) {
    return (
      <img
        className="avatar"
        src={src}
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
