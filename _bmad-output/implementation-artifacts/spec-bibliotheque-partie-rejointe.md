---
title: 'Bibliothèque pour un joueur-compte invité + fix identité anonyme→compte'
type: 'feature'
created: '2026-07-29'
status: 'done'
context: []
baseline_commit: 7035296c4f938c54eb7791d3643e38db9e4b0952
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un compte qui rejoint la partie d'un autre créateur via `?partie=code` atterrit sur un écran sans aucun retour vers sa propre Bibliothèque (dead-end), et cette partie n'apparaît nulle part dans sa Bibliothèque. Pire, un joueur qui rejoint anonymement puis se connecte/crée un compte plus tard (identité `auth.uid()` différente) voit sa grille devenir définitivement inaccessible : `PartieActiveScreen` fait confiance sans vérification à un `joueur` obsolète persisté en localStorage (lié à l'ancienne identité anonyme), et les policies RLS bloquent silencieusement toutes les lectures pour la nouvelle identité — écran d'erreur qui boucle sur "Réessayer".

**Approach:** (1) Scoper le localStorage persisté à l'`auth_user_id` courant, pas seulement au `codePartie` — un changement d'identité doit retomber sur le flux normal (formulaire pseudo + `rejoindre_partie`, idempotent), jamais sur un raccourci obsolète. (2) Donner un retour vers la Bibliothèque à tout compte réel qui rejoint via lien. (3) Ajouter une policy RLS lecture seule permettant à un joueur non-créateur de lire nom/taille de la grille qu'il joue. (4) Ajouter une section "Parties auxquelles je participe" dans la Bibliothèque, avec Rejoindre + Dupliquer, jamais Clôturer.

## Boundaries & Constraints

**Always:** Un joueur non-créateur (même avec compte) ne voit jamais de CTA Clôturer/Modifier — par construction (nouveau composant sans cette prop), pas par un simple masquage conditionnel. `lireJoueurPersiste`/`persisterJoueur` sont toujours appelés avec l'`auth_user_id` courant ; un mismatch retombe silencieusement sur le flux `rejoindre_partie` normal (jamais d'erreur visible). Aucune régression sur le comportement invité sans compte (Story 2.7 : jamais de retour Bibliothèque, jamais de session détruite via `signOut()`).

**Ask First:** Aucune décision bloquante identifiée — RLS et flux déjà vérifiés dans l'investigation préalable.

