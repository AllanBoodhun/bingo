---
title: Reconciliation — Brief vs PRD (bingo)
created: 2026-07-04
---

# Reconciliation: brief.md vs prd.md — bingo

Source input: `brief-bingo-2026-07-03/brief.md`
Derived output: `prd-bingo-2026-07-03/prd.md`

Overall: the PRD is a faithful, well-structured derivation. It explicitly and correctly defers market-context and differentiation sections to the brief (PRD §0), converts the brief's 5-step solution flow into FR-1..FR-18 cleanly, and preserves the core "trust-based, non-arbitrated, informal group game" framing (Non-Goals §5, Non-Users §2.2). The findings below are the meaningful exceptions.

## 1. Factual contradiction — win does not end the game (severity: high, and partly self-contradictory within the PRD)

- **Brief**, solution step 4: "Gagner — la première personne à compléter une ligne, une colonne ou une diagonale **termine la partie**."
- **PRD UJ-2**, Résolution: "il complète une ligne avant les autres ; l'app lui signale qu'il a gagné et **termine la partie pour tout le monde**." — this restates the brief's behavior.
- **PRD FR-11/FR-12/FR-13**, however, explicitly reverse this: "La détection d'un vainqueur **ne met pas fin à la partie automatiquement**" (FR-11) and "La partie reste ouverte tant que le créateur ne l'a pas explicitement terminée" (FR-12), with a new FR-14 reminder mechanism for creators who forget to close a finished game.

So there are two problems stacked here: (a) the PRD's own journey narrative (UJ-2) contradicts its own functional requirements (FR-11–13), and (b) both the brief and the UJ-2 narrative describe automatic game-ending on victory, while the binding FRs describe manual closure only. Since FRs are what downstream epics/architecture will implement, UJ-2's prose is effectively stale and should be corrected to match FR-12/13 (or FR-11-13 should be revisited if manual closure wasn't actually the intended decision). This is worth fixing before it propagates into epics.

## 2. Gap — success metric for "grilles retrouvables et réutilisables" dropped

The brief lists four success criteria, the fourth being: "Les grilles créées sont **retrouvables et réutilisables depuis un compte**."

The PRD's Success Metrics (§7: SM-1, SM-2, SM-3, SM-C1) validate event-usage, grid-creation speed, and guest-join speed — but none of them validate the accounts/library/reuse feature set (FR-15–FR-18), even though that feature set is fully specified elsewhere in the PRD (§4.4, UJ-3). The capability was carried forward faithfully as a feature; the *success bar* for it from the brief was not carried forward into §7.

## 3. Gap — vision's identity-forming image dropped

Brief's Vision closes with a specific, memorable image of what success looks like qualitatively: "bingo devient le réflexe qu'on a en tête avant un événement social entre proches — **au même titre qu'on crée un groupe WhatsApp pour l'occasion**, on crée une partie de bingo."

PRD §1 Vision keeps the mechanical description and the "not a startup" framing, but drops this analogy entirely — along with the brief's framing of the project as being for "**le plaisir de jouer et de construire**" (the joy of playing and building), which PRD replaces with a more clinical bar: "le construire, le tester en conditions réelles, et que ça marche." This is exactly the kind of tone/voice content that an FR-structured PRD tends to silently lose — worth re-inserting a line if this document is meant to keep steering the author's own motivation, not just scope.

## 4. Gap — two of three "next steps if it works" ideas disappear

Brief's Vision names three concrete natural next steps *if* the real-world test succeeds: **nouvelles conditions de victoire**, **thèmes de phrases suggérées**, **historique des parties jouées** — explicitly framed as open/unconmitted future directions, contingent on the v1 test working.

PRD §6.2 (Out of Scope for MVP) only carries one of these forward, and reframes it: "Historique/statistiques des parties jouées et gagnées. [NOTE FOR PM : pourrait être une suite naturelle...]" — good, this one survives with its forward-looking framing intact.
The other two do not survive as future ideas:
- "thèmes de phrases suggérées" (suggested phrase prompts/themes to help creators write phrases) is absent from the PRD entirely — not in scope, not in out-of-scope, not mentioned as a future idea.
- "nouvelles conditions de victoire" only survives indirectly, folded into an out-of-scope line about non-square grids/alternate win shapes (§6.2), stripped of the brief's "if the concept proves out, this is worth exploring" framing — it now reads as a flat exclusion rather than a live idea to revisit.

## 5. Minor — tone shift in the creator's motivation (JTBD)

Brief, "À qui s'adresse bingo": the creator wants to add "**une couche de jeu léger et complice**" (light-hearted, conspiratorial/inside-joke) to the event.

PRD §2.1 JTBD: "je veux préparer une animation de groupe **originale**... sans effort de préparation lourd." "Léger et complice" (light, intimate, in-on-the-joke with friends/family) is replaced by "originale" (original/novel), which is a different axis — novelty vs. intimacy. Combined with the loss of the brief's second illustrative phrase example ("Tonton Michel va chanter du Renaud" — dropped from PRD, which keeps only "le père de la mariée va pleurer"), the PRD's voice is slightly more feature/novelty-oriented and slightly less warm/inside-joke-oriented than the brief's. Minor, but consistent with the pattern of qualitative "feel" details eroding under the FR structure.

## What was carried forward well (no action needed)

- Market context, competitive differentiation: correctly and explicitly deferred to the brief (PRD §0), not duplicated — intentional, not a gap.
- Declarative/trust-based checking, no central arbitration: preserved (FR-10, Non-Goals).
- No friend system, no monetization, no B2B/education scope: preserved verbatim in Non-Goals §5.
- Informal/family-friendly tone as an explicit boundary: preserved in §2.2 Non-Users ("le ton, les phrases et l'usage restent pensés pour un groupe d'amis/famille informel").
- All 5 brief solution steps (Créer/Lancer/Jouer/Gagner/Retrouver) map cleanly to FR groups §4.1–4.4.
- Simultaneous-winner handling, mid-game phrase editing, guest no-history: these are reasonable elaborations beyond the brief's level of detail, not contradictions.
