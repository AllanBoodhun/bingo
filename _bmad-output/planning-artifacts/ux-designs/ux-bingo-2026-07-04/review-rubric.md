# Spine Pair Review — bingo

## Overall verdict

A distinctive, coherent "carnet de fête" identity with strong flow and state modeling for the core real-time game loop — this is a well-executed spine pair for a hobby project, not a rewrite candidate. The one real actionable gap is component coverage: three components that EXPERIENCE.md relies on behaviorally (avatar stack, in-progress-game banner, close-game CTA) have no matching visual spec in DESIGN.md, and one component is named/split inconsistently across the two files. None of this blocks starting implementation, but a developer building the avatar stack or the banner today would have to invent the visual treatment from scratch. Recommend a short update pass before story-dev begins.

## 1. Flow coverage — adequate

Sources frontmatter resolves to `prd.md` and `brief.md`. All three PRD UJs (UJ-1, UJ-2, UJ-3) are present in EXPERIENCE.md Key Flows with identical names, named protagonists (Léa, Karim, Léa), numbered steps, and an explicit **Climax** beat. UJ-1 and UJ-2 carry a **Cas limite** matching the PRD's edge case; UJ-3 has none in either source or spine — consistent, not a miss.

### Findings
- **medium** UJ-2's flow never ties into the "Partie pleine" (party full) state defined in State Patterns — a real join-failure path (Karim taps the link after 6 players already joined) has no narrative beat in the Key Flow itself, only an isolated table row (EXPERIENCE.md §State Patterns, "Partie pleine (6 joueurs)"). *Fix:* add a one-line "Cas limite" to UJ-2 pointing at this state, the way UJ-1/UJ-2 already do for other edge cases.

## 2. Token completeness — adequate

Every frontmatter token (`colors`, `typography`, `rounded`, `spacing`, `components`) is defined with concrete values; all color tokens carry hex. Every `{path.to.token}` reference in the prose resolves to a real frontmatter key (checked: `{colors.*}` ×7, `{typography.*}` ×6, `{rounded.lg/DEFAULT/full}`, `{spacing.screen-margin/2}`, plus all `components.*` field references). No light/dark pairs needed — single light theme is an explicit, documented decision (Do's and Don'ts, memlog).

### Findings
- **low** `Shapes` hardcodes corner radii as "entre 9px et 15px" instead of referencing the `rounded` scale, even though `rounded.sm` (9px) / `rounded.DEFAULT` (12px) / `rounded.md` (14px) already cover almost exactly that range (DESIGN.md §Shapes). *Fix:* either express the per-corner randomization as "varies within `{rounded.sm}`–`{rounded.md}`" or add a comment explaining why this one spec intentionally bypasses the token scale (true per-cell randomization can't be a single token).
- **low** No explicit contrast ratio/target is stated anywhere for load-bearing text-on-background pairs (e.g., `ink` body text at 15px on `paper-bg`/`paper-card`). Given the "papier crème, jamais blanc pur" choice, contrast is not free. *Fix:* one line in DESIGN.md.Colors or EXPERIENCE.md.Accessibility Floor stating the target (e.g., "ink on paper-bg/paper-card meets WCAG AA at body size") — low effort, closes an easy blind spot for a hobby build.

## 3. Component coverage — thin

DESIGN.md.Components lists 5 rows (grid-cell, cta-primary, cta-secondary, live-badge, toast) plus a 6th unnamed entry ("Champ de phrase / sélecteur de taille"). EXPERIENCE.md.Component Patterns lists 9 rows. Cross-checking names:

### Findings
- **high** "Pile d'avatars" (avatar stack, up to 3 + counter) is specified behaviorally in EXPERIENCE.md §Component Patterns but has zero visual spec anywhere in DESIGN.md — no size, overlap treatment, border, or color usage defined. (EXPERIENCE.md §Component Patterns, row "Pile d'avatars"). *Fix:* add a `avatar-stack` row to DESIGN.md.Components and a frontmatter `components.avatar-stack` entry.
- **high** "Bannière 'partie en cours'" is specified behaviorally (EXPERIENCE.md §Component Patterns and §State Patterns, "Rappel de partie en cours") but never appears in DESIGN.md — no visual spec, not even a pointer to an existing token set (e.g., "reuses `toast` styling"). *Fix:* either add a dedicated `banner` component row, or state explicitly that it reuses `toast`'s sage-dashed treatment (memlog hints at "pointillée sauge" for this but it's not written into either spine).
- **medium** "Champ de phrase" and "Sélecteur de taille" are two distinct rows in EXPERIENCE.md.Component Patterns but are collapsed into one unnamed line in DESIGN.md.Components ("Champ de phrase / sélecteur de taille"), and neither has its own frontmatter `components` entry (the frontmatter has no `field` or `size-chip` token object at all — the prose row references bordered/chip styling only informally). *Fix:* split into two named rows with matching names in both files, and add corresponding frontmatter tokens (or explicitly note they reuse an existing token, e.g. `line`/`terracotta`, by path reference).
- **medium** "CTA 'Clôturer la Partie'" has a behavioral row (EXPERIENCE.md §Component Patterns) but no stated visual treatment — it's unclear whether it should render as `cta-primary` (terracotta) or `cta-secondary` (dashed outline). DESIGN.md defines `cta-primary` as "réservé aux actions qui font avancer la partie," and closing the game is arguably the opposite of that, so the default mapping isn't obvious. *Fix:* one line stating which CTA style "Clôturer la Partie" uses and why.

## 4. State coverage — adequate

