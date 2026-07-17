import { useState } from 'react'
import { useStore } from '../store/AppStore'
import { Sheet } from './Sheet'

// Set a shared goal/challenge with a buddy (e.g. "log 5 meals this week").
// Either buddy can tally progress with a "+1" tap on the BuddyHome goal card.
export function GoalSheet({
  open,
  onClose,
  relationshipId,
}: {
  open: boolean
  onClose: () => void
  relationshipId: string
}) {
  const { createGoal } = useStore()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('5')

  const targetCount = parseInt(target, 10)
  const canSubmit = title.trim().length > 0 && Number.isFinite(targetCount) && targetCount > 0

  const submit = () => {
    if (!canSubmit) return
    createGoal(relationshipId, title.trim(), targetCount)
    setTitle('')
    setTarget('5')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h2>Set a shared goal</h2>
      <p style={{ marginTop: 4 }}>
        You and your buddy tally progress together — either of you can tap "+1" as you go.
      </p>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Goal</label>
        <input
          className="input"
          placeholder="e.g. Log 5 meals this week"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label>Target count</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
      </div>
      <button className="btn" disabled={!canSubmit} onClick={submit}>Set goal</button>
    </Sheet>
  )
}
