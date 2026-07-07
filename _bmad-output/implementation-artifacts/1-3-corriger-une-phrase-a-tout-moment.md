---
baseline_commit: NO_VCS
---

# Story 1.3: Corriger une phrase à tout moment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur,
I want modifier le texte d'une phrase de ma grille à tout moment,
so that je corrige une coquille sans tout retaper.

## Acceptance Criteria

1. **Given** une grille qui m'appartient (validée ou non)
   **When** je tape une phrase existante
   **Then** je peux éditer son texte en place et l'enregistrer

2. **Given** une correction enregistrée
   **When** je recharge la grille
   **Then** le nouveau texte est affiché et la position de la phrase dans la grille ne change jamais suite à une correction de texte

   **And** seul le créateur propriétaire de la grille peut modifier une phrase — appliqué via RLS (AD-8)
   **And** la propagation en temps réel de cette correction vers des grilles déjà distribuées à des joueurs est traitée dans l'Epic 2 (nécessite les tables `parties`/`cases`, hors périmètre de cette story)

## Tasks / Subtasks

- [x] Task 1: Charger les phrases existantes d'une grille au montage (AC: #2)
  - [x] Dans `ComposerPhrases` (`src/features/creation-grille/CreationGrilleScreen.tsx`), remplacer l'état initial `useState<Phrase[]>([])` par un chargement effectif : `useEffect` qui exécute `supabase.from('phrases').select('id, texte').eq('grille_id', grille.id).order('created_at')` au montage, et peuple `phrases` avec le résultat
  - [x] Sans spinner visible (EXPERIENCE.md, Interaction Primitives — pas de spinner sur les actions courantes) : ne rien afficher tant que le chargement initial n'est pas résolu (même traitement que le `loading` de `App.tsx`, Story 1.1), puis afficher la liste
  - [x] Gérer l'échec du chargement avec le même pattern `friendlyErrorMessage` que le reste de l'écran (try/catch, pas de spinner ni de crash) ; la liste reste vide et le message s'affiche
  - [x] Ce chargement rend le composant capable d'afficher une grille déjà partiellement composée — condition nécessaire pour qu'une future entrée depuis la Bibliothèque (Story 1.5) puisse rouvrir une grille existante sans changement supplémentaire ici

