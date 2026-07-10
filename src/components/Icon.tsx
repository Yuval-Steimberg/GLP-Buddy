import { useId } from 'react'
import type { CSSProperties } from 'react'

export type IconName =
  | 'home' | 'users' | 'growth' | 'chat' | 'profile' | 'bell'
  | 'lock' | 'heart' | 'shield' | 'spark' | 'logout' | 'clock' | 'search' | 'doc'
  | 'mail' | 'send' | 'check' | 'download' | 'share' | 'close' | 'plus'
  | 'camera' | 'image'

// Clean, consistent line icons (currentColor, 24px grid) used in place of
// emoji for a more professional, branded look.
export function Icon({ name, size = 22, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    'aria-hidden': true,
  }
  switch (name) {
    case 'home':
      return <svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /></svg>
    case 'users':
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" />
          <path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.1" />
        </svg>
      )
    case 'growth':
      return (
        <svg {...p}>
          <path d="M12 21v-8" />
          <path d="M12 13c-.5-3-3-4.8-6-4.8.2 3 2.6 4.8 6 4.8z" />
          <path d="M12 11.5c.3-3.4 2.9-5.5 6.2-5.5-.2 3.4-2.8 5.5-6.2 5.5z" />
        </svg>
      )
    case 'chat':
      return <svg {...p}><path d="M20.5 11.3a7.5 7.5 0 0 1-10.6 6.8L4 19.8l1.7-5.2A7.5 7.5 0 1 1 20.5 11.3z" /></svg>
    case 'profile':
      return <svg {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
    case 'bell':
      return <svg {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z" /><path d="M10.2 20a2 2 0 0 0 3.6 0" /></svg>
    case 'lock':
      return <svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
    case 'heart':
      return <svg {...p}><path d="M12 20.5C12 20.5 3.5 15 3.5 8.8 3.5 6 5.6 4 8.2 4c1.6 0 3 .9 3.8 2.2C12.8 4.9 14.2 4 15.8 4 18.4 4 20.5 6 20.5 8.8c0 6.2-8.5 11.7-8.5 11.7z" /></svg>
    case 'shield':
      return <svg {...p}><path d="M12 3l7 2.8v5.4c0 4.3-2.9 7.3-7 8.8-4.1-1.5-7-4.5-7-8.8V5.8z" /><path d="M9 11.6l2 2 4-4.2" /></svg>
    case 'spark':
      return <svg {...p}><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16l-1.8-4.5L5 9.7l5.2-1.8z" /></svg>
    case 'logout':
      return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5 16.5 16.5" /></svg>
    case 'doc':
      return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>
    case 'mail':
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 5.5L20 7" /></svg>
    case 'send':
      return <svg {...p}><path d="M21 11.5 4 4l3 7.5L4 19z" /><path d="M7 11.5h14" /></svg>
    case 'check':
      return <svg {...p}><path d="M20 6 9 17l-5-5" /></svg>
    case 'download':
      return <svg {...p}><path d="M12 3v12" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4 20.5h16" /></svg>
    case 'share':
      return <svg {...p}><path d="M12 15V4" /><path d="m8 7.5 4-4 4 4" /><path d="M6 11H5a1.6 1.6 0 0 0-1.6 1.6v6.8A1.6 1.6 0 0 0 5 21h14a1.6 1.6 0 0 0 1.6-1.6v-6.8A1.6 1.6 0 0 0 19 11h-1" /></svg>
    case 'close':
      return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
    case 'plus':
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
    case 'camera':
      return <svg {...p}><path d="M4 8.5a2 2 0 0 1 2-2h1.5l1.2-1.8a1 1 0 0 1 .83-.45h5.94a1 1 0 0 1 .83.45L18.5 6.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" transform="translate(0 0.5)" /><circle cx="12" cy="13.5" r="3.4" /></svg>
    case 'image':
      return <svg {...p}><rect x="3" y="4.5" width="18" height="15" rx="2.4" /><circle cx="8.5" cy="10" r="1.6" /><path d="m5 18 4.5-4.5a1.6 1.6 0 0 1 2.2 0L18 20" /></svg>
  }
}

// App logo: a rounded "dusk" gradient badge holding a chat bubble with two
// linked dots — two pen pals in conversation.
export function BrandMark({ size = 30 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5e8c74" />
          <stop offset="0.52" stopColor="#7ba890" />
          <stop offset="1" stopColor="#a7c6bd" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12.5" fill={`url(#${id})`} />
      {/* Speech bubble */}
      <path
        d="M11 13.6c0-1.5 1.2-2.7 2.7-2.7h12.6c1.5 0 2.7 1.2 2.7 2.7v8c0 1.5-1.2 2.7-2.7 2.7H19l-4.9 4.1c-.7.6-1.7.1-1.7-.8v-3.3h.3c-.9 0-1.7-.8-1.7-1.9z"
        fill="#fff"
      />
      {/* Two linked pen-pal dots */}
      <circle cx="17.2" cy="17.6" r="2.05" fill="#5e8c74" />
      <circle cx="23.2" cy="17.6" r="2.05" fill="#c2955f" />
      <rect x="18.9" y="16.85" width="3.6" height="1.5" rx="0.75" fill="#7ba890" />
    </svg>
  )
}
