---
baseline_commit: 88c4526
---

# Story 2.5: Clôturer la partie et rappel de partie en cours

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur,
I want clôturer la partie quand je le décide, et être rappelé si j'oublie après une victoire,
so that je ne laisse pas une partie ouverte indéfiniment.

## Acceptance Criteria

1. **Given** je suis le créateur d'une partie active
   **When** je tape "Clôturer la Partie" (disponible à tout moment, pas seulement après une victoire)
   **Then** `parties.statut` passe à "terminee" — seul le créateur peut écrire ce champ (AD-8)

2. **Given** la partie clôturée
   **When** n'importe quel joueur la consulte
   **Then** il voit l'état "Partie terminée" et la grille reste consultable en lecture seule

3. **Given** une partie dont un vainqueur a été déclaré mais que je n'ai pas encore clôturée
   **When** je reviens sur l'app (Bibliothèque)
   **Then** une bannière pointillée sauge me le rappelle en tête de liste

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — clôture, lecture des vainqueurs par le créateur, publication Realtime (AC: #1, #2, #3)
  - [x] Générer via `supabase migration new cloturer_partie`
  - [x] `create policy "Créateur clôture sa partie" on parties for update using (exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid())) with check (exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid()));` — même forme que les policies existantes sur `grilles`/`parties` (chaîne de propriété via `grilles.compte_id`), pas de fonction `SECURITY DEFINER` nécessaire (pas de risque de récursion RLS ici, `grilles` n'a pas de dépendance circulaire vers `parties`)
  - [x] `grant update (statut) on parties to authenticated;` — **grant colonne par colonne**, pas `grant update on parties` : même garde-fou qu'en Story 2.3 pour `cases.checked` — une policy RLS ne restreint que les *lignes* adressables, jamais les *colonnes* modifiables dans la même requête ; sans ce grant colonne, rien n'empêcherait un `PATCH` malveillant d'inclure aussi `grille_id`/`code_partie` dans le même appel
  - [x] **Angle mort à combler** : la policy `select` existante sur `parties_vainqueurs` ("Joueur lit les vainqueurs de sa partie", Story 2.4) passe par `est_dans_la_partie(partie_id)`, qui dépend d'une ligne `joueurs` existante pour l'utilisateur courant. Un créateur qui n'a **jamais rejoint sa propre partie** comme Joueur (n'a pas encore cliqué son propre lien) ne peut donc pas relire les vainqueurs de cette partie via cette policy seule — or la bannière de rappel (AC #3) doit lui être montrée dans tous les cas. Ajouter une **2e policy select** (permissive, s'additionne à l'existante par OR — comportement RLS par défaut de Postgres, aucune configuration `restrictive` en jeu ici ni ailleurs dans ce projet) :
    `create policy "Créateur lit les vainqueurs de ses parties" on parties_vainqueurs for select using (exists (select 1 from parties p join grilles g on g.id = p.grille_id where p.id = parties_vainqueurs.partie_id and g.compte_id = auth.uid()));`
  - [x] **Activer Realtime** pour `parties` : `alter publication supabase_realtime add table parties;` — nécessaire pour que tous les Joueurs voient "Partie terminée" apparaître en direct dès la clôture (AC #2), sans recharger la page. Périmètre additif : `cases`/`phrases` (Story 2.3), `parties_vainqueurs` (Story 2.4) déjà publiées ; `joueurs` reste hors périmètre (absent d'AD-7, confirmé Stories 2.3/2.4)
  - [x] Appliquer avec `supabase migration up`

- [x] Task 2: CTA "Clôturer la Partie" (créateur uniquement) et état "Partie terminée" en lecture seule (AC: #1, #2)
  - [x] Dans `GrilleEnDirecteScreen.tsx`, étendre le `Promise.all` du chargement initial (déjà `cases` + `joueurs` + `parties_vainqueurs` depuis les Stories 2.3/2.4) avec une 4e requête : `supabase.from('parties').select('grille_id, statut').eq('id', joueur.partieId).single()`. Stocker le résultat dans un nouvel état `statutPartie: 'en_cours' | 'terminee'` (défaut `'en_cours'` si la requête échoue — dégradation cohérente avec le traitement déjà appliqué à `joueurs`/`parties_vainqueurs`, ne pas bloquer tout l'écran pour cet accroc)
  - [x] **Détection "suis-je le créateur ?"** — après la résolution du `Promise.all` (séquentiel, dépend du `grille_id` obtenu ci-dessus, ne bloque pas l'affichage si cet appel échoue) : `const { data } = await supabase.from('grilles').select('id').eq('id', grilleId).maybeSingle()`. La policy `select` existante sur `grilles` ("Créateur lit ses grilles", Story 1.2, `compte_id = auth.uid()`) filtre déjà cette requête : si l'utilisateur courant est le créateur, `data` contient une ligne ; sinon la RLS la filtre silencieusement et `data` est `null` — **aucune nouvelle policy ni fonction n'est nécessaire pour cette détection**, c'est un sous-produit direct de la RLS déjà en place. Stocker le résultat dans `estCreateur: boolean` (défaut `false` en cas d'échec réseau — un joueur non identifié comme créateur ne voit simplement pas le CTA, échec sûr par construction)
  - [x] Ajouter une 4e écoute sur le canal Realtime déjà ouvert : `.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties' }, (payload) => setStatutPartie((payload.new as { statut: 'en_cours' | 'terminee' }).statut))`. Pas de filtre serveur par `id` — même raisonnement que pour `cases`/`phrases`/`parties_vainqueurs` : la policy `select` `"Joueur lit sa partie"` (Story 2.2) scope déjà la diffusion Realtime à la seule partie du joueur courant (AD-7)
  - [x] CTA "Clôturer la Partie" : affiché uniquement si `estCreateur && statutPartie === 'en_cours'`, à tout moment (pas seulement après un vainqueur, FR-13/AC #1 — ne pas conditionner son affichage à `vainqueurs.length > 0`). Style `cta-close-game` (`DESIGN.md.components.cta-close-game` — fond transparent, texte terracotta, bordure pointillée terracotta, `rounded.DEFAULT` : **distinct** de `cta-secondary`, ne pas réutiliser ce dernier ici contrairement au bouton "Fermer" de l'overlay de vainqueur en Story 2.4). Étendre `src/components/Button.tsx` : ajouter la variante `'close-game'` au type `variant` (aux côtés de `'primary'`/`'secondary'`), mappée vers la classe `cta-close-game` (ajouter la classe correspondante dans `src/components/Button.css`, dans le même fichier que `.cta-primary`/`.cta-secondary` — ce composant est déjà le point de centralisation des styles de bouton du projet, ne pas dupliquer localement dans `GrilleEnDirecteScreen.css`)
  - [x] `handleCloturer()` : suit le pattern déjà établi de `handleRelancer`/`handleDupliquer` (`BibliothequeScreen.tsx`) plutôt que le pattern optimiste sans état `pending` de `handleToggle` (Story 2.3) — la clôture n'est pas une "action courante" au sens d'UX-DR5 (comme cocher une case), c'est une action rare et conséquente, un état `clotureEnCours: boolean` désactivant le bouton pendant la requête est donc approprié ici (pas de spinner texte, juste `disabled`). `await supabase.from('parties').update({ statut: 'terminee' }).eq('id', joueur.partieId).select()` — `.select()` obligatoire pour détecter un update silencieusement filtré par RLS (même piège que Story 2.3 `handleToggle`), traiter `error || !data || data.length === 0` comme un échec (message générique `friendlyErrorMessage()`, pas de modale de confirmation avant l'action — cohérent avec UX-DR5 même si cette action n'est pas explicitement visée par l'interdiction, aucun AC ne demande de confirmation)
  - [x] État "Partie terminée" (`statutPartie === 'terminee'`, tous les joueurs, pas seulement le créateur) : remplacer `<LiveBadge />` par un badge "Partie terminée" — **aucun composant dédié à cet état n'est défini dans `DESIGN.md.components`** (même lacune que l'overlay de vainqueur en Story 2.4). Décision de design pour cette story : réutiliser la même forme de pastille que `live-badge` (pointillé, `radius-full`, texte `caption`) mais en `--color-ink-soft`/`--color-line` plutôt que moutarde — la moutarde est réservée par `DESIGN.md.Colors` à l'indicateur "en direct"/l'état de tension, jamais à un état neutre/terminé. Story 2.3 avait explicitement laissé "pas encore de logique de masquage à la clôture" pour une story ultérieure — **c'est cette story**
  - [x] Grille en lecture seule : passer une prop `disabled={statutPartie === 'terminee'}` à chaque `GridCell` (nouveau champ `disabled?: boolean` sur `GridCellProps`, appliqué à l'attribut natif `disabled` du `<button>`). Un bouton HTML `disabled` ne déclenche jamais son `onClick` — aucune garde supplémentaire nécessaire dans `handleToggle` lui-même. Ajouter un style `.grid-cell:disabled` dans `GrilleEnDirecteScreen.css` (`cursor: default`, légère réduction d'opacité — rester lisible, ne pas reproduire l'`opacity: 0.6` de `Button.css` qui rendrait le texte des phrases difficile à lire) ; la coche encre déjà cochée reste visible et sert toujours de signal primaire (aucune régression sur l'accessibilité déjà actée en Story 2.3)
  - [x] **Hors périmètre explicite, à ne pas construire** : aucune application côté serveur (RLS) n'empêche un `PATCH` direct sur `cases.checked` après clôture — la policy `update` de la Story 2.3 ne vérifie pas `parties.statut`. Cohérent avec la posture du projet (`ARCHITECTURE-SPINE.md.Deferred` : "Protection anti-abus au-delà des défauts Supabase — délibérément non traité", "la confiance plutôt que l'arbitrage", `EXPERIENCE.md`) et avec le fait qu'aucun AC de cette story ne l'exige — l'AC #2 ne parle que de ce que "n'importe quel joueur... voit", pas d'un verrou serveur. Ne pas ajouter cette vérification par anticipation

- [x] Task 3: Bannière de rappel de partie en cours dans la Bibliothèque (AC: #3)
  - [x] Dans `BibliothequeScreen.tsx`, ajouter un chargement séquentiel supplémentaire après celui des `phrases` (même style séquentiel déjà en place dans ce fichier, ne pas introduire de `Promise.all` étranger à sa convention existante) : `supabase.from('parties_vainqueurs').select('parties!inner(id, code_partie, grilles!inner(nom))').eq('parties.statut', 'en_cours')`. La nouvelle policy `select` du Task 1 (`"Créateur lit les vainqueurs de ses parties"`) scope déjà le résultat aux seules parties du créateur courant — aucun filtre `.eq('grilles.compte_id', ...)` supplémentaire n'est nécessaire côté client
  - [x] **Dédupliquer par `parties.id`** avant affichage : une partie à plusieurs co-vainqueurs (Story 2.4, AC #2) produit une ligne `parties_vainqueurs` par vainqueur, donc potentiellement plusieurs lignes pour la même partie dans ce résultat — la bannière doit lister chaque partie en attente une seule fois, pas une fois par vainqueur
  - [x] Traiter un échec de cette requête comme une dégradation silencieuse (pas de bannière affichée), jamais comme un blocage de l'écran — même principe que les dégradations déjà en place dans `GrilleEnDirecteScreen.tsx` pour les requêtes secondaires
  - [x] Composant bannière (interne à `BibliothequeScreen.tsx`, pas de fichier séparé — même colocalisation que les autres composants internes de ce projet) : une **seule** carte pointillée sauge (`DESIGN.md.components.banner-reminder`) affichée en tête de liste (avant `<ul className="grille-list">`, y compris si `grilles.length === 0`), listant chaque partie en attente comme une sous-ligne (nom de la grille + lien de partie, réutilisant `construireLienPartie(code_partie)` déjà défini dans ce fichier) plutôt que d'empiler une carte par partie — décision de présentation pour cette story, l'AC #3 ne précise pas le cas à plusieurs parties en attente simultanément (cas rare mais non exclu par les AC : un créateur peut lancer plusieurs parties)
  - [x] **Le lien de partie est nécessaire dans la bannière, pas juste le texte de rappel** : après un rechargement de page, `liensPartie` (état React local de la Story 2.1) est réinitialisé à vide — sans réafficher ce lien ici, un créateur revenant sur l'app n'aurait aucun moyen de retrouver comment rejoindre sa propre partie pour la clôturer (le CTA "Clôturer la Partie" du Task 2 n'existe que sur l'écran Grille en direct, atteint uniquement via ce lien). Style du lien réutilisant `.grille-list__lien` (`user-select: all`, cohérent avec le pattern déjà établi)
  - [x] Texte de la bannière : "Une Partie est toujours en cours — tu veux la clôturer ?" (`EXPERIENCE.md.Voice and Tone`, exemple donné tel quel)
  - [x] CSS (`BibliothequeScreen.css`) : nouvelle classe `.bibliotheque-screen__rappel` — mêmes valeurs de tokens que `.grille-list__partie` déjà présent dans ce fichier (`border: 1.5px dashed var(--color-sage)`, `background: var(--color-paper-card)`, `border-radius: var(--radius-default)`, `transform: rotate(0.4deg)`) : ce fichier contient déjà exactement le traitement visuel `banner-reminder` sous un autre nom de classe, réutiliser les mêmes valeurs plutôt que d'improviser un nouveau style

- [x] Task 4: Vérification manuelle (AC: #1 à #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Reprendre une partie de test (identités anonymes rejointes, même méthode que Stories 2.2 à 2.4) : un joueur complète une ligne (déclenche la détection de victoire, Story 2.4) sans que le créateur ne clôture
  - [x] Créateur (compte authentifié, propriétaire de la grille) : `PATCH /rest/v1/parties` sur `statut: 'terminee'` pour cette partie → `200`, `statut` mis à jour ; tenter le même `PATCH` avec un compte créateur d'une **autre** grille (n'appartenant pas à cette partie) → `0` ligne affectée (RLS), pas d'erreur mais aucun changement
  - [x] Tenter le `PATCH` en incluant `grille_id` dans le corps → refusé (grant colonne), confirme le grant colonne par colonne
  - [x] Ouvrir un abonnement Realtime en tant que Joueur (script Node, même méthode que Stories 2.3/2.4) pendant que le créateur clôture → l'événement `UPDATE` sur `parties` avec `statut: 'terminee'` est bien reçu côté Joueur en quelques secondes
  - [x] Vérifier par lecture du code que la grille passe en lecture seule (`disabled` sur `GridCell`) et que le badge "Partie terminée" remplace `LiveBadge` une fois `statutPartie === 'terminee'` propagé
  - [x] Créateur : ouvrir la Bibliothèque **avant** d'avoir rejoint sa propre partie comme Joueur (nouvelle grille + partie de test, vainqueur déclaré par un joueur invité seul) → confirmer que la bannière de rappel apparaît malgré l'absence de ligne `joueurs` pour ce créateur dans cette partie (valide la policy select ajoutée au Task 1), puis clôturer via le lien affiché dans la bannière → la bannière disparaît au rechargement suivant (la partie n'est plus `en_cours`)
  - [x] Confirmer par lecture directe de `pg_publication_tables` que `parties` est bien publiée après application de la migration
  - [x] Nettoyer les données de test créées (comptes anonymes, grilles/parties de test) après vérification, comme aux stories précédentes

### Review Findings

**Patch:**

- [x] [Review][Patch] L'écoute Realtime `UPDATE` sur `parties` n'a aucune garde sur l'`id` de la ligne reçue — la policy `select` "Créateur lit ses parties" (Story 2.1) scope la visibilité RLS à **toutes** les parties du créateur, pas seulement à celle affichée à l'écran. Un créateur ayant relancé la même grille plusieurs fois ("Relancer", Story 2.1 — scénario déjà supporté, pas hypothétique) et ayant deux parties actives ouvertes dans deux onglets verrait la clôture de l'une se répercuter à tort sur `statutPartie` de l'autre (grille désactivée, badge "Partie terminée" affiché pour une partie qui reste en réalité active) — violation directe d'AC #2 ("il voit l'état" de **la** partie consultée). [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:207-210] — correctif : ignorer l'événement si `(payload.new as { id: string }).id !== joueur.partieId`.
- [x] [Review][Patch] Régression introduite par la nouvelle policy `select` de cette story sur `parties_vainqueurs` ("Créateur lit les vainqueurs de ses parties", scopée par créateur donc **multi-parties**) : l'écoute Realtime `INSERT` sur `parties_vainqueurs` (Story 2.4, non modifiée par cette story mais dont le périmètre RLS est élargi par la nouvelle policy) n'a elle non plus aucune garde sur `partie_id`. Un créateur avec plusieurs parties actives verrait l'overlay/toast de vainqueur d'une partie A se déclencher alors qu'il consulte l'écran de la partie B. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:189-193] — correctif : ignorer l'événement si `(payload.new as { partie_id: string }).partie_id !== joueur.partieId`.
- [x] [Review][Patch] La bannière de rappel (`BibliothequeScreen.tsx`) fuite vers des joueurs non-créateurs — les policies RLS s'additionnent par OR : la policy pré-existante de la Story 2.4 ("Joueur lit les vainqueurs de sa partie", basée sur l'appartenance `joueurs`) reste active en plus de la nouvelle policy créateur ajoutée par cette story. Un utilisateur **déjà connecté avec son propre compte** qui rejoint la partie d'un ami via le lien (`RejoindrePartieScreen.tsx` n'appelle `signInAnonymously()` que si `!session` — un compte existant garde sa véritable identité, confirmé par `rejoindre_partie`) satisfait aussi `est_dans_la_partie` pour cette partie précise, et verrait donc à tort la bannière "Une Partie est toujours en cours — tu veux la clôturer ?" dans **sa propre** Bibliothèque pour une partie qu'il ne peut pas clôturer (le CTA du Task 2 reste correctement absent pour lui côté `GrilleEnDirecteScreen`, créant une impasse) — violation d'AC #3 ("**Given** je suis le créateur"). Le commentaire du code ("aucun filtre... supplémentaire n'est nécessaire ici") repose sur une hypothèse fausse (une seule policy select active). [src/features/bibliotheque/BibliothequeScreen.tsx:113-117] — correctif : ajouter un filtre explicite `.eq('parties.grilles.compte_id', (await supabase.auth.getUser()).data.user?.id ?? '')` à la requête (filtre imbriqué à 2 niveaux, supporté par PostgREST puisque chaque niveau embarqué utilise déjà `!inner`).

**Defer:**

- [x] [Review][Defer] La policy `update` sur `parties.statut` ("Créateur clôture sa partie") ne restreint que la propriété de la ligne (`using`/`with check` identiques), jamais la valeur ni le sens de la transition — un créateur pourrait, via un appel API direct (hors UI), repasser une partie déjà `terminee` à `en_cours`. [supabase/migrations/20260709212326_cloturer_partie.sql] — deferred : cohérent avec la posture déjà acceptée du projet ("Protection anti-abus au-delà des défauts Supabase — délibérément non traité", `ARCHITECTURE-SPINE.md.Deferred`) et avec le fait qu'aucun AC n'exige explicitement l'irréversibilité côté serveur ; noter que la valeur elle-même reste bornée par le type enum Postgres `partie_statut` (`'en_cours'`/`'terminee'` uniquement, pas une chaîne arbitraire).
- [x] [Review][Defer] `.single()` sur le chargement de `parties` renvoie une erreur pour un `partieId` inexistant, traitée de façon identique au défaut `'en_cours'` (`partieError || !partieData ? 'en_cours' : ...`) plutôt que comme un état d'erreur distinct. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx] — deferred, actuellement inatteignable : aucune fonctionnalité de suppression de partie/grille n'existe dans l'app, `joueur.partieId` provient toujours d'un `rejoindre_partie` réussi ; même raisonnement déjà accepté en Story 2.4 pour un cas structurellement identique.
- [x] [Review][Defer] Aucun `aria-disabled`/changement de libellé accessible n'annonce pourquoi la grille a cessé de répondre une fois la partie clôturée — seuls `cursor: default`/`opacity: 0.85` le signalent visuellement. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — `GridCell`] — deferred : amélioration d'accessibilité légitime mais non exigée par le plancher explicite de cette story, même catégorie déjà différée en Story 2.4.

**Dismissed:**

- Aucune confirmation avant "Clôturer la Partie" — cohérent avec UX-DR5 et déjà justifié explicitement dans les Dev Notes de cette story elle-même, aucun AC n'exige de modale.
- `estCreateur` dépend implicitement de la forme actuelle de la policy select sur `grilles` — remarque architecturale valide mais spéculative ("si la policy est élargie plus tard") : la policy actuelle (`compte_id = auth.uid()`, propriété stricte) est fiable aujourd'hui, pas un défaut de cette story.
- Cast non validé des payloads Realtime (`payload.new as {...}`) — cohérent avec l'absence de types générés Supabase dans tout le reste du projet, déjà explicitement accepté en Story 2.3.
- La bannière de rappel ne montre que les parties ayant déjà au moins un vainqueur (`!inner` sur `parties_vainqueurs`) — faux positif : c'est exactement ce que demande l'AC #3 ("**Given** une partie dont un vainqueur a été déclaré"), pas une partie simplement stagnante.
- Réutilisation des classes `.grille-list__nom`/`.grille-list__lien` dans la bannière — décision de réutilisation intentionnelle et documentée dans le Task 3 de cette story, pas un import accidentel.
- Requête de rappel séquentielle plutôt que parallélisée dans `Promise.all` — décision intentionnelle documentée (suit la convention déjà établie du fichier), cohérent avec SM-C1.
- Aucune pagination/plafond sur le nombre de parties listées dans la bannière — cohérent avec SM-C1, même raisonnement déjà accepté en Story 1.5 pour la bibliothèque elle-même.
- Absence de tests automatisés — SM-C1, aucun framework de test imposé, cohérent avec toutes les stories précédentes.
- Majuscule à "Partie" dans "Une Partie est toujours en cours"/"Clôturer la Partie" — faux positif : c'est la casse explicitement prescrite par UX-DR7 pour les termes du glossaire produit, et l'exemple donné tel quel par `EXPERIENCE.md.Voice and Tone`.
- Migration sans policy `drop`/rollback associée — convention déjà établie dans toutes les migrations précédentes du projet, déjà écartée pour le même motif en Story 2.3.
- Aucun verrou serveur n'empêche un cochage de case après clôture via un appel API direct — décision de périmètre explicitement documentée dans cette story elle-même (Task 2, dernier point ; Dev Notes), pas un oubli.

## Dev Notes

- **Portée volontairement étroite** : cette story clôture la partie et rappelle une clôture oubliée. Ne construit ni la reconnexion après coupure réseau (Story 2.6, AD-10), ni l'absence d'historique pour les invités (Story 2.7), ni le mode solo (Story 2.8, déjà largement couvert par le fait qu'aucun AC de cette story ne suppose plusieurs joueurs). Ne pas anticiper ces stories.
- **AD-8 est absolu** : `parties.statut` ne peut être écrit que par le créateur, via une policy RLS **et** un grant colonne par colonne — pas l'un sans l'autre (rappel déjà documenté aux Stories 1.2/2.1/2.2/2.3 : RLS filtre les lignes, le grant filtre les colonnes, les deux sont nécessaires ensemble).
- **La détection "suis-je le créateur ?" ne nécessite aucune nouvelle table/colonne/fonction** — c'est un sous-produit de la policy `select` déjà existante sur `grilles` depuis la Story 1.2. Ne pas ajouter de champ `est_createur` sur `joueurs` ni de fonction dédiée : la requête `grilles.select('id').eq('id', grilleId).maybeSingle()` suffit, RLS répond `null` ou une ligne selon le cas.
- **Angle mort RLS comblé par cette story** : avant cette story, un créateur qui n'avait jamais rejoint sa propre partie comme Joueur ne pouvait pas relire `parties_vainqueurs` pour cette partie (la policy Story 2.4 dépend de `joueurs`). C'est un vrai scénario : un créateur peut lancer une partie et repartir sans la rejoindre immédiatement (Story 2.2 ne l'y oblige pas). La 2e policy select du Task 1 comble cet angle mort — sans elle, l'AC #3 échouerait silencieusement pour ce cas précis (aucune erreur visible, juste une bannière qui n'apparaît jamais).
- **Deux décisions de design non couvertes par `DESIGN.md`** (même situation que l'overlay de vainqueur en Story 2.4) : le badge "Partie terminée" (Task 2) et la présentation à plusieurs parties en attente dans la bannière (Task 3). Les deux sont documentées inline dans les tasks correspondantes — rester dans le vocabulaire de tokens existant si le design final diverge.
- **Hors périmètre assumé** : aucun verrou RLS n'empêche un cochage après clôture (voir Task 2, dernier point) — cohérent avec `ARCHITECTURE-SPINE.md.Deferred` ("Protection anti-abus au-delà des défauts Supabase — délibérément non traité") et le principe directeur "la confiance plutôt que l'arbitrage" d'`EXPERIENCE.md`. Ne pas ajouter cette protection par anticipation.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs, comme toutes les stories précédentes. E2E navigateur complet toujours indisponible dans ce sandbox.

### Previous Story Intelligence (Story 2.4)

- Le pattern fetch-then-subscribe (`Promise.all` pour le chargement initial, canal Realtime ouvert seulement après succès) continue de s'étendre sans jamais créer un second effet ou un second canal — cette story l'étend une 4e fois (`parties` en plus de `cases`/`joueurs`/`parties_vainqueurs`).
- La revue de code de la Story 2.4 a corrigé un bug de fermeture (closure) sur un état React référencé dans un handler Realtime défini une seule fois à l'ouverture du canal (`vainqueurIdsRef`, un `useRef` synchrone plutôt qu'un état React fermé sur sa valeur de montage). Le nouveau listener `parties` de cette story (`setStatutPartie(...)`) n'a pas ce problème car il fait un remplacement direct sans lire d'état antérieur dans le handler — mais rester vigilant à ce piège pour tout futur handler qui lirait un état React capturé.
- Rappel du piège GRANT (Stories 1.2, 2.1, 2.2, 2.3, 2.4) : RLS filtre les lignes mais ne remplace pas les privilèges Postgres — s'applique ici à `grant update (statut) on parties`, à accorder en plus (pas à la place) de la policy RLS.
- Le badge "en direct" (`LiveBadge`) était affiché "en permanence... pas encore de logique de masquage à la clôture" selon les Dev Notes de la Story 2.3, qui différait explicitement ce travail à cette story.
- Quand `DESIGN.md` ne définit pas un composant nécessaire, la Story 2.4 a posé le principe de rester dans le vocabulaire de tokens existant plutôt que d'improviser de nouvelles valeurs — appliqué de nouveau ici pour le badge "Partie terminée".

### Project Structure Notes

```
bingo/
  src/
    components/
      Button.tsx                                 # MODIFIÉ — nouvelle variante 'close-game'
      Button.css                                 # MODIFIÉ — classe .cta-close-game
    features/
      bibliotheque/
        BibliothequeScreen.tsx                   # MODIFIÉ — bannière de rappel de partie en cours
        BibliothequeScreen.css                   # MODIFIÉ — style .bibliotheque-screen__rappel
      grille-en-direct/
        GrilleEnDirecteScreen.tsx                # MODIFIÉ — CTA clôture, détection créateur, état "Partie terminée", grille lecture seule
        GrilleEnDirecteScreen.css                # MODIFIÉ — badge "Partie terminée", .grid-cell:disabled
  supabase/
    migrations/
      <timestamp>_cloturer_partie.sql            # NOUVEAU — policy update parties.statut, grant colonne, policy select parties_vainqueurs (créateur), publication Realtime parties
```

Aucun nouveau dossier de feature. `Button.tsx`/`Button.css` sont modifiés pour la première fois depuis leur création (Story 1.2) — vérifié qu'aucune autre story en attente n'y touche en parallèle.

### References

- [Source: epics.md#Story 2.5: Clôturer la partie et rappel de partie en cours]
- [Source: epics.md#FR-13 (clôture par le créateur, à tout moment), FR-14 (rappel de partie en cours non clôturée)]
- [Source: ARCHITECTURE-SPINE.md#AD-7 — Realtime Postgres Changes (liste des tables incluant parties), #AD-8 — RLS par ligne (seul le créateur écrit parties.statut)]
- [Source: ARCHITECTURE-SPINE.md#Deferred — protection anti-abus au-delà des défauts Supabase délibérément non traitée]
- [Source: EXPERIENCE.md#State Patterns — "Partie active, pas encore de vainqueur" (CTA clôture déjà visible), "Partie clôturée" (lecture seule), "Rappel de partie en cours" (bannière sauge)]
- [Source: EXPERIENCE.md#Component Patterns — cta-close-game (disponible à tout moment), live-badge (disparaît à la clôture), banner-reminder (Bibliothèque uniquement, si vainqueur non clôturé)]
- [Source: EXPERIENCE.md#Voice and Tone — "Une Partie est toujours en cours — tu veux la clôturer ?"]
- [Source: DESIGN.md#Components — cta-close-game (fond transparent, texte/bordure terracotta), banner-reminder (bordure pointillée sauge, paper-card)]
- [Source: 2-4-detecter-et-annoncer-les-vainqueurs.md#Dev Notes, Change Log — pattern fetch-then-subscribe étendu, piège de fermeture React sur un handler Realtime, piège GRANT]
- [Source: supabase/migrations/20260708115501_lancer_partie.sql — policies existantes sur `parties` (select/insert créateur), pas encore de policy update]
- [Source: supabase/migrations/20260708200136_rejoindre_partie.sql — policy "Joueur lit sa partie", fonction `est_dans_la_partie`]
- [Source: src/features/bibliotheque/BibliothequeScreen.tsx — `construireLienPartie`, `.grille-list__partie` (traitement visuel déjà identique à banner-reminder)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session — aucune action requise.
- Vérifié avant la migration que `pg_publication_tables` contenait `phrases`/`cases`/`parties_vainqueurs` (héritage Stories 2.3/2.4) mais pas `parties` ; confirmé après application que `parties` y apparaît aussi.
- Vérification par un script Node autonome (`@supabase/supabase-js`, exécuté depuis la racine du projet, supprimé après usage) : un compte créateur fraîchement inscrit (email/mot de passe) crée sa propre grille 3×3 + 9 phrases + une partie ; deux joueurs anonymes (Alice25, Bob25) la rejoignent ; Bob complète une ligne (déclenche `parties_vainqueurs`, Story 2.4) — **le créateur ne rejoint volontairement jamais sa propre partie comme Joueur**, pour tester spécifiquement l'angle mort RLS comblé par cette story.
- Séquence de vérification : le créateur (aucune ligne `joueurs` pour lui dans cette partie) lit `parties_vainqueurs` via la nouvelle policy `"Créateur lit les vainqueurs de ses parties"` → une ligne visible (confirme l'angle mort comblé) ; un **second** compte créateur (n'ayant aucun lien avec cette grille) tente `PATCH parties.statut='terminee'` → `[]` (RLS bloque silencieusement, 0 ligne affectée) ; le vrai créateur tente le même `PATCH` en ajoutant `grille_id` au corps → `403 permission denied` (confirme le grant colonne par colonne) ; abonnement Realtime côté Alice (`.subscribe()` avec attente explicite du statut `SUBSCRIBED`, leçon retenue de la Story 2.4) pendant que le vrai créateur clôture avec succès → événement `UPDATE` reçu côté Alice avec `statut: 'terminee'` en quelques secondes ; requête de rappel re-exécutée après clôture → vide pour cette partie (confirme la disparition de la bannière).
- Nettoyage : grille/phrases/partie de test supprimées (cascade sur `joueurs`/`cases`/`parties_vainqueurs`) ; 4 comptes de test (2 créateurs email/mot de passe, Alice25, Bob25) supprimés via `delete from auth.users`.

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- Migration `supabase/migrations/20260709212326_cloturer_partie.sql` : policy `update` sur `parties.statut` scopée au créateur (chaîne `grilles.compte_id`), `grant update (statut)` colonne par colonne (AD-8), 2e policy `select` sur `parties_vainqueurs` comblant l'angle mort d'un créateur n'ayant jamais rejoint sa propre partie, activation de la publication Realtime pour `parties`.
- `src/components/Button.tsx`/`Button.css` : nouvelle variante `'close-game'` → classe `cta-close-game` (fond transparent, texte/bordure terracotta), premier changement de ce composant depuis sa création (Story 1.2).
- `GrilleEnDirecteScreen.tsx` : chargement initial étendu (4e requête `parties` dans le `Promise.all`), détection "suis-je le créateur ?" en sous-produit de la RLS existante sur `grilles` (aucune nouvelle policy nécessaire pour cette détection précise), 4e écoute Realtime sur `parties`, `handleCloturer` (pattern `pending`/désactivation, pas optimiste), CTA "Clôturer la Partie" (créateur uniquement, à tout moment), badge "Partie terminée" remplaçant `LiveBadge`, grille en lecture seule (`disabled` natif sur `GridCell`) une fois la partie clôturée.
- `GrilleEnDirecteScreen.css` : `.grid-cell:disabled` (opacité réduite, curseur par défaut, coche toujours visible), `.partie-terminee-badge` (même forme que `.live-badge`, couleurs ink-soft/line plutôt que moutarde).
- `BibliothequeScreen.tsx` : chargement séquentiel supplémentaire des parties en attente de clôture (vainqueur déclaré, statut `en_cours`), dédupliqué par `partie.id` (plusieurs co-vainqueurs ne créent pas plusieurs entrées), bannière unique en tête de liste listant chaque partie en attente avec son lien de partie (nécessaire pour que le créateur puisse effectivement atteindre le CTA de clôture après un rechargement de page).
- `BibliothequeScreen.css` : nouvelle classe `.bibliotheque-screen__rappel`, mêmes valeurs de tokens que `.grille-list__partie` déjà présent (traitement visuel `banner-reminder`).
- Vérification : RLS de clôture (créateur uniquement, y compris refus d'un autre créateur), grant colonne par colonne, angle mort RLS sur `parties_vainqueurs` comblé, propagation Realtime de la clôture, disparition de la bannière après clôture — tous confirmés via script Node de bout-en-bout. `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Données de test (grille, phrases, partie, 4 comptes) nettoyées après coup.

### File List

- `supabase/migrations/20260709212326_cloturer_partie.sql` (nouveau)
- `src/components/Button.tsx` (modifié — nouvelle variante `close-game`)
- `src/components/Button.css` (modifié — classe `.cta-close-game`)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` (modifié — CTA clôture, détection créateur, état "Partie terminée", grille lecture seule)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.css` (modifié — badge "Partie terminée", `.grid-cell:disabled`)
- `src/features/bibliotheque/BibliothequeScreen.tsx` (modifié — bannière de rappel de partie en cours)
- `src/features/bibliotheque/BibliothequeScreen.css` (modifié — style `.bibliotheque-screen__rappel`)

## Change Log

- 2026-07-09 : Implémentation complète (Tasks 1 à 4) — migration `cloturer_partie` (policy update `parties.statut`, grant colonne, policy select `parties_vainqueurs` pour le créateur, publication Realtime `parties`), CTA "Clôturer la Partie" et état "Partie terminée" en lecture seule dans `GrilleEnDirecteScreen`, bannière de rappel de partie en cours dans la Bibliothèque, nouvelle variante `close-game` du composant `Button`. Vérifié via script Node de bout-en-bout couvrant RLS, grant colonne, angle mort RLS sur les vainqueurs, Realtime et disparition de la bannière après clôture. Statut passé à "review".
- 2026-07-09 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — les 3 layers ont convergé indépendamment sur une même classe de régression : les nouvelles policies RLS de cette story élargissent la visibilité Realtime au-delà d'une seule partie pour un créateur multi-parties (scénario déjà supporté via "Relancer", Story 2.1) et pour un joueur authentifié non-créateur. 3 patches appliqués : garde `id === joueur.partieId` sur l'écoute `parties` UPDATE, garde `partie_id === joueur.partieId` sur l'écoute `parties_vainqueurs` INSERT (régression exposée dans du code hérité de la Story 2.4 par la nouvelle policy créateur), filtre explicite `.eq('parties.grilles.compte_id', ...)` sur la requête de bannière de rappel (les policies RLS s'additionnent par OR, la policy joueur de la Story 2.4 restait active). Les 3 fuites ont été confirmées reproductibles puis corrigées via un script Node de bout-en-bout (créateur avec 2 parties actives, joueur authentifié non-créateur). 3 éléments différés vers `deferred-work.md` (réversibilité de la clôture non bloquée côté serveur, cas `partieId` inexistant actuellement inatteignable, accessibilité ARIA au-delà du plancher explicite), 12 signalements bruts écartés (faux positifs vérifiés, conventions déjà établies, décisions déjà documentées dans cette story). `npm run build`/`npm run lint` et un test de non-régression API repassés après les correctifs. Statut passé à "done".
