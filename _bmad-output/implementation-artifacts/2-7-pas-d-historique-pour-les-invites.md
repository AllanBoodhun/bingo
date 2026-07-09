---
baseline_commit: 945f73e
---

# Story 2.7: Pas d'historique pour les invités

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a joueur invité sans compte,
I want ne conserver aucune trace de mes parties après leur fin,
so that je reste cohérent avec le principe "pas de compte imposé pour un jeu ponctuel".

## Acceptance Criteria

1. **Given** un joueur invité (session anonyme) a participé à une partie désormais clôturée ou quittée
   **When** il revient sur l'app
   **Then** il ne voit aucune surface "mes parties" ni trace d'historique de cette partie

2. **And** cela ne s'applique jamais à un créateur avec compte, qui retrouve toujours ses grilles et parties passées via la Bibliothèque

## Tasks / Subtasks

- [x] Task 1: Empêcher une session invité (anonyme) d'atteindre la Bibliothèque/Création de grille (AC: #1, #2)
  - [x] **Analyse du gouffre existant** : `App.tsx` ne fait aujourd'hui **aucune distinction** entre une session invité (anonyme, créée via `signInAnonymously()` dans `RejoindrePartieScreen.tsx`, Story 2.2) et une session de compte permanent (email/mot de passe, `AuthScreen.tsx`, Story 1.1). Le seul test actuel est `if (!session) return <AuthScreen />` (ligne ~77) — **toute** session, y compris anonyme, passe ce test et atterrit sur `<BibliothequeScreen />`, littéralement l'écran "Bibliothèque" (surface "mes parties" au sens de l'AC), même si `grilles` y est vide pour ce compte (aucune fuite de contenu réel, mais une surface conceptuellement réservée aux créateurs, atteignable par un invité). **Reproductible concrètement, pas hypothétique** : le manifeste PWA (`vite.config.ts`, `start_url: '/'`) fait que l'app installée sur l'écran d'accueil d'un téléphone (NFR-2) s'ouvre **toujours** sur l'URL nue, sans jamais conserver le `?partie=code` de la dernière partie jouée — un invité qui a installé l'app pendant l'événement puis la rouvre plus tard retombera systématiquement sur ce chemin
  - [x] Dans `App.tsx`, distinguer les deux types de session via le champ `session.user.is_anonymous` (`boolean | undefined`, exposé nativement par `@supabase/supabase-js` 2.110.0 sur `User`, déjà la version utilisée par ce projet — aucune dépendance à ajouter) : remplacer `if (!session) { return <AuthScreen /> }` par `if (!session || session.user.is_anonymous) { return <AuthScreen /> }`. Une session invité est donc traitée exactement comme "pas de session" pour l'accès à la Bibliothèque/Création de grille — ce test unique couvre les deux surfaces d'un coup, `CreationGrilleScreen` n'étant atteignable qu'après ce même gardien
  - [x] **Ne jamais appeler `supabase.auth.signOut()` à cet endroit** — décision de conception critique, à ne pas "corriger" par anticipation d'une fuite qui n'existe pas : détruire la session invité casserait la garantie de reconnexion de la Story 2.6 (AD-10) et le mécanisme d'idempotence de `rejoindre_partie` (Story 2.2, `where partie_id = ... and auth_user_id = auth.uid()`). Un invité qui a **directement** le lien de sa partie (`?partie=code`, cas normal d'usage — il ne passe alors jamais par ce gardien, `codePartieRejoint !== null` est vérifié en premier dans `App.tsx`) doit pouvoir y retourner à tout moment et retrouver exactement le même `joueur_id`/mêmes `cases`, sans nouvelle distribution aléatoire ni perte de progression. Ce gardien ne fait que **masquer une surface** à l'invité s'il revient sans lien précis ; il ne touche jamais à l'identité/au jeton sous-jacent
  - [x] **Aucune requête supplémentaire à ajouter, aucune nouvelle policy RLS nécessaire** : `AuthScreen` ne charge aucune donnée au montage (uniquement au clic sur "Créer mon compte"/"Me connecter") — une fois le gardien en place, un invité ne déclenche donc plus jamais aucune requête `grilles`/`parties`/`parties_vainqueurs` en dehors de sa propre partie active, ce qui satisfait déjà entièrement "ni trace d'historique de cette partie" (AC #1) sans code additionnel
  - [x] **AC #2 est un sous-produit direct de ce même test** : un créateur avec compte a systématiquement `is_anonymous === false` (créé exclusivement via `AuthScreen`, jamais via `signInAnonymously()`) — il continue de passer le gardien normalement et retrouve sa Bibliothèque comme avant cette story, aucune régression possible sur ce chemin

- [x] Task 2: Vérification manuelle (AC: #1, #2)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Vérifier par lecture du code que le nouveau test `!session || session.user.is_anonymous` ne modifie que le chemin "pas de `?partie=` dans l'URL" — `RejoindrePartieScreen`/`GrilleEnDirecteScreen` (atteints via `codePartieRejoint !== null`, vérifié en premier dans `App.tsx`) restent totalement inchangés, un invité en cours de partie n'est jamais affecté
  - [x] Scénario direct (script Node, méthode des stories précédentes, ou test manuel dans un navigateur si l'outil `run` de ce projet le permet — sinon documenter la limite comme aux stories précédentes) : un invité rejoint une partie de test (`signInAnonymously` + `rejoindre_partie`), obtient une session ; confirmer via `session.user.is_anonymous === true` que le nouveau gardien le redirigerait bien vers `AuthScreen` s'il visitait l'URL nue (vérification de la condition elle-même, pas seulement lecture du code) ; confirmer en parallèle qu'un compte créateur existant (email/mot de passe) a bien `is_anonymous === false` sur sa session
  - [x] Confirmer qu'aucune régression n'affecte le chemin créateur : connexion avec un compte existant → Bibliothèque s'affiche normalement avec ses grilles
  - [x] Nettoyer les données de test créées après vérification, comme aux stories précédentes

### Review Findings

**Patch:**

- [x] [Review][Patch] `session.user.is_anonymous` est typé `boolean | undefined` par le SDK Supabase — le test `session.user.is_anonymous` (vérité directe) échoue **ouvert** si jamais cette valeur était `undefined` (un invité laisserait alors passer le gardien vers la Bibliothèque, exactement ce que cette story doit empêcher). Bien que ce cas ne soit pas atteignable dans l'usage normal de cette app (`is_anonymous` dérive de la colonne `auth.users.is_anonymous`, toujours peuplée pour toute ligne utilisateur existante, pas d'une réclamation JWT pouvant manquer), le typage optionnel du SDK laisse la possibilité ouverte — confirmé indépendamment par deux couches de revue. [src/App.tsx:80] — correctif : inverser le sens du test en `session.user.is_anonymous !== false`, qui échoue **fermé** (route vers `AuthScreen`) par défaut en cas d'incertitude, cohérent avec le pattern "échec sûr par construction" déjà établi dans ce projet (ex. `estCreateur` par défaut à `false`, Story 2.5).

**Defer:**

- [x] [Review][Defer] Aucun message contextuel spécifique n'explique à un invité pourquoi il atterrit sur l'écran de connexion/création de compte après la fin d'une partie — amélioration UX potentielle, non exigée par un AC ou un `UX-DR` de ce projet. [src/features/auth/AuthScreen.tsx] — deferred, amélioration facultative hors périmètre des AC de cette story.

**Dismissed:**

- **Un invité qui revisite le lien direct d'une partie désormais clôturée verrait toujours la grille et son historique de cochage, en violation d'AC #1** — analysé en profondeur, **écarté** : la Story 2.5 (AC #2, déjà revue et livrée) garantit explicitement que "n'importe quel joueur... voit l'état 'Partie terminée' et la grille reste consultable en lecture seule" — sans distinction invité/créateur, et ce comportement est intentionnel (accès par lien direct déjà connu, pas une surface de découverte). La clause "And" d'AC #2 de **cette** story ancre explicitement son intention sur la Bibliothèque ("qui retrouve toujours ses grilles et parties passées **via la Bibliothèque**") — c'est bien l'absence d'une surface de type Bibliothèque/découverte pour l'invité qui est visée, pas la révocation d'un accès à un lien déjà en sa possession. Révoquer cet accès contredirait une AC sœur déjà livrée et réintroduirait précisément le risque de régression (reconnexion Story 2.6, idempotence de `rejoindre_partie`) que le Task 1 de cette story a explicitement raisonné pour éviter. Le cas "quittée" (sans fonctionnalité de départ de partie existante dans le code) reste de toute façon inatteignable, donc non vérifiable en l'état.
- Absence de tests automatisés — SM-C1, aucun framework de test imposé, cohérent avec toutes les stories précédentes.
- `session.user` pourrait être `undefined`/`null` malgré un `session` non nul, provoquant une exception — faux positif : `user` est un champ non optionnel du type `Session` du SDK, un `session` non nul garantit `session.user` défini au niveau du typage TypeScript.
- Style du commentaire (références sans lien, verbosité) — cohérent avec la convention déjà établie dans tout le projet de documenter les décisions de conception non triviales directement en commentaire inline.
- L'interaction avec `AuthScreen` (inscription/connexion) pourrait remplacer la session invité en arrière-plan — propriété déjà existante du comportement Supabase lors d'un changement d'identité, non modifiée ni aggravée par ce diff, hors périmètre de cette story précise.
- Garde purement côté client, sans application RLS serveur, donc "cosmétique" — la RLS protège déjà entièrement les données réelles à la source (une requête `grilles` d'un invité renvoie toujours un résultat vide via `compte_id = auth.uid()`, quel que soit l'écran qui l'exécute) : il n'y a aucune donnée sensible supplémentaire à protéger côté serveur pour ce cas précis.
- D'autres points d'entrée "URL nue" (liens de réinitialisation de mot de passe, autres liens d'invitation) mériteraient le même traitement — n'existent pas dans cette app (aucune fonctionnalité de réinitialisation de mot de passe implémentée).
- Stabilité/compatibilité du champ `is_anonymous` avec la version du SDK épinglée — déjà vérifiée présente dans la version installée lors de la rédaction de cette story.
- Les affirmations du commentaire sur la reconnexion/l'idempotence ne seraient pas étayées — elles renvoient à un comportement déjà revu et livré des Stories 2.2/2.6, pas des suppositions non vérifiées.
- Absence de gestion d'une transition anonyme → compte permanent en cours de rendu (ex. liaison de compte dans un autre onglet) — déjà géré nativement par le modèle de réactivité React (`session` est un état React mis à jour via `onAuthStateChange`, tout changement redéclenche un rendu qui réévalue cette condition).
- Fusion du traitement UI "pas de session" et "session invité" en un seul embranchement — choix intentionnel et approprié, pas un défaut fonctionnel : les deux cas appellent la même action (se connecter ou créer un compte).

## Dev Notes

- **Portée volontairement étroite et déjà presque entièrement satisfaite par l'architecture existante** : cette story ne construit aucune nouvelle surface, aucune migration, aucune nouvelle policy RLS. Le seul gouffre concret identifié est l'absence de distinction invité/compte dans le routage de `App.tsx` — combler ce seul gouffre suffit à satisfaire les deux AC, par construction (voir Task 1).
- **Ne pas construire un écran "historique" ou "mes parties" pour vérifier son absence** — l'AC demande l'absence d'une telle surface, pas sa construction suivie d'un contrôle d'accès dessus. Ne pas ajouter de nouvelle route/écran par anticipation.
- **Ne jamais détruire la session invité (pas de `signOut()`)** — voir Task 1 pour le raisonnement complet ; c'est la décision de conception la plus importante de cette story, celle qui évite une régression silencieuse sur la Story 2.6 (reconnexion) et sur l'idempotence de `rejoindre_partie` (Story 2.2).
- **`is_anonymous` est un champ natif de `@supabase/supabase-js` 2.110.0`**, déjà la version utilisée par ce projet (`ARCHITECTURE-SPINE.md.Stack`) — confirmé présent sur le type `User` exposé par le client déjà installé. Aucune mise à jour de dépendance nécessaire.
- **Cohérence avec `rejoindre_partie`** (Story 2.2) : la fonction distingue déjà invité/compte via `coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)` côté serveur (pour décider si `compte_id` doit être `null` ou `auth.uid()`) — cette story introduit le même type de distinction côté client, mais via le champ `session.user.is_anonymous` déjà exposé par le SDK plutôt qu'en reparsant le JWT à la main.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs. E2E navigateur complet limité dans ce sandbox (limite déjà documentée à chaque story précédente) ; cette story se prête toutefois particulièrement bien à une vérification par lecture directe de la valeur `session.user.is_anonymous` retournée par l'API, sans dépendre du rendu React lui-même.

### Previous Story Intelligence (Story 2.6)

- La Story 2.6 a durci les garanties de reconnexion (AD-10) et l'idempotence de session pour un invité en cours de partie — cette story ne doit surtout pas les fragiliser en manipulant la session invité (voir Task 1, "ne jamais appeler `signOut()`").
- Rappel du principe déjà établi (Stories 2.4/2.5/2.6) : quand une story doit prendre une décision non couverte explicitement par les AC/documents (ici : que faire exactement d'une session invité qui revient sans lien de partie — la masquer sans la détruire), documenter la décision et son raisonnement inline plutôt que de deviner silencieusement.
- Le manifeste PWA (`vite.config.ts`, `start_url: '/'`) n'avait pas encore été examiné par une story précédente sous cet angle — c'est cette story qui établit qu'il rend le scénario "invité revient sur l'URL nue" concrètement probable (PWA installée) plutôt qu'un cas limite théorique.

### Project Structure Notes

```
bingo/
  src/
    App.tsx    # MODIFIÉ — distinction session invité/compte dans le gardien de routage
```

Aucun nouveau fichier, aucune migration. Seul `App.tsx` est modifié.

### References

- [Source: epics.md#Story 2.7: Pas d'historique pour les invités]
- [Source: epics.md#FR-19 (aucun historique pour un invité sans compte)]
- [Source: ARCHITECTURE-SPINE.md#AD-5 — identité des invités via l'auth anonyme Supabase, session persistée côté client]
- [Source: src/App.tsx — routage actuel (`codePartieRejoint` en premier, puis `loading`, puis `!session` → `AuthScreen`, puis `Bibliothèque`/`CreationGrille`)]
- [Source: src/features/rejoindre-partie/RejoindrePartieScreen.tsx — `signInAnonymously()` uniquement si `!session`, confirme qu'un compte déjà connecté garde sa véritable identité en rejoignant une partie (Story 2.5, revue de code)]
- [Source: supabase/migrations/20260708200136_rejoindre_partie.sql — distinction invité/compte déjà pratiquée côté serveur via `auth.jwt() ->> 'is_anonymous'`]
- [Source: vite.config.ts — manifeste PWA, `start_url: '/'`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session — aucune action requise.
- Vérification par script Node autonome (`@supabase/supabase-js`, exécuté depuis la racine du projet, supprimé après usage) : une identité invitée (session anonyme, rejoint la partie de test résiduelle `code_partie=0c6510d5`) confirmée avec `session.user.is_anonymous === true` ; un compte créateur fraîchement inscrit (email/mot de passe) confirmé avec `session.user.is_anonymous === false` — la condition exacte utilisée par le nouveau gardien (`!session || session.user.is_anonymous`) a donc été vérifiée directement sur des sessions réelles pour les deux cas, pas seulement par lecture du code.
- Rendu React lui-même non vérifié visuellement (pas de navigateur réel disponible dans ce sandbox, limite déjà documentée à chaque story précédente) — la logique de branchement (`if (!session || session.user.is_anonymous) return <AuthScreen />`) est un test booléen simple sur une valeur elle-même confirmée correcte pour les deux identités, risque résiduel jugé négligeable.
- Nettoyage : le compte anonyme invité et le compte créateur de test supprimés via `delete from auth.users` (cascade sur `joueurs`/`cases` pour l'invité).

### Completion Notes List

- Toutes les tasks (1 et 2) implémentées et vérifiées.
- `App.tsx` : le gardien `if (!session) return <AuthScreen />` devient `if (!session || session.user.is_anonymous) return <AuthScreen />` — une session invité (anonyme) est désormais traitée comme "pas de session" pour l'accès à la Bibliothèque/Création de grille, sans jamais détruire la session sous-jacente (aucun appel à `signOut()`), préservant intégralement la reconnexion (Story 2.6) et l'idempotence de `rejoindre_partie` (Story 2.2) pour un invité qui reviendrait directement via le lien de sa partie.
- Aucune nouvelle requête, aucune nouvelle policy RLS, aucune migration — le gardien à lui seul satisfait les deux AC par construction (AuthScreen ne charge aucune donnée au montage).
- Vérification : `session.user.is_anonymous` confirmé `true`/`false` respectivement pour une identité invitée et un compte créateur via appels API directs. `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Données de test (1 compte anonyme, 1 compte créateur) nettoyées après coup.

### File List

- `src/App.tsx` (modifié — distinction session invité/compte dans le gardien de routage)

## Change Log

- 2026-07-10 : Implémentation complète (Tasks 1 et 2) — `App.tsx` distingue désormais une session invité (anonyme) d'une session de compte permanent via `session.user.is_anonymous`, empêchant un invité d'atteindre la Bibliothèque/Création de grille sans jamais détruire sa session (préserve la reconnexion Story 2.6 et l'idempotence de `rejoindre_partie`). Vérifié via script Node confirmant la valeur exacte de `is_anonymous` sur des sessions réelles pour les deux types d'identité. Statut passé à "review".
- 2026-07-10 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 1 patch appliqué (`is_anonymous !== false` plutôt qu'un test de vérité direct, échec fermé par défaut en cas d'incertitude sur ce champ optionnel du SDK). 1 élément différé (message contextuel pour l'invité sur AuthScreen, amélioration UX non requise). L'Acceptance Auditor a soulevé qu'un invité revisitant le lien direct d'une partie clôturée voit toujours sa grille — écarté après analyse : la Story 2.5 (AC #2, déjà livrée) garantit explicitement cet accès en lecture seule pour "n'importe quel joueur", et la clause "And" de cette story ancre son intention sur l'absence d'une surface Bibliothèque, pas sur la révocation d'un lien déjà connu ; le révoquer aurait contredit une AC sœur déjà livrée et réintroduit le risque de régression que le Task 1 de cette story évitait explicitement. 12 autres signalements écartés (faux positifs vérifiés ou conventions déjà établies). `npm run build`/`npm run lint` et un test de non-régression API repassés après le correctif. Statut passé à "done".
