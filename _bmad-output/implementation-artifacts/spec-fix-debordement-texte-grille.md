---
title: 'Correction du débordement de texte dans les cases de la grille bingo'
type: 'bugfix'
created: '2026-07-30'
status: 'done'
baseline_commit: '22bb8534180c19b154234cbd88e60b293000d7f6'
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-bingo-2026-07-04/reconcile-correctif-grille-en-direct.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-bingo-2026-07-04/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-bingo-2026-07-04/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le texte des cases de la grille bingo (`grid-cell`) déborde visuellement quand il est trop long, empiétant sur les cases voisines (voir `imports/Correctifs/grille-design-error.png`) — aucune troncature CSS n'existe et la limite de saisie (200 caractères) n'a jamais été calibrée sur l'espace réel d'une case, surtout en grille 5×5.

**Approach:** Troncature CSS systématique (garde-fou), limite de saisie resserrée à 50 caractères, et appui long pour consulter le texte complet d'une case tronquée — décisions actées dans `reconcile-correctif-grille-en-direct.md`.

## Boundaries & Constraints

**Always:**
- `.grid-cell__texte` reste tronqué à 3 lignes avec ellipsis quelle que soit la longueur du texte, indépendamment de la limite de saisie.
- Le tap simple sur une case reste l'unique geste qui coche/décoche (FR-10) — le long-press ne déclenche jamais le toggle.
- Le nouveau CHECK SQL est ajouté en `NOT VALID` : pas d'environnement Supabase local pour vérifier l'état réel des données, migration appliquée directement en prod — ne jamais risquer une migration qui échoue ou invalide des lignes existantes.
- La bulle `text-reveal-bubble` n'apparaît que si le texte est réellement tronqué (pas sur une case dont le texte tient déjà).

**Ask First:**
- Si l'implémentation envisage une correction rétroactive des données existantes (troncature en base, notification à l'utilisateur) plutôt que la simple non-validation `NOT VALID` — HALT et demander confirmation avant toute modification de données existantes.

