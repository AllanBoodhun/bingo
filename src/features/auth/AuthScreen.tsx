import { useState, type FormEvent } from 'react'
import { obtenirSession, inscrire, connecter, nettoyerJoueursInvite } from '../../services/auth.service'
import { Button } from '../../components/Button'
import './AuthScreen.scss'

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

      // Capturé AVANT le signUp/signInWithPassword : un invité qui rejoint une partie
      // anonymement (signInAnonymously, écran "Rejoindre") puis se connecte ici à un
      // compte réel change d'`auth_user_id` — Supabase émet une identité entièrement
      // nouvelle, jamais une migration de l'ancienne. Le jeton de cette ancienne
      // session reste valide indépendamment du succès de l'appel ci-dessous (capturé
      // maintenant, utilisé seulement après un succès confirmé) : sert au nettoyage
      // ci-dessous, pour ne jamais supprimer une partie en cours sur une simple
      // tentative de connexion ratée (mot de passe erroné, etc.).
      const {
        data: { session: sessionAvant },
      } = await obtenirSession()

      if (mode === 'signup') {
        const { data, error } = await inscrire(trimmedEmail, password)
        if (error) {
          setMessage(friendlyErrorMessage(error.message))
          return
        } else if (!data.session && (data.user?.identities?.length ?? 0) === 0) {
          setMessage(friendlyErrorMessage('already registered'))
          return
        }
      } else {
        const { error } = await connecter(trimmedEmail, password)
        if (error) {
          setMessage(friendlyErrorMessage(error.message))
          return
        }
      }

      // Uniquement si l'identité PRÉCÉDENTE était un invité anonyme (jamais pour un
      // compte réel qui change simplement d'email/mot de passe) : ses éventuelles
      // lignes `joueurs` deviennent orphelines (jeton local perdu, plus jamais
      // ré-atteignables par l'app) tout en continuant à compter dans le plafond de 6
      // joueurs d'une partie — les supprimer maintenant reclaim ce(s) slot(s).
      if (sessionAvant?.user.is_anonymous) {
        await nettoyerJoueursInvite(sessionAvant)
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
