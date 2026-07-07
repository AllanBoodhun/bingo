---
baseline_commit: NO_VCS
---

# Story 1.5: Consulter sa bibliothèque de grilles

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur connecté,
I want voir la liste de mes grilles créées,
so that je les retrouve facilement.

## Acceptance Criteria

1. **Given** je suis connecté et j'ai créé au moins une grille
   **When** j'ouvre la Bibliothèque
   **Then** je vois la liste de mes grilles identifiées par leur nom

2. **Given** je n'ai encore créé aucune grille
   **When** j'ouvre la Bibliothèque
   **Then** je vois un message d'invitation à créer ma première grille plutôt qu'un tableau vide silencieux (UX-DR4)

3. **And** une grille validée affiche l'action "Dupliquer" (l'action "Relancer" arrive avec l'Epic 2)

## Tasks / Subtasks

- [x] Task 1: Charger les grilles du compte et leur statut de validation (AC: #1)
  - [x] Dans `BibliothequeScreen.tsx`, ajouter un `useEffect` au montage : `supabase.from('grilles').select('id, nom, taille').order('created_at', { ascending: false })` — la RLS (Story 1.2) scope déjà le résultat aux grilles de `auth.uid()`, pas besoin de filtrer côté client
  - [x] Si des grilles existent, charger en une seconde requête le compte de phrases par grille : `supabase.from('phrases').select('grille_id').in('grille_id', ids)`, puis dériver `validee = nombrePhrases === taille * taille` par grille — pas de colonne "validée" stockée (cohérent avec les Dev Notes des Stories 1.2/1.3)
  - [x] Reprendre tel quel le pattern chargement/erreur/retry déjà établi et revu dans `ComposerPhrases` (Story 1.3) : `chargement`, `chargementEchoue`, bouton "Réessayer", pas de spinner visible (EXPERIENCE.md)

- [x] Task 2: État vide — message d'invitation (AC: #2, UX-DR4)
  - [x] Si, une fois le chargement terminé, `grilles.length === 0`, afficher un message chaleureux invitant à créer sa première grille (ex. "Crée ta première grille pour commencer !") à la place de la liste — jamais un tableau/liste vide silencieuse
  - [x] Le CTA "Nouvelle grille" (déjà existant, Story 1.2) reste visible dans les deux cas (bibliothèque vide ou non)

- [x] Task 3: Liste des grilles avec action "Dupliquer" sur les grilles validées (AC: #1, #3)
  - [x] Afficher chaque grille par son `nom` dans une liste (styles cohérents avec le design system — cartes papier, bordure pointillée, cf. `phrase-list` de `CreationGrilleScreen.css` comme référence de motif)
  - [x] Pour chaque grille où `validee` est vrai, afficher un bouton "Dupliquer" (`cta-secondary`)
  - [x] **Cette story n'implémente pas la duplication elle-même** (Story 1.4, qui suit désormais celle-ci — voir Dev Notes) : au clic sur "Dupliquer", afficher un message temporaire cohérent avec la voix du produit (ex. "Bientôt disponible !") sans créer ou modifier quoi que ce soit en base
  - [x] Ne pas construire l'action "Relancer" — explicitement hors périmètre, Epic 2 (Story 2.1)

- [x] Task 4: Vérification manuelle (AC: #1, #2, #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Compte sans grille : confirmé via l'API (`[]`) — le composant affiche le message d'invitation dans ce cas (`grilles.length === 0`)
  - [x] Compte avec une grille incomplète (2/9) et une grille complète (9/9) : les deux requêtes que fait le composant (`grilles` puis `phrases?grille_id=in.(...)`) confirmées via l'API — le calcul `validee` correspond exactement (false/true)
  - [x] Le bouton "Dupliquer" (`handleDupliquer`) ne fait qu'un `setMessage(...)`, aucun appel Supabase — pas de risque de création involontaire en base (relecture du code, pas d'appel réseau dans ce handler)

### Review Findings

**Patch:**

- [x] [Review][Patch] Le message "Bientôt disponible !" (et tout message transitoire) ne se referme jamais — pas réellement "temporaire" comme l'exige la story. L'effacer automatiquement après quelques secondes (cohérent avec le comportement du composant `toast` du design system — DESIGN.md : "disparaît d'elle-même") et le réinitialiser aussi au début d'un nouveau chargement [src/features/bibliotheque/BibliothequeScreen.tsx:106-108, 146]
- [x] [Review][Patch] `handleSignOut` n'a pas de `catch` — si `supabase.auth.signOut()` est rejeté, cela remonte en rejet de promesse non gérée dans le gestionnaire de clic, sans aucun message pour l'utilisateur. Ajouter un `catch` avec le message générique, cohérent avec tous les autres handlers du projet [src/features/bibliotheque/BibliothequeScreen.tsx:97-104]
- [x] [Review][Patch] Boutons "Dupliquer" tous identiques pour les lecteurs d'écran (même nom accessible "Dupliquer" sur chaque ligne, aucune indication de quelle grille) — ajouter un `aria-label` incluant le nom de la grille [src/features/bibliotheque/BibliothequeScreen.tsx:136-140]

**Deferred:**

- [x] [Review][Defer] Pas de découpage (chunking) sur `.in('grille_id', ids)` pour une bibliothèque très volumineuse — cohérent avec SM-C1 (ne pas sur-investir), improbable à l'échelle de ce projet [src/features/bibliotheque/BibliothequeScreen.tsx:54-58] — deferred, priorité basse
- [x] [Review][Defer] Pas de garde anti-double-clic sur "Réessayer" — pattern hérité tel quel de `ComposerPhrases` (Story 1.3), pas une régression introduite ici [src/features/bibliotheque/BibliothequeScreen.tsx:118-120] — deferred, cohérence avec le composant frère
- [x] [Review][Defer] Boutons "Nouvelle grille"/"Réessayer" non désactivés pendant la déconnexion — course de faible probabilité et impact limité pour cette app personnelle [src/features/bibliotheque/BibliothequeScreen.tsx:148-153] — deferred, priorité basse
- [x] [Review][Defer] Erreurs non loggées (pas de `console.error`/télémétrie) — même pattern déjà différé dans les Stories 1.1/1.2/1.3 [src/features/bibliotheque/BibliothequeScreen.tsx] — deferred, observabilité, priorité basse

**Dismissed:**

- Pas de filtre client explicite en plus de RLS (`.eq('compte_id', ...)`) — décision architecturale assumée (AD-8, RLS comme seule autorité), pas une régression de cette story.
- Comptage de phrases en double faussant `validee` — déjà empêché par la contrainte `unique(grille_id, texte)` ajoutée en Story 1.2.
- `taille` null/undefined provoquant un `NaN` — `taille` est `not null` dans le schéma (migration Story 1.2), scénario non atteignable.
- Pas de pagination sur la liste des grilles — cohérent avec SM-C1, pas d'ambition de scale pour ce projet personnel.
- Pas d'agrégation serveur (vue/fonction Postgres) à la place des deux requêtes — décision explicite des Dev Notes de cette story.
- Absence de spinner pendant le chargement — décision explicite (EXPERIENCE.md, même traitement que le reste de l'app).
- Staleness temps réel (grille créée/supprimée ailleurs pendant que l'écran est ouvert) — Realtime est explicitement Epic 2 (AD-7), hors périmètre d'Epic 1.

## Dev Notes

- **Changement d'ordonnancement (2026-07-07)** : dans le découpage initial des epics, la Story 1.4 (Dupliquer une grille) précédait cette story. Son AC exige un point d'entrée "depuis la Bibliothèque", qui n'existait pas encore (Bibliothèque = stub depuis la Story 1.1). Décision utilisateur : inverser l'ordre — cette story (1.5) construit d'abord la liste et l'affichage de l'action "Dupliquer" (scaffoldée, sans logique de duplication réelle) ; la Story 1.4, qui vient maintenant après, n'aura plus qu'à câbler le clic sur un bouton déjà existant.
- **Portée volontairement étroite** : ne pas implémenter la duplication réelle (Story 1.4) ni l'action "Relancer" (Story 2.1, nécessite `parties`). Le bouton "Dupliquer" de cette story est un point d'entrée visuel, pas une fonctionnalité.
- **Pas de colonne "validée" stockée** (rappel Stories 1.2/1.3) : calculée ici aussi en comptant les `phrases` par `grille_id` et en comparant à `taille × taille`.
- **Deux requêtes plutôt qu'une jointure comptée** : `grilles` puis `phrases` filtrées par `grille_id in (...)` — pas de vue ni de fonction Postgres nécessaire pour ce volume de données (SM-C1, ne pas sur-investir).
- **Aucune nouvelle migration** : la RLS sur `grilles`/`phrases` (Story 1.2) couvre déjà la lecture scopée au propriétaire.
- **Ordre d'affichage** : les grilles les plus récemment créées en premier (`created_at desc`) — aucune contrainte contraire dans le PRD/les epics.
- Pas de spinner de chargement visible (EXPERIENCE.md, Interaction Primitives) — même traitement que `ComposerPhrases`/`App.tsx`.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API directs suffisants, comme pour les stories précédentes.

### Previous Story Intelligence (Story 1.3)

- Pattern chargement/erreur/retry déjà écrit et revu dans `ComposerPhrases` (`src/features/creation-grille/CreationGrilleScreen.tsx`) : états `chargement`/`chargementEchoue`/`retry`, effet avec flag `ignore` pour éviter une mise à jour d'état après démontage, `try/catch/finally`, bouton "Réessayer" qui incrémente `retry` pour redéclencher l'effet. Reproduire ce pattern à l'identique dans `BibliothequeScreen.tsx`, ne pas en réinventer un autre.
- `compte_id` sur `grilles` a un `default auth.uid()` (Story 1.2) — jamais à repasser depuis le client.
- Contrainte `taille between 3 and 5` (ajustée par correct-course, 2026-07-07) — sans impact sur cette story (elle ne crée pas de grille), mentionné pour contexte.

### Project Structure Notes

Aucun nouveau fichier. Seuls `src/features/bibliotheque/BibliothequeScreen.tsx` et `BibliothequeScreen.css` sont modifiés.

Aucune variance connue à date.

### References

- [Source: epics.md#Story 1.5: Consulter sa bibliothèque de grilles]
- [Source: prd.md#FR-17 : Bibliothèque de grilles]
- [Source: ARCHITECTURE-SPINE.md#AD-8 — RLS]
- [Source: EXPERIENCE.md#State Patterns — Bibliothèque vide ; #Component Patterns]
- [Source: 1-3-corriger-une-phrase-a-tout-moment.md#Dev Agent Record — pattern chargement/erreur/retry]
- [Source: sprint-change-proposal-2026-07-07.md — contexte de la réduction de taille de grille, sans impact direct ici]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- E2E navigateur toujours indisponible dans ce sandbox (mêmes limites que les stories précédentes) — vérification par appels directs à l'API REST Supabase reproduisant exactement les requêtes du composant (`grilles` puis `phrases?grille_id=in.(...)`), avec un compte vide puis un compte avec une grille incomplète (2/9) et une grille complète (9/9).
- Une grille de test résiduelle ("test", 6 phrases sur une grille 3×3 non nettoyée d'une session de vérification antérieure) a été trouvée et supprimée avant de démarrer la vérification propre de cette story.
- Données de test créées pendant la vérification ("Grille incomplete", "Grille complete") nettoyées après coup.

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- `BibliothequeScreen.tsx` réécrit : chargement des grilles + comptage des phrases par grille (2 requêtes, pas de vue/fonction Postgres), calcul dérivé de `validee`, état vide avec message d'invitation, liste des grilles avec action "Dupliquer" scaffoldée (message temporaire, pas de logique réelle — Story 1.4).
- Pattern chargement/erreur/retry repris à l'identique de `ComposerPhrases` (Story 1.3), y compris la garde `ignore` contre les mises à jour après démontage/changement de dépendance.
- Aucune migration SQL : RLS déjà en place depuis la Story 1.2.

### File List

- `src/features/bibliotheque/BibliothequeScreen.tsx` (modifié — réécriture complète : chargement des grilles, état vide, liste, action Dupliquer scaffoldée)
- `src/features/bibliotheque/BibliothequeScreen.css` (modifié — styles de la liste de grilles et des messages)

## Change Log

- 2026-07-07 : Implémentation complète (Tasks 1 à 4) — chargement des grilles et de leur statut de validation, état vide avec message d'invitation, liste avec action "Dupliquer" scaffoldée (sans logique réelle, préparée pour la Story 1.4). Statut passé à "review".
- 2026-07-07 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 3 patches appliqués (message temporaire qui s'auto-efface après 3s, `catch` sur `handleSignOut`, `aria-label` par grille sur les boutons "Dupliquer"), 4 points différés. `npm run build`/`npm run lint` revérifiés après correctifs. Statut passé à "done".
