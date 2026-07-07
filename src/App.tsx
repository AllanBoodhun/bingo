import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'
import { AuthScreen } from './features/auth/AuthScreen'
import { BibliothequeScreen } from './features/bibliotheque/BibliothequeScreen'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return null
  }

  return session ? <BibliothequeScreen /> : <AuthScreen />
}

export default App
