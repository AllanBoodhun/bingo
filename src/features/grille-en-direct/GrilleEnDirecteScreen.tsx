import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { creerCanal, retirerCanal } from '../../services/supabase.service'
import * as casesService from '../../services/cases.service'
import * as joueursService from '../../services/joueurs.service'
import * as partiesService from '../../services/parties.service'
import * as grillesService from '../../services/grilles.service'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { GridCell, type CaseGrille } from '../../components/GridCell'
import { useLienCopie } from '../../lib/useLienCopie'
import { construireLienPartie } from '../bibliotheque/utils'
import { GrilleAdversaireScreen } from './GrilleAdversaireScreen'
import './GrilleEnDirecteScreen.scss'

type Joueur = {
  id: string
  pseudo: string
  partieId: string
}

export type JoueurPartie = {
  id: string
  pseudo: string
}

// Alias conservé (nom historique de ce fichier) : forme identique à `CaseGrille`,
// désormais définie une seule fois dans le composant partagé `GridCell`.
type CaseJoueur = CaseGrille

type Vainqueur = {
  id: string
  pseudo: string
}

type StatutPartie = 'en_cours' | 'terminee'

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

const TOAST_DUREE_MS = 4000

type GrilleEnDirecteScreenProps = {
  joueur: Joueur
  codePartie: string
  // Absent pour un invité arrivé via lien de partie : il n'y a pas de Bibliothèque vers
  // laquelle revenir (même principe que PartieActiveScreen.onRetour).
  onRetourBibliotheque?: () => void
}

