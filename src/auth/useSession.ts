import { useEffect, useState } from 'react'
import { auth } from '../services/api'
import { USE_SUPABASE } from '../lib/env'

interface SessionState {
  loading: boolean
  userId: string | null
}

// Tracks the Supabase auth session. In local demo mode this resolves
// immediately with no session (the local store handles "who am I").
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: USE_SUPABASE,
    userId: null,
  })

  useEffect(() => {
    if (!USE_SUPABASE) return
    let active = true
    auth.currentUserId().then((id) => {
      if (active) setState({ loading: false, userId: id })
    })
    const unsub = auth.onAuthChange((id) => {
      if (active) setState({ loading: false, userId: id })
    })
    return () => {
      active = false
      unsub()
    }
  }, [])

  return state
}
