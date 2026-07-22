---
title: Reconciliation — imports/CreationGrille.png vs UX spines
created: 2026-07-22
sources:
  - imports/CreationGrille.png
  - DESIGN.md
  - EXPERIENCE.md
---

# Reconciliation: imports/CreationGrille.png vs ux-bingo (DESIGN.md / EXPERIENCE.md)

## Method

Visual read of the PNG export against the spines' existing "Création de grille" specification (already spec'd behaviorally in EXPERIENCE.md's Component/State Patterns tables, previously without a dedicated mockup beyond the older `mockups/direction-artisanal.html`).

## Overall verdict

No behavioral contradictions — the mockup mostly confirms the existing FR-1–FR-4 behavior (size chips, phrase counter, add-phrase flow) under the new visual system. Two visual-system deltas and one new layout pattern are folded in.

## Changes reconciled

### 1. Form fields move from dashed to solid border

"Nom de la grille" and the phrase inputs use a solid ink border in the mockup, not the dashed-line treatment the current spine and codebase (`creation-grille-screen__input`) use. Folded into `DESIGN.md.Components` ("Champ de phrase / champ de formulaire") and `Elevation & Depth`.

### 2. Sticky bottom action bar

"Créer la grille" (primary) / "Annuler" (closing) sit in a fixed card-style bar pinned to the bottom of the screen, rather than flowing inline after the form as today. New component `sticky-action-bar` documented in `DESIGN.md` and `EXPERIENCE.md.Component Patterns`.

### 3. Brand header

Same "2000 Super Bingo" wordmark as the Bibliothèque mockup — consistent with the global `brand-mark` decision, no new reconciliation needed here beyond confirming consistency across screens.

## Non-issues (checked, confirmed consistent)

- Size chips (3×3/4×4/5×5) keep the dashed-border-when-inactive / solid-terracotta-when-active treatment already specified — no change here, confirmed by direct visual comparison (this is the one control the new system deliberately leaves dashed, see `DESIGN.md.Elevation & Depth`).
- Phrase counter ("1 / 9") and the disabled-until-complete state of the primary CTA match `EXPERIENCE.md.State Patterns` ("Grille incomplète") as already written — no change.
- No new fields beyond nom + taille + phrases — FR-1 to FR-4 scope unchanged.

## Open item

None outstanding — this screen's behavior was already fully spec'd; only the visual system needed folding in (shared with the other two reconciliations).
