---
title: Reconciliation — imports/EditionGrille.png vs UX spines
created: 2026-07-22
sources:
  - imports/EditionGrille.png
  - DESIGN.md
  - EXPERIENCE.md
---

# Reconciliation: imports/EditionGrille.png vs ux-bingo (DESIGN.md / EXPERIENCE.md)

## Method

Visual read of the PNG export. "Édition de grille" did not previously exist as its own named surface in `EXPERIENCE.md` — editing an existing grille was folded into the same behavioral rows as "Création de grille" (same component, different initial state), with no distinct IA entry.

## Overall verdict

This is the mockup with the most information-architecture weight of the three: it moves grille lifecycle actions (Relancer/Dupliquer/Supprimer) that were previously Bibliothèque-only into the edit screen, and changes the nom-editing interaction pattern. Both were flagged to the user as decisions rather than silently absorbed, and both were confirmed before being folded into the spines.

## Changes reconciled

### 1. Relancer / Dupliquer / Supprimer surfaced on the edit screen

Previously these three actions lived exclusively on the Bibliothèque list card (`EXPERIENCE.md` 2026-07-04: "Grille listée avec ses deux actions"). The mockup puts them as a button row at the top of Édition de grille too. **Confirmed by the user** as an intentional IA change, not mockup noise — folded into `EXPERIENCE.md`'s Information Architecture row for Édition de grille and into `State Patterns` ("Grille validée, partie non lancée").

### 2. Nom de la grille: click-to-edit → permanent field

The current spec and implementation use a tap-on-title-to-edit-inline pattern (title becomes an input on click, saves on blur). The mockup shows a persistent labeled input ("Nom de la grille"), matching the creation form. **Confirmed by the user** as an intentional replacement, not just a visual reskin of the same interaction — folded into `EXPERIENCE.md.Component Patterns` (Champ de phrase / champ de formulaire row) as an explicit override of the 2026-07-04 decision.

### 3. New IA surface: "Édition de grille"

Added as its own row in `EXPERIENCE.md.Information Architecture`, distinct from "Création de grille," since it now has a materially different action set (lifecycle actions) even though it's expected to keep sharing the same underlying component/behavior for size/phrases editing.

## Non-issues (checked, confirmed consistent)

- Taille chips and phrase list behavior (editable at any time, including post-launch, FR-3/FR-5) are visually consistent with the mockup and unchanged in the spine — the mockup doesn't show a disabled/locked state for a grille with an active partie, but that's expected: a static mockup can't show a state the example grille isn't in. No contradiction with FR-5 (chip disabled-not-hidden when a partie exists).
- Bottom sticky bar mirrors Création de grille's, with "Enregistrer" replacing "Créer la grille" — consistent, same `sticky-action-bar` component, no new pattern.

## Open item

[ASSUMPTION] The mockup doesn't show a per-phrase delete affordance (visible in the current implementation as a "Supprimer" button per phrase row). Read as a static-mockup limitation (delete-on-hover/tap-to-reveal isn't representable in a single flat export) rather than a decision to remove per-phrase deletion — `EXPERIENCE.md` keeps per-phrase deletion as-is. Flag to the user if this was actually meant to disappear.
