import type { ReactNode } from 'react'

// Render **bold** inline; leave everything else as text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/)
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{part}</span>
  })
}

// Lightweight formatter for the Coach's replies: paragraphs, bullet lists and
// bold — so we don't show raw markdown (**, -) in the bubble. Used by both the
// dedicated Coach screen and the "Hey Coach" replies inside the buddy chat.
export function CoachText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let key = 0
  const flush = () => {
    if (list.length) {
      const items = list
      blocks.push(
        <ul key={key++} className="coach-list">
          {items.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of text.split('\n')) {
    const bullet = raw.match(/^\s*[-*]\s+(.*)/)
    if (bullet) { list.push(bullet[1]); continue }
    flush()
    if (raw.trim() === '') continue
    blocks.push(<p key={key++} className="coach-p">{inline(raw)}</p>)
  }
  flush()
  return <>{blocks}</>
}