**Never:** Ne jamais appeler `supabase.auth.signOut()` dans ce lot (casserait Story 2.6/2.7). Ne jamais donner à un joueur non-créateur de policy `update`/`delete` sur `parties`/`grilles`. Ne pas fusionner la nouvelle section avec "Partie en cours" existante (qui reste réservée aux parties créées par le compte).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compte rejoint via lien | Session compte réel, `?partie=code` valide | Après `rejoindre_partie`, `GrilleEnDirecteScreen` affiche un bouton "Retour à la bibliothèque" qui ramène à la Bibliothèque normale | N/A |
| Invité anonyme rejoint via lien | Pas de session, `?partie=code` valide | Comportement inchangé : pas de bouton retour (Story 2.7) | N/A |
| Anonyme → compte réel (bug rapporté) | localStorage contient un `joueur` persisté sous l'ancien `auth_user_id` anonyme, session actuelle = nouveau compte réel | `lireJoueurPersiste` renvoie `null` (mismatch d'identité) ; le formulaire pseudo s'affiche normalement, `rejoindre_partie` crée/retrouve la ligne `joueurs` de la NOUVELLE identité | N/A — pas d'erreur visible, juste un nouveau join transparent |
| Bibliothèque d'un compte ayant rejoint une partie d'autrui | Compte non-créateur avec une ligne `joueurs` sur une partie `en_cours` d'un autre | Section "Parties auxquelles je participe" affiche cette partie (nom/taille de grille, nombre de joueurs, vainqueur éventuel), boutons Rejoindre + Dupliquer, jamais Clôturer | Échec réseau sur ce fetch dégrade silencieusement (section absente), même principe que le fetch existant des parties actives créateur |
| Duplication d'une grille jouée (non possédée) | Clic "Dupliquer" sur une carte de cette nouvelle section | Nouvelle ligne `grilles`/`phrases` créée avec `compte_id = auth.uid()` (le compte courant), apparaît ensuite dans "Mes grilles" | Échec insertion → message générique existant, rollback grille orpheline (logique déjà existante de `handleDupliquer`) |
| Partie clôturée entre-temps | Une partie rejointe passe à `statut = 'terminee'` | Disparaît de la section "Parties auxquelles je participe" au prochain chargement (même filtre `en_cours` que la section créateur) | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/joueurStorage.ts` -- ajouter `authUserId` au JSON persisté ; `lireJoueurPersiste`/`persisterJoueur` prennent ce paramètre en plus
- `src/features/partie-active/PartieActiveScreen.tsx` -- lecture localStorage devient asynchrone (via session courante), capture l'`auth_user_id` définitif après `signInAnonymously()` ou session existante
- `src/App.tsx` -- `codePartieRejoint` devient settable ; passe `onRetourBibliotheque` à `GrilleEnDirecteScreen` quand `session?.user.is_anonymous === false` ; passe `compteId` à `BibliothequeScreen`
- `src/features/bibliotheque/BibliothequeScreen.tsx` -- nouvelle prop `compteId` ; nouveau fetch `joueurs` par `auth_user_id` ; nouvel état `partiesRejointes` ; nouvelle section
- `src/features/bibliotheque/components/PartieRejointeCard.tsx` -- nouveau composant (Rejoindre + Dupliquer, jamais Clôturer)
- `src/features/bibliotheque/components/PartieEnCoursCard.tsx` -- référence de style pour le nouveau composant, non modifié
- `supabase/migrations/<timestamp>_bibliotheque_parties_rejointes.sql` -- nouvelle policy select sur `grilles` via `est_dans_la_partie`

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/joueurStorage.ts` -- ajouter param `authUserId` à la lecture/écriture, comparaison stricte -- corrige le bug d'intégrité identité anonyme→compte
- [x] `src/features/partie-active/PartieActiveScreen.tsx` -- vérification d'identité asynchrone au montage (`return null` pendant la vérif, convention UX-DR5 déjà en place) ; capturer l'auth_user_id réel dans `handleRejoindre`
- [x] `supabase/migrations/<timestamp>_bibliotheque_parties_rejointes.sql` -- policy "Joueur lit les grilles des parties auxquelles il participe" via `est_dans_la_partie(p.id)`, appliquer via `supabase migration up`
- [x] `src/App.tsx` -- setter sur `codePartieRejoint`, `onRetourBibliotheque` conditionnel au compte réel, prop `compteId` vers `BibliothequeScreen`
- [x] `src/features/bibliotheque/components/PartieRejointeCard.tsx` -- nouveau composant, aucune prop de clôture
- [x] `src/features/bibliotheque/BibliothequeScreen.tsx` -- fetch + état + rendu de la nouvelle section, réutilise `handleDupliquer`/`onRejoindrePartie` existants sans les modifier

**Acceptance Criteria:**
- Given un compte réel qui vient de rejoindre via `?partie=code`, when la grille en direct s'affiche, then un bouton "Retour à la bibliothèque" est visible et ramène à la Bibliothèque
- Given un invité sans compte qui rejoint via lien, when la grille en direct s'affiche, then aucun bouton retour n'apparaît (inchangé)
- Given un joueur ayant rejoint anonymement puis s'étant connecté à un compte réel, when il rouvre le lien de la même partie, then il repasse par le formulaire pseudo (pas d'écran d'erreur bloquant) et rejoint normalement sous sa nouvelle identité
- Given un compte ayant rejoint la partie d'un autre créateur (statut en_cours), when il ouvre sa Bibliothèque, then il voit cette partie dans une section distincte de "Mes grilles"/"Partie en cours", sans CTA Clôturer
- Given cette même carte, when il clique Dupliquer, then une copie indépendante de la grille apparaît dans "Mes grilles"

## Spec Change Log

