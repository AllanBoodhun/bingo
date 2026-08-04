---
title: 'Consulter la grille en direct d'un autre joueur'
type: 'feature'
created: '2026-08-05'
status: 'done'
context: []
baseline_commit: 'e4437387882dc608c00a75a27f201590049f20e6'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Pendant une partie longue, un joueur ne voit que sa propre grille — impossible de savoir où en est un autre joueur sans lui demander de vive voix.

**Approach:** Rendre chaque avatar de la pile (sauf le sien) cliquable : il ouvre un écran plein affichant le pseudo et la grille de ce joueur en lecture seule, mise à jour en direct tant que l'écran reste ouvert. Bouton Retour pour revenir à sa propre grille. Aucune donnée nouvelle côté serveur : la policy RLS "Joueur lit les cases de sa partie" (Story 2.2) autorise déjà la lecture de toutes les cases de la partie.

## Boundaries & Constraints

**Always:**
- Aucun `onToggle` sur la grille consultée : impossible de cocher une case d'un autre joueur.
- Accessible aussi bien en partie active qu'après clôture (`statut: terminee`).
- La mise à jour en direct réutilise le canal Realtime déjà ouvert par `GrilleEnDirecteScreen` (AD-7) — pas de nouvel abonnement par joueur consulté.
- Une correction de phrase (FR-3) reçue pendant la consultation se répercute aussi sur la grille consultée.

**Ask First:** aucune — temps réel pendant la vue, écran plein, accessible après clôture sont déjà tranchés.

**Never:**
- Pas de nouvelle policy RLS ni de migration : la lecture est déjà couverte par les policies existantes.
- Pas de bouton sur son propre avatar.
- Pas de correction du long-press "bulle de texte tronqué" sur case désactivée (déjà limité ainsi en partie clôturée) — hors périmètre.
- Pas de badge vainqueur/live dupliqué sur cet écran : le header reste celui de l'écran principal, seule la zone grille/actions bascule.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clic avatar d'un autre joueur | joueur de la partie, pas soi-même | Écran plein : pseudo + grille lecture seule | Échec chargement → message générique + Retour |
| Clic sur son propre avatar | avatar-stack | Non cliquable, aucune action | N/A |
| Joueur consulté coche une case | écran ouvert, event Realtime UPDATE `cases` | Case se coche sans re-fetch | N/A |
| Créateur corrige une phrase | écran ouvert, event Realtime UPDATE `phrases` | Nouveau texte affiché | N/A |
| Clic "Retour" | écran ouvert | Retour instantané à sa grille, pas de refetch | N/A |
| Compteur "+N" avatar-stack | >3 joueurs | Non cliquable (aucun joueur précis associé) | N/A |

</frozen-after-approval>

## Code Map

- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` -- ajoute `joueurConsulte`/`casesAdversaire`, rend `AvatarStack` cliquable, étend les handlers Realtime `cases`/`phrases` existants pour patcher aussi `casesAdversaire`
- `src/features/grille-en-direct/GrilleEnDirecteScreen.scss` -- style bouton sur `.avatar-stack__avatar` + layout de la zone de consultation
- `src/components/GridCell.tsx` (nouveau) -- extraction telle quelle de `GridCell`, pour réemploi
- `src/features/grille-en-direct/GrilleAdversaireScreen.tsx` (nouveau) -- écran lecture seule : pseudo, grille (`GridCell` tous `disabled`), Retour, chargement/erreur
- `src/services/cases.service.ts` -- inchangé ; `listerCasesDeJoueur(joueurId)` déjà réutilisable pour n'importe quel joueur de la partie

## Tasks & Acceptance

**Execution:**
- [x] `src/components/GridCell.tsx` -- extraire `GridCell` hors de `GrilleEnDirecteScreen.tsx` (comportement identique) ; le screen l'importe à la place de sa définition locale -- prérequis au réemploi
- [x] `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` -- avatars autres que soi-même deviennent des `<button>` cliquables → fetch `casesService.listerCasesDeJoueur(joueur.id)`, fixent `joueurConsulte`/`casesAdversaire` ; ajouter `joueurConsulteRef` miroir (même pattern que `joueursRef`/`vainqueurIdsRef` déjà présents) -- point d'entrée + lecture à jour dans les handlers Realtime
- [x] `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` -- étendre les handlers UPDATE `cases` et `phrases` existants pour patcher aussi `casesAdversaire` (par `id` de ligne pour `cases`, par `phrase_id` pour `phrases`) quand `joueurConsulteRef.current` correspond
- [x] `src/features/grille-en-direct/GrilleAdversaireScreen.tsx` -- nouveau composant : props `{ joueur, cases, chargement, erreur, onRetour }` ; header "Grille de {pseudo}" + Retour ; grille `GridCell` tous `disabled`
- [x] `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` -- si `joueurConsulte` défini, remplacer la zone sous-titre/grille/actions/clôture par `<GrilleAdversaireScreen .../>` ; header (avatar-stack, badge, toast, overlay vainqueur) reste affiché

**Acceptance Criteria:**
- Given une partie à ≥2 joueurs, when je clique sur l'avatar d'un autre joueur, then je vois son pseudo et sa grille avec ses cases cochées, sans pouvoir en cocher.
- Given l'écran de consultation ouvert, when le joueur consulté coche une case, then elle se coche sans rouvrir l'écran.
- Given l'écran de consultation ouvert, when je clique "Retour", then je retrouve ma grille intacte, sans rechargement réseau.
- Given une partie clôturée, when je clique sur l'avatar d'un autre joueur, then la consultation fonctionne pareil.
- Given mon propre avatar dans la pile, when je le regarde, then il n'est pas cliquable.

## Spec Change Log

## Design Notes

- Réemployer le pattern `joueursRef`/`vainqueurIdsRef` déjà présent (miroir synchrone d'un state pour les handlers Realtime) pour `joueurConsulteRef` — même problème déjà résolu deux fois dans ce fichier.
- `listerCasesDeJoueur` ne fait aucune vérification d'autorisation côté client : c'est la policy RLS qui filtre. Un id hors de la partie renverrait `data: []`, jamais une erreur.
- Le payload `UPDATE` Realtime contient l'`id` de la ligne `cases` modifiée : matcher `casesAdversaire` par `id`, pas par `position`.

## Verification

**Commands:**
- `npm run lint` -- expected: aucune erreur oxlint
- `npm run build` -- expected: `tsc -b && vite build` réussit sans erreur de typage

**Manual checks (if no CLI):**
- Deux sessions navigateur sur la même partie. Depuis A, cliquer l'avatar de B : vérifier pseudo + cases. Cocher une case côté B, vérifier la mise à jour live côté A. Cliquer Retour côté A, vérifier le retour intact à sa grille.

## Suggested Review Order

**Point d'entrée**

- Clic sur un avatar déclenche la consultation en lecture seule (fetch + états).
  [`GrilleEnDirecteScreen.tsx:111`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L111)

- Avatar cliquable seulement pour les autres joueurs, jamais pour soi-même.
  [`GrilleEnDirecteScreen.tsx:589`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L589)

**Cohérence temps réel (réutilisation du canal unique, AD-7)**

- Le handler UPDATE `cases` existant patch aussi la grille consultée, en bufferisant les événements arrivés pendant le fetch initial pour éviter une régression stale (relecture post-review).
  [`GrilleEnDirecteScreen.tsx:316`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L316)

- Le fetch initial rejoue le buffer d'événements avant d'appliquer les données, garde carré-parfait/vide et try/catch réseau (ajoutés en revue).
  [`GrilleEnDirecteScreen.tsx:141`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L141)

**Rendu**

- Bascule entre sa propre grille et l'écran de consultation, header/toast/overlay vainqueur inchangés.
  [`GrilleEnDirecteScreen.tsx:503`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L503)

- Écran lecture seule : pseudo, grille toujours `disabled`, états chargement/erreur.
  [`GrilleAdversaireScreen.tsx:24`](../../src/features/grille-en-direct/GrilleAdversaireScreen.tsx#L24)

**Peripherals**

- Extraction inchangée de `GridCell` (réemployée en lecture seule).
  [`GridCell.tsx:30`](../../src/components/GridCell.tsx#L30)
