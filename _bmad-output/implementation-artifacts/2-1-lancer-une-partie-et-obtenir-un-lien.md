---
baseline_commit: NO_VCS
---

# Story 2.1: Lancer une partie et obtenir un lien

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur,
I want lancer une partie à partir d'une grille validée et obtenir un lien à partager,
so that j'invite mes proches à jouer.

## Acceptance Criteria

1. **Given** une grille validée (pool complet) m'appartenant
   **When** je lance la partie
   **Then** une Partie est créée en base référencée à cette grille, avec un statut "en_cours" et un code/lien unique généré

2. **Given** une partie lancée
   **When** je consulte à nouveau la grille source
   **Then** sa taille ne peut plus être modifiée (le texte des phrases reste modifiable, cf Story 1.3)

   **And** le lien de partie est réutilisable — plusieurs joueurs peuvent l'utiliser pour rejoindre, ce n'est pas un lien à usage unique
   **And** l'action "Relancer" est disponible depuis la Bibliothèque sur une grille existante et déclenche ce même mécanisme de lancement (FR-18), sans retaper le contenu de la grille

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — table `parties`, verrou de taille (AC: #1, #2)
  - [x] Générer le fichier via `supabase migration new lancer_partie` (nomme automatiquement `supabase/migrations/<timestamp>_lancer_partie.sql`)
  - [x] `create type partie_statut as enum ('en_cours', 'terminee');` — enum Postgres, conforme à la Consistency Convention de la spine (`parties.statut`), pas un simple `check` textuel
  - [x] Table `parties` : `id uuid primary key default gen_random_uuid()`, `grille_id uuid not null references grilles(id) on delete cascade`, `code_partie text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)`, `statut partie_statut not null default 'en_cours'`, `created_at timestamptz not null default now()` — `code_partie` généré côté serveur par défaut de colonne, jamais envoyé par le client (même principe que `compte_id default auth.uid()` en Story 1.2)
  - [x] `create index parties_grille_id_idx on parties (grille_id);`
  - [x] `alter table parties enable row level security;`
  - [x] Policy select : `"Créateur lit ses parties"` `using (exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid()))` — nécessaire pour que `.insert().select().single()` puisse relire la ligne tout juste créée
  - [x] Policy insert : `"Créateur lance une partie"` `with check (exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid()))`
  - [x] `grant select, insert on parties to authenticated;` — sans ce GRANT, PostgREST refuse la requête avant même d'évaluer les policies (même piège que la Story 1.2, voir Debug Log de cette story)
  - [x] Pas de policy UPDATE/DELETE sur `parties` dans cette story — aucun AC ne le demande ici (la clôture de partie, qui écrira `statut`, arrive en Story 2.5)
  - [x] Fonction trigger `empecher_modification_taille_si_partie_lancee()` : `security definer`, `set search_path = ''` avec les identifiants pleinement qualifiés par schéma (`public.parties`) à l'intérieur du corps de la fonction — durcissement recommandé pour les fonctions `SECURITY DEFINER` (plus strict que `search_path = public`), lève une exception si `new.taille is distinct from old.taille` et qu'il existe au moins une ligne `parties` référençant `old.id` — `security definer` est nécessaire ici pour que la vérification d'existence ne dépende pas des policies `select` de l'utilisateur courant sur `parties` (défense en profondeur, cohérent avec les futures fonctions `SECURITY DEFINER` de la spine, AD-3/AD-9, qui devraient reprendre le même réflexe `search_path = ''`)
  - [x] `create trigger verrouiller_taille_apres_lancement before update on grilles for each row execute function empecher_modification_taille_si_partie_lancee();` — implémente FR-5/AC2, référencé comme dépendance en attente dans les Dev Notes de la Story 1.2
  - [x] Appliquer avec `supabase migration up` (pas `supabase db reset`, voir Dev Notes des Stories précédentes sur le compte de test)

- [x] Task 2: CTA "Lancer la Partie" depuis la composition de phrases fraîchement complétée (AC: #1)
  - [x] Dans `src/features/creation-grille/CreationGrilleScreen.tsx` (`ComposerPhrases`), quand `complete` est vrai, afficher un CTA `cta-primary` "Lancer la Partie" à côté du message "Ta grille est complète !"
  - [x] `handleLancerPartie()` : `supabase.from('parties').insert({ grille_id: grille.id }).select().single()` (jamais envoyer `code_partie` ni `statut` depuis le client), `try/catch/finally` avec état `pending` désactivant le CTA pendant l'appel, `friendlyErrorMessage()` en cas d'échec (reprendre la fonction déjà écrite dans ce fichier, ne pas en créer une variante)
  - [x] En cas de succès, afficher un panneau "partie lancée" en remplacement du CTA (ne pas permettre de relancer une deuxième partie depuis ce même écran/cette même instance de composant) : microcopie chaleureuse (ex. "Ta partie est prête ! Partage ce lien :"), le lien affiché en texte sélectionnable, et un bouton `cta-secondary` "Copier le lien" (`navigator.clipboard.writeText`, échec silencieux toléré — le lien reste visible et copiable manuellement dans tous les cas, pas besoin d'état d'erreur dédié)
  - [x] Lien affiché : `${window.location.origin}?partie=${codePartie}` (voir Dev Notes — convention à respecter par la Story 2.2)

- [x] Task 3: Action "Relancer" depuis la Bibliothèque (AC: #1, #2, FR-18)
  - [x] Dans `src/features/bibliotheque/BibliothequeScreen.tsx`, ajouter un bouton `cta-secondary` "Relancer" **avant** le bouton "Dupliquer" existant (ordre du tableau State Patterns d'EXPERIENCE.md : "Relancer" puis "Dupliquer"), visible uniquement quand `grille.validee` est vrai (même condition que "Dupliquer")
  - [x] `handleRelancer(grille)` : même logique d'insertion que la Task 2 (dupliquer le code plutôt que factoriser un hook partagé entre les deux écrans — cohérent avec le reste du projet, qui duplique déjà `friendlyErrorMessage()` à l'identique dans chaque écran plutôt que d'introduire une abstraction partagée prématurée)
  - [x] État `lancementIds: Set<string>` (même pattern que `dupliquantIds` de la Story 1.4) pour désactiver uniquement le bouton "Relancer" de la grille concernée pendant l'opération
  - [x] En cas de succès, afficher le lien généré et un bouton "Copier le lien" via un état dédié (ex. `partieLancee: { grilleId: string; lien: string } | null`), rendu à la place de la zone de message existante — **ne pas** réutiliser l'état `message` (`string | null`) tel quel pour y loger un lien + un bouton, ce n'est pas un simple texte

- [x] Task 4: Vérification manuelle (AC: #1, #2)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Compléter une grille (pool exact), lancer une partie via l'API en reproduisant l'appel de `handleLancerPartie` : une ligne `parties` créée avec `statut = 'en_cours'` et un `code_partie` de 8 caractères généré côté serveur
  - [x] Lancer deux parties successives pour la même grille (reproduisant "Relancer" deux fois) : deux lignes `parties` distinctes, deux `code_partie` différents — confirme la réutilisabilité et l'absence de contrainte d'unicité sur `grille_id`
  - [x] Après création d'une partie pour une grille, tenter `PATCH /rest/v1/grilles` sur `taille` pour cette grille : rejeté par le trigger (message d'exception Postgres remonté) ; tenter la même chose sur `nom` : accepté (le verrou ne porte que sur `taille`)
  - [x] Tenter de créer une partie avec un `grille_id` appartenant à un autre compte : refusé par la policy RLS `insert`
  - [x] Vérifier dans Studio/psql que RLS est active sur `parties`, que la policy `select` permet bien la relecture immédiate après insertion (`insert().select().single()` ne renvoie pas `null`)
  - [x] Collision d'unicité sur `code_partie` : non testée activement (probabilité négligeable sur 8 caractères hexadécimaux, cf. Dev Notes) — si elle survenait, l'insert échoue simplement et remonte `friendlyErrorMessage()` comme n'importe quelle autre erreur ; ne pas la confondre avec un bug pendant la vérification manuelle

### Review Findings

**Patch:**

- [x] [Review][Patch] État `partieLancee` unique dans `BibliothequeScreen` — relancer une 2e grille pendant que le lien de la 1ère est encore affiché fait disparaître le lien de la 1ère de l'écran (le lien reste valide côté serveur, mais l'utilisateur perd sa seule copie visible). Passé à `liensPartie: Record<string, string>` (clé = `grille.id`) et `liensCopies: Set<string>` pour le libellé "copié", au lieu d'un objet/booléen uniques [src/features/bibliotheque/BibliothequeScreen.tsx]
- [x] [Review][Patch] Les deux panneaux "partie lancée" sont stylés différemment entre les deux écrans (`--color-paper-bg` vs `--color-paper-card`, padding et rotation différents) — `.grille-list__partie` aligné sur `--color-paper-card`, `padding: var(--space-3)` et `transform: rotate(0.4deg)`, cohérent avec `.creation-grille-screen__partie` [src/features/bibliotheque/BibliothequeScreen.css]

**Deferred:**

- [x] [Review][Defer] La policy `select` sur `parties` ne couvre que le créateur — un futur Joueur/invité qui ouvre le lien partagé ne pourra pas relire l'état de la partie via cette policy seule [supabase/migrations/20260708115501_lancer_partie.sql:15-18] — deferred, explicitement à la charge de la Story 2.2 (déjà noté dans les Dev Notes de cette story)
- [x] [Review][Defer] Pas de garde `ignore` dans `handleLancerPartie`/`handleRelancer` contre un démontage du composant pendant l'appel réseau [src/features/creation-grille/CreationGrilleScreen.tsx:228-250, src/features/bibliotheque/BibliothequeScreen.tsx:192-218] — deferred, même pattern déjà accepté pour `handleDupliquer` en Story 1.4
- [x] [Review][Defer] Erreurs Supabase non loggées (`error` ignoré, seul un message générique est affiché) [src/features/bibliotheque/BibliothequeScreen.tsx:204, src/features/creation-grille/CreationGrilleScreen.tsx:238] — deferred, pattern pré-existant déjà différé dans toutes les stories précédentes
- [x] [Review][Defer] Collision d'unicité sur `code_partie` sans retry automatique côté client [supabase/migrations/20260708115501_lancer_partie.sql:6] — deferred, probabilité négligeable sur 8 caractères hexadécimaux, déjà noté et accepté au Task 4 de cette story
- [x] [Review][Defer] Double-clic sur "Copier le lien" dans la fenêtre de 2 secondes réinitialise prématurément l'état "Lien copié !" [src/features/bibliotheque/BibliothequeScreen.tsx:220-227, src/features/creation-grille/CreationGrilleScreen.tsx:252-259] — deferred, cosmétique mineur
- [x] [Review][Defer] Course théorique entre une modification de `taille` et un insert `parties` non encore commité dans une transaction concurrente [supabase/migrations/20260708115501_lancer_partie.sql:34-46] — deferred, non atteignable via l'UI actuelle (les deux actions viennent du même compte créateur et le CTA se désactive pendant l'appel), risque négligeable à l'échelle de ce projet (SM-C1)
- [x] [Review][Defer] Pas de confirmation accessible (`aria-live`) pour l'action "Copier le lien" [src/features/bibliotheque/BibliothequeScreen.tsx:220-227, src/features/creation-grille/CreationGrilleScreen.tsx:252-259] — deferred, même catégorie de dette d'accessibilité déjà différée ailleurs (Story 1.2)
- [x] [Review][Defer] Le panneau "partie lancée" n'a pas de bouton pour le fermer ou rappeler le lien une fois affiché [src/features/creation-grille/CreationGrilleScreen.tsx:328-338, src/features/bibliotheque/BibliothequeScreen.tsx:280-286] — deferred, amélioration UX non requise par les AC de cette story

**Dismissed:**

- Pas de vérification serveur que la grille est "validée" avant de créer une partie — décision explicite documentée dans les Dev Notes de cette story, cohérente avec le même choix déjà fait dans les Stories 1.2 à 1.5 (jamais imposé côté base).
- Valeur d'enum `terminee` non atteignable depuis cette story (aucune logique de clôture) — hors périmètre explicitement assumé (Story 2.5) ; conception de schéma tournée vers l'avenir plutôt que du scope creep.
- Aucune limite ni invalidation sur les relances successives (chaque lien généré reste actif indéfiniment) — comportement voulu et documenté (EXPERIENCE.md UJ-3, Dev Notes de cette story).
- Duplication de `construireLienPartie`/`PartieLancee`/`handleCopierLien` entre les deux écrans — décision explicite des Dev Notes/Task 3, cohérente avec la convention déjà établie du projet (petits helpers dupliqués plutôt que hook partagé prématuré).
- `construireLienPartie` utilise uniquement `window.location.origin` (pas de base path) — aucune indication que l'app sera servie ailleurs qu'à la racine d'un domaine Vercel (AD-4), cohérent avec le reste de l'app qui ne gère pas non plus de sous-chemin.
- Le trigger de verrouillage ne bloque que `taille`, pas le contenu des phrases — comportement explicitement voulu par l'AC2 ("le texte des phrases reste modifiable"), pas une lacune.
- Changement de layout sur la classe CSS partagée `.grille-list__item` — vérifié par recherche dans tout le code : cette classe n'est utilisée qu'à un seul endroit (ce même fichier), aucun autre consommateur à casser.

## Dev Notes

- **Portée volontairement étroite** : cette story ne construit ni `joueurs`/`cases` ni la fonction `rejoindre_partie` (AD-9, Story 2.2), ni la détection de victoire (AD-3, Story 2.4), ni la clôture de partie (`parties.statut` → `terminee`, Story 2.5), ni aucun écran "Rejoindre une partie" ou "Grille en direct". Elle s'arrête à la création de la Partie et à l'affichage du lien généré — la Story 2.2 est celle qui donnera un sens réel au lien (rejoindre effectivement la partie).
- **Décision de forme du lien** : `${window.location.origin}?partie=${code_partie}` — un paramètre de requête, pas de route dédiée, car aucune librairie de routing n'existe dans l'app (`App.tsx` bascule entre écrans via un état React local, cf. AD-2/Structural Seed et Dev Notes de la Story 1.2 : "poursuivre ce pattern plutôt qu'introduire `react-router`"). Cette convention est posée ici faute d'alternative existante et **devra être lue par la Story 2.2** au chargement de l'app pour rediriger un invité directement vers "Rejoindre une partie" (EXPERIENCE.md, IA) — à ne pas réinventer sous une autre forme dans cette story suivante.
- **Angle mort à connaître pour la Story 2.2** : la policy `select` de cette story sur `parties` ne couvre que le créateur (propriétaire de la grille). Un futur Joueur (créateur y compris une fois qu'il a rejoint sa propre partie, ou tout invité) n'aura aucun moyen de relire l'état de la partie via cette policy seule — la Story 2.2 devra ajouter l'accès en lecture nécessaire (probablement via la fonction `rejoindre_partie` `SECURITY DEFINER`, ou une policy `select` élargie aux `joueurs` de la partie une fois cette table créée). Ne pas partir du principe que la policy actuelle suffit déjà pour la suite.
- **`code_partie` généré par défaut de colonne**, jamais par le client — 8 caractères hexadécimaux dérivés d'un `gen_random_uuid()`, cohérent avec `compte_id default auth.uid()` (Story 1.2) : le client n'insère que `{ grille_id }`.
- **Première fonction `SECURITY DEFINER` du projet** : `empecher_modification_taille_si_partie_lancee()`. Poser `set search_path = public` (bonne pratique Postgres/Supabase pour ce type de fonction) — les futures fonctions `SECURITY DEFINER` de la spine (`rejoindre_partie` en 2.2, détection de victoire en 2.4) devraient suivre le même réflexe.
- **Pas de vérification serveur que la grille est "validée" (pool complet)** avant de créer une partie — cohérent avec le choix déjà fait dans les Stories 1.2 à 1.5 de ne jamais stocker/contraindre "validée" côté base (état dérivé côté client uniquement). Le CTA "Lancer la Partie"/"Relancer" n'apparaît de toute façon que lorsque `complete`/`validee` est vrai côté client — pas une régression introduite ici, une continuité assumée.
- **"Relancer" toujours disponible sur une grille validée**, sans condition sur une partie déjà active pour cette grille — relancer plusieurs fois la même grille est un chemin valide (EXPERIENCE.md, UJ-3), chaque lancement crée une nouvelle ligne `parties` indépendante. Pas de bannière de rappel de partie en cours ici (FR-14, Story 2.5).
- **Aucune nouvelle policy DELETE** sur `parties` — pas de fonctionnalité de suppression demandée (même raisonnement YAGNI que `grilles`/`phrases`, Story 1.2).
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API directs, comme toutes les stories précédentes.

### Previous Story Intelligence (Stories 1.2, 1.4, 1.5)

- `friendlyErrorMessage()`, le pattern `try/catch/finally` avec état `pending`, et la désactivation du bouton concerné pendant l'opération sont identiques dans tout le projet depuis la Story 1.1 — les reproduire sans variation dans les deux écrans touchés ici.
- Le pattern `Set<string>` pour suivre plusieurs opérations concurrentes par grille (`dupliquantIds`, Story 1.4) est directement réutilisable pour `lancementIds` — ne pas revenir à un id unique qui bloquerait deux lancements concurrents sur deux grilles différentes.
- `BibliothequeScreen.tsx` contient déjà le chargement des grilles avec `taille` (Story 1.4) et le calcul dérivé de `validee` (Story 1.5) — aucune nouvelle requête de chargement nécessaire, seulement une nouvelle action sur les grilles déjà en mémoire.
- Contrairement à `handleDupliquer` (Story 1.4), pas besoin de suppression compensatoire en cas d'échec partiel : la création d'une partie est une seule opération d'insertion (`{ grille_id }`), pas une séquence multi-étapes pouvant laisser une ligne orpheline.
- Rappel Story 1.2 (Dev Notes) : "Le verrouillage de la taille après lancement d'une partie (FR-5) n'a pas de sens tant que `parties` n'existe pas — sera traité en Story 2.1." — c'est cette story.

### Project Structure Notes

```
bingo/
  src/
    features/
      creation-grille/         # MODIFIÉ — CTA "Lancer la Partie" + panneau lien (ComposerPhrases)
      bibliotheque/             # MODIFIÉ — action "Relancer" à côté de "Dupliquer"
  supabase/
    migrations/
      <timestamp>_lancer_partie.sql   # NOUVEAU — table parties, enum statut, RLS, trigger de verrouillage de taille
```

Aligné sur la Structural Seed de la spine (ERD : table `parties` déjà prévue). Aucun nouveau dossier de feature — pas d'écran dédié pour cette story (le lien s'affiche en place sur les écrans existants).

Aucune variance connue à date.

### References

- [Source: epics.md#Story 2.1: Lancer une partie et obtenir un lien]
- [Source: prd.md#FR-5 : Lancement de partie, #FR-7 : Génération du lien de partie, #FR-18 : Relance d'une grille existante]
- [Source: ARCHITECTURE-SPINE.md#AD-2 — pas de librairie de routing, #AD-8 — RLS, #Consistency Conventions — `parties.statut` en enum Postgres, #ERD (table `parties`)]
- [Source: EXPERIENCE.md#Component Patterns — CTA principal, #State Patterns — Grille validée partie non lancée (actions "Relancer"/"Dupliquer"), #Key Flows UJ-1, UJ-3]
- [Source: DESIGN.md#Components — `cta-primary`/`cta-secondary`]
- [Source: 1-2-creer-une-grille.md#Dev Notes — verrouillage de taille différé à cette story ; bug GRANT manquant après activation RLS]
- [Source: 1-4-dupliquer-une-grille.md#Dev Agent Record — pattern `Set<string>` pour opérations concurrentes par grille]
- [Source: 1-5-consulter-sa-bibliotheque-de-grilles.md#Tasks — chargement de `taille` et calcul de `validee` déjà en place]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Docker/Supabase local non démarré en début de session (containers arrêtés) — utilisateur sollicité pour démarrer Docker (`sudo service docker start`), instance déjà présente (containers créés lors d'une session précédente) et repartie normalement ensuite, `npx supabase migration up` appliqué sans `db reset` (préserve `admin@test.com`).
- Vérification par appels directs à l'API REST Supabase (E2E navigateur toujours indisponible dans ce sandbox, même limite que toutes les stories précédentes), avec le compte `admin@test.com` et une grille de test résiduelle 3×3 déjà validée ("test", trouvée pré-existante en base — non créée par cette story, laissée en place, seul son `nom` a été temporairement modifié puis restauré pour le test de verrouillage).
- Séquence reproduisant `handleLancerPartie`/`handleRelancer` : deux `POST /rest/v1/parties` successifs sur la même grille → deux lignes distinctes, `code_partie` de 8 caractères hexadécimaux différents, `statut = 'en_cours'` par défaut dans les deux cas.
- Verrou de taille (trigger) : `PATCH /rest/v1/grilles` sur `taille` après création d'une partie → `400` avec le message d'exception Postgres attendu (`empecher_modification_taille_si_partie_lancee`) ; `PATCH` sur `nom` de la même grille → `200`, accepté (confirme que le verrou ne porte que sur `taille`).
- Isolation RLS : création d'un 2e compte de test (`autre-story21@test.com`, auth par mot de passe, pas de vérification email requise en local) tentant un `POST /rest/v1/parties` avec le `grille_id` du 1er compte → `403 new row violates row-level security policy for table "parties"`.
- Nettoyage après vérification : les deux lignes `parties` de test supprimées directement via `psql` dans le conteneur `supabase_db_bmad` (aucune policy DELETE côté REST, cohérent avec la portée de cette story) ; le compte `autre-story21@test.com` supprimé (`delete from auth.users`) ; le `nom` de la grille résiduelle restauré à `"test"`.

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- Migration `supabase/migrations/20260708115501_lancer_partie.sql` : enum `partie_statut`, table `parties` (`code_partie` généré côté serveur, `statut` par défaut `en_cours`), RLS (select/insert scopés au créateur via la grille), `GRANT` pour `authenticated`, et trigger `SECURITY DEFINER` (`search_path = ''`) verrouillant `grilles.taille` dès qu'une partie existe pour cette grille. Appliquée via `supabase migration up` (données existantes préservées).
- `CreationGrilleScreen.tsx` (`ComposerPhrases`) : CTA "Lancer la Partie" affiché une fois la grille complète, panneau "partie lancée" (lien sélectionnable + bouton "Copier le lien") affiché à la place du CTA après succès, pattern `pending`/`friendlyErrorMessage()` identique au reste du projet.
- `BibliothequeScreen.tsx` : bouton "Relancer" ajouté avant "Dupliquer" sur les grilles validées (état `lancementIds: Set<string>` pour ne désactiver que le bouton concerné), panneau "partie lancée" affiché dans la ligne de la grille concernée après succès.
- Convention posée pour la Story 2.2 : lien de partie = `${window.location.origin}?partie=${code_partie}` (pas de route dédiée, aucune librairie de routing dans le projet) ; angle mort RLS documenté (la policy `select` actuelle sur `parties` ne couvre que le créateur, pas encore les Joueurs/invités).
- Vérification : deux lancements successifs sur la même grille produisent deux `code_partie` distincts, verrouillage de `taille` confirmé (rejeté) tout en laissant `nom` modifiable, isolation RLS confirmée avec un 2e compte. `npm run build`/`npm run lint` passent sans erreur.
- Données de test créées pendant la vérification (2 lignes `parties`, compte `autre-story21@test.com`) nettoyées après coup ; la grille résiduelle "test" pré-existante (non créée par cette story) laissée intacte, son `nom` restauré à l'identique.

### File List

- `supabase/migrations/20260708115501_lancer_partie.sql` (nouveau)
- `src/features/creation-grille/CreationGrilleScreen.tsx` (modifié — CTA "Lancer la Partie", panneau lien, `handleLancerPartie`/`handleCopierLien`)
- `src/features/creation-grille/CreationGrilleScreen.css` (modifié — styles du panneau "partie lancée")
- `src/features/bibliotheque/BibliothequeScreen.tsx` (modifié — action "Relancer", panneau lien par grille, `handleRelancer`/`handleCopierLien`)
- `src/features/bibliotheque/BibliothequeScreen.css` (modifié — styles de la ligne d'actions et du panneau "partie lancée")

## Change Log

- 2026-07-08 : Implémentation complète (Tasks 1 à 4) — migration `parties` (enum `statut`, RLS, trigger de verrouillage de taille `SECURITY DEFINER`), CTA "Lancer la Partie" depuis la composition de phrases, action "Relancer" depuis la Bibliothèque, affichage/copie du lien de partie généré. Vérifié via appels API directs (deux lancements distincts, verrou de taille, isolation RLS). Statut passé à "review".
- 2026-07-08 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 2 patches appliqués (état de lien de partie/état "copié" passés d'un objet unique à un état par grille dans `BibliothequeScreen`, panneaux "partie lancée" alignés visuellement entre les deux écrans), 8 points différés (voir `deferred-work.md`), 7 signalements écartés (choix explicitement documentés dans cette story ou faux positifs vérifiés). `npm run build`/`npm run lint` revérifiés après correctifs. Statut passé à "done".
