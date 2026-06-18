import { avatarColor, initials } from '../utils/format'

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
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