export function GrilleEnDirecteScreen({ joueur, codePartie, onRetourBibliotheque }: GrilleEnDirecteScreenProps) {
  const { copie: lienCopie, copier: copierLien } = useLienCopie()
  const lien = construireLienPartie(codePartie)
  const [cases, setCases] = useState<CaseJoueur[]>([])
  const [joueurs, setJoueurs] = useState<JoueurPartie[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [vainqueurs, setVainqueurs] = useState<Vainqueur[]>([])
  const [overlayFerme, setOverlayFerme] = useState(false)
  // Miroir des ids déjà connus, à jour de façon synchrone (contrairement à `vainqueurs`,
  // fermé sur sa valeur de montage dans le handler Realtime) : permet de distinguer un
  // véritable nouveau vainqueur d'un événement redélivré, sans rouvrir l'overlay à tort.
  const vainqueurIdsRef = useRef<Set<string>>(new Set())
  const [statutPartie, setStatutPartie] = useState<StatutPartie>('en_cours')
  const [estCreateur, setEstCreateur] = useState(false)
  const [clotureEnCours, setClotureEnCours] = useState(false)
  const [confirmationCloture, setConfirmationCloture] = useState(false)
  // Miroir synchrone de `joueurs`, même raison d'être que `vainqueurIdsRef` : les
  // handlers Realtime (toast de cochage, overlay de vainqueur) doivent résoudre un
  // pseudo à jour même pour un joueur arrivé après l'ouverture du canal — un `const`
  // fermé sur l'instantané chargé au montage ne le pourrait jamais.
  const joueursRef = useRef<JoueurPartie[]>([])

  // Joueur dont la grille est actuellement consultée (avatar cliqué dans la pile), ou
  // `null` quand on affiche sa propre grille. `casesAdversaire` est le contenu de cette
  // grille consultée, chargé une seule fois au clic puis tenu à jour par les mêmes
  // handlers Realtime que `cases` (AD-7 : pas de nouvel abonnement par joueur consulté).
  const [joueurConsulte, setJoueurConsulte] = useState<JoueurPartie | null>(null)
  const [casesAdversaire, setCasesAdversaire] = useState<CaseJoueur[]>([])
  const [chargementAdversaire, setChargementAdversaire] = useState(false)
  const [erreurAdversaire, setErreurAdversaire] = useState(false)
  // Miroir synchrone de `joueurConsulte`, même pattern que `joueursRef`/`vainqueurIdsRef` :
  // les handlers Realtime UPDATE `cases`/`phrases` (fermés sur leur valeur de montage)
  // doivent savoir à chaque événement quel joueur est consulté *maintenant*, pas au
  // moment où le canal a été ouvert.
  const joueurConsulteRef = useRef<JoueurPartie | null>(null)
  // Incrémenté à chaque consultation/retour : une réponse de fetch qui atterrit après
  // qu'on ait déjà changé de joueur consulté (ou qu'on soit revenu à sa grille) ne doit
  // jamais écraser un état plus récent.
  const consultationTokenRef = useRef(0)
  // Cochages reçus en direct pour le joueur actuellement consulté pendant que son fetch
  // initial est encore en vol (voir handleConsulterJoueur) — clé = id de la case.
  const casesAdversaireEventsRef = useRef<Map<string, boolean>>(new Map())

  function afficherToast(message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DUREE_MS)
  }

  function resoudrePseudo(joueurId: string): string {
    return joueursRef.current.find((j) => j.id === joueurId)?.pseudo ?? 'Un joueur'
  }

  async function handleConsulterJoueur(joueurCible: JoueurPartie) {
    const token = ++consultationTokenRef.current
    joueurConsulteRef.current = joueurCible
    setJoueurConsulte(joueurCible)
    setCasesAdversaire([])
    setChargementAdversaire(true)
    setErreurAdversaire(false)

    try {
      const { data, error } = await casesService.listerCasesDeJoueur(joueurCible.id)

      // Un retour à sa grille (ou un autre avatar cliqué entre-temps) a invalidé cette
      // requête pendant l'attente réseau — ne jamais appliquer une réponse obsolète.
      if (consultationTokenRef.current !== token) return

      // Même garde que pour sa propre grille (`casesData.length === 0` et carré parfait) :
      // un résultat vide ou non carré signale un problème plutôt qu'une grille légitimement
      // vide, sinon `repeat(0, 1fr)`/`repeat(NaN, 1fr)` en CSS produirait un écran cassé.
      if (error || !data || data.length === 0 || !Number.isInteger(Math.sqrt(data.length))) {
        setErreurAdversaire(true)
        setChargementAdversaire(false)
        return
      }

      // Un événement Realtime UPDATE `cases` pour ce joueur peut arriver pendant cet await
      // (le canal est déjà ouvert et abonné, contrairement au fetch-then-subscribe initial
      // de l'écran, AD-10) : `casesAdversaire` étant encore vide à ce moment, le handler
      // Realtime l'aurait ignoré silencieusement. On rejoue ici les cochages bufferisés
      // pendant l'attente pour ne jamais afficher un état plus ancien que ce qui a déjà
      // été reçu en direct.
      const donnees = (data as unknown as CaseJoueur[]).map((c) => {
        const checkedRecu = casesAdversaireEventsRef.current.get(c.id)
        return checkedRecu === undefined ? c : { ...c, checked: checkedRecu }
      })

      setCasesAdversaire(donnees)
      setChargementAdversaire(false)
    } catch {
      if (consultationTokenRef.current !== token) return
      setErreurAdversaire(true)
      setChargementAdversaire(false)
    }
  }

  function handleRetourGrille() {
    consultationTokenRef.current += 1
    joueurConsulteRef.current = null
    casesAdversaireEventsRef.current = new Map()
    setJoueurConsulte(null)
    setCasesAdversaire([])
    setChargementAdversaire(false)
    setErreurAdversaire(false)
  }

  useEffect(() => {
    let ignore = false
    let channel: RealtimeChannel | undefined
    let chargeEnCours = false

    async function charger(silencieux: boolean) {
      if (chargeEnCours) return
      chargeEnCours = true

      // Un canal existant devenu obsolète après une coupure ne doit pas rester ouvert
      // en parallèle du nouveau (doublons d'événements, fuite de ressources) — le
      // retirer avant tout nouveau fetch, jamais après.
      if (channel) {
        retirerCanal(channel)
        channel = undefined
      }

      if (!silencieux) {
        setChargement(true)
        setChargementEchoue(false)
      }

      try {
        const [casesResult, joueursResult, vainqueursResult, partieResult] = await Promise.all([
          casesService.listerCasesDeJoueur(joueur.id),
          joueursService.listerJoueursDePartie(joueur.partieId),
          partiesService.listerVainqueursDePartie(joueur.partieId),
          partiesService.obtenirPartie(joueur.partieId),
        ])

        if (ignore) return

        const { data: casesData, error: casesError } = casesResult
        const { data: joueursData, error: joueursError } = joueursResult
        const { data: vainqueursData, error: vainqueursError } = vainqueursResult
        const { data: partieData, error: partieError } = partieResult

        // Un résultat vide ou non carré ne peut arriver qu'en contournant l'UI (la grille
        // source n'était pas complète au lancement de la partie) — traité comme un échec
        // de chargement plutôt qu'affiché tel quel (sinon `repeat(0, 1fr)` en CSS, écran vide
        // silencieux indiscernable d'un chargement bloqué). Seul l'échec des `cases` (l'essentiel,
        // AC #1) bloque l'écran ; un accroc sur la liste des joueurs (avatar-stack/toast
        // uniquement) dégrade en liste vide plutôt que d'empêcher d'afficher la grille.
        if (
          casesError ||
          !casesData ||
          casesData.length === 0 ||
          !Number.isInteger(Math.sqrt(casesData.length))
        ) {
          // Un rechargement silencieux (reconnexion) ne doit jamais faire apparaître
          // l'écran d'erreur — un casesError transitoire (ex. jeton en cours de
          // rafraîchissement juste après une coupure) ne signifie pas forcément une
          // vraie corruption de données ; l'utilisateur garde son dernier état connu.
          if (!silencieux) {
            setChargementEchoue(true)
          }
          return
        }

        const listeJoueurs = joueursError || !joueursData ? [] : joueursData
        // Avant tout appel à resoudrePseudo (y compris celui juste en dessous pour
        // vainqueursInitiaux) : le ref doit refléter ce chargement pour que la résolution
        // des vainqueurs déjà connus soit correcte dès ce même cycle.
        joueursRef.current = listeJoueurs

        const vainqueursInitiaux =
          vainqueursError || !vainqueursData
            ? []
            : vainqueursData.map((v) => ({ id: v.joueur_id, pseudo: resoudrePseudo(v.joueur_id) }))

        setCases(casesData as unknown as CaseJoueur[])
        setJoueurs(listeJoueurs)
        setVainqueurs(vainqueursInitiaux)
        // Un vainqueur apparu pendant une coupure (Realtime ne rejoue jamais les
        // événements manqués) doit rouvrir l'overlay s'il avait été fermé pour un
        // vainqueur précédent — sans quoi son annonce serait silencieusement perdue
        // (EXPERIENCE.md : "vainqueur déjà annoncé" fait partie de l'état à restaurer).
        // Au tout premier montage, vainqueurIdsRef est vide donc tout vainqueur compte
        // comme "nouveau" — sans effet visible puisque overlayFerme vaut déjà false.
        const idsAvant = vainqueurIdsRef.current
        const aDeNouveauxVainqueurs = vainqueursInitiaux.some((v) => !idsAvant.has(v.id))
        vainqueurIdsRef.current = new Set(vainqueursInitiaux.map((v) => v.id))
        if (aDeNouveauxVainqueurs) {
          setOverlayFerme(false)
        }
        setStatutPartie(partieError || !partieData ? 'en_cours' : partieData.statut)
        setChargementEchoue(false)

        // "Suis-je le créateur ?" : ne peut plus se déduire de la simple lisibilité de
        // `grilles` (bug corrigé le 2026-07-29) — depuis la policy "Joueur lit les
        // grilles des parties auxquelles il participe" (CAP-6), n'IMPORTE QUEL joueur
        // de la partie peut désormais lire cette ligne, pas seulement son créateur.
        // Comparaison explicite de `grilles.compte_id` avec le `compte_id` de MA PROPRE
        // ligne `joueurs` (jamais avec `auth.uid()` directement : un invité anonyme n'a
        // pas de `compte_id`, la comparaison doit échouer pour lui aussi). Aucune
        // nouvelle policy nécessaire : "Joueur lit les joueurs de sa partie" (Story 2.2)
        // couvre déjà la lecture de ma propre ligne. Échoue vers `false` par défaut
        // (CTA de clôture absent) sur tout échec réseau — jamais l'inverse.
        if (!ignore && !partieError && partieData) {
          const [{ data: grilleData }, { data: monJoueurData }] = await Promise.all([
            grillesService.obtenirCompteIdGrille(partieData.grille_id),
            joueursService.obtenirCompteIdJoueur(joueur.id),
          ])
          if (!ignore) {
            setEstCreateur(
              Boolean(grilleData?.compte_id) &&
                Boolean(monJoueurData?.compte_id) &&
                grilleData?.compte_id === monJoueurData?.compte_id,
            )
          }
        }

        // Le composant a pu se démonter (ou l'effet se relancer) pendant l'await
        // ci-dessus — sans cette garde, un canal serait créé et assigné après que le
        // nettoyage de l'effet a déjà tourné, fuite de connexion Realtime jamais retirée.
        if (ignore) return

        // Fetch-then-subscribe (AD-10) : le canal Realtime n'ouvre qu'après le chargement
        // complet réussi, à chaque appel de charger() — montage initial comme reconnexion
        // silencieuse (Story 2.6). Un seul canal, cinq écoutes — pas de filtre serveur par
        // partie_id/grille_id : les policies select scopent déjà la diffusion Realtime
        // elle-même (AD-7), un filtre applicatif reste nécessaire pour les cas où la RLS
        // couvre plusieurs parties d'un même utilisateur (voir gardes ci-dessous, Story 2.5).
        channel = creerCanal(`partie:${joueur.partieId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'joueurs' },
            (payload) => {
              const nouveauJoueur = payload.new as { id: string; pseudo: string; partie_id: string }
              if (nouveauJoueur.partie_id !== joueur.partieId) return
              // Idempotence : un événement redélivré (reconnexion brève) ne doit pas
              // dupliquer l'entrée dans la pile d'avatars.
              if (joueursRef.current.some((j) => j.id === nouveauJoueur.id)) return
              const misAJour = [...joueursRef.current, { id: nouveauJoueur.id, pseudo: nouveauJoueur.pseudo }]
              joueursRef.current = misAJour
              setJoueurs(misAJour)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'cases' },
            (payload) => {
              const nouvelleCase = payload.new as { id: string; joueur_id: string; checked: boolean }
              // Grille consultée (AD-7, pas de nouvel abonnement dédié) : patcher par `id`
              // de ligne (pas par `position`, cf. Design Notes de la spec) dès que la case
              // modifiée appartient au joueur actuellement consulté — coche ET décoche,
              // pas seulement le cas "cochage" ci-dessous qui ne concerne que le toast.
              if (joueurConsulteRef.current?.id === nouvelleCase.joueur_id) {
                // Toujours bufferisé, même si le fetch initial n'a pas encore résolu (la
                // case ne serait alors pas encore présente dans `casesAdversaire`, ce `.map`
                // serait un no-op) — `handleConsulterJoueur` rejoue ce buffer à la résolution.
                casesAdversaireEventsRef.current.set(nouvelleCase.id, nouvelleCase.checked)
                setCasesAdversaire((current) =>
                  current.map((c) =>
                    c.id === nouvelleCase.id ? { ...c, checked: nouvelleCase.checked } : c,
                  ),
                )
              }
              // Ne notifier que sur cochage (pas décochage) et jamais pour ses propres cases.
              if (!nouvelleCase.checked || nouvelleCase.joueur_id === joueur.id) return
              // Repli générique conservé en filet de sécurité (ex. écoute `joueurs` pas
              // encore établie au moment précis de l'événement) plutôt que d'abandonner
              // la notification en silence — `joueursRef` couvre le cas normal désormais.
              afficherToast(`${resoudrePseudo(nouvelleCase.joueur_id)} vient de cocher une Case.`)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'phrases' },
            (payload) => {
              const phraseModifiee = payload.new as { id: string; texte: string }
              setCases((current) =>
                current.map((c) =>
                  c.phrase_id === phraseModifiee.id
                    ? { ...c, phrases: { texte: phraseModifiee.texte } }
                    : c,
                ),
              )
              // Une correction de phrase (FR-3) reçue pendant la consultation se répercute
              // aussi sur la grille consultée (boundary "Always" de la spec) — pas de garde
              // sur `joueurConsulteRef` nécessaire : si `casesAdversaire` est vide (aucune
              // consultation en cours), ce `.map` est un no-op inoffensif.
              setCasesAdversaire((current) =>
                current.map((c) =>
                  c.phrase_id === phraseModifiee.id
                    ? { ...c, phrases: { texte: phraseModifiee.texte } }
                    : c,
                ),
              )
            },
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'parties_vainqueurs' },
            (payload) => {
              const nouveauVainqueur = payload.new as { joueur_id: string; partie_id: string }
              // Un créateur ayant plusieurs parties actives (ex. "Relancer") est, via la
              // policy "Créateur lit les vainqueurs de ses parties", abonné aux vainqueurs
              // de TOUTES ses parties — ignorer tout événement qui ne concerne pas celle
              // affichée à cet écran (revue de code, régression introduite par cette policy).
              if (nouveauVainqueur.partie_id !== joueur.partieId) return
              // Un vainqueur déjà connu (événement Realtime redélivré, ex. reconnexion
              // brève) ne doit pas rouvrir un overlay que le joueur venait de fermer.
              if (vainqueurIdsRef.current.has(nouveauVainqueur.joueur_id)) return
              vainqueurIdsRef.current.add(nouveauVainqueur.joueur_id)
              setVainqueurs((current) => [
                ...current,
                { id: nouveauVainqueur.joueur_id, pseudo: resoudrePseudo(nouveauVainqueur.joueur_id) },
              ])
              // Un joueur qui a fermé l'overlay pour un précédent vainqueur ne doit pas
              // manquer l'annonce d'un co-vainqueur réellement nouveau (UX-DR6).
              setOverlayFerme(false)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'parties' },
            (payload) => {
              const partieMaj = payload.new as { id: string; statut: StatutPartie }
              // La policy "Créateur lit ses parties" scope la visibilité à TOUTES les
              // parties du créateur, pas seulement celle-ci — un créateur multi-parties
              // (ex. "Relancer") recevrait sinon le statut de la mauvaise partie.
              if (partieMaj.id !== joueur.partieId) return
              setStatutPartie(partieMaj.statut)
            },
          )
          .subscribe()
      } catch {
        // Un échec silencieux (reconnexion automatique) ne doit jamais faire
        // apparaître l'écran d'erreur — l'utilisateur garde son dernier état connu,
        // un prochain événement de reconnexion réessaiera (AC #2).
        if (!ignore && !silencieux) {
          setChargementEchoue(true)
        }
      } finally {
        chargeEnCours = false
        if (!ignore) {
          setChargement(false)
        }
      }
    }

    charger(false)

    // Reconnexion (AC #1 à #3) : rejoue le cycle fetch-then-subscribe silencieusement
    // dès que le réseau revient, ou dès que l'app redevient visible (téléphone
    // déverrouillé) — ce second signal couvre le cas le plus fréquent pour ce projet
    // mobile-first (NFR-2) : une mise en veille suspend généralement la connexion
    // WebSocket sans jamais faire basculer navigator.onLine à false. Volontairement
    // pas de 3e signal basé sur le statut du canal Realtime lui-même (redondant, cf.
    // Dev Notes de cette story).
    function handleReconnexion() {
      charger(true)
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        charger(true)
      }
    }
    window.addEventListener('online', handleReconnexion)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ignore = true
      window.removeEventListener('online', handleReconnexion)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (channel) {
        retirerCanal(channel)
      }
    }
  }, [joueur.id, joueur.partieId, retry])

  async function handleToggle(caseItem: CaseJoueur) {
    const nextChecked = !caseItem.checked
    setCases((current) =>
      current.map((c) => (c.id === caseItem.id ? { ...c, checked: nextChecked } : c)),
    )

    // `.select()` force la représentation de la ligne modifiée : un update filtré en
    // silence par RLS (ex. case déjà réassignée) renvoie un succès avec `data: []`,
    // sans `error` — sans ce `.select()`, ce cas ne serait jamais détecté ni annulé.
    const { data, error } = await casesService.mettreAJourCase(caseItem.id, nextChecked)

    if (error || !data || data.length === 0) {
      setCases((current) =>
        current.map((c) => (c.id === caseItem.id ? { ...c, checked: !nextChecked } : c)),
      )
    }
  }

  async function handleCloturer() {
    setClotureEnCours(true)
    try {
      // `.select()` force la représentation de la ligne modifiée : même piège que
      // `handleToggle` (Story 2.3) — un update filtré en silence par RLS renverrait
      // sinon un succès sans erreur, sans que la clôture n'ait réellement eu lieu.
      const { data, error } = await partiesService.cloturerPartie(joueur.partieId)

      if (error || !data || data.length === 0) {
        afficherToast(friendlyErrorMessage())
        return
      }

      setStatutPartie('terminee')
    } catch {
      afficherToast(friendlyErrorMessage())
    } finally {
      setClotureEnCours(false)
      setConfirmationCloture(false)
    }
  }

  const cote = useMemo(() => Math.sqrt(cases.length), [cases.length])

  if (chargement) {
    return null
  }

  if (chargementEchoue) {
    return (
      <main className="grille-en-direct-screen">
        <p className="grille-en-direct-screen__message">{friendlyErrorMessage()}</p>
        <Button type="button" variant="primary" onClick={() => setRetry((n) => n + 1)}>
          Réessayer
        </Button>
      </main>
    )
  }

  const estTerminee = statutPartie === 'terminee'

  return (
    <main className="grille-en-direct-screen">
      <div className="grille-en-direct-screen__header">
        {estTerminee ? <PartieTermineeBadge /> : <LiveBadge />}
        <AvatarStack joueurs={joueurs} joueurCourantId={joueur.id} onConsulterJoueur={handleConsulterJoueur} />
      </div>

      {joueurConsulte ? (
        <GrilleAdversaireScreen
          joueur={joueurConsulte}
          cases={casesAdversaire}
          chargement={chargementAdversaire}
          erreur={erreurAdversaire}
          onRetour={handleRetourGrille}
        />
      ) : (
        <>
          <div className="grille-en-direct-screen__actions">
            <Button type="button" variant="secondary" onClick={() => copierLien(lien)}>
              {lienCopie ? 'Lien copié !' : 'Copier le lien'}
            </Button>
            {onRetourBibliotheque && (
              <Button type="button" variant="secondary" onClick={onRetourBibliotheque}>
                Retour à la bibliothèque
              </Button>
            )}
          </div>

          <p className="grille-en-direct-screen__subtitle">Tu joues sous le nom {joueur.pseudo}</p>

          <div
            className="grille-en-direct-screen__grille"
            style={{ gridTemplateColumns: `repeat(${cote}, 1fr)` }}
          >
            {cases.map((caseItem) => (
              <GridCell key={caseItem.id} caseItem={caseItem} onToggle={handleToggle} disabled={estTerminee} />
            ))}
          </div>

          {estCreateur && !estTerminee && (
            <Button
              type="button"
              variant="close-game"
              disabled={clotureEnCours}
              onClick={() => setConfirmationCloture(true)}
            >
              Clôturer la Partie
            </Button>
          )}

          {confirmationCloture && (
            <ConfirmDialog
              titre="Clôturer la partie ?"
              message="Les joueurs ne pourront plus rejoindre cette partie."
              confirmLabel="Clôturer"
              confirmEnCours={clotureEnCours}
              onConfirm={handleCloturer}
              onCancel={() => setConfirmationCloture(false)}
            />
          )}
        </>
      )}

      {toast && <p className="toast">{toast}</p>}

      {vainqueurs.length > 0 && !overlayFerme && (
        <VainqueurOverlay vainqueurs={vainqueurs} onFermer={() => setOverlayFerme(true)} />
      )}
    </main>
  )
}

function PartieTermineeBadge() {
  return <span className="partie-terminee-badge">Partie terminée</span>
}

function LiveBadge() {
  return (
    <span className="live-badge">
      <span className="live-badge__point" />
      En direct
    </span>
  )
}

const COULEURS_AVATAR = ['terracotta', 'sage', 'mustard']

type AvatarStackProps = {
  joueurs: JoueurPartie[]
  joueurCourantId: string
  onConsulterJoueur: (joueur: JoueurPartie) => void
}

function AvatarStack({ joueurs, joueurCourantId, onConsulterJoueur }: AvatarStackProps) {
  const visibles = joueurs.slice(0, 3)
  const reste = joueurs.length - visibles.length

  return (
    <div className="avatar-stack">
      {visibles.map((j, index) => {
        const classe = `avatar-stack__avatar avatar-stack__avatar--${COULEURS_AVATAR[index % COULEURS_AVATAR.length]}`
        const initiale = Array.from(j.pseudo)[0]?.toUpperCase()

        // Pas de bouton sur son propre avatar (boundary "Never" de la spec) : reste un
        // simple `span`, jamais interactif. Le compteur "+N" ci-dessous n'est jamais
        // cliquable non plus (aucun joueur précis associé).
        if (j.id === joueurCourantId) {
          return (
            <span key={j.id} className={classe}>
              {initiale}
            </span>
          )
        }

        return (
          <button
            key={j.id}
            type="button"
            className={`${classe} avatar-stack__avatar--cliquable`}
            aria-label={`Consulter la grille de ${j.pseudo}`}
            onClick={() => onConsulterJoueur(j)}
          >
            {initiale}
          </button>
        )
      })}
      {reste > 0 && <span className="avatar-stack__compteur">+{reste}</span>}
    </div>
  )
}

function formatNomsVainqueurs(pseudos: string[]): string {
  if (pseudos.length === 1) return pseudos[0]
  return `${pseudos.slice(0, -1).join(', ')} et ${pseudos[pseudos.length - 1]}`
}

type VainqueurOverlayProps = {
  vainqueurs: Vainqueur[]
  onFermer: () => void
}

function VainqueurOverlay({ vainqueurs, onFermer }: VainqueurOverlayProps) {
  const label = vainqueurs.length === 1 ? 'Vainqueur' : 'Vainqueurs'
  const noms = formatNomsVainqueurs(vainqueurs.map((v) => v.pseudo))

  return (
    <div className="vainqueur-overlay">
      <p className="vainqueur-overlay__texte">
        {label} : {noms} 🎉
      </p>
      <Button type="button" variant="secondary" onClick={onFermer}>
        Fermer
      </Button>
    </div>
  )
}
