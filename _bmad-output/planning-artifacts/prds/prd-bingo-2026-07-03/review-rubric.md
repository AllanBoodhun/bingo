# PRD Quality Review — bingo

## Overall verdict

This is a disciplined, lean hobby-project PRD: FRs are mostly paired with testable consequences, scope is honestly bounded (Non-Goals §5, Out-of-Scope §6.2), and the two named UJs carry real weight rather than serving as decoration. The main risk is that two foundational mechanics — network/connectivity resilience during live play, and the account-creation mechanism — are entirely unaddressed despite being load-bearing for the PRD's own primary success metric (SM-1: "sans blocage technique du début à la fin"). Nothing here is structurally broken, but an engineer building from this PRD would have to invent both of those from scratch.

## Decision-readiness — adequate

Most decisions are stated as decisions with real trade-offs named: the 6-player cap, the deliberate absence of strict tie-breaking (FR-11, echoed in §5 Non-Goals), and SM-C1 explicitly naming "don't over-invest in scalability" as a counter-metric to SM-1 — this is exactly the kind of honest trade-off the rubric rewards. §8 Open Questions claims all prior open items are resolved and traces each to the FR that resolved it (FR-1, FR-8, FR-5, FR-13/14) — that's a verifiable claim, not rhetorical closure.

However, one real tension is not surfaced anywhere: the product is explicitly designed for live, real-time play at events (weddings, dinners) where mobile connectivity is commonly unreliable, and SM-1 stakes the entire project's success on the game running "sans blocage technique." Nothing in the PRD decides what happens when a player's connection drops mid-game — this is precisely the kind of decision the PRD should surface and make (even if the answer is "out of scope for v1, accept the risk"), and it currently isn't mentioned at all, not even as a Non-Goal or `[NOTE FOR PM]`.

### Findings
- **high** Connectivity/reconnection behavior undecided (§4.3, §7 SM-1) — The PRD's own primary success metric depends on the game working "sans blocage technique du début à la fin" at a live event, but no FR or NFR addresses what happens when a player loses signal or backgrounds the app mid-party (does state resync on reconnect? is checked-box state persisted server-side or lost?). This is a decision the PRD should make explicitly, not one it should be silent on. *Fix:* Add an FR (or an explicit `[NON-GOAL for MVP]` if the answer is "not handled, players re-check manually") describing reconnect/resync behavior.
- **medium** Auth mechanism for FR-15 left fully open (§4.4) — "Un utilisateur peut créer un compte" states the feature exists but not how (email/password, magic link, OAuth?). This isn't a minor omission — the answer materially shapes the architecture step immediately downstream. *Fix:* Either pick a mechanism explicitly or tag it `[NOTE FOR PM]` as a deferred decision for the architecture phase.

## Substance over theater — strong

No inflation here. Two personas (Léa, Karim), each driving distinct FRs — no persona padding. The Vision (§1) is specific to this product ("phrases personnalisées," "temps réel entre proches," explicit non-startup framing) and wouldn't drop cleanly into another PRD. Market/differentiation content is correctly deferred to the linked brief rather than duplicated. No boilerplate NFR language ("must be scalable," "must be secure") — the one feature-specific NFR in §4.3 is product-specific, if underspecified (see Done-ness below).

No findings — this dimension is clean.

## Strategic coherence — strong