- [x] Task 2: Vérifier que la correction de texte fonctionne sur une grille "validée" (AC: #1)
  - [x] Confirmé (sans nouveau code — déjà couvert par l'implémentation de la Story 1.2) que `startEdit`/`saveEdit` restent accessibles sur une phrase même quand `complete` est vrai (le formulaire d'ajout se cache alors, mais la liste des phrases et le tap-pour-éditer restent affichés et actifs)
  - [x] Vérifié : grille 3×3 complétée (9/9), phrase existante corrigée avec succès après complétion (voir Debug Log)

- [x] Task 3: Vérifier la persistance de la correction et la stabilité de la position (AC: #2)
  - [x] Vérifié via l'API REST Supabase qu'après une correction, `phrases.texte` est bien mis à jour et que `phrases.id` (donc la ligne elle-même) est inchangé — il n'existe aucune colonne de position sur `phrases` dans ce modèle de données (Dev Notes Story 1.2, ARCHITECTURE-SPINE.md ERD) : la position n'existe qu'au niveau de la table `cases`, introduite en Epic 2 (AD-6), donc "la position ne change jamais" est structurellement garanti par l'absence même d'un tel champ sur `phrases`
  - [x] Vérifié que la policy RLS `update` sur `phrases` refuse toujours la modification par un compte qui n'est pas le propriétaire de la grille parente (0 ligne modifiée par le 2e compte de test)

- [x] Task 4: Vérification manuelle globale (AC: #1, #2)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Créer une grille, ajouter ses N² phrases, corriger une phrase après complétion, revérifier via l'API que le nouveau texte est bien celui attendu — confirmé

### Review Findings

**Patch:**

- [x] [Review][Patch] Pas de `.catch()` sur la promesse de chargement des phrases — si elle est rejetée (plutôt que résolue avec `{ error }`), `chargement` reste bloqué à `true` indéfiniment et l'écran reste vide pour toujours [src/features/creation-grille/CreationGrilleScreen.tsx:148-161]
- [x] [Review][Patch] `chargement`/`phrases` jamais réinitialisés si `grille.id` change — `chargement` n'est initialisé qu'une fois via `useState(true)` ; si ce composant est un jour réutilisé pour rouvrir une grille différente (Story 1.5), les phrases de l'ancienne grille resteraient affichées sous le titre de la nouvelle jusqu'à la résolution du nouveau fetch. Réinitialiser `setChargement(true)`/`setPhrases([])` en tête de l'effet [src/features/creation-grille/CreationGrilleScreen.tsx:145-166]
- [x] [Review][Patch] Aucun moyen de réessayer si le chargement initial échoue — l'utilisateur reste bloqué avec une liste vide et un message d'erreur, sans recours autre que recharger toute la page. Ajouter une action "Réessayer" qui redéclenche le fetch [src/features/creation-grille/CreationGrilleScreen.tsx:227-229]

**Deferred:**

- [x] [Review][Defer] Pas d'annulation de la requête réseau elle-même pendant le chargement (seul son résultat est ignoré via le flag `ignore`) — `.abortSignal()` existe côté Supabase mais son ajout n'apporte que peu de valeur pour ce projet à faible trafic [src/features/creation-grille/CreationGrilleScreen.tsx:145-166] — deferred, priorité basse

**Dismissed:**

- Écran vide sans indicateur pendant le chargement (pas de spinner) — décision explicite des Dev Notes (EXPERIENCE.md, pas de spinner sur les actions courantes, même traitement que `App.tsx`), pas un oubli.
- Grille supprimée de façon concurrente pendant le chargement — aucune fonctionnalité de suppression n'existe dans l'app à ce jour, scénario actuellement impossible.
- Absence de `.limit()` sur le fetch pour se prémunir d'une grille avec plus de phrases que taille² — déjà explicitement écarté en Story 1.2 (pas de protection anti-abus au-delà des défauts Supabase, cohérent avec l'architecture spine).
- Course hypothétique entre `handleAjouter`/`saveEdit` et le chargement initial "si la garde `if (chargement) return null` était un jour retirée" — spéculatif, non atteignable dans le code actuel.
- Libellé des chips modifié ("3×3 - 9 phrases") en dehors du périmètre déclaré de cette story — changement mineur, cohérent avec le design system, accepté.

## Dev Notes

- **Portée volontairement réduite** : la Story 1.2 a déjà implémenté un mécanisme de correction de phrase générique et non restreint par l'état "validée/non validée" (`saveEdit` dans `ComposerPhrases` n'est jamais conditionné par `complete`), ainsi que la policy RLS `update` sur `phrases` scopée au créateur propriétaire (AD-8, `20260707202115_grilles_phrases.sql`). **Ces deux éléments satisfont déjà l'essentiel de l'AC1 et de la contrainte RLS de l'AC2** — cette story ne les réimplémente pas, elle les vérifie et comble le seul vrai manque : les phrases existantes ne sont jamais rechargées depuis la base au montage de l'écran (Task 1).
- **Pas de point d'entrée pour rouvrir une grille existante depuis la Bibliothèque** : la Bibliothèque (`BibliothequeScreen.tsx`) est toujours un stub (Story 1.1) ne listant aucune grille — cette capacité arrive avec la Story 1.5 (FR-17). En conséquence, la vérification de "je recharge la grille" (AC2) pour CETTE story se fait par appel direct à l'API REST Supabase (comme pour les Stories 1.1/1.2), pas par un aller-retour dans l'interface — il n'existe simplement pas encore de navigation UI vers une grille existante. Ne pas construire cette navigation ici : ce serait empiéter sur le périmètre de la Story 1.5.
- **Aucune migration SQL nécessaire** : les policies RLS de `phrases` (créées en Story 1.2) couvrent déjà "seul le créateur propriétaire modifie" sans distinction de statut de la grille. Ne pas créer de nouvelle policy.
- **Pas de colonne `position` sur `phrases`** (rappel Story 1.2) : la stabilité de la position d'une phrase dans une grille déjà distribuée est un concept qui n'existe qu'au niveau de la table `cases` (Epic 2, AD-6) — `phrases` n'a et n'aura jamais de position propre. La "And" de l'AC2 sur la position est donc satisfaite par construction du modèle de données, pas par un mécanisme à coder ici.
- **Propagation temps réel vers des joueurs déjà en partie** (dernière "And" de l'AC2) : explicitement hors périmètre — nécessite les tables `parties`/`cases` et l'abonnement Realtime de l'Epic 2 (AD-7). Ne pas anticiper.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API directs suffisants, comme pour les Stories 1.1 et 1.2.
- Pas de spinner de chargement visible (EXPERIENCE.md, Interaction Primitives) — le chargement initial des phrases suit le même silence que le chargement de session dans `App.tsx`.

### Previous Story Intelligence (Story 1.2)

- `ComposerPhrases` (`src/features/creation-grille/CreationGrilleScreen.tsx`) contient déjà `startEdit`/`saveEdit` avec : garde anti-course sur `setEditingId` (`setEditingId((current) => current === id ? null : current)`), Entrée qui déclenche un `blur` plutôt qu'un second appel direct à `saveEdit` (évite la double sauvegarde), `maxLength={TEXTE_MAX_LENGTH}` (200) sur le champ d'édition. Réutiliser ces patterns tels quels, ne pas les dupliquer ni les modifier sans raison.
- La revue de code de la Story 1.2 a identifié et corrigé une contrainte d'unicité `(grille_id, texte)` sur `phrases` — une correction de texte qui produirait un doublon avec une autre phrase de la même grille sera donc rejetée par la base (`23505`) ; le `friendlyErrorMessage` générique existant suffit à afficher un message pour ce cas, pas de traitement spécifique requis.
- `compte_id` sur `grilles` a un `default auth.uid()` (Story 1.2, patch de revue) — ne jamais le repasser depuis le client sur un futur insert/update.
- Pattern d'erreur établi (Stories 1.1/1.2) : toujours `try/catch/finally`, désactiver les contrôles pendant une requête en cours (`pending`), jamais d'erreur réseau silencieuse.

### Project Structure Notes

Aucun nouveau fichier. Seul `src/features/creation-grille/CreationGrilleScreen.tsx` (`ComposerPhrases`) est modifié — ajout d'un `useEffect` de chargement initial des phrases.

Aucune variance connue à date.

### References

- [Source: epics.md#Story 1.3: Corriger une phrase à tout moment]
- [Source: prd.md#FR-3 : Modification d'une phrase à tout moment]
- [Source: ARCHITECTURE-SPINE.md#AD-6 — Cases référencent une Phrase, #AD-8 — RLS, #AD-7 — Realtime (hors périmètre ici)]
- [Source: EXPERIENCE.md#Interaction Primitives — pas de spinner sur les actions courantes]
- [Source: 1-2-creer-une-grille.md#Dev Notes, #Review Findings — RLS déjà vérifiée, garde anti-course sur l'édition, contrainte d'unicité des phrases]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Vérification E2E navigateur (Playwright) toujours indisponible dans ce sandbox (mêmes limites que Stories 1.1/1.2) — vérification faite intégralement via l'API REST Supabase avec le compte de test `admin@test.com` : création d'une grille 3×3, ajout de 9 phrases (complétion), correction d'une phrase après complétion, re-fetch confirmant la persistance et l'`id` inchangé, tentative de modification par un 2e compte confirmant le refus RLS (`[]`, 0 ligne).
- Données de test créées pendant la vérification (grille "Bingo story 1.3", compte "autre@test.com") nettoyées après coup.

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- Seul changement de code : `ComposerPhrases` charge désormais les phrases existantes de la grille via `useEffect`/`select` au montage (au lieu de partir d'une liste toujours vide), avec le même traitement "pas de spinner" que `App.tsx` (Story 1.1) et le même pattern d'erreur générique.
- Aucune migration SQL nécessaire : la policy RLS `update` sur `phrases` (Story 1.2) couvrait déjà "seul le créateur propriétaire modifie", sans distinction de statut de la grille — reconfirmé par test plutôt que réimplémenté.
- La stabilité de la position (2ᵉ "And" de l'AC2) est garantie structurellement : `phrases` n'a pas de colonne de position (elle n'existe qu'au niveau de `cases`, Epic 2).
- La propagation temps réel vers des joueurs déjà en partie (3ᵉ "And" de l'AC2) reste hors périmètre, comme prévu — nécessite `parties`/`cases` (Epic 2).
- Pas de nouveau point d'entrée pour "rouvrir une grille existante" depuis la Bibliothèque — toujours le stub de la Story 1.1, la liste réelle arrive en Story 1.5.

### File List

- `src/features/creation-grille/CreationGrilleScreen.tsx` (modifié — chargement des phrases existantes au montage de `ComposerPhrases`)

## Change Log

- 2026-07-07 : Implémentation complète (Tasks 1 à 4) — chargement des phrases existantes au montage ; re-vérification de la correction en place (déjà fonctionnelle depuis la Story 1.2) et de la restriction RLS. Statut passé à "review".
- 2026-07-07 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 3 patches appliqués (`.catch()` sur le chargement, réinitialisation de `chargement`/`phrases` par grille, action "Réessayer" en cas d'échec), 1 point différé. `npm run build`/`npm run lint` et vérification API revérifiés après correctifs. Statut passé à "done".