**Never:**
- Pas de scroll dédié à la grille (non-issue confirmée dans le reconcile doc).
- Pas de nouvelle dépendance (lib de tooltip/gesture) — événements pointer natifs uniquement.
- Ne pas dupliquer la logique dans un composant `edition-grille` séparé — `CreationGrilleScreen.tsx` sert déjà les deux flux (création + édition via la prop `grilleInitiale`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Texte court | Phrase ≤ ~50 car., tient sur 3 lignes | Affichage normal, pas d'ellipsis, pas de bulle au long-press | N/A |
| Texte tronqué (donnée existante) | Phrase en base >50 car. saisie avant resserrage, dépasse 3 lignes | Ellipsis visible ; appui long (~450ms) ouvre `text-reveal-bubble` avec le texte intégral | Relâchement avant le seuil ou tap ailleurs ferme sans toggle |
| Nouvelle saisie trop longue | Utilisateur tape au-delà de 50 car. dans le champ phrase | Saisie bloquée à 50 car. (`maxLength`) | N/A |
| Case cochée + appui long | Case déjà cochée, texte tronqué | Bulle s'ouvre normalement, la case reste cochée | N/A |
| Redimensionnement viewport | Rotation d'écran / resize pendant l'affichage de la grille | Statut "tronqué" recalculé (`ResizeObserver`), bulle fermée si ouverte pendant le resize | N/A |
| Migration sur données existantes | Ligne `phrases.texte` déjà >50 caractères en base | Migration réussit sans erreur, ligne inchangée (contrainte `NOT VALID`) | N/A |
| Édition d'une phrase existante trop longue | Phrase en base déjà >50 caractères (saisie avant le resserrage), l'utilisateur l'édite (avec ou sans la raccourcir) et enregistre | Si l'enregistrement échoue à cause de la contrainte de longueur, message explicite ("Cette phrase dépasse la nouvelle limite de 50 caractères, réduis-la avant d'enregistrer.") au lieu du message générique. Aucune troncature automatique, aucune perte de donnée silencieuse. | Autre erreur (réseau, etc.) : message générique existant inchangé |
| Duplication d'une grille contenant une phrase trop longue | Grille source (Bibliothèque ou écran de composition) contenant au moins une phrase >50 caractères (legacy) | La duplication est bloquée avant tout appel réseau de création si possible (écran de composition, phrases déjà en mémoire) ou avant l'insertion des phrases avec retrait de la grille déjà créée le cas échéant (Bibliothèque, phrases récupérées après création de la grille) ; message explicite ("Cette grille contient une phrase de plus de 50 caractères, modifie-la avant de la dupliquer.") au lieu du message générique. Aucune troncature automatique. | Autre erreur (réseau, etc.) : message générique existant inchangé |

</frozen-after-approval>

## Code Map

- `src/features/grille-en-direct/GrilleEnDirecteScreen.scss:50-56` -- `.grid-cell__texte`, ajouter la troncature (line-clamp) + style de `.text-reveal-bubble` + classe de feedback d'appui
- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:457-650` -- `GridCell`, détection de troncature + long-press + bulle rendue via portail + feedback visuel d'appui
- `src/features/creation-grille/CreationGrilleScreen.tsx:26` -- `TEXTE_MAX_LENGTH`, 200 → 50 (4 usages existants, création + édition) -- **exporter** cette constante (réutilisée par `BibliothequeScreen.tsx`)
- `src/features/creation-grille/CreationGrilleScreen.tsx:413-438` (`saveEdit`) -- message d'erreur spécifique si la contrainte de longueur bloque l'enregistrement
- `src/features/creation-grille/CreationGrilleScreen.tsx:477-510` (`handleDupliquer`) -- bloquer la duplication si une phrase déjà en mémoire dépasse `TEXTE_MAX_LENGTH`
- `src/features/bibliotheque/BibliothequeScreen.tsx:288-330` (`handleDupliquer`) -- bloquer la duplication (avec retrait de la grille déjà créée) si une phrase récupérée dépasse `TEXTE_MAX_LENGTH`
- `src/features/auth/AuthScreen.tsx:8-16` -- référence de style existante pour un `friendlyErrorMessage` qui distingue les erreurs par pattern-matching sur `error.message`
- `node_modules/@supabase/postgrest-js` (`PostgrestError`) -- expose `error.code` (SQLSTATE Postgres, ex. `23514` pour une violation de CHECK) -- plus robuste qu'un regex sur `error.message`
- `src/features/creation-grille/constants.ts` -- nouveau fichier, `TEXTE_MAX_LENGTH` + helpers partagés (`contientPhraseTropLongue`, `estErreurLongueurPhrase`, `MESSAGE_PHRASE_TROP_LONGUE`) réutilisés par les deux `handleDupliquer`
- `supabase/migrations/` -- nouvelle migration resserrant le CHECK sur `phrases.texte`

## Tasks & Acceptance

**Execution:**
- [x] `GrilleEnDirecteScreen.scss` -- troncature sur `.grid-cell__texte` + `.text-reveal-bubble` + `.grid-cell--en-appui` (itération 2)
- [x] `GrilleEnDirecteScreen.scss` -- retirer `pointer-events: none` de `.text-reveal-bubble`
- [x] `GrilleEnDirecteScreen.tsx` -- `GridCell` : détection de troncature, long-press, bulle via portail, feedback d'appui (itération 2)
- [x] `GrilleEnDirecteScreen.tsx` -- ajouter `caseItem.phrases?.texte` aux dépendances de l'effet de mesure de troncature ; nettoyer `timerRef.current` au début de `handlePointerDown`
- [x] `CreationGrilleScreen.tsx:26` -- `TEXTE_MAX_LENGTH = 200` → `50` (itération 2)
- [x] `CreationGrilleScreen.tsx:26` -- exporter `TEXTE_MAX_LENGTH` (`export const`)
- [x] `CreationGrilleScreen.tsx` (`saveEdit`) -- message d'erreur spécifique via regex (itération 2)
- [x] `CreationGrilleScreen.tsx` (`friendlyEditErrorMessage`) -- `error.code === '23514'` + interpolation de `TEXTE_MAX_LENGTH`
- [x] `CreationGrilleScreen.tsx` (`handleDupliquer`) -- garde-fou avant tout appel réseau si une phrase en mémoire dépasse `TEXTE_MAX_LENGTH`
- [x] `BibliothequeScreen.tsx` (`handleDupliquer`) -- garde-fou après récupération de `phrasesSource`, avec annulation de la grille déjà créée
- [x] `supabase/migrations/<timestamp>_resserrer_limite_texte_phrases.sql` -- contrainte resserrée en `NOT VALID` (itération 2)

**Acceptance Criteria:**
- Given une case dont le texte dépasse 3 lignes, when la grille s'affiche, then le texte est tronqué avec ellipsis et ne déborde jamais du cadre de la case.
- Given une case au texte tronqué, when l'utilisateur fait un appui long dessus, then une bulle s'ouvre avec le texte complet, sans aucune rotation héritée de la case, et la case ne se coche/décoche pas.
- Given une case au texte tronqué dans la colonne de bord (gauche ou droite) d'une grille 5×5, when la bulle s'ouvre, then elle reste entièrement visible dans le viewport (pas de débordement horizontal).
- Given une case au texte tronqué avec la bulle ouverte, when l'utilisateur relâche ou tape ailleurs, then la bulle se ferme, et un tap visuellement sur la bulle ne coche/décoche jamais une case différente en dessous.
- Given un appui en cours sur une case au texte tronqué, when l'utilisateur maintient la pression, then un feedback visuel progressif est visible avant l'ouverture de la bulle.
- Given le champ de saisie d'une phrase, when l'utilisateur tape au-delà de 50 caractères, then la saisie est bloquée à 50.
- Given une ligne existante en base avec un texte de plus de 50 caractères, when la migration est appliquée, then elle réussit sans erreur et la ligne reste inchangée.
- Given une phrase existante de plus de 50 caractères, when l'utilisateur l'édite et enregistre sans la raccourcir, then un message explicite apparaît, sans troncature automatique ni perte de donnée silencieuse.
- Given une grille (en cours de composition ou dans la Bibliothèque) contenant une phrase de plus de 50 caractères, when l'utilisateur clique "Dupliquer", then la duplication est bloquée avec un message explicite, sans grille partielle créée.
- Given une case dont le texte est modifié en direct par le créateur pendant qu'une partie est active (FR-3), when le nouveau texte change son statut de troncature, then l'affichage (ellipsis ou non) se met à jour sans nécessiter un redimensionnement de l'écran.

## Spec Change Log

- **2026-07-30, itération 1 → 2** -- Déclencheur : revue à 3 agents (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sur l'implémentation initiale.
  - **intent_gap** résolu par l'utilisateur : édition d'une phrase legacy >50 caractères → message d'erreur explicite (pas de troncature automatique). Ajouté à l'I/O Matrix (frozen) et aux Acceptance Criteria.
  - **bad_spec** (root cause hors frozen, dans les Design Notes de l'itération 1) : la bulle était positionnée en `position: absolute` imbriquée dans le `<button>` pivoté (rotation aléatoire DESIGN.md §Shapes) — héritait visuellement de cette rotation, contredisant l'exigence "coins réguliers, pas de rotation" du composant `text-reveal-bubble`. Corrigé : rendu via `createPortal` + `position: fixed`, ce qui règle aussi le débordement horizontal (bad_spec #2) en un seul mécanisme.
  - **bad_spec** : le feedback visuel progressif pendant l'appui, documenté dans `EXPERIENCE.md.Interaction Primitives`, n'avait jamais été traduit en tâche. Ajouté (`enAppui` + classe CSS animée).
  - **KEEP** : l'approche globale de l'itération 1 était juste et à préserver telle quelle -- troncature CSS systématique (line-clamp 3 lignes) comme garde-fou indépendant de la limite de saisie ; `TEXTE_MAX_LENGTH` resserré à 50 ; détection de troncature via comparaison `scrollHeight`/`clientHeight` (pas de solution CSS pure) ; suppression du toggle de coche via un flag consommé par le `onClick` natif (qui se déclenche après `pointerup`) ; contrainte SQL en `NOT VALID` pour ne jamais invalider les lignes existantes. Seuls des détails d'implémentation ont été amendés, pas l'approche.
- **2026-07-30, itération 2 → 3** -- Déclencheur : nouvelle revue à 3 agents sur l'implémentation de l'itération 2 (les 3 correctifs de l'itération précédente ont été vérifiés fonctionnels par l'Acceptance Auditor).
  - **intent_gap** résolu par l'utilisateur : dupliquer une grille contenant une phrase legacy >50 caractères casse la duplication (insert en masse rejeté par la contrainte SQL, sans que l'utilisateur puisse voir/corriger la phrase depuis cet écran) → bloquer avec message explicite avant toute création, cohérent avec le choix fait pour l'édition (pas de troncature automatique). Ajouté à l'I/O Matrix (frozen) et aux Acceptance Criteria. Concerne deux call-sites différents (`CreationGrilleScreen.handleDupliquer` et `BibliothequeScreen.handleDupliquer`), avec des contraintes d'ordre d'opérations différentes (voir Code Map).
  - **patch** : `.text-reveal-bubble` avait `pointer-events: none`, ce qui laissait un tap visuel sur la bulle "traverser" jusqu'à une case différente potentiellement affichée en dessous (chevauchement visuel possible selon le flip haut/bas) et la cocher/décocher par erreur. Retiré -- la bulle étant la boîte la plus haute en z-index à cet endroit, elle capte nativement le tap (hit-testing du navigateur), qui continue de fermer la bulle via le listener `pointerdown` sur `document`.
  - **patch** : `timerRef` pouvait être écrasé par un second `onPointerDown` sur la même case sans `pointerup` intermédiaire (deux doigts, stylet+doigt), laissant le premier timer orphelin et non annulable, capable de rouvrir la bulle et de ré-armer la suppression du toggle bien après la fin perçue de l'interaction. `handlePointerDown` nettoie désormais explicitement `timerRef.current` avant d'en programmer un nouveau.
  - **patch** : `friendlyEditErrorMessage` reposait uniquement sur un regex contre `error.message`, couplé au texte exact renvoyé par Postgres. Utilise désormais `error.code === '23514'` (SQLSTATE stable pour une violation CHECK, exposé par `PostgrestError`), plus robuste qu'un pattern-matching textuel.
  - **patch** : le message d'erreur codait "50" en dur au lieu d'interpoler `TEXTE_MAX_LENGTH` -- risque de désynchronisation silencieuse si la constante change. Interpolée.
  - **patch** : l'effet de mesure de troncature ne se réexécutait que via `ResizeObserver`, jamais quand `caseItem.phrases?.texte` change sans changement de taille (FR-3 permet d'éditer une phrase pendant une partie active) -- ajout de cette dépendance à l'effet.
  - **defer** (voir `deferred-work.md`) : parité clavier/ARIA pour la bulle, `touch-action`/callout natif, repositionnement au scroll, portée générale multi-touch au-delà du cas de fuite de timer corrigé, distinction contrainte unique vs longueur dans les messages d'erreur, léger conflit de z-index avec `vainqueur-overlay`.
  - **KEEP** : tout ce qui a été vérifié fonctionnel par l'Acceptance Auditor de l'itération 2 (portail + `position: fixed` sans héritage de rotation, clamp horizontal, feedback `enAppui`, `TEXTE_MAX_LENGTH` à 50 partout, `NOT VALID` sur la migration) est à préserver tel quel -- seuls les points listés ci-dessus ont été amendés.
- **2026-07-31, itération 3, revue finale** -- Nouvelle revue à 3 agents. Aucun `intent_gap` ni `bad_spec` : les 10 Acceptance Criteria sont tous vérifiés conformes (Acceptance Auditor), `npm run lint`/`npm run build` passent. Uniquement des `patch` (auto-appliqués, pas de HALT nécessaire) :
  - `TEXTE_MAX_LENGTH` déplacée dans un nouveau fichier `src/features/creation-grille/constants.ts` (au lieu d'un export depuis `CreationGrilleScreen.tsx`) : mélanger un export de constante et un export de composant dans le même fichier casse le Fast Refresh de Vite/React pour ce fichier (édit → rechargement complet au lieu du hot-reload).
  - Vérification "phrase trop longue" extraite en fonctions partagées (`contientPhraseTropLongue`, `estErreurLongueurPhrase`, `MESSAGE_PHRASE_TROP_LONGUE`) dans `constants.ts`, réutilisées dans les deux `handleDupliquer` (au lieu du même check et du même littéral de message copiés-collés dans les deux fichiers).
  - Filet de sécurité ajouté sur l'erreur d'insertion des deux `handleDupliquer` (en plus de la vérification préalable côté client) : si l'insertion échoue quand même pour cause de longueur (`error.code === '23514'`), le même message explicite s'affiche plutôt que le message générique -- couvre l'écart entre `.length` (UTF-16, JS) et `char_length()` (points de code, Postgres), qui peut faire échouer côté serveur un texte que la vérification client avait laissé passer par erreur.
  - `friendlyEditErrorMessage` typée avec le vrai `PostgrestError` (`@supabase/supabase-js`) au lieu d'un type dupliqué à la main.
  - **defer** (voir `deferred-work.md`) : écart `.length`/`char_length()` documenté comme limitation systémique du projet (le `maxLength` HTML des champs a la même caractéristique), pas propre à ce correctif.

## Design Notes

- Détection de troncature : pas de moyen CSS pur pour savoir si `line-clamp` a effectivement tronqué — comparer `scrollHeight` et `clientHeight` du span après rendu (`useLayoutEffect` + `ResizeObserver`, la case étant dimensionnée en `1fr`/`aspect-ratio`, donc sensible à la taille d'écran).
- Suppression du toggle pendant un long-press : un flag (`ref` booléen) est mis à `true` quand le timer aboutit, et remis à `false` au tout début de chaque nouveau `onPointerDown` (pas seulement consommé par `onClick`) -- évite qu'un flag reste bloqué à `true` si un `click` ne se déclenche jamais après un `pointerup` (mouvement du pointeur hors de l'élément par exemple).
- Positionnement de la bulle -- **changement d'approche (itération 2)** : le bouton `grid-cell` porte une rotation CSS aléatoire (`transform: rotate(...)`, DESIGN.md §Shapes) ; un enfant en `position: absolute` de ce bouton hérite visuellement de cette rotation (un `transform` sur un parent affecte le rendu de tout son sous-arbre, sans moyen pour un enfant de s'en affranchir via son propre `transform`). La bulle doit donc être rendue **hors** du bouton pivoté : `createPortal` vers `document.body`, en `position: fixed`, avec les coordonnées calculées explicitement via `getBoundingClientRect()` du bouton (déjà fait pour le flip haut/bas) -- étendre ce calcul pour clamper aussi la position horizontale entre `--space-screen-margin` et `window.innerWidth - largeur_bulle - --space-screen-margin`, pour ne jamais déborder du viewport sur les colonnes de bord.
- Feedback progressif pendant l'appui : un état `enAppui` (`true` dès `onPointerDown` si la case est tronquée, `false` sur `pointerup/leave/cancel`) pilote une classe CSS (`.grid-cell--en-appui`) avec une transition dont la durée est calée sur `APPUI_LONG_MS` (ex. `transform: scale(0.96)` avec `transition-duration: 450ms`), pour donner une sensation de pression progressive avant l'ouverture de la bulle -- répond à l'exigence `EXPERIENCE.md` sans complexité additionnelle (pas d'animation JS, tout en CSS déclenché par une classe).
- Message d'erreur pour l'édition d'une phrase legacy trop longue : suit l'esprit du pattern existant dans `AuthScreen.tsx:8-16` (`friendlyErrorMessage(rawMessage)`), mais teste `error.code === '23514'` plutôt qu'un regex sur `error.message` -- `PostgrestError` (voir `node_modules/@supabase/postgrest-js`) expose le SQLSTATE Postgres de façon stable, indépendamment du texte exact du message (qui peut varier selon la locale ou une future version de Postgres). Le regex textuel avait été utile en itération 2 pour rester cohérent avec le pattern existant, mais s'est révélé plus fragile que nécessaire à l'usage.
- `NOT VALID` sur le nouveau CHECK : Postgres n'exécute la validation que sur les futurs INSERT/UPDATE, jamais sur les lignes existantes — évite tout risque de migration cassée en prod sans environnement de test pour vérifier l'état réel des données au préalable. Corollaire découvert en itération 2 : ce même CHECK s'applique aussi aux insertions faites par `Dupliquer` (nouvelle ligne = nouvel INSERT, jamais exempté par `NOT VALID`) -- d'où la vérification préalable côté application avant de dupliquer une grille contenant une phrase legacy trop longue.
- Duplication (`handleDupliquer`, deux fichiers) : `CreationGrilleScreen.tsx` a déjà les phrases en mémoire (état `phrases`), donc la vérification se fait avant tout appel réseau -- rien à annuler en cas d'échec. `BibliothequeScreen.tsx` ne connaît pas les phrases avant de les avoir récupérées (`listerTextesPhrases`), ce qui arrive après la création de la nouvelle grille dans le flux existant -- la vérification s'insère donc au même endroit que la gestion d'erreur d'insertion déjà présente (juste avant l'insertion), avec le même appel `annulerCreationGrille` en cas de phrase trop longue, pour ne jamais laisser une grille dupliquée vide.
- Retrait de `pointer-events: none` sur `.text-reveal-bubble` : la bulle est la boîte la plus haute en z-index à l'endroit où elle s'affiche (au-dessus ou en dessous de la case pressée, potentiellement chevauchant une case voisine visuellement) -- sans ce retrait, un tap dessus traverse jusqu'à l'élément réellement sous le curseur (une case de grille différente), pouvant la cocher/décocher par erreur. Avec le retrait, le tap est capté par la bulle elle-même (hit-testing standard du navigateur : l'élément le plus haut en z-index à ce point reçoit l'événement) ; l'événement natif continue de bouillonner (bubbling) jusqu'à `document`, où le listener `pointerdown` existant ferme toujours la bulle normalement.

## Verification

**Commands:**
- `npm run lint` -- expected: aucune erreur oxlint sur les fichiers modifiés
- `npm run build` -- expected: build TypeScript + Vite réussit sans erreur

**Manual checks (if no CLI):**
- Ouvrir l'app en local sur une grille 5×5 avec au moins une phrase de plus de 50 caractères (donnée existante ou test manuel) : vérifier que le texte est tronqué proprement sans déborder, que l'appui long ouvre la bulle avec le texte complet, et qu'un tap simple continue de cocher/décocher normalement.

## Suggested Review Order

**Troncature visuelle (garde-fou CSS)**

- Point d'entrée : le débordement de texte n'est plus possible, quelle que soit la longueur saisie.
  [`GrilleEnDirecteScreen.scss:63`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.scss#L63)

- Nouveau composant `text-reveal-bubble`, coins réguliers (pas de rotation héritée), `pointer-events` par défaut pour ne jamais laisser un tap traverser vers une case en dessous.
  [`GrilleEnDirecteScreen.scss:83`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.scss#L83)

- Feedback progressif pendant l'appui long, composé avec la rotation aléatoire de la case sans jamais la perdre.
  [`GrilleEnDirecteScreen.scss:59`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.scss#L59)

**Appui long et consultation du texte complet**

- `GridCell` : détection de troncature (`scrollHeight`/`clientHeight`), re-mesurée si le texte change en direct (FR-3), pas seulement au resize.
  [`GrilleEnDirecteScreen.tsx:512`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L512)

- Calcul de position de la bulle : mesure réelle après un premier rendu invisible, clamp horizontal + flip vertical.
  [`GrilleEnDirecteScreen.tsx:541`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L541)

- Démarrage de l'appui : timer nettoyé avant d'en programmer un nouveau (évite un timer orphelin sur appui multiple).
  [`GrilleEnDirecteScreen.tsx:600`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L600)

- Suppression du toggle de coche après un appui long réussi, sans jamais affecter un tap simple.
  [`GrilleEnDirecteScreen.tsx:617`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L617)

- Rendu de la bulle hors de l'élément pivoté via `createPortal`.
  [`GrilleEnDirecteScreen.tsx:644`](../../src/features/grille-en-direct/GrilleEnDirecteScreen.tsx#L644)

**Limite de caractères et messages d'erreur**

- Constantes et helpers partagés (seuil, détection côté client, détection du code SQLSTATE) extraits pour éviter la duplication entre les deux flux de duplication.
  [`constants.ts:5`](../../src/features/creation-grille/constants.ts#L5)

- Message d'erreur spécifique si l'édition d'une phrase legacy dépasse la nouvelle limite, basé sur le code d'erreur Postgres plutôt qu'un texte fragile.
  [`CreationGrilleScreen.tsx:42`](../../src/features/creation-grille/CreationGrilleScreen.tsx#L42)

- Édition d'une phrase (`saveEdit`) : point d'appel du message spécifique.
  [`CreationGrilleScreen.tsx:430`](../../src/features/creation-grille/CreationGrilleScreen.tsx#L430)

**Duplication d'une grille contenant une phrase trop longue**

- Composition de grille : blocage avant tout appel réseau (phrases déjà en mémoire).
  [`CreationGrilleScreen.tsx:483`](../../src/features/creation-grille/CreationGrilleScreen.tsx#L483)

- Bibliothèque : blocage après récupération des phrases, avec annulation de la grille déjà créée.
  [`BibliothequeScreen.tsx:293`](../../src/features/bibliotheque/BibliothequeScreen.tsx#L293)

**Migration**

- Contrainte resserrée en `NOT VALID` pour ne jamais invalider les lignes existantes.
  [`20260730120000_resserrer_limite_texte_phrases.sql:1`](../../supabase/migrations/20260730120000_resserrer_limite_texte_phrases.sql#L1)