- **Triggering finding (review, blind hunter + edge case hunter, converged independently) :** le fix anonyme→compte (rejouer `rejoindre_partie` sous la nouvelle identité) laisse l'ancienne ligne `joueurs` anonyme orpheline -- jamais relisible par l'app une fois le jeton local perdu, mais continuant à compter dans le plafond de 6 joueurs d'une partie. Non anticipé par l'Approche originale, qui ne traitait que le symptôme (écran bloqué), pas la conséquence (slot de joueur non reclamé).
- **Décision humaine (Allan) :** nettoyer automatiquement plutôt qu'accepter le risque tel quel.
- **Amendement :** ajout d'une policy delete self-scopée sur `joueurs` (`auth_user_id = auth.uid() and compte_id is null` -- exclut structurellement tout compte réel) et d'un nettoyage dans `AuthScreen.tsx`, déclenché uniquement après un `signUp`/`signInWithPassword` réussi, via un client Supabase temporaire authentifié avec le jeton de l'ANCIENNE session anonyme (capturé avant l'appel, pour ne jamais supprimer une partie en cours sur une tentative de connexion ratée).
- **État connu-mauvais évité :** un compte qui bascule anonyme→réel ne doit jamais laisser un slot de joueur fantôme faire échouer une partie ("Cette Partie est complète") pour les autres joueurs restés légitimes.
- **KEEP :** le reste de l'implémentation (retour Bibliothèque, section "Parties auxquelles je participe", policy select `grilles`, `PartieRejointeCard` sans prop de clôture) a été audité comme conforme à 100 % des AC/contraintes par l'acceptance auditor -- rien à re-dériver là-dessus, uniquement ce complément ciblé.
- **Patches (auto-fixés, ne nécessitaient pas de décision humaine) :** (1) `phrasesError` dans `BibliothequeScreen.tsx` ne fait plus `return` anticipé -- il court-circuitait le fetch indépendant des parties rejointes ; dégradé en `validee: false` pour "Mes grilles" à la place. (2) `onRetourBibliotheque` (App.tsx) nettoie désormais l'URL (`history.replaceState`) -- sans ça un rechargement après "retour" rentrait directement dans la partie. (3) Le placeholder "Crée ta première grille" ne s'affiche plus quand `partiesRejointes.length > 0`, pour ne pas contredire la section juste au-dessus. (4) `verifierIdentite` (PartieActiveScreen.tsx) est désormais protégé par un `try/catch/finally` -- un `getSession()` qui rejette ne bloque plus l'écran indéfiniment sur `null`.

## Design Notes

`rejoindre_partie` (Story 2.2) est déjà idempotent par `(partie_id, auth_user_id)` — rejouer l'inscription pour une nouvelle identité après un changement de session est donc sûr, pas de garde supplémentaire nécessaire côté serveur. La lecture des phrases pour dupliquer une grille non possédée fonctionne déjà via la policy existante "Joueur lit les phrases de sa partie" (Story 2.2) : la distribution de cases d'un joueur couvre 100% du pool de phrases de sa grille, donc `handleDupliquer` existant n'a besoin d'aucune modification.

## Verification

**Commands:**
- `npm run build` -- expected: aucune erreur TypeScript
- `npm run lint` -- expected: aucun avertissement oxlint

**Manual checks (if no CLI):**
- Scénario du bug rapporté : rejoindre anonymement, appeler `signUp`/`signInWithPassword` pour simuler la connexion à un compte réel, rouvrir le lien de la même partie -- doit repasser par le formulaire pseudo, pas d'écran d'erreur
- Vérifier via RLS direct (appel API) qu'un compte non-créateur peut désormais lire `grilles.nom`/`taille` d'une partie à laquelle il participe, et ne peut ni `update` ni `delete` dessus
- Nettoyer les données de test créées (comptes/joueurs), comme dans les stories précédentes

## Dev Agent Record

**Statut :** implémentation de code complète ; migration SQL écrite mais non appliquée/testée en live (voir limite ci-dessous).

