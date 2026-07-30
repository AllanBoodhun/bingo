---
title: Reconciliation — imports/Correctifs/grille-design-error.png vs UX spines
created: 2026-07-30
sources:
  - imports/Correctifs/grille-design-error.png
  - DESIGN.md
  - EXPERIENCE.md
---

# Reconciliation: imports/Correctifs/grille-design-error.png vs ux-bingo (DESIGN.md / EXPERIENCE.md)

## Method

Diagnostic visuel du bug (débordement de texte dans les cases de `grid-cell`, écran Grille en direct) confronté au code existant (`GrilleEnDirecteScreen.tsx`, `GrilleEnDirecteScreen.scss`, `CreationGrilleScreen.tsx`) et aux spines. Discussion avec Aboodhun (via Sally) pour caler le correctif avant implémentation.

## Overall verdict

Le débordement vient de deux causes cumulées : (1) aucune contrainte CSS de troncature sur `.grid-cell__texte`, (2) une limite de saisie (`TEXTE_MAX_LENGTH = 200`) jamais calibrée sur l'espace d'affichage réel d'une case (le pire cas étant une grille 5×5). Le correctif introduit une troncature systématique (garde-fou, quelle que soit la longueur saisie) + une limite resserrée à ~50 caractères + un mécanisme de consultation du texte complet. Ce dernier point recoupe une règle déjà actée dans `EXPERIENCE.md` (« pas de long-press sur la grille ») — confirmé avec l'utilisateur comme un **override assumé**, documenté ci-dessous plutôt que silencieusement contredit.

## Changes reconciled

### 1. Troncature systématique du texte de case (`grid-cell__texte`)

`-webkit-line-clamp: 3` + `text-overflow: ellipsis` sur `.grid-cell__texte` — garde-fou qui s'applique quelle que soit la longueur du texte saisi, indépendamment de la limite de caractères. Garantit qu'aucun texte ne déborde plus jamais visuellement de la case, même dans un cas non prévu (donnée existante saisie avant le resserrage de la limite). Folded into `DESIGN.md.Components` (`grid-cell`).

### 2. Limite de saisie resserrée à ~50 caractères (au lieu de 200)

Calibrée sur le pire cas d'affichage (grille 5×5, cellule ~80px de large sur un écran mobile de 480px de large) pour que le texte tienne sur 3 lignes sans même atteindre l'ellipsis dans la majorité des cas. Implémentation : `TEXTE_MAX_LENGTH` dans `CreationGrilleScreen.tsx:26` + contrainte SQL associée (`supabase/migrations/20260707202115_grilles_phrases.sql:12`) — ajustement du code hors scope spine, suivi en implémentation. Folded into `DESIGN.md.Components` (Champ de phrase / champ de formulaire) et `EXPERIENCE.md.Component Patterns`.

### 3. Override de « pas de long-press » pour la consultation du texte complet

`EXPERIENCE.md.Interaction Primitives` interdisait jusqu'ici tout long-press sur la grille (décision héritée des sessions 2026-07-04/07-22). Nouvelle règle, confirmée par l'utilisateur : un appui long (~450ms) sur une case au texte tronqué ouvre une bulle ancrée à la case (`text-reveal-bubble`) affichant le texte complet ; relâchement avant le seuil ou tap ailleurs referme/annule sans déclencher de coche. Ce geste reste strictement une action de **consultation**, distincte du tap qui demeure l'unique geste de coche — aucun changement sur FR-10. Folded into `EXPERIENCE.md.Interaction Primitives`, `.Component Patterns` et `.State Patterns` (`grid-cell`), nouveau composant `text-reveal-bubble` dans `DESIGN.md.Components`.

## Non-issues (checked, confirmed consistent)

- Pas de scroll dédié à la grille : avec le plancher `min-height: 44px` et la taille de cellule relative (`aspect-ratio: 1/1`, `width: 100%`), une grille 5×5 tient dans la hauteur d'un écran mobile standard — le scroll de page existant suffit, pas de mécanisme supplémentaire à construire.
- La coche d'état (`grid-cell__coche`, coin haut-droit) reste inchangée et ne chevauche jamais le texte — cohérent avec la décision existante.

## Open item

[ASSUMPTION] Le seuil de ~50 caractères et le délai de ~450ms pour l'appui long sont des estimations de design, pas mesurées empiriquement sur device — à ajuster en implémentation si le rendu réel (police Nunito chargée, tailles d'écran variées) diverge sensiblement.
