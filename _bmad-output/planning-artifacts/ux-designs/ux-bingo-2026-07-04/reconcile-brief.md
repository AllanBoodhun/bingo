---
title: Reconciliation — brief vs UX spines
created: 2026-07-04
sources:
  - ../../briefs/brief-bingo-2026-07-03/brief.md
  - DESIGN.md
  - EXPERIENCE.md
---

# Reconciliation: brief-bingo vs ux-bingo (DESIGN.md / EXPERIENCE.md)

## Method

Read the source brief and both derived UX spines in full. Rather than checking IA/component coverage (which is well-formed and traceable to FR-numbers throughout EXPERIENCE.md), this pass specifically hunts for qualitative drift: tone, differentiation framing, and the "personal passion project, not a startup" positioning that a rigid table structure tends to silently drop.

## Overall verdict

**No hard contradictions.** The "feel" of the brief survives the translation unusually well — DESIGN.md's "carnet de fête bricolé à la main" concept is arguably the single best possible visual expression of "personal passion project, not a startup": handmade imperfection (irregular rotations, scissor-cut corners), explicit rejection of "logiciel d'entreprise" cues (no Material shadows, no glossy gradients, no perfect squares), and a voice register described as "chaleureux, complice, chuchoté plutôt que crié." EXPERIENCE.md's Voice/Tone Do/Don't table and its ban on loading spinners/confirmation modals/long animations directly encode the brief's core complaint that existing tools "cassent le rythme" of a live shared moment. This is a strong, non-mechanical inheritance of the brief's intent, not just its features.

That said, three soft gaps are worth flagging — none contradict the brief outright, but each is a place where a future reader (or implementer) could drift away from the brief's intent if these spines are treated as the whole picture.

## Gaps found

### 1. Wedding-anchoring risk narrows the "generalist" differentiator

The brief is explicit that bingo's differentiation is being a **generalist** tool for "n'importe quel événement social entre proches" (mariage, anniversaire, repas de famille, soirée), explicitly contrasted against single-vertical competitors (Buzzword Bingo for meetings, Stream Bingo for Twitch — "outils temps réel verrouillés sur un seul secteur d'usage précis"). Both derived docs, however, anchor almost every illustrative example on a wedding: DESIGN.md's defining brand metaphor is "l'objet qu'on aurait rempli au feutre la veille d'un mariage," and all three of EXPERIENCE.md's Key Flows (UJ-1 through UJ-3) are wedding scenarios ("Bingo mariage de Julie," "le cocktail," "le mariage de sa sœur"). Even UJ-3, which is *supposed* to demonstrate cross-event reuse, stays inside the same wedding rather than showing a genuinely different event type (e.g., a birthday or family dinner). Nothing here is wrong, but if these become the only reference examples carried into implementation/copywriting, the product risks reading as a "wedding bingo app" — which is precisely the single-vertical narrowness the brief's differentiation section explicitly positions against.

### 2. Trust/non-arbitration rationale is implemented but not stated as a principle

The brief frames the declarative (self-reported, unverified) checking mechanic in explicitly emotional/philosophical terms: "c'est un jeu entre proches basé sur la confiance, pas une compétition arbitrée." This rationale *is* faithfully implemented behaviorally — EXPERIENCE.md specifies no confirmation on tap-to-check, no undo friction, and co-winners displayed with "sans ordre de priorité affiché" when two players complete a line simultaneously. But the "why" (trust between friends, not adjudicated competition) is never stated as a named design principle anywhere in EXPERIENCE.md's Voice and Tone or Interaction Primitives sections. A future contributor extending the product (e.g., adding a "dispute a check" feature, or an admin override) would have no documented guardrail explaining why that would be off-brand — only inferable from re-reading the brief.

### 3. Design-token rigor sits in mild tension with "modest, for-fun project" framing

The brief is explicit that ambition is "volontairement modeste... un projet pour le plaisir de jouer et de construire, pas une startup en devenir," with no moat and no growth ambitions. DESIGN.md responds with a fairly production-grade design-token system (precise hex values, named rotation ranges to the tenth of a degree, exact shadow offsets, a full component spec table). This is not a contradiction — the *content* of the tokens (handmade imperfection, warm materials, whispered rather than shouted UI) is a genuine and well-judged translation of "not a startup." But the *rigor of the system itself* (a maintained token library, explicit Do's/Don'ts, tested-and-rejected states like the solid-dot rejection) is more artifact-heavy than what "just for fun" might imply. Worth noting only so a solo builder doesn't feel obligated to over-invest in system upkeep beyond what a hobby project needs — the brief's modesty is about ambition/scope, not about craft, and the spines correctly keep those separate, but the tonal signal is easy to conflate.

## Non-issues (checked, confirmed consistent)

- Zero-friction guest join ("rejoint la partie en quelques secondes," "pas de compte obligatoire") is preserved end-to-end: EXPERIENCE.md's IA table and UJ-2 flow route a guest straight to "Grille en direct" with no login/library detour.
- No enterprise/education-flavored features or copy anywhere in either derived doc — consistent with the brief's explicit out-of-scope call.
- No growth/monetization/virality mechanics (referral prompts, analytics nudges, upsells) introduced by the UX layer — consistent with "pas de monétisation."
- The brief's "not a moat" honesty statement (differentiation is a simple underserved combination, not defensible tech) is strategic/investor-facing language with no natural UX-spine counterpart — correctly absent rather than dropped.
- Scope stays within v1: all EXPERIENCE.md flows and states map to FR-1–FR-17; none of the brief's "vision" ideas (new win conditions, suggested phrase themes, game history) leak into the spines as if committed.
