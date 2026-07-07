---
title: bingo — PRD vs UX spine reconciliation
created: 2026-07-04
sources:
  - ../../prds/prd-bingo-2026-07-03/prd.md
  - ./DESIGN.md
  - ./EXPERIENCE.md
---

# Reconciliation: PRD vs EXPERIENCE.md / DESIGN.md

Method: walked FR-1 through FR-19 one by one, checked whether EXPERIENCE.md's IA table, Component Patterns, State Patterns, and Key Flows trace each requirement (most FRs are explicitly cited by number in EXPERIENCE.md, which makes the ones that are *not* cited easy to spot), then separately scanned both derived docs for statements that contradict the PRD.

## FR-by-FR coverage

| FR | Requirement | Coverage in EXPERIENCE.md | Verdict |
|---|---|---|---|
| FR-1 | Grid NxN, 3–8, phrase count = N×N before validation | IA table, "Création de grille"; State Patterns "Grille incomplète" (CTA disabled, counter "5/25") | Covered |
| FR-2 | Naming a grid | UJ-1 flow step 3 | Covered |
| FR-3 | Edit phrase text anytime incl. live game; real-time propagation; position in already-distributed grids doesn't move | Component Patterns "Champ de phrase" — editable post-validation and mid-game; UJ-1 cas limite | Covered (position-preserved nuance is a data-layer detail, not UX-visible — reasonable to omit) |
| FR-4 | Duplicate grid | State Patterns row "Grille validée..."; UJ-3 flow | Covered |
| FR-5 | Launch game from validated grid; size locked after launch | State Patterns "Sélecteur de taille... désactivé après lancement" | Covered |
| FR-6 | Random per-player distribution, no two players identical | IA table cites FR-6; UJ-1/UJ-2 flows ("mélangée différemment") | Covered |
| FR-7 | Game link generation, shareable outside app | UJ-1 flow step 5 | Covered |
| FR-8 | Join via link/code, with/without account; **max 6 players incl. creator**; link reusable (not single-use) | "Rejoindre une partie" surface + flow cover joining without account. Max-6 cap and link-reusability are **not represented anywhere** — no "game full" state, no error/blocked state for a 7th joiner. | **Gap** — see below |
| FR-9 | Creator joins own game as player | UJ-1 flow step 6 | Covered |
| FR-10 | Declarative check/uncheck, no central validation | Component Patterns "Case de grille" | Covered |
| FR-11 | Victory detection; near-simultaneous → co-winners, no strict tiebreak; doesn't auto-close game | IA note ("détection... ne ferme pas la partie"); UJ-2 cas limite (co-winners in overlay) | Covered |
| FR-12 | All players notified in real time, no manual action; game stays open until creator closes | State Patterns "Vainqueur déclaré" (overlay); Accessibility Floor requires persistent (non-transient) winner announcement — stricter than PRD, not a conflict | Covered |
| FR-13 | Creator can close manually **at any time**, notably after a winner | State Patterns table only shows the "Clôturer la Partie" CTA attached to the *"Vainqueur déclaré"* row. No state row shows a close control while the game is in progress with no winner yet. | **Gap/ambiguity** — see below |
| FR-14 | Reminder to creator on next visit if a winner was declared but game not closed | State Patterns "Rappel de partie en cours"; Component Patterns "Bannière 'partie en cours'" | Covered |
| FR-15 | Reconnection restores grid, checked cells, already-announced winner, no rejoin needed | State Patterns "Reconnexion après coupure" | Covered |
| FR-16 | Account creation to save grids | IA table "Connexion / Compte" | Covered |
| FR-17 | Grid library listed by name | IA table + State Patterns "Grille validée..." | Covered |
| FR-18 | Relaunch existing grid without retyping | State Patterns row; UJ-3 flow ("Relancer") | Covered |
| FR-19 | Guest players keep no history after game ends | **No mention anywhere** — not in IA table, not in Component/State Patterns, not in flows. Every other FR (FR-1 through FR-18) is explicitly cited by number somewhere in EXPERIENCE.md; FR-19 is the one silent exception. | **Gap** |

## Gaps (behavioral nuances silently dropped)

1. **FR-19 — no-history-for-guests is untraced.** EXPERIENCE.md never states what a guest sees/can do once a game ends or if they navigate back later (e.g., does the app just have nothing to show them, is there an explicit "this won't be saved" cue). Given every other FR gets an explicit citation in the spine, this FR's total absence looks like an oversight rather than a deliberate "nothing to design" call. Minor but should at least be a one-line explicit note ("no surface needed — guests have no account-backed screen to return to").

2. **FR-8 — 6-player cap has no UX treatment.** The PRD hard-caps a game at 6 players including the creator, but EXPERIENCE.md's "Rejoindre une partie" flow and State Patterns table have no "game full" state. What a 7th person sees when tapping the link is undefined. This is exactly the kind of behavioral nuance the review was asked to watch for, and it's missing.

3. **FR-13 — ambiguous availability of manual closure.** PRD FR-13 says the creator can close the game "à tout moment" (at any time), with the after-a-winner case called out only as the notable/expected case ("notamment après qu'un vainqueur a été déclaré"). EXPERIENCE.md's State Patterns table attaches the "Clôturer la Partie" CTA only to the *Vainqueur déclaré* row — there's no equivalent control shown in an ordinary in-progress/no-winner-yet state. The IA table's one-line objective for "Grille en direct" ("...voir le vainqueur, clôturer") loosely implies closure is a general capability of that screen, but the detailed State Patterns table contradicts that by only surfacing the control post-victory. This should be resolved explicitly (either the close CTA is always available to the creator on Grille en direct, or the PRD's "à tout moment" wording needs a narrower UX reading) rather than left implicit.

## Contradiction

4. **"Pile d'avatars" example counter conflicts with the FR-8 player cap.** Component Patterns describes the avatar stack as "Affiche jusqu'à 2-3 joueurs + compteur ('+8')." With a hard max of 6 players (creator included) per FR-8, a "+8" overflow counter is arithmetically impossible (2-3 shown + 8 more implies 10-11 total players). This reads as a copy-paste/placeholder example that wasn't checked against the PRD's numeric constraint. Should be corrected to a value consistent with max 6 (e.g., "+3" at most).

## Non-issues considered and dismissed

- FR-3's "position doesn't move in already-distributed grids" — a data-layer guarantee, not something a UX spine needs to encode; the visible behavior (text updates live) is correctly covered.
- FR-8's link reusability (not single-use) — doesn't require different UX handling since every joiner goes through the same "Rejoindre une partie" flow regardless of how many already joined; only the missing max-capacity handling (gap #2 above) is a real nuance.
- The feature-specific NFR under §4.3 (propagation within a few seconds) is a performance target, correctly left out of a UX spine.
- DESIGN.md's visual system (no dark mode, single accent color, ink-based checkmark instead of a solid color dot) doesn't contradict anything in the PRD; the accessibility rationale in EXPERIENCE.md ("jamais par la couleur seule") is consistent with DESIGN.md's explicit rejection of solid color dots.

## Summary

EXPERIENCE.md is largely faithful and unusually well cross-referenced to FR numbers, but it drops the two hardest "operational limit" nuances from the PRD (max player count, and the always-vs-post-victory availability of manual game closure) and is completely silent on FR-19. It also carries one small internal-consistency slip (the "+8" avatar counter) that contradicts the explicit 6-player cap. None of these are fatal to the design's overall shape, but all four should be resolved before this spine is treated as implementation-ready.
