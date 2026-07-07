import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './AuthScreen.css'

type Mode = 'login' | 'signup'

function friendlyErrorMessage(rawMessage: string): string {
  if (/invalid login credentials/i.test(rawMessage)) {
    return 'Identifiant ou mot de passe incorrect.'
  }
  if (/already registered/i.test(rawMessage)) {
    return 'Un compte existe déjà avec cet identifiant — essaie de te connecter.'
  }
  return "Un souci est survenu, réessaie dans un instant."
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const trimmedEmail = email.trim()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password })
        if (error) {
          setMessage(friendlyErrorMessage(error.message))
        } else if (!data.session && (data.user?.identities?.length ?? 0) === 0) {
          setMessage(friendlyErrorMessage('already registered'))
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        if (error) {
          setMessage(friendlyErrorMessage(error.message))
        }
      }
    } catch {
      setMessage(friendlyErrorMessage(''))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-screen">
      <h1 className="auth-screen__title">bingo</h1>
      <p className="auth-screen__subtitle">
        {mode === 'signup' ? 'Crée ton compte pour sauvegarder tes grilles.' : 'Content de te revoir !'}
      </p>

      <form className="auth-screen__form" onSubmit={handleSubmit}>
        <label className="auth-screen__label" htmlFor="email">
          Identifiant
        </label>
        <input
          id="email"
          className="auth-screen__input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className="auth-screen__label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          className="auth-screen__input"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {message && <p className="auth-screen__message">{message}</p>}

        <Button type="submit" variant="primary" disabled={pending}>
          {mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
        </Button>
      </form>

      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMode(mode === 'signup' ? 'login' : 'signup')
          setMessage(null)
        }}
      >
        {mode === 'signup' ? "J'ai déjà un compte" : "Je n'ai pas encore de compte"}
      </Button>
    </main>
  )
}
