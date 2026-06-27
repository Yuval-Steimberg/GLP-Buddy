import { useState } from 'react'
import { useStore } from '../store/AppStore'
import { Sheet } from './Sheet'
import { MILESTONE_TYPES, MILESTONE_EMOJI } from '../constants'
import type { MilestoneType } from '../types'

export function MilestoneSheet({
  open,
  onClose,
  relationshipId,
}: {
  open: boolean
  onClose: () => void
  relationshipId: string
}) {
  const { addMilestone } = useStore()
  const [type, setType] = useState<MilestoneType>('Started medication')
  const [note, setNote] = useState('')

  const submit = () => {
    addMilestone(relationshipId, type, note)
    setNote('')
    setType('Started medication')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h2>Add a milestone</h2>
      <p style={{ marginTop: 4 }}>It appears on your shared timeline and your buddy gets a nudge.</p>
      <div className="option-grid" style={{ marginBottom: 16 }}>
        {MILESTONE_TYPES.map((m) => (
          <button
            key={m}
            className={`option${type === m ? ' selected' : ''}`}
            onClick={() => setType(m)}
          >
            {MILESTONE_EMOJI[m]} {m}
          </button>
        ))}
      </div>
      <div className="field">
        <label>Add a note {type === 'Custom milestone' ? '' : '(optional)'}</label>
        <textarea
          className="input"
          style={{ minHeight: 70 }}
          placeholder={type === 'Custom milestone' ? 'Describe your milestone…' : 'Say a little more…'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        className="btn"
        disabled={type === 'Custom milestone' && note.trim().length === 0}
        onClick={submit}
      >
        Add to timeline
      </button>
    </Sheet>
  )
}