**Résumé des changements :**
- `src/lib/joueurStorage.ts` : `Joueur` persisté enrichi d'un `authUserId` scellé au moment de l'écriture ; `lireJoueurPersiste`/`persisterJoueur` prennent désormais ce paramètre et comparent strictement avant de renvoyer une entrée, ce qui corrige la cause racine du bug (identité anonyme→compte).
- `src/features/partie-active/PartieActiveScreen.tsx` : la lecture localStorage au montage est devenue asynchrone (`getSession()` puis `lireJoueurPersiste(codePartie, session.user.id)`), avec un état `verificationEnCours` qui fait `return null` pendant la vérification (même convention que les autres écrans). `handleRejoindre` capture désormais explicitement l'`auth_user_id` définitif (session existante, sinon celui renvoyé par `signInAnonymously()`) et le passe à `persisterJoueur`.
- `supabase/migrations/20260729190000_bibliotheque_parties_rejointes.sql` : nouvelle policy select permissive "Joueur lit les grilles des parties auxquelles il participe" sur `grilles`, via `est_dans_la_partie(p.id)` (aucune nouvelle fonction, aucune policy update/delete ajoutée).
- `src/App.tsx` : `codePartieRejoint` est devenu settable ; `onRetourBibliotheque` est passé à `GrilleEnDirecteScreen` uniquement quand `session?.user.is_anonymous === false` (undefined sinon, échec fermé) et réinitialise `joueurRejoint`/`codePartieRejoint` pour retomber sur la Bibliothèque normale ; `compteId={session.user.id}` passé à `BibliothequeScreen`.
- `src/features/bibliotheque/components/PartieRejointeCard.tsx` (nouveau) : structure dupliquée depuis `PartieEnCoursCard` (convention du projet), sans aucune prop de clôture -- seulement `onRejoindrePartie`/`onDupliquer`/`dupliquantEnCours`.
- `src/features/bibliotheque/BibliothequeScreen.tsx` : nouvelle prop `compteId` ; fetch étendu pour ne plus retourner tôt quand le compte n'a aucune grille possédée (nécessaire pour qu'un compte sans grille propre voie quand même ses parties rejointes) ; nouveau fetch `joueurs` filtré par `compte_id = compteId` puis `parties`/`grilles` correspondantes (via la nouvelle policy), en excluant les grilles déjà possédées pour ne jamais fusionner avec "Partie en cours" ; les requêtes `joueurs`(comptage)/`parties_vainqueurs` existantes sont étendues (liste de `partieIds` élargie) plutôt que dupliquées ; nouvel état `partiesRejointes` et nouvelle section JSX "Parties auxquelles je participe", rendue indépendamment de `grilles.length` ; réutilise `handleDupliquer`/`onRejoindrePartie` tels quels.

**Vérifications exécutées :**
- `npm run build` -- succès, aucune erreur TypeScript.
- `npm run lint` -- succès, aucun avertissement oxlint.

