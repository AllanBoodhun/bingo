---
title: Reconciliation — imports/BibiothèqueScreen.png vs UX spines
created: 2026-07-22
sources:
  - imports/BibiothèqueScreen.png
  - DESIGN.md
  - EXPERIENCE.md
---

# Reconciliation: imports/BibiothèqueScreen.png vs ux-bingo (DESIGN.md / EXPERIENCE.md)

## Method

Visual read of the PNG export against the spines as they stood before this session (Bibliothèque was `spine-only`, decided 2026-07-04 as "assez simple" to not need a mockup). No source code of `BibliothequeScreen.tsx` was treated as authoritative here — only the spines and the mockup — implementation follow-up is a separate step.

## Overall verdict

The mockup overturns the "spine-only, simple enough" call from 2026-07-04: it introduces enough new structure (status grouping, per-card metadata, a logo header) that treating it as spine-only would now under-specify the screen. Everything found is additive or a visual-system change, confirmed with the user and folded into `DESIGN.md`/`EXPERIENCE.md` in this pass — no dropped ideas.

## Changes reconciled

### 1. Visual system: solid border + flat offset shadow extended to all buttons and cards

Previously the offset shadow (`3px 3px 0 {colors.ink}`) was reserved for `cta-primary`; everything else used a dashed-line border with no shadow. The mockup applies a solid ink border + the same shadow to every button ("Relancer", "Modifier", "Supprimer") and to every card (grille card, "Partie en cours" reminder card). Folded into `DESIGN.md.Elevation & Depth` and `Components` — confirmed by the user as a **global** design-system evolution, not a one-off for this screen.

### 2. List grouping by status

The flat `grille-list` becomes two titled sections — "Partie en cours - N" and "Mes grilles - N" — using the existing `label-caps` typography token for the section header (no new token needed, new usage documented). Folded into `EXPERIENCE.md.State Patterns`.

### 3. New per-card metadata

Cards now surface taille (e.g. "5 x 5"), player count and vainqueur name for active games, and a `status-chip` ("En cours") — none of this was visible in the prior list-item treatment. Folded into `EXPERIENCE.md.Component Patterns` (`card`, `status-chip`).

### 4. Brand header ("2000 Super Bingo")

Not previously part of any surface's spec. Confirmed with the user to appear on every screen, including in-game. Folded into `DESIGN.md.Brand & Style` as `brand-mark` — flagged as a bespoke image asset, not a CSS-reconstructible component.

## Non-issues (checked, confirmed consistent)

- The reminder banner's purpose (vainqueur déclaré non clôturé, FR-14) is unchanged — only its visual treatment (solid border + shadow instead of dashed) moves, not its behavior or trigger condition.
- No new information architecture beyond grouping: still one flat "Bibliothèque" surface, no new navigation level introduced.
- The mockup shows only "Relancer / Modifier / Supprimer" per grille card, no "Dupliquer" visible — read as illustrative incompleteness (the grille shown is a placeholder example), not a decision to drop Dupliquer from the Bibliothèque; `EXPERIENCE.md` keeps Dupliquer as a Bibliothèque action per the 2026-07-04 spec, unchanged.

## Open item

[ASSUMPTION] Exact colors/spacing were read visually from a flattened PNG, not measured from a source file — hex/px values in `DESIGN.md` reuse existing palette tokens by visual similarity (e.g., the dark "Supprimer" button assumed to reuse `{colors.ink}`) rather than introducing unverified new hex codes. Revisit if the user has a source design file with precise values.
