import { useState } from 'react'
import { useStore } from '../store/AppStore'
import { Sheet } from './Sheet'

// Log today's weight. Private to the user (never shown to buddies) — it only
// powers the "kg lost" figure in the Year in Review and recap.
export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { postWeight, latestWeight } = useStore()
  const last = latestWeight()
  const [value, setValue] = useState('')

  const submit = () => {
    const kg = parseFloat(value.replace(',', '.'))
    if (!Number.isFinite(kg) || kg <= 0) return
    postWeight(kg)
    setValue('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h2>Log your weight</h2>
      <p style={{ marginTop: 4 }}>
        Private to you — it never shows to your buddies. It just lets your recaps show real progress.
      </p>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Weight (kg)</label>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          placeholder={last != null ? String(last) : 'e.g. 82.5'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          autoFocus
        />
        {last != null && (
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Last logged: {last} kg</p>
        )}
      </div>
      <button className="btn" disabled={!value.trim()} onClick={submit}>Save weight</button>
    </Sheet>
  )
}