**Revue (step-04) :** blind hunter, edge case hunter, acceptance auditor lancés en parallèle sur le diff vs baseline. Acceptance auditor : conforme à 100 % (aucune violation d'AC/contrainte/matrice). Blind hunter + edge case hunter : convergence indépendante sur un vrai trou d'intention (ligne `joueurs` anonyme orpheline après anonyme→compte, cf Spec Change Log) tranché par l'utilisateur (nettoyage automatique), plus 4 patches triviaux appliqués directement (pas de décision humaine requise) -- détaillés dans Spec Change Log.

**Complément post-revue (cleanup anonyme→compte) :**
- `src/lib/supabase/client.ts` : nouvelle fonction exportée `nettoyerJoueursInvite(ancienneSession)` -- crée un client Supabase temporaire authentifié avec le jeton de l'ancienne session anonyme (`setSession`) et supprime ses lignes `joueurs` (`auth_user_id` = ancienne identité) ; échec silencieux toléré (best-effort).
- `src/features/auth/AuthScreen.tsx` : capture `sessionAvant` via `getSession()` avant `signUp`/`signInWithPassword` ; sur succès uniquement (retour anticipé ajouté sur chaque branche d'erreur, qui n'existait pas avant), si `sessionAvant.user.is_anonymous`, appelle `nettoyerJoueursInvite(sessionAvant)`.
- `supabase/migrations/20260729190000_bibliotheque_parties_rejointes.sql` : nouvelle policy delete self-scopée `"Invité nettoie sa propre ligne joueur"` sur `joueurs` (`auth_user_id = auth.uid() and compte_id is null`) + `grant delete on joueurs to authenticated`.

**Limite connue :** aucune CLI `supabase` disponible dans cet environnement (`supabase status` échoue, commande introuvable) -- la migration `20260729190000_bibliotheque_parties_rejointes.sql` (policies select + delete) n'a pas pu être appliquée ni testée contre une base réelle. Le SQL a été relu attentivement (cohérence des noms de policy avec les migrations existantes -- notamment `20260708200136_rejoindre_partie.sql` et `20260722120000_bibliotheque_joueurs_vainqueur.sql` --, réutilisation de `est_dans_la_partie()` sans nouvelle fonction) mais reste non vérifié en live. Les "Manual checks" de la section Verification (scénario anonyme→compte, vérification RLS directe, et désormais aussi : confirmer que la ligne `joueurs` anonyme disparaît bien après connexion à un compte réel, et qu'un compte réel ne peut jamais supprimer la ligne `joueurs` d'un AUTRE joueur via cette policy) restent à exécuter par un humain avec accès à une base Supabase.

**Fichiers modifiés/créés (total, implémentation + revue + complément) :**
- Modifiés : `src/lib/joueurStorage.ts`, `src/features/partie-active/PartieActiveScreen.tsx`, `src/App.tsx`, `src/features/bibliotheque/BibliothequeScreen.tsx`, `src/lib/supabase/client.ts`, `src/features/auth/AuthScreen.tsx`
- Créés : `src/features/bibliotheque/components/PartieRejointeCard.tsx`, `supabase/migrations/20260729190000_bibliotheque_parties_rejointes.sql`
- Build/lint repassés après chaque lot de changements (implémentation initiale, patches de revue, complément cleanup) : succès à chaque fois.

## Suggested Review Order

**Fix identité anonyme→compte (bug rapporté)**

- Point d'entrée : une entrée persistée n'est valide que pour l'identité qui l'a écrite.
  [`joueurStorage.ts:26`](../../src/lib/joueurStorage.ts#L26)

- Vérification asynchrone au montage remplace le raccourci synchrone sans garde.
  [`PartieActiveScreen.tsx:56`](../../src/features/partie-active/PartieActiveScreen.tsx#L56)

- Capture l'identité définitive (session existante ou nouvel anonyme) avant persistance.
  [`PartieActiveScreen.tsx:110`](../../src/features/partie-active/PartieActiveScreen.tsx#L110)

**Nettoyage du slot orphelin (ajouté après revue, décision utilisateur)**

- Client temporaire authentifié avec l'ancien jeton, seul moyen de prouver l'ancienne identité.
  [`client.ts:32`](../../src/lib/supabase/client.ts#L32)

- Capture avant le switch, nettoyage seulement après succès confirmé (jamais sur un échec de connexion).
  [`AuthScreen.tsx:42`](../../src/features/auth/AuthScreen.tsx#L42)

- Policy delete self-scopée, exclut structurellement tout compte réel.
  [`20260729190000_....sql:30`](../../supabase/migrations/20260729190000_bibliotheque_parties_rejointes.sql#L30)

**Retour vers la Bibliothèque pour un compte réel**

- Conditionnel à `is_anonymous === false`, nettoie l'URL pour qu'un retour survive à un rechargement.
  [`App.tsx:92`](../../src/App.tsx#L92)

**Bibliothèque : section "Parties auxquelles je participe"**

- Nouvelle policy select permissive, seule lacune RLS restante pour un joueur non-créateur.
  [`20260729190000_....sql:12`](../../supabase/migrations/20260729190000_bibliotheque_parties_rejointes.sql#L12)

- Fetch `joueurs` par `compte_id`, point de départ de la nouvelle section.
  [`BibliothequeScreen.tsx:151`](../../src/features/bibliotheque/BibliothequeScreen.tsx#L151)

- Exclusion explicite des grilles déjà possédées, jamais fusionné avec "Partie en cours".
  [`BibliothequeScreen.tsx:175`](../../src/features/bibliotheque/BibliothequeScreen.tsx#L175)

- Carte dédiée sans prop de clôture par construction, pas par masquage conditionnel.
  [`PartieRejointeCard.tsx:17`](../../src/features/bibliotheque/components/PartieRejointeCard.tsx#L17)

**Peripherals**

- Prop `compteId` transmise depuis la session déjà résolue par App.tsx.
  [`App.tsx:176`](../../src/App.tsx#L176)