Walked all 5 IA surfaces (Bibliothèque de grilles, Connexion/Compte, Création de grille, Rejoindre une partie, Grille en direct). Grille en direct is the best-covered surface (9 distinct states including reconnection). Création de grille has its incomplete-grid state. Bibliothèque has its populated-list and reminder-banner states.

### Findings
- **medium** Bibliothèque de grilles has no empty/cold-load state (first-time user, zero grids created) — every row in State Patterns for this surface assumes at least one grid already exists. *Fix:* add a row for the zero-grids case (likely just "Nouvelle grille" CTA + friendly empty message, consistent with Voice and Tone).
- **medium** Rejoindre une partie covers "party full" but not an invalid/expired/already-closed party link (a realistic case given links are shared over WhatsApp and can be mistyped, or the party may have been closed by the creator before a guest opens it). *Fix:* add a state row parallel to "Partie pleine."
- **low** No in-flight offline indicator is defined — "Reconnexion après coupure" (EXPERIENCE.md §State Patterns) covers silent restoration *after* reconnecting, but not whether/how a player sees anything *while* offline (e.g., could someone tap cases unaware they aren't syncing?). Given SM-1 explicitly calls out network drops as the key resilience test, this is worth a line even at hobby scale. *Fix:* state explicitly whether there's a subtle offline cue, or that silence is intentional (consistent with the "confiance plutôt qu'arbitrage" principle — taps are optimistic/local-first regardless).
- **low** Connexion/Compte (an IA surface) has no associated row anywhere in State Patterns (no error, no loading). Likely acceptable since PRD FR-16 explicitly punts the auth mechanism as "hors du périmètre," but worth a one-line acknowledgment that this surface is deliberately under-specified rather than accidentally skipped.

## 5. Visual reference coverage — adequate

Two mockups exist (`mockups/direction-artisanal.html`, `mockups/carnet-checkmark-variants.html`); `imports/` is empty (no orphans there). EXPERIENCE.md links both inline in §Information Architecture with a description of what each illustrates, and states spines-win-on-conflict explicitly (with a concrete example: mockup shows "10 joueurs," spine's 6-player cap wins).

### Findings
- **low** DESIGN.md never links to either mockup, even though §Shapes (irregular corners/rotation) and §Components (checked-state treatment) are exactly what `direction-artisanal.html` and `carnet-checkmark-variants.html` visualize. Only EXPERIENCE.md carries the reference. *Fix:* add a one-line pointer from DESIGN.md.Shapes and DESIGN.md.Components to the relevant mockup file, mirroring what EXPERIENCE.md already does.

## 6. Bloat & overspecification — strong

DESIGN.md prose carries appropriate editorial voice (permitted per rubric); EXPERIENCE.md prose stays behavioral, no narrative bloat. No restatement of personas/FRs/scope. Tables are used where a table fits (Component Patterns, State Patterns, IA, Voice and Tone) rather than prose. No decorative narrative untied to a decision — every stylistic choice ("no filled colored dot," "no dark mode") is tied to an explicit rejected-alternative note.

### Findings
None beyond the token/pixel duplication already noted under Token completeness (§2).

## 7. Inheritance discipline — thin

`sources` frontmatter in EXPERIENCE.md resolves to real files (`prd.md`, `brief.md`); DESIGN.md correctly omits `sources` (not a required key per design.md spec). UJ names are verbatim from the PRD. Glossary terms (Grille, Partie, Case, Vainqueur, Joueur invité) are declared to be used as-is from the PRD glossary, and spot checks confirm this. The core inheritance problem is component names, which is the same defect already detailed in §3 — cross-referencing rather than repeating in full here.

### Findings
- **high** (same root cause as §3) Component names are not identical across the two files: DESIGN.md's component set (5 named + 1 unnamed combined row) does not cover 3 of EXPERIENCE.md's 9 named components (avatar stack, banner, close-game CTA), and the phrase-field/size-chip pair is split in one file and merged in the other. *Fix:* reconcile the component list so both files enumerate the same named set — see §3 for the specific fixes.

## 8. Shape fit — strong

DESIGN.md sections appear in canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts). EXPERIENCE.md carries all 8 required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) in that order. Responsive is correctly omitted — this is an explicitly mobile-only single-surface PWA with no stated breakpoints.

### Findings
- **low** No Inspiration section, despite `.memlog.md` documenting rejected directions ("candy," "neon," "minimal" explored and dropped in favor of "carnet de fête"; the filled colored dot was explicitly tested and rejected). The rubric's trigger condition ("memlog show reference products or rejects") is technically met. Given this is a hobby project and the rejects are already captured in Do's and Don'ts / memlog, this is low priority — a one-paragraph Inspiration section would mainly help a future reader understand *why* "carnet de fête" won over the alternatives, not change any downstream decision. *Fix (optional):* fold a short "why this direction, what we moved away from" paragraph into Brand & Style, or add a minimal Inspiration section if the memlog reasoning is worth preserving long-term.

## Mechanical notes

- Component naming inconsistency: DESIGN.md's "Champ de phrase / sélecteur de taille" (1 combined, unnamed row) vs. EXPERIENCE.md's "Champ de phrase" + "Sélecteur de taille" (2 separate named rows).
- Three EXPERIENCE.md component names have no corresponding row anywhere in DESIGN.md: "Pile d'avatars," "Bannière 'partie en cours'," "CTA 'Clôturer la Partie'" (style unspecified).
- No broken cross-references found (`{path.to.token}` resolution checked exhaustively — see §2); no YAML frontmatter syntax errors; no Mermaid diagrams present (N/A); mockup file paths in EXPERIENCE.md's IA section both resolve to real files under `mockups/`.
