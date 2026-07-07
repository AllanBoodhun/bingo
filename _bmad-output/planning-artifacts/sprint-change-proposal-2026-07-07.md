---
date: 2026-07-07
status: implemented
scope: minor
---

# Sprint Change Proposal — Réduction de la taille maximale de grille (8×8 → 5×5)

## 1. Résumé du problème

Décision produit : la borne maximale de taille de grille (8×8, soit 64 phrases) est jugée excessive pour l'usage réel du produit (jeu entre proches pendant un événement). 5×5 (25 phrases) est jugé largement suffisant. Cette borne pourra être réélevée plus tard si l'usage réel en montre le besoin — pas de raison technique ou architecturale à la limite choisie, uniquement un ajustement de scope produit.

Déclencheur : retour direct de l'auteur/PM du projet (pas un bug ni une contrainte technique découverte en implémentation).

## 2. Analyse d'impact

**Epics :** aucun impact structurel. Epic 1 reste complétable tel quel ; Epic 2 ne dépend d'aucune borne numérique de taille. Aucun epic obsolète, aucun nouveau epic nécessaire, pas de resequencement.

**Artefacts vivants mis à jour :**
- `prd.md` (FR-1 — borne et exemples)
- `SPEC.md` (Constraints — borne)
- `epics.md` (FR-1, FR Coverage Map, UX-DR2, UX-DR6, AC de la Story 1.2)
- `EXPERIENCE.md` (Component Patterns — chips, Accessibility Floor)
- `DESIGN.md` (typographie body-sm — exemple de grille dense)

**Artefacts historiques volontairement non modifiés** (instantanés d'une décision passée, pas la source de vérité courante) : `.memlog.md` (brief/prd/spec/ux/architecture), `review-rubric.md`, `reconcile-prd.md`, `implementation-readiness-report-2026-07-04.md`, mockups `.html`.

**Code :**
- Nouvelle migration `supabase/migrations/20260707210812_reduire_taille_max_grille.sql` — contrainte `grilles_taille_check` passée de `between 3 and 8` à `between 3 and 5`
- `src/features/creation-grille/CreationGrilleScreen.tsx` — `TAILLES` passé de `[3,4,5,6,7,8]` à `[3,4,5]`

**Stories déjà `done` (1.2, 1.3) :** AC/Tasks non réécrites (elles reflètent fidèlement ce qui a été revu à l'époque, borne 3-8) ; une entrée de Change Log ajoutée dans chacune pour tracer l'ajustement rétrospectif.

## 3. Chemin retenu

**Option 1 — Ajustement direct.** Effort faible, risque faible : changement de paramètre localisé (une contrainte SQL, un tableau de constantes UI, quelques lignes de documentation). Pas de rollback nécessaire, pas de révision du MVP — FR-1 reste pleinement atteignable, juste avec une borne plus resserrée.

## 4. Changements appliqués

| Fichier | Changement |
|---|---|
| `prd.md` | FR-1 : "3 et 8" → "3 et 5" ; exemples mis à jour |
| `SPEC.md` | Constraints : "N entre 3 et 8" → "N entre 3 et 5" |
| `epics.md` | FR-1, FR Coverage Map, UX-DR2, UX-DR6, AC Story 1.2 : "8×8"/"3 et 8" → "5×5"/"3 et 5" |
| `EXPERIENCE.md` | Component Patterns (chips), Accessibility Floor : "8×8" → "5×5" |
| `DESIGN.md` | body-sm : "7x7/8x8" → "4x4/5x5" |
| `supabase/migrations/20260707210812_reduire_taille_max_grille.sql` | Nouvelle migration, contrainte `taille between 3 and 5` |
| `src/features/creation-grille/CreationGrilleScreen.tsx` | `TAILLES = [3, 4, 5]` |
| `1-2-creer-une-grille.md`, `1-3-corriger-une-phrase-a-tout-moment.md` | Entrée de Change Log ajoutée (traçabilité, AC/Tasks historiques non réécrites) |

Vérifié : `npm run build`/`npm run lint` passent ; contrainte testée via API (taille=6 rejetée, taille=5 acceptée).

## 5. Handoff

**Classification : Minor.** Implémenté directement (pas de PO/PM/Architecte nécessaire pour un changement de ce périmètre).

## 6. Statut

✅ Implémenté et vérifié le 2026-07-07.