The thesis is explicit and consistent: a lightweight, trust-based social game for one real event, not a platform to grow (§1, reinforced by SM-C1's counter-metric and the flat "pas de monétisation" in §5). Feature grouping (grid creation → launch/invite → real-time play → account/library) follows the JTBD in §2.1 rather than reading as an arbitrary capability list. Success metrics measure the thesis directly (a real event working end-to-end, fast setup, fast onboarding) rather than vanity/activity metrics — SM-1/SM-2/SM-3 would all fail to move if the product were merely "used a lot," which is the right test.

No findings — this dimension is clean.

## Done-ness clarity — thin

Most FRs carry a "Conséquences (testables)" block with genuinely verifiable bounds (grid size 3–8, N×N phrase count, 6-player cap, link reusability, position-preserving phrase edits). This is the PRD's strongest section pattern and should be read as the model for the rest.

But the pattern isn't applied uniformly, and a few FRs that need it don't have it:

### Findings
- **medium** FR-15 (création de compte) has no testable consequences at all (§4.4) — no password/format rules, no uniqueness constraint on identifiers, no stated auth flow. Compare to the rigor applied to FR-1 or FR-8. *Fix:* Add minimal testable consequences or explicitly defer the mechanism (see Decision-readiness finding above).
- **medium** "Quasi instantanée" (§4.3 feature-specific NFR) is an adjective, not a bound — the rubric flags this pattern by name. For a real-time-play product this is exactly the kind of NFR downstream engineering will need a number for. *Fix:* Give it a rough bound even if generous for a hobby project (e.g., "under ~2s on a normal WiFi/4G connection").
- **low** FR-2 (nommage), FR-4 (duplication), FR-9 (créateur comme joueur) have no "Conséquences (testables)" block — for FR-2/FR-4 in particular, questions like "can two grids share a name?" or "does duplication reset the game-launch lock on size (FR-5)?" are left implicit. *Fix:* One line each would close the gap; low stakes given how self-evident the behavior likely is.

## Scope honesty — adequate

§5 Non-Goals and §6.2 Out of Scope are both substantive, not perfunctory — five and six items respectively, including a live `[NOTE FOR PM]` on deferred history/stats (§6.2). §8 and §9 (Open Questions, Assumptions Index) both explain *why* they're empty by tracing back to a prior draft's resolved items rather than just asserting closure — that's a legitimate, checkable form of closure, not a dodge.

That said, the claim of full closure sits oddly next to the two gaps flagged above (connectivity resilience, auth mechanism) — neither appears as an FR, a Non-Goal, an `[ASSUMPTION]`, or a `[NOTE FOR PM]`. For a PRD that explicitly declares zero open items, these are exactly the kind of omissions the rubric asks to distinguish from honest silence: the reader is left to infer that they were considered and intentionally deferred, when more likely they simply weren't surfaced yet.

### Findings
- **medium** Two undecided items (connectivity resilience, auth mechanism) are present by omission rather than by explicit deferral, despite the PRD asserting complete closure in §8/§9. *Fix:* Either resolve them inline or add them to Open Questions / tag with `[NOTE FOR PM]` so the closure claim stays honest.

## Downstream usability — strong

This PRD explicitly feeds architecture and epic/story breakdown (§0), so this dimension carries real weight. Glossary (§3) terms — Grille, Phrase, Partie, Créateur, Joueur, Joueur invité, Case, Distribution aléatoire, Ligne gagnante, Vainqueur — are used consistently across UJs and FRs with no drift observed. FR IDs (1–18), UJ IDs (1–3), and SM IDs (1–3, C1) are contiguous and unique; "Réalise UJ-X" cross-references resolve correctly for essentially every FR.

### Findings
- **low** FR-14 ("Rappel de partie en cours") is tagged "Réalise UJ-1," but UJ-1's narrative (§2.3) never mentions the creator forgetting to close a party — the traceability link is asserted but not actually present in the journey text. *Fix:* Either add the beat to UJ-1's resolution or retarget the cross-reference.

## Shape fit — strong

Consumer product with real UX → UJs with named protagonists are correctly load-bearing here, and the PRD uses exactly two (Léa, Karim), each carrying context inline (device, moment in the event, emotional stake) rather than being generic placeholders. No compliance/SLA/ROI scaffolding was force-fit onto a hobby project — appropriately absent. Rigor is calibrated: light on process, still substantive on the mechanics that matter (grid math, real-time propagation, win detection).

No findings — this dimension is clean.

## Mechanical notes

- Glossary terms are used consistently; no case/plural drift spotted across §2–§6.
- FR/UJ/SM ID sequences are contiguous with no gaps or duplicates.
- Assumptions Index (§9) round-trips cleanly against its own claim — but see the Scope honesty finding: two undecided items exist that aren't captured as inline `[ASSUMPTION]` or `[NOTE FOR PM]` tags anywhere in the document, so the roundtrip is complete only for what's been tagged, not for everything that arguably should be.
- FR-14 → UJ-1 cross-reference doesn't fully resolve against the UJ-1 narrative text (see Downstream usability finding).
- Document is written in French throughout; internally consistent, no bilingual drift.
