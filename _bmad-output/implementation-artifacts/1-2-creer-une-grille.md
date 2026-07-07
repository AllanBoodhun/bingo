---
baseline_commit: NO_VCS
---

# Story 1.2: Créer une grille

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur connecté,
I want créer une grille en choisissant sa taille et en la nommant,
so that je prépare un nouveau jeu à phrases personnalisées.

## Acceptance Criteria

1. **Given** je suis connecté
   **When** je choisis "Nouvelle grille", sélectionne une taille via les chips (3×3 à 8×8) et saisis un nom
   **Then** une nouvelle grille est créée et associée à mon compte

2. **Given** une grille en cours de création
   **When** je saisis mes phrases une à une
   **Then** un compteur affiche "X / N²" et la grille n'est validée que lorsque le nombre de phrases égale exactement N×N (FR-1)

   **And** le champ de phrase suit le pattern "tap pour éditer en place", pas d'écran séparé (UX-DR5)
   **And** le sélecteur de taille utilise les chips du design system : bordure pointillée à l'état inactif, fond terracotta plein à l'état actif (UX-DR2)

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — tables `grilles` et `phrases` + RLS (AC: #1, #2)
  - [x] Générer le fichier via `supabase migration new grilles_phrases` (nomme automatiquement `supabase/migrations/<timestamp>_grilles_phrases.sql`)
  - [x] Table `grilles` : `id uuid primary key default gen_random_uuid()`, `compte_id uuid not null references auth.users(id) on delete cascade`, `nom text not null check (char_length(trim(nom)) > 0)`, `taille int not null check (taille between 3 and 8)`, `created_at timestamptz not null default now()`
  - [x] Table `phrases` : `id uuid primary key default gen_random_uuid()`, `grille_id uuid not null references grilles(id) on delete cascade`, `texte text not null check (char_length(trim(texte)) > 0)`, `created_at timestamptz not null default now()`
  - [x] `alter table grilles enable row level security;` et idem pour `phrases`
  - [x] Policies `grilles` (select/insert/update) scoped à `compte_id = auth.uid()` — voir AD-8. Pas de policy DELETE (aucune suppression de grille demandée en v1)
  - [x] Policies `phrases` (select/insert/update) scoped via `exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())` (AD-8 : le Créateur modifie `phrases.texte` à tout moment). Pas de policy DELETE
  - [x] Appliquer avec `supabase migration up` (**pas** `supabase db reset` — voir Dev Notes) puis vérifier tables/policies dans Studio (http://127.0.0.1:64323)

- [x] Task 2: Écran "Nouvelle grille" — nom + taille (AC: #1, #4)
  - [x] Créer `src/features/creation-grille/CreationGrilleScreen.tsx` + `.css`
  - [x] Formulaire : champ nom (texte libre, requis) + sélecteur de taille en chips (3×3 à 8×8) ; chip inactif = bordure pointillée `--color-line`, chip actif = fond `--color-terracotta` plein, texte `--color-paper-card` (DESIGN.md `components` — sélecteur de taille)
  - [x] Au submit : `supabase.from('grilles').insert({ compte_id: session.user.id, nom, taille }).select().single()`, puis transition vers la composition des phrases pour cette grille (garder l'`id` retourné) — gérer l'erreur (try/catch, message convivial, pas de code brut — cf. `friendlyErrorMessage` de Story 1.1)

- [x] Task 3: Composition des phrases (AC: #2, #3)
  - [x] Une fois la grille créée, afficher un compteur "X / N²" (N = `taille` de la grille), recalculé à chaque phrase ajoutée
  - [x] Champ d'ajout de phrase (saisie + validation Entrée/bouton) → `supabase.from('phrases').insert({ grille_id, texte })`
  - [x] Liste des phrases déjà ajoutées (ordre d'insertion), chacune éditable en place au tap (UX-DR5, pas d'écran séparé) → `supabase.from('phrases').update({ texte }).eq('id', phraseId)`
  - [x] Pas de suppression de phrase (hors AC — uniquement ajout et correction de texte)
  - [x] "Grille validée" = état dérivé (`nombre de phrases === taille²`), pas de colonne stockée — voir Dev Notes

- [x] Task 4: Navigation depuis la Bibliothèque (AC: #1)
  - [x] Ajouter un CTA "Nouvelle grille" (`cta-primary`) dans `BibliothequeScreen.tsx`
  - [x] `App.tsx` : ajouter un état d'écran (ex. `'bibliotheque' | 'creation-grille'`) pour basculer entre les deux, cohérent avec le pattern de navigation en pile déjà en place (pas de librairie de routing, cf. AD-2 / Structural Seed)
  - [x] Retour vers la Bibliothèque possible à tout moment depuis l'écran de création (la grille est déjà persistée au fil de l'eau, aucune perte)

- [x] Task 5: Vérification manuelle (AC: #1, #2, #3, #4)
  - [x] `npm run build` réussit (et `npm run lint` sans erreur)
  - [x] Créer une grille 3×3 nommée, ajouter 9 phrases une à une : le compteur passe de "0 / 9" à "9 / 9" — vérifié via appels directs à l'API REST Supabase (voir Debug Log, E2E navigateur indisponible dans ce sandbox)
  - [x] Éditer une phrase déjà ajoutée, vérifier que le nouveau texte est bien persisté — vérifié via `PATCH /rest/v1/phrases` puis relecture en base (le "rechargement de page" littéral n'a pas de sens ici : aucune surface ne permet de rouvrir une grille en cours de composition avant la Story 1.5, voir Debug Log)
  - [x] Vérifier dans Studio/psql que les policies RLS de `grilles`/`phrases` sont bien actives et scopées à `compte_id`/`auth.uid()` — confirmé, et complété par un test d'isolation avec un 2e compte (lecture/écriture croisée refusées)
  - [x] Contraintes vérifiées : `taille` hors 3-8 et `nom`/`texte` vides rejetés par la base (check constraints)

### Review Findings

**Patch:**

- [x] [Review][Patch] Aucun plafond réel sur l'ajout de phrases — le formulaire "Ajouter la phrase" reste actif même une fois `phrases.length === total` ; en usage normal (un clic de trop), le nombre de phrases dépasse N² et la grille ne peut plus jamais redevenir "exactement N×N" (AC2/FR-1), sans aucun moyen de suppression pour corriger. Désactiver le formulaire d'ajout dès que `complete` est vrai [src/features/creation-grille/CreationGrilleScreen.tsx — ComposerPhrases]
- [x] [Review][Patch] Double sauvegarde d'une phrase éditée — `onKeyDown` (Entrée → `saveEdit`) et `onBlur` (→ `saveEdit`) peuvent tous deux se déclencher pour la même édition (l'unmount du input après Entrée peut générer un blur), envoyant deux `UPDATE` pour la même phrase. Sur Entrée, déclencher un blur (`event.currentTarget.blur()`) plutôt qu'appeler `saveEdit` directement, pour n'avoir qu'un seul chemin de sauvegarde [src/features/creation-grille/CreationGrilleScreen.tsx:283-289]
- [x] [Review][Patch] Course sur `setEditingId(null)` dans `saveEdit` — si l'utilisateur clique sur une autre phrase pendant qu'une sauvegarde précédente est encore en vol, la résolution tardive de l'ancienne `saveEdit` referme l'édition de la nouvelle phrase en cours. Utiliser `setEditingId((current) => (current === id ? null : current))` [src/features/creation-grille/CreationGrilleScreen.tsx:250-256]
- [x] [Review][Patch] Aucune limite de longueur sur `nom`/`texte`, ni côté client ni en base — ajouter une contrainte `check` de longueur max en SQL et `maxLength` sur les champs correspondants [supabase/migrations/20260707202115_grilles_phrases.sql, src/features/creation-grille/CreationGrilleScreen.tsx]
- [x] [Review][Patch] Aucune prévention des phrases en double dans une même grille — ajouter une contrainte `unique (grille_id, texte)` [supabase/migrations/20260707202115_grilles_phrases.sql]
- [x] [Review][Patch] `compte_id` envoyé par le client à l'insert plutôt que défini par défaut côté serveur — repose uniquement sur la policy RLS pour empêcher l'usurpation ; défense en profondeur en passant la colonne à `default auth.uid()` et en ne l'envoyant plus depuis le client [supabase/migrations/20260707202115_grilles_phrases.sql, src/features/creation-grille/CreationGrilleScreen.tsx]
- [x] [Review][Patch] Pas d'index sur `phrases.grille_id` — colonne de clé étrangère non indexée automatiquement par Postgres, pourtant utilisée dans toutes les policies RLS (`EXISTS ... where g.id = phrases.grille_id`) ; ajouter `create index` [supabase/migrations/20260707202115_grilles_phrases.sql]

**Deferred:**

- [x] [Review][Defer] `grilles.taille` reste modifiable via l'API après que des phrases ont été ajoutées (aucune UI ne l'expose, mais la policy RLS `update` ne le restreint pas) — le verrouillage réel (FR-5) dépend de l'existence de `parties`, introduite en Story 2.1 [supabase/migrations/20260707202115_grilles_phrases.sql] — deferred, dépend de Story 2.1
- [x] [Review][Defer] Une édition de phrase non confirmée est perdue si on clique "Retour à la Bibliothèque" pendant l'édition — pas de perte de données déjà persistées, juste la correction en cours [src/features/creation-grille/CreationGrilleScreen.tsx] — deferred, UX mineure
- [x] [Review][Defer] Messages d'erreur génériques sans log de l'erreur réelle — même pattern déjà accepté en Story 1.1 [src/features/creation-grille/CreationGrilleScreen.tsx] — deferred, observabilité, priorité basse
- [x] [Review][Defer] État `pending` partagé entre ajout et édition de phrase (pas de flags séparés par opération) — désynchronisation UI mineure possible en cas d'actions concurrentes, peu probable en usage mobile normal [src/features/creation-grille/CreationGrilleScreen.tsx] — deferred, priorité basse
- [x] [Review][Defer] Pas de région `aria-live` sur le compteur "X/N²" ni le message de complétion — amélioration accessibilité non couverte explicitement par le plancher d'EXPERIENCE.md [src/features/creation-grille/CreationGrilleScreen.tsx] — deferred, amélioration a11y
- [x] [Review][Defer] Pas de reprise d'une grille en cours de composition après navigation (chaque passage par "Nouvelle grille" recrée une ligne) — dépend de la Bibliothèque (liste des grilles), Story 1.5 [src/features/creation-grille/CreationGrilleScreen.tsx] — deferred, dépend de Story 1.5

**Dismissed:**

- Absence de policy DELETE sur `grilles`/`phrases` malgré les FK `on delete cascade` — décision explicite des Dev Notes (pas de fonctionnalité de suppression demandée, YAGNI), pas un oubli.
- Absence de colonne `updated_at` — non requise par un FR/AC actuel.
- Ambiguïté `.single()` entre "0 ligne" et "plusieurs lignes" — déjà traitée de façon uniforme et sûre par le catch-all `error || !data` existant.
- Double-soumission rapide du formulaire "Créer la grille" créant potentiellement 2 grilles — déjà atténué par le `disabled={pending}` existant ; une contrainte unique serait inappropriée (casserait la duplication légitime de noms via "Dupliquer", Story 1.4).
- Contrainte `unique (compte_id, nom)` suggérée — pas une règle produit demandée, casserait la duplication légitime de grilles.
- Contournement du `nom` vide via soumission Entrée malgré le bouton désactivé — même si atteint, protégé par la contrainte `check` en base (conséquence bénigne : message générique, pas de corruption).

## Dev Notes

- **Portée volontairement étroite** : ne pas créer `parties`/`joueurs`/`cases` ici (Epic 2). Le verrouillage de la taille après lancement d'une partie (FR-5) n'a pas de sens tant que `parties` n'existe pas — sera traité en Story 2.1.
- **Pas de colonne "validée" sur `grilles`** : l'état "grille validée" (pool complet) est dérivé en comptant les `phrases` par `grille_id` et en comparant à `taille × taille`, jamais stocké — cohérent avec l'ERD de la spine qui ne liste pas ce champ sur `GRILLES`.
- **Pas de colonne `position` sur `phrases`** : l'ordre d'affichage pendant la composition suit l'ordre d'insertion (`created_at`). La position figée dans une grille distribuée à un joueur appartient à la table `cases` (Epic 2, AD-6), jamais à `phrases`.
- **RLS (AD-8)** : le Créateur lit/crée/modifie uniquement ses propres `grilles` (`compte_id = auth.uid()`) et le texte de ses `phrases` (via `EXISTS` sur la grille parente). Aucune policy DELETE sur les deux tables — pas de fonctionnalité de suppression demandée (ne pas l'ajouter par anticipation).
- **Chips affichées une seule fois** : le sélecteur de taille n'apparaît qu'à l'étape "Nouvelle grille" (nom + taille), pas sur l'écran de composition des phrases qui suit — évite l'ambiguïté d'un changement de taille après des phrases déjà saisies, non traité par les AC/FR de cette story ni par le PRD/la spine.
- **Nomenclature française imposée par la spine** : tables/colonnes `grilles`, `phrases`, `compte_id`, `nom`, `taille`, `texte` — ne pas traduire en anglais.
- **Ne pas réutiliser `Button` pour les chips** : un chip est un contrôle de sélection (état actif/inactif), pas une action déclenchante comme `cta-primary`/`cta-secondary` — construire un petit composant/markup dédié dans `creation-grille/`, pas de nouveau composant partagé tant qu'il n'est utilisé qu'ici (pas d'abstraction prématurée).
- **Migration locale** : utiliser `supabase migration up` pour appliquer sans perdre les données existantes. Un `supabase db reset` recrée la base depuis les migrations + `seed.sql` et **supprimerait** le compte de test `admin@test.com` créé manuellement en Story 1.1 (il n'est pas dans `seed.sql`) — si un reset est malgré tout nécessaire, recréer le compte ensuite (voir README.md § Compte de test).
- Aucun framework de test imposé (SM-C1, projet personnel) — vérification manuelle suffisante, comme en Story 1.1.

### Previous Story Intelligence (Story 1.1)

- Client Supabase (`src/lib/supabase/client.ts`) et tokens design (`src/styles/tokens.css`) déjà en place — importer, ne pas dupliquer ni réinstancier.
- Pattern de navigation établi dans `App.tsx` : bascule de composant selon un état React local (pas de librairie de routing) — poursuivre ce pattern plutôt qu'introduire `react-router`.
- Revue de code de la Story 1.1 a corrigé plusieurs manques à reproduire ici : envelopper tout appel Supabase asynchrone en `try/catch/finally`, désactiver les boutons pendant une requête en cours (`pending`/`disabled`), ne jamais laisser une erreur réseau silencieuse (toujours un message ou un état géré).
- `Makefile` (`make up`/`make down`/`make status`/`make reset`) centralise le lancement local — voir README.md.

### Project Structure Notes

```
bingo/
  src/
    features/
      creation-grille/         # NOUVEAU — cette story (FR-1, FR-2)
        CreationGrilleScreen.tsx
        CreationGrilleScreen.css
      bibliotheque/             # MODIFIÉ — ajout du CTA "Nouvelle grille"
      auth/                      # inchangé (Story 1.1)
    lib/
      supabase/                  # inchangé, client réutilisé
  supabase/
    migrations/
      <timestamp>_grilles_phrases.sql   # NOUVEAU
```

Aligné sur la Structural Seed de la spine (dossier `src/features/creation-grille/` déjà prévu par l'architecture).

Aucune variance connue à date.

### References

- [Source: epics.md#Story 1.2: Créer une grille]
- [Source: prd.md#FR-1 : Création de grille, #FR-2 : Nommage de grille]
- [Source: ARCHITECTURE-SPINE.md#AD-6, #AD-8, #Structural Seed, #ERD (tables grilles/phrases)]
- [Source: DESIGN.md#Components — sélecteur de taille (chips), #Shapes]
- [Source: EXPERIENCE.md#Component Patterns — Sélecteur de taille (chips), Champ de phrase ; #State Patterns — Grille incomplète]
- [Source: 1-1-mise-en-place-du-projet-et-creation-de-compte.md#Review Findings — patterns d'erreur/pending à reproduire]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx playwright install chromium` / `--with-deps` : échec, `libnspr4.so` manquant et pas de sudo sans mot de passe dans ce sandbox — vérification E2E navigateur (façon Story 1.1) impossible ici. Contournement : vérification par appels directs à l'API REST Supabase (`/rest/v1/grilles`, `/rest/v1/phrases`) avec le token d'un vrai utilisateur (`admin@test.com`), reproduisant exactement les appels que fait le code React (`supabase.from(...).insert/update/select`).
- Bug détecté et corrigé pendant la vérification : la migration initiale activait RLS et créait les policies mais n'accordait aucun privilège Postgres (`GRANT`) au rôle `authenticated` sur `grilles`/`phrases` — RLS filtre les lignes mais ne remplace pas le système de privilèges ; sans `GRANT`, PostgREST renvoyait `permission denied for table grilles` avant même d'évaluer les policies. Corrigé en ajoutant `grant select, insert, update on grilles/phrases to authenticated;` à la fin de la même migration (`20260707202115_grilles_phrases.sql`), puis appliqué manuellement sur l'instance locale déjà migrée (évite un `db reset` qui aurait supprimé le compte de test).
- La vérification "recharger la page" de la tâche 5 a été adaptée : il n'existe aucune surface (avant la Story 1.5) permettant de rouvrir une grille en cours de composition après un rechargement ; la persistance a donc été vérifiée par relecture directe via l'API (`GET /rest/v1/phrases`) plutôt que par un rechargement de l'écran React.
- Vérification visuelle des chips (bordure pointillée → fond terracotta) faite par relecture du CSS (`size-chip--active` applique `--color-terracotta`/`--color-paper-card`, conforme à DESIGN.md) plutôt que par capture d'écran navigateur, pour la même raison d'indisponibilité de Chromium dans ce sandbox.

### Completion Notes List

- Toutes les tasks (1 à 5) implémentées et vérifiées.
- Migration `supabase/migrations/20260707202115_grilles_phrases.sql` : tables `grilles`/`phrases`, contraintes (`taille` 3-8, `nom`/`texte` non vides), RLS + policies + grants pour `authenticated`. Appliquée via `supabase migration up` (données existantes préservées).
- Écran `CreationGrilleScreen` (nom + chips de taille, puis composition des phrases avec compteur "X/N²" et édition en place) accessible depuis un nouveau CTA "Nouvelle grille" dans `BibliothequeScreen`, routé via un état d'écran simple dans `App.tsx` (pas de librairie de routing, cohérent avec la Story 1.1).
- Vérification : insert/update via API REST avec un compte réel, isolation RLS confirmée avec un 2e compte (lecture et écriture croisées toutes deux refusées), contraintes `taille`/`nom` rejetées comme attendu. `npm run build` et `npm run lint` passent sans erreur.
- Données de test créées pendant la vérification (grille "Bingo API test", compte "autre@test.com") nettoyées après coup.

### File List

- `supabase/migrations/20260707202115_grilles_phrases.sql` (nouveau)
- `src/features/creation-grille/CreationGrilleScreen.tsx` (nouveau)
- `src/features/creation-grille/CreationGrilleScreen.css` (nouveau)
- `src/features/bibliotheque/BibliothequeScreen.tsx` (modifié — CTA "Nouvelle grille")
- `src/App.tsx` (modifié — état d'écran `bibliotheque`/`creation-grille`)

## Change Log

- 2026-07-07 : Implémentation complète (Tasks 1 à 5) — migration `grilles`/`phrases` + RLS, écran de création (nom, chips de taille), composition des phrases (compteur, édition en place), navigation depuis la Bibliothèque. Statut passé à "review".
- 2026-07-07 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 7 patches appliqués (plafond sur l'ajout de phrases une fois complète, correction de la double-sauvegarde Entrée/blur, garde anti-course sur `setEditingId`, limites de longueur `nom`/`texte`, contrainte d'unicité `(grille_id, texte)`, `compte_id` par défaut côté serveur, index sur `phrases.grille_id`), 6 points différés (voir `deferred-work.md`). Migration locale resynchronisée (tables vides, recréées proprement). `npm run build`/`npm run lint` et vérification API revérifiés après correctifs. Statut passé à "done".
