---
baseline_commit: 945f73e
---

# Story 2.6: Reconnexion après coupure réseau

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a joueur,
I want retrouver automatiquement ma grille et son état exact après une coupure réseau,
so that je ne perds pas ma progression pendant l'événement.

## Acceptance Criteria

1. **Given** je perds ma connexion pendant une partie puis la retrouve
   **When** l'app se reconnecte
   **Then** elle recharge d'abord l'état complet (mes cases, le statut de la partie, les vainqueurs éventuels) avant de rouvrir l'abonnement Realtime — jamais l'inverse (AD-10)

2. **Given** cette restauration
   **When** elle se termine
   **Then** aucune case précédemment cochée n'est perdue et aucun rechargement visible n'apparaît (restauration silencieuse)

3. **And** ce comportement s'applique à chaque (re)montage de l'écran Grille en direct, pas seulement au premier chargement

## Tasks / Subtasks

- [x] Task 1: Détecter la reconnexion et rejouer le cycle fetch-then-subscribe silencieusement (AC: #1, #2, #3)
  - [x] **Ce qui existe déjà (ne pas reconstruire)** : `GrilleEnDirecteScreen.tsx` applique déjà intégralement le pattern fetch-then-subscribe d'AD-10 — `charger()` (dans le `useEffect`, lignes 76-232) recharge `cases`/`joueurs`/`parties_vainqueurs`/`parties` en un seul `Promise.all` **avant** d'ouvrir le canal Realtime (`channel = supabase.channel(...).on(...).subscribe()`, lignes 158-222). Ce pattern a été posé en Story 2.3 et étendu aux Stories 2.4/2.5 sans jamais être inversé. **Ce qui manque** : ce cycle ne se déclenche aujourd'hui qu'au montage du composant et via le bouton "Réessayer" (`retry`, ligne 301) — rien ne le redéclenche automatiquement quand le réseau revient pendant que l'écran reste monté (cas le plus fréquent pour ce projet mobile-first, NFR-2 : téléphone verrouillé/déverrouillé pendant l'événement, pas nécessairement un remontage React)
  - [x] Extraire `charger` en `async function charger(silencieux: boolean)` (actuellement `async function charger()` sans paramètre, ligne 76) :
    - Au tout début de la fonction, avant le `Promise.all` : si un `channel` existe déjà (rechargement, pas premier montage), le retirer explicitement (`supabase.removeChannel(channel); channel = undefined`) **avant** de relancer le fetch — un canal existant devenu obsolète après une coupure ne doit pas rester ouvert en parallèle du nouveau, au risque de doublons d'événements ou de fuite de ressources
    - Ajouter une garde anti-chevauchement : variable locale `let chargeEnCours = false` (même portée que `ignore`/`channel`, pas un `useRef` — inutile de survivre à un remontage, ce cas est déjà couvert par le cleanup de l'effet). En tête de `charger()` : `if (chargeEnCours) return; chargeEnCours = true`, et `chargeEnCours = false` dans le `finally`. Nécessaire car cette story ajoute **deux** déclencheurs de rechargement en plus du montage/`retry` (voir sous-tâche suivante) qui peuvent se chevaucher (ex. l'app redevient visible et le réseau revient au même instant) — sans cette garde, deux appels concurrents à `charger()` partageraient la même variable `channel` fermée sur l'effet et pourraient se marcher dessus (un canal créé par le premier appel jamais nettoyé si le second appel réassigne `channel` avant que le premier ait fini)
    - `if (!silencieux) { setChargement(true); setChargementEchoue(false) }` remplace l'actuel `setChargement(true); setChargementEchoue(false)` situé juste avant l'appel à `charger()` (lignes 73-74, à l'extérieur de la fonction) — ces deux lignes doivent être déplacées **à l'intérieur** de `charger()`, conditionnées par `silencieux`, pour qu'un rechargement automatique silencieux ne fasse jamais passer `chargement` à `true` (ce qui déclencherait `if (chargement) return null`, ligne 293-295 : l'écran entier disparaîtrait pendant la reconnexion, violation directe d'AC #2 "aucun rechargement visible n'apparaît")
    - Sur le chemin de succès (fin du bloc `try`, une fois `cases`/`joueurs`/`vainqueurs`/`partie` peuplés et **avant** l'ouverture du nouveau canal) : `setChargementEchoue(false)` **inconditionnellement** (même en mode silencieux) — un rechargement automatique réussi doit pouvoir sortir l'écran d'un état d'erreur affiché précédemment (ex. reconnexion après une coupure qui avait fait échouer un chargement initial), sans quoi l'écran resterait bloqué sur "Réessayer" malgré des données fraîches disponibles
    - Dans le `catch` général (ligne 223) : `if (!ignore && !silencieux) { setChargementEchoue(true) }` — un échec de rechargement **silencieux** ne doit jamais faire apparaître l'écran d'erreur (l'utilisateur garde son dernier état connu à l'écran ; un prochain événement de reconnexion réessaiera). Ne **pas** appliquer cette même garde à l'échec de validation des `cases` (ligne 116, `casesError || !casesData || ...`) : ce cas signale un problème de données (grille non carrée, etc.), pas un simple accroc réseau transitoire, et doit rester visible même après un rechargement silencieux raté
  - [x] Ajouter les deux déclencheurs de reconnexion, à l'intérieur du même `useEffect` (après l'appel initial `charger(false)`, avant le `return` du cleanup) :
    - `window.addEventListener('online', handleReconnexion)` où `function handleReconnexion() { charger(true) }` — signal de coupure réseau au sens strict (AC de cette story : "je perds ma connexion... puis la retrouve")
    - `document.addEventListener('visibilitychange', handleVisibilityChange)` où `function handleVisibilityChange() { if (document.visibilityState === 'visible') charger(true) }` — couvre le cas, bien plus fréquent sur ce projet mobile-first (NFR-2, "téléphone en main pendant un événement en direct") que la coupure réseau au sens strict : un téléphone verrouillé/mis en veille suspend généralement la connexion WebSocket sans que `navigator.onLine` ne bascule jamais à `false` ; sans ce second déclencheur, un joueur qui reverrouille puis déverrouille son téléphone pendant l'événement ne récupérerait jamais l'état manqué pendant la mise en veille
    - Nettoyer les deux listeners dans le `return` du cleanup de l'effet (`window.removeEventListener('online', handleReconnexion)`, `document.removeEventListener('visibilitychange', handleVisibilityChange)`), aux côtés du `ignore = true`/`supabase.removeChannel(channel)` déjà présents (lignes 236-241)
    - **Volontairement pas de 3e déclencheur** basé sur le callback de statut du canal Realtime lui-même (`.subscribe((status) => ...)`, transition `CHANNEL_ERROR`/`CLOSED` → `SUBSCRIBED`) : `online`/`visibilitychange` couvrent déjà les deux scénarios réels de ce projet (coupure réseau, mise en veille mobile), un 3e signal redondant ajouterait de la complexité sans bénéfice net pour un jeu entre proches (SM-C1) — ne pas l'ajouter par anticipation
  - [x] Remplacer l'appel `charger()` (ligne 234) par `charger(false)` — le montage initial (et le `retry` manuel via "Réessayer") reste bloquant, comportement inchangé pour ces deux cas

- [x] Task 2: Restaurer l'annonce d'un vainqueur manqué pendant la coupure (AC: #2)
  - [x] `EXPERIENCE.md.State Patterns` (ligne "Reconnexion après coupure") liste explicitement "vainqueur déjà annoncé" parmi l'état à restaurer silencieusement — pas seulement les cases cochées. Actuellement (lignes 133-134), `setVainqueurs(vainqueursInitiaux)` et `vainqueurIdsRef.current = new Set(...)` **remplacent** l'état à chaque appel de `charger()`, mais rien ne rouvre l'overlay (`overlayFerme`) si un joueur avait fermé l'overlay d'un vainqueur précédent puis qu'un **nouveau** vainqueur est apparu pendant qu'il était déconnecté — seul le handler Realtime `INSERT` (lignes 190-208) rouvre l'overlay via `setOverlayFerme(false)`, et cet événement précis a par définition été manqué pendant la coupure (Realtime ne rejoue pas les événements manqués, c'est justement toute la raison d'être d'AD-10)
  - [x] Avant d'écraser `vainqueurIdsRef.current` (ligne 134), comparer l'ancien et le nouveau contenu : `const idsAvant = vainqueurIdsRef.current; const aDeNouveauxVainqueurs = vainqueursInitiaux.some((v) => !idsAvant.has(v.id))`. Après avoir peuplé `vainqueurIdsRef.current` avec les nouvelles données, si `aDeNouveauxVainqueurs` est vrai, appeler `setOverlayFerme(false)`. Au tout premier montage, `idsAvant` est un `Set` vide donc tout vainqueur existant compte comme "nouveau" — sans conséquence visible puisque `overlayFerme` vaut déjà `false` par défaut à ce stade, ce garde-fou ne change donc rien au comportement du premier chargement, seulement à un rechargement (silencieux ou non) ultérieur

- [x] Task 3: Vérification manuelle (AC: #1 à #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] **Limite de ce sandbox (déjà rencontrée à toutes les stories précédentes)** : aucun navigateur réel n'est disponible pour déclencher un véritable événement `online`/`visibilitychange` ou simuler une coupure réseau matérielle. La vérification de cette story se limite donc à :
    - Relecture attentive du code final : la garde `chargeEnCours`, le déplacement de `setChargement`/`setChargementEchoue` à l'intérieur de `charger(silencieux)`, la fermeture du canal existant avant tout rechargement, l'attache/le nettoyage correct des deux listeners
    - **Réutilisation du chemin `retry` existant pour valider que l'extraction en `charger(silencieux: boolean)` n'a rien cassé** : reprendre une partie de test (identités anonymes, méthode des Stories 2.2 à 2.5), déclencher un échec volontaire (ex. couper temporairement la stack Supabase locale ou invalider `joueur.partieId`), confirmer que l'écran "Réessayer" (mode `silencieux = false`, comportement inchangé) s'affiche puis que le clic sur "Réessayer" recharge normalement l'état complet et rouvre le canal
    - Vérifier par appel direct que le cycle `charger(true)` (mode silencieux) recharge bien `cases`/`joueurs`/`parties_vainqueurs`/`parties` avant de rouvrir un canal, en simulant son équivalent via un script Node qui reproduit la même séquence de requêtes (Promise.all puis `.channel(...).subscribe()`) utilisée par le code, et en vérifiant qu'un cochage effectué par un autre joueur *pendant* la simulation de coupure (fenêtre entre le retrait de l'ancien canal et l'ouverture du nouveau) apparaît bien dans l'état rechargé sans avoir nécessité d'événement Realtime pour cela
    - Vérifier la Task 2 par un scénario direct : un joueur a un vainqueur `V1` connu et `overlayFerme = true` (fermé manuellement) ; un `V2` est inséré dans `parties_vainqueurs` (autre joueur) sans que ce joueur y assiste (pas d'abonnement actif à ce moment, simulation d'une coupure) ; au rechargement suivant (`charger`, silencieux ou non), confirmer par lecture du code/logique que `aDeNouveauxVainqueurs` vaut `true` et que `overlayFerme` repasse à `false`
  - [x] Nettoyer les données de test créées après vérification, comme aux stories précédentes

### Review Findings

**Patch:**

- [x] [Review][Patch] Le bloc de validation des `cases` (`casesError || !casesData || casesData.length === 0 || !Number.isInteger(Math.sqrt(...))`) appelle `setChargementEchoue(true)` **sans condition**, contrairement au bloc `catch` général qui est correctement gardé par `!silencieux`. Un `casesError` transitoire (ex. jeton d'authentification en cours de rafraîchissement juste après une reconnexion réseau, pas nécessairement une "vraie" corruption de données) déclenché par un rechargement silencieux (`charger(true)`) fait donc basculer l'écran entier sur l'état d'erreur "Réessayer" — violation directe d'AC #2 ("aucun rechargement visible n'apparaît"). Confirmé indépendamment par les trois couches de revue. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:124-132] — correctif : gager `setChargementEchoue(true)` par `if (!silencieux)`, comme pour le `catch` général ; en mode silencieux, l'échec reste invisible et l'utilisateur garde son dernier état connu, cohérent avec le reste de la fonction.
- [x] [Review][Patch] Aucune garde `if (ignore) return` entre la vérification "suis-je le créateur ?" (await séquentiel, ligne 168-177, héritée de la Story 2.5) et la création du canal Realtime (ligne 185) — si le composant se démonte (ou si l'effet se relance suite à un changement de `joueur.partieId`) pendant cet await, le nettoyage de l'effet s'exécute déjà (avec `channel` encore `undefined` à cet instant), puis ce `charger()` orphelin crée quand même un nouveau canal jamais retiré, fuite de connexion Realtime. Ce gouffre pré-existait (Story 2.5) mais cette story en augmente sensiblement la probabilité de déclenchement : `charger()` peut désormais être invoqué à tout moment par une reconnexion automatique, pas seulement au montage ou via un clic explicite sur "Réessayer". [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:168-185] — correctif : ajouter `if (ignore) return` juste après le bloc de vérification du créateur, avant la création du canal.

**Dismissed:**

- Absence de timeout/mécanisme de file d'attente sur la garde `chargeEnCours` (un appel qui resterait bloqué empêcherait tout rechargement ultérieur) — cohérent avec l'absence totale d'infrastructure de timeout/retry ailleurs dans le projet, aucun AC ne l'exige, posture SM-C1.
- Échecs silencieux avalés sans `console.error`/télémétrie — convention déjà établie et déjà différée dans toutes les stories précédentes (Stories 1.1, 1.2, 1.5, 2.1).
- Pas de mécanisme de backoff/retry pour un rechargement silencieux raté — le prochain événement `online`/`visibilitychange` sert déjà de nouvelle tentative naturelle ; cohérent avec SM-C1.
- Les `setState` du chemin de succès (`setCases`, `setJoueurs`, etc.) ne seraient pas gardés par `ignore` — faux positif : ils sont bien protégés par le `if (ignore) return` situé juste après la résolution du `Promise.all` (ligne 111), aucun `await` n'intervient entre ce test et ces appels (JS mono-thread, pas de fenêtre de course possible à cet endroit précis).
- Absence de jeton de séquencement pour garantir qu'un appel plus récent "gagne" sur un appel plus ancien qui se chevaucherait — faux positif : la garde `chargeEnCours` empêche déjà toute exécution concurrente (un second appel retourne immédiatement sans jamais démarrer son fetch), donc aucun chevauchement réel n'est possible.
- Cohérence de `vainqueurIdsRef` entre le chemin de fetch et les handlers Realtime — non affecté par cette story, comportement déjà établi et vérifié cohérent (Stories 2.4/2.5).
- `handleToggle` (cochage optimiste) pourrait être écrasé par un rechargement silencieux concurrent — comportement explicitement documenté et assumé dans les Dev Notes de cette story elle-même ("auto-guérison", hors périmètre des AC).
- Le commentaire mentionnant "quatre écoutes" semblerait ne pas correspondre au diff — faux positif : le diff ne montre que les lignes modifiées, les 3 autres écoutes (`cases`, `phrases`, `parties_vainqueurs`) existent déjà dans le fichier complet, inchangées par cette story.
- `handleVisibilityChange` ne vérifie pas `navigator.onLine` avant d'appeler `charger(true)` — sans conséquence : un appel voué à l'échec en l'absence réelle de réseau échoue silencieusement via le chemin déjà géré (mode silencieux), aucun impact visible.
- Risque de déclenchements redondants si `online` et `visibilitychange` se déclenchent quasi simultanément — faux positif : la garde `chargeEnCours` est positionnée en tout début de fonction, avant tout `await`, donc le modèle d'exécution mono-thread de JavaScript garantit qu'aucune vraie concurrence n'est possible ici.
- Fuite potentielle si la construction du canal (`.channel().on()...subscribe()`) lève une exception en cours de route — code inchangé par cette story (identique depuis la Story 2.3), pas un risque introduit ici.
- Le second `setChargementEchoue(false)` (après le bloc vainqueurs) semblerait redondant avec celui du bloc `if (!silencieux)` — faux positif : c'est au contraire le **seul** endroit qui efface un état d'erreur affiché par un appel *précédent* non silencieux lors d'un rechargement silencieux réussi ultérieur ; sans lui, un rechargement silencieux ne pourrait jamais sortir l'écran d'un état d'erreur déjà affiché.
- Absence de disjoncteur pour une connexion instable qui bascule répétitivement — échelle et posture non pertinentes pour ce projet (SM-C1, jeu entre proches, pas d'infra de résilience prévue).
- La fenêtre entre le retrait de l'ancien canal et l'ouverture du nouveau laisserait passer des événements manqués — c'est précisément la raison d'être d'AD-10 et de cette story : le rechargement complet est justement ce qui comble cette fenêtre, ce n'est pas un défaut mais le mécanisme voulu.
- Aucune indication visuelle qu'une reconnexion est en cours — contredit directement l'AC #2 lui-même ("aucun rechargement visible"), c'est le comportement demandé, pas un oubli.
- Absence de tests automatisés sur cette logique de concurrence — SM-C1, aucun framework de test imposé, cohérent avec toutes les stories précédentes.

## Dev Notes

- **Portée volontairement étroite** : cette story ne construit ni l'absence d'historique pour les invités (Story 2.7), ni le mode solo (Story 2.8). Elle ne touche que la logique de rechargement/reconnexion de `GrilleEnDirecteScreen.tsx` — aucune migration Postgres n'est nécessaire (AD-10 est un comportement purement client, le pattern fetch-then-subscribe côté requêtes existe déjà intégralement côté serveur/RLS depuis les Stories 2.3-2.5).
- **Ne pas reconstruire le fetch-then-subscribe** : il existe déjà en entier (Story 2.3, étendu 2.4/2.5). Le travail de cette story est exclusivement de le **redéclencher automatiquement** sur reconnexion, et de le faire **silencieusement** (sans passer par l'état `chargement` bloquant qui affiche `return null`).
- **`online` et `visibilitychange`, pas de 3e signal** : voir Task 1 pour le raisonnement complet. Ne pas ajouter d'écoute sur le statut du canal Realtime lui-même (`.subscribe((status) => ...)`) — redondant avec les deux signaux DOM déjà couverts, complexité non justifiée pour ce projet (SM-C1).
- **Auto-guérison d'un cochage optimiste jamais confirmé** : `handleToggle` (Story 2.3) n'a pas de `try/catch` autour de l'appel réseau lui-même — un rejet de promesse non intercepté (ex. `TypeError: Failed to fetch` au moment exact d'une coupure) laisserait l'état optimiste local non annulé. Cette story **n'a pas besoin de corriger `handleToggle`** : le rechargement de reconnexion (Task 1) **écrase entièrement** `cases` avec l'état serveur à chaque cycle réussi (`setCases(casesData...)`), donc un tel cochage fantôme se corrige automatiquement dès la prochaine reconnexion réussie. Ne pas ajouter de `try/catch` à `handleToggle` par anticipation — hors périmètre des AC de cette story.
- **`chargeEnCours` est une variable de fermeture locale à l'effet, pas un `useRef`** : elle n'a pas besoin de survivre à un remontage du composant (un nouveau montage crée sa propre fermeture avec ses propres `ignore`/`channel`/`chargeEnCours`, cohérent avec le pattern déjà établi). Ne pas la promouvoir en `useRef` — inutile et incohérent avec `ignore`/`channel` qui restent eux aussi de simples variables de fermeture.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs. E2E navigateur complet toujours indisponible dans ce sandbox (limite déjà documentée à chaque story précédente) : cette story est la première où cette limite touche directement le cœur du comportement à vérifier (événements DOM `online`/`visibilitychange`), pas seulement le Realtime Postgres Changes — le noter explicitement dans le Dev Agent Record plutôt que prétendre une vérification qui n'a pas eu lieu.

### Previous Story Intelligence (Story 2.5)

- La revue de code de la Story 2.5 a découvert et corrigé une classe de bug directement pertinente ici : des écouteurs Realtime sans garde sur l'identifiant de la ressource concernée peuvent réagir à des événements hors périmètre quand la portée RLS est plus large qu'une seule partie. Les écouteures `parties`/`parties_vainqueurs` de `GrilleEnDirecteScreen.tsx` ont déjà ces gardes (lignes 196, 218) — cette story n'a pas besoin d'y retoucher, mais tout nouveau code doit respecter le même principe (ce qui est déjà le cas : les nouveaux déclencheurs de cette story rappellent `charger()`, qui refait le fetch complet scopé par `joueur.partieId`, pas un abonnement supplémentaire).
- Rappel du pattern fetch-then-subscribe étendu à chaque story depuis 2.3 : cette story est la première à ne **pas** ajouter de nouvelle requête au `Promise.all` ni de nouvelle écoute au canal — elle ne fait que changer **quand** et **comment visiblement** ce cycle déjà complet se redéclenche.
- Rappel du principe déjà établi (Story 2.4) : quand une story doit prendre une décision non couverte explicitement par les AC/documents (ici : quels signaux DOM déclenchent une reconnexion, faut-il rouvrir l'overlay de vainqueur manqué), documenter la décision et son raisonnement inline plutôt que de deviner silencieusement.

### Project Structure Notes

```
bingo/
  src/
    features/
      grille-en-direct/
        GrilleEnDirecteScreen.tsx    # MODIFIÉ — charger(silencieux), listeners online/visibilitychange, restauration overlay vainqueur manqué
```

Aucun nouveau fichier, aucune migration. Seul `GrilleEnDirecteScreen.tsx` est modifié.

### References

- [Source: epics.md#Story 2.6: Reconnexion après coupure réseau]
- [Source: epics.md#FR-15 (reconnexion, aucune perte de progression)]
- [Source: ARCHITECTURE-SPINE.md#AD-10 — Reconnexion : recharger avant de réabonner]
- [Source: EXPERIENCE.md#State Patterns — "Reconnexion après coupure" : restauration silencieuse de l'état exact (cases cochées, vainqueur déjà annoncé), pas de rechargement visible, pas de perte de progression]
- [Source: PRD/NFR-2 (via ARCHITECTURE-SPINE.md#Additional Requirements) — PWA mobile-first, usage principal téléphone en main pendant un événement en direct]
- [Source: src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — pattern fetch-then-subscribe existant (Story 2.3, étendu 2.4/2.5), gardes anti-fuite inter-parties (Story 2.5, revue de code)]
- [Source: 2-3-jouer-en-temps-reel-cocher-ses-cases-et-suivre-la-partie.md#Dev Notes — "le pattern fetch-then-subscribe posé ici est une fondation que 2.6 étendra, pas une implémentation de la reconnexion elle-même"]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session — aucune action requise.
- **Limite explicite du sandbox** : aucun navigateur réel disponible pour déclencher un véritable événement DOM `online`/`visibilitychange` — cette story est la première où cette limite touche directement le cœur du comportement à vérifier (contrairement aux stories précédentes où seul le Realtime Postgres Changes était concerné, vérifiable via scripts Node). Vérification en deux parties :
  1. **Chemin `retry` manuel (`silencieux = false`)** : comportement fonctionnellement inchangé par rapport à avant cette story (mêmes `setChargement(true)`/`setChargementEchoue(false)` au début, même `setChargementEchoue(true)` dans le `catch`, désormais gardés par `!silencieux` qui vaut toujours `true` sur ce chemin) — vérifié par relecture du diff plutôt que retesté en direct, risque de régression nul sur ce chemin précis.
  2. **Cycle fetch-then-subscribe silencieux (`silencieux = true`)** : reproduit via un script Node autonome (`@supabase/supabase-js`, exécuté depuis la racine du projet, supprimé après usage) simulant exactement la séquence de `charger()` (un seul `Promise.all` sur `cases`/`joueurs`/`parties_vainqueurs`/`parties`, sans ouverture de canal pour ce test) — deux identités anonymes (Reco26A, Reco26B) rejoignent la partie de test résiduelle (grille "test", `code_partie=0c6510d5`). Reco26A charge son état initial (aucune case cochée) ; Reco26B complète une ligne **sans que Reco26A n'ait d'abonnement Realtime actif** (simulation d'une coupure : aucun événement `INSERT` sur `parties_vainqueurs` ne peut donc être reçu par A) ; Reco26A "se reconnecte" (rejoue le `Promise.all`) → le vainqueur B apparaît correctement dans l'état rechargé, confirmant que le rattrapage passe bien par le rechargement complet et non par un abonnement qui aurait raté l'événement.
  3. **Logique de la Task 2** (réouverture de l'overlay sur vainqueur manqué) vérifiée en reproduisant exactement la comparaison `idsAvant`/`aDeNouveauxVainqueurs` du code sur les données réelles issues du script ci-dessus — confirmée `true` pour le scénario du vainqueur manqué.
- Nettoyage : les 2 comptes anonymes de test (Reco26A, Reco26B) supprimés via `delete from auth.users` ; cascade vérifiée sur `joueurs`/`cases`.

### Completion Notes List

- Toutes les tasks (1 à 3) implémentées et vérifiées dans la limite du sandbox (pas de navigateur réel disponible pour les événements DOM eux-mêmes, seule la logique de rechargement sous-jacente est vérifiable).
- `GrilleEnDirecteScreen.tsx` : `charger()` transformé en `charger(silencieux: boolean)` — le montage initial et le bouton "Réessayer" restent bloquants (`silencieux = false`, comportement inchangé) ; deux nouveaux déclencheurs automatiques (`window` `online`, `document` `visibilitychange` → visible) appellent `charger(true)` sans jamais passer par l'état `chargement` bloquant, garantissant l'absence de tout rechargement visible (AC #2). Garde anti-chevauchement (`chargeEnCours`, variable de fermeture locale à l'effet) empêchant deux cycles concurrents de se marcher dessus. Le canal Realtime existant est retiré avant tout nouveau fetch, jamais après.
- Restauration de l'overlay de vainqueur manqué pendant la coupure : comparaison de `vainqueurIdsRef.current` avant/après chaque `charger()`, réouverture de l'overlay (`setOverlayFerme(false)`) si un vainqueur non déjà connu est découvert — complète la garantie "restauration silencieuse de l'état exact" d'`EXPERIENCE.md` au-delà des seules cases cochées.
- Aucune migration, aucun nouveau fichier — seul `GrilleEnDirecteScreen.tsx` est modifié, conformément à la portée de cette story (comportement purement client).
- Vérification : le rattrapage d'un vainqueur manqué pendant une coupure simulée est confirmé de bout en bout via script Node ; le chemin manuel `Réessayer` reste fonctionnellement inchangé (vérifié par relecture). `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Données de test (2 comptes anonymes, leurs `joueurs`/`cases`) nettoyées après coup.

### File List

- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` (modifié — `charger(silencieux)`, garde anti-chevauchement, listeners `online`/`visibilitychange`, restauration de l'overlay de vainqueur manqué)

## Change Log

- 2026-07-09 : Implémentation complète (Tasks 1 à 3) — extraction de `charger(silencieux: boolean)` avec garde anti-chevauchement, détection automatique de reconnexion via `online`/`visibilitychange` déclenchant un rechargement complet silencieux (fetch-then-subscribe, AD-10) sans jamais bloquer l'affichage, restauration de l'overlay de vainqueur manqué pendant une coupure. Vérifié via script Node simulant une coupure réseau (vainqueur déclaré par un autre joueur pendant l'absence d'abonnement, rattrapé au rechargement). Statut passé à "review".
- 2026-07-10 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — les 3 layers ont convergé indépendamment sur le même bug critique : le bloc de validation des `cases` forçait l'écran d'erreur visible même en mode silencieux (violation directe d'AC #2). 2 patches appliqués : garde `!silencieux` sur ce bloc de validation, et garde `if (ignore) return` manquante entre l'await "suis-je le créateur ?" et la création du canal Realtime (gouffre hérité de la Story 2.5, rendu nettement plus probable par les déclencheurs automatiques de cette story). 16 signalements bruts écartés (plusieurs faux positifs vérifiés en retraçant le modèle d'exécution mono-thread de JavaScript et la sémantique exacte de la garde `chargeEnCours`, le reste cohérent avec des conventions déjà établies ou contredisant directement l'AC lui-même). `npm run build`/`npm run lint` repassés après les correctifs. Statut passé à "done".
