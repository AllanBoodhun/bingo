---
baseline_commit: d00e67f
---

# Story 2.8: Jouer seul, sans inviter personne

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur,
I want lancer une partie et y jouer seul, sans inviter personne,
so that je peux profiter du jeu même sans autres joueurs disponibles, sans attendre ni forcer une invitation.

## Acceptance Criteria

1. **Given** une grille validée m'appartenant
   **When** je lance une partie et la rejoins comme seul joueur
   **Then** je peux cocher mes cases, être détecté vainqueur, et clôturer la partie exactement comme dans une partie à plusieurs — aucune étape n'exige d'attendre ou d'inviter d'autres joueurs (FR-20)

2. **Given** je suis seul dans la partie
   **When** je consulte l'écran Grille en direct
   **Then** aucun message n'indique une attente de joueurs supplémentaires ; la pile d'avatars affiche uniquement moi-même

3. **And** FR-8 est reformulé en conséquence : une Partie accepte entre 1 et 6 joueurs, créateur inclus — le minimum de 1 rend le jeu solo explicitement valide, pas un cas limite accidentel

## Tasks / Subtasks

- [x] Task 1: Auditer le code existant pour confirmer que rien ne bloque ni ne suggère une attente d'autres joueurs (AC: #1, #2, #3)
  - [x] **Point de départ important** : contrairement aux stories précédentes de cet epic, cette story n'ajoute quasiment certainement **aucune nouvelle fonctionnalité**. FR-20 a été ajouté après revue du PRD (2026-07-04, *avant* le début de l'implémentation de l'Epic 2) et l'epic lui-même énonce déjà "Jouer seul, sans inviter personne, est un chemin valide au même titre qu'une partie à plusieurs" (`epics.md#Epic 2`) — chaque story 2.1 à 2.7 a donc été conçue sans notion de nombre minimum de joueurs. Cette story est un **audit de confirmation**, dans l'esprit de la Story 2.7 (qui a trouvé un seul gouffre concret plutôt que de tout reconstruire) — mais il est tout à fait possible qu'aucun gouffre n'existe ici. Ne pas construire de nouvelle UI ou de nouveau message par anticipation d'un besoin non confirmé par la lecture du code.
  - [x] Vérifier `supabase/migrations/20260708200136_rejoindre_partie.sql` (fonction `rejoindre_partie`, lignes ~138-139) : seule une borne haute (`v_nb_joueurs >= 6`) est vérifiée avant insertion — aucune borne basse. Confirme que FR-8 (AC #3) est déjà satisfait tel quel côté serveur, sans migration nécessaire.
  - [x] Vérifier qu'aucun écran n'affiche de message de type "en attente d'autres joueurs" : `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx`, `src/features/rejoindre-partie/RejoindrePartieScreen.tsx`, `src/features/bibliotheque/BibliothequeScreen.tsx`, `src/features/creation-grille/CreationGrilleScreen.tsx` — recherche déjà effectuée en amont de cette story (grep sur "attend"/"seul"/"solo") : aucune occurrence de ce type trouvée. Reconfirmer par lecture directe de ces quatre fichiers avant de conclure l'AC #2 satisfait.
  - [x] Vérifier `AvatarStack` (`GrilleEnDirecteScreen.tsx`, ~lignes 459-476) : avec `joueurs.length === 1`, `visibles` contient l'unique joueur et `reste = 0`, donc aucun compteur "+N" ne s'affiche — la pile montre déjà uniquement soi-même par construction, sans code spécifique au cas solo. Documenter cette confirmation plutôt que d'ajouter une condition dédiée qui dupliquerait une logique déjà correcte.
  - [x] Vérifier que `handleToggle` (cochage), la détection de victoire (trigger Postgres `detecter_victoire`, AD-3) et `handleCloturer` (clôture) dans `GrilleEnDirecteScreen.tsx` ne contiennent aucune condition sur le nombre de joueurs — confirmer par lecture que ces trois mécanismes opèrent uniquement sur l'identité du joueur courant (`joueur.id`) et l'état de la Partie, jamais sur un décompte de joueurs (AC #1).

- [x] Task 2: Vérification bout-en-bout d'une partie solo réelle (AC: #1)
  - [x] Reproduire le parcours complet en solo, via script Node autonome (`@supabase/supabase-js`, méthode déjà établie aux stories précédentes — aucun accès navigateur réel dans ce sandbox) ou via le navigateur si l'outil `run` de ce projet le permet : créer un compte créateur de test, créer et valider une grille (taille 3×3 suffisant), lancer une partie, rejoindre cette même partie en tant que créateur (RPC `rejoindre_partie`), cocher les cases d'une ligne/colonne/diagonale complète, confirmer l'insertion dans `parties_vainqueurs`, puis clôturer la partie (`parties.statut = 'terminee'`) — à aucune étape une erreur ou un blocage lié à l'absence d'un second joueur ne doit survenir.
  - [x] Confirmer explicitement qu'aucune requête ni fonction serveur du parcours ci-dessus ne dépend d'un `count(joueurs) > 1` implicite (ex. une policy RLS mal bornée) — revue directe des policies concernées si un comportement inattendu apparaît pendant la vérification.
  - [x] Nettoyer les données de test créées après vérification (compte, grille, partie), comme aux stories précédentes.

- [x] Task 3: Non-régression et clôture (AC: #1, #2, #3)
  - [x] `npm run build` et `npm run lint` passent.
  - [x] Si l'audit (Task 1) ne révèle aucun gouffre : documenter cette conclusion dans Dev Notes/Completion Notes plutôt que de forcer un changement de code inutile — un diff vide (hors documentation de la story elle-même) est un résultat valide et attendu pour cette story.
  - [x] Si un gouffre concret et reproductible est trouvé (ex. un message ou un composant supposant implicitement ≥2 joueurs quelque part non couvert par l'audit ci-dessus) : le corriger a minima, en respectant le design system existant (`DESIGN.md` — ton chaleureux, pas de nouvelle surface) et le principe "pas d'arbitrage" (`EXPERIENCE.md#Foundation`) déjà établi dans ce projet.

## Dev Notes

- **Cette story est very probablement un no-op côté code applicatif.** Les Stories 2.1 à 2.7 ont toutes été conçues et vérifiées sans jamais introduire de dépendance à un nombre minimum de joueurs — le plafond de 6 (AD-9) a toujours été une borne haute uniquement. Le rôle de cette story est de le **confirmer explicitement et de le vérifier bout-en-bout**, pas de développer une nouvelle capacité. Résister à la tentation d'ajouter un message de bienvenue spécifique au solo, un raccourci "jouer seul" distinct du parcours normal, ou toute autre fonctionnalité non demandée par les AC — cela introduirait de la scope creep sur une story dont le périmètre exact est la vérification (voir Task 1/3).
- **Le parcours créateur solo reste identique au parcours multi-joueurs existant** (Story 2.1, FR-9) : après "Lancer la Partie" (`CreationGrilleScreen.tsx#handleLancerPartie` ou `BibliothequeScreen.tsx#handleRelancer`), le créateur reçoit un lien affiché en texte à copier — il doit ensuite lui-même naviguer vers ce lien (`?partie=code`) pour rejoindre sa propre partie via `RejoindrePartieScreen`, exactement comme un invité. Ce mécanisme n'est pas spécifique à cette story et ne doit pas être modifié ici (ex. ne pas ajouter de bouton "Rejoindre maintenant" — hors périmètre des AC).
- **RLS et fonctions serveur (AD-8, AD-9)** : `rejoindre_partie` (SECURITY DEFINER) est la seule porte d'entrée pour `joueurs`/`cases` ; elle ne vérifie qu'une borne haute (`>= 6`). Aucune modification de policy ou de fonction n'est anticipée par cette story — seulement une vérification.
- **Principe déjà établi (Stories 2.4 à 2.7)** : si l'audit (Task 1) découvre malgré tout un gouffre concret, documenter la décision et son raisonnement inline (comme `App.tsx` pour la Story 2.7) plutôt que de deviner silencieusement une solution.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs, cohérent avec toutes les stories précédentes. E2E navigateur complet limité dans ce sandbox (limite déjà documentée à chaque story).

### Previous Story Intelligence (Story 2.7)

- Story 2.7 a établi le précédent méthodologique pour ce type de story : lire exhaustivement le code existant avant de conclure qu'un changement est nécessaire, ne construire que le strict gouffre identifié (le cas échéant), et documenter les décisions non triviales inline. Cette story (2.8) suit la même discipline, avec la particularité que l'audit initial (mené en amont de la rédaction de cette story, voir Task 1) n'a trouvé **aucun** gouffre comparable à celui de 2.7 (`App.tsx`) — à confirmer et vérifier formellement par le développeur, pas à supposer.
- Rappel Story 2.7 : ne jamais appeler `supabase.auth.signOut()` sur la session du créateur pendant cette vérification (romprait la reconnexion Story 2.6) — sans rapport direct avec cette story mais discipline à maintenir dans tout script de test Node utilisé pour la Task 2.

### Project Structure Notes

```
bingo/
  src/features/grille-en-direct/GrilleEnDirecteScreen.tsx   # AUDIT — AvatarStack, handleToggle, handleCloturer
  src/features/rejoindre-partie/RejoindrePartieScreen.tsx    # AUDIT — pas de message d'attente
  src/features/bibliotheque/BibliothequeScreen.tsx            # AUDIT — handleRelancer, pas de message d'attente
  src/features/creation-grille/CreationGrilleScreen.tsx        # AUDIT — handleLancerPartie, pas de message d'attente
  supabase/migrations/20260708200136_rejoindre_partie.sql     # AUDIT — borne haute uniquement (>= 6), pas de borne basse
```

Aucun nouveau fichier ni migration anticipé — modification uniquement si un gouffre réel est trouvé (Task 3).

### References

- [Source: epics.md#Story 2.8: Jouer seul, sans inviter personne]
- [Source: epics.md#FR-20 (jouer seul, sans inviter personne)]
- [Source: epics.md#Epic 2 (description explicite : "Jouer seul... est un chemin valide au même titre qu'une partie à plusieurs")]
- [Source: prd.md#FR-20 : Jouer seul, sans inviter personne]
- [Source: prd.md#FR-8 : Rejoindre une partie (une Partie accepte entre 1 et 6 joueurs)]
- [Source: ARCHITECTURE-SPINE.md#AD-9 — rejoindre_partie vérifie le plafond de 6 joueurs (borne haute uniquement)]
- [Source: supabase/migrations/20260708200136_rejoindre_partie.sql — `if v_nb_joueurs >= 6 then` (aucune borne basse)]
- [Source: src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — AvatarStack (lignes ~459-476), handleToggle, handleCloturer]
- [Source: EXPERIENCE.md#Foundation — principe "la confiance plutôt que l'arbitrage", pas de nouvelle surface pour ce cas]
- [Source: _bmad-output/implementation-artifacts/2-7-pas-d-historique-pour-les-invites.md — méthodologie de story d'audit/confirmation]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session (conteneurs Docker `supabase_*_bmad`, port 64321) — aucune action requise.
- Audit de code (Task 1) : lecture complète de `supabase/migrations/20260708200136_rejoindre_partie.sql` — seule condition `if v_nb_joueurs >= 6 then raise exception 'partie_complete'` (ligne 139), aucune borne basse. Grep ciblé (`attend|waiting|minimum|min.*joueur|joueurs.length`) sur les 4 écrans du parcours (`GrilleEnDirecteScreen.tsx`, `RejoindrePartieScreen.tsx`, `BibliothequeScreen.tsx`, `CreationGrilleScreen.tsx`) : seule occurrence de `joueurs.length` est `AvatarStack` (`reste = joueurs.length - visibles.length`), qui vaut 0 pour 1 joueur — pas de compteur affiché, aucun message d'attente nulle part.
- Vérification bout-en-bout (Task 2) : script Node autonome (`@supabase/supabase-js` 2.110.0, exécuté depuis la racine du projet pour résoudre `node_modules`, supprimé après usage) exécutant le parcours complet en une seule identité (compte créateur email/mot de passe) : création grille 3×3 → 9 phrases → lancement partie → `rejoindre_partie` (roster confirmé à exactement 1 ligne `joueurs`) → 9 cases distribuées → cochage de 3 cases (première ligne) → `parties_vainqueurs` confirme le joueur solo déclaré vainqueur (trigger `detecter_victoire`, AD-3) → clôture (`parties.statut = 'terminee'`) réussie. Aucune erreur, aucun blocage à aucune étape.
- Nettoyage : grille de test supprimée via `delete from grilles` (cascade sur `phrases`/`parties`/`joueurs`/`cases`/`parties_vainqueurs`) ; compte Auth de test supprimé via `admin.deleteUser` (clé `service_role` locale, hors bundle client).
- Rendu React lui-même non vérifié visuellement (pas de navigateur réel disponible dans ce sandbox, limite déjà documentée à chaque story précédente) — la logique auditée (`AvatarStack`, absence de messages conditionnels) est directement lisible dans le code source, risque résiduel jugé négligeable comme pour les stories 2.4 à 2.7.

### Completion Notes List

- Audit complet (Task 1) : **aucun gouffre trouvé**. FR-20 était déjà satisfait par construction avant cette story — `rejoindre_partie` ne vérifie qu'une borne haute (6 joueurs max, jamais de minimum), `AvatarStack` affiche naturellement 0 compteur pour 1 seul joueur, et aucun des 4 écrans du parcours de jeu n'affiche de message supposant un nombre minimum de joueurs. Le cochage, la détection de victoire (trigger Postgres) et la clôture de partie n'ont jamais eu de dépendance au nombre de joueurs dans le code des Stories 2.1 à 2.7.
- Vérification bout-en-bout (Task 2) : script Node confirmant sur des données réelles (pas seulement par lecture du code) qu'un créateur peut lancer une partie, la rejoindre comme unique joueur, cocher ses cases, être détecté vainqueur, et clôturer la partie — sans aucune erreur ni blocage lié à l'absence d'un second joueur (AC #1, #3).
- Aucune modification de code source (`src/`, `supabase/migrations/`) n'a été nécessaire — cette story se conclut par un **diff vide côté application**, résultat attendu et documenté dans le Dev Notes de la story avant implémentation. Seule la story elle-même (checkboxes, Dev Agent Record, Status) et `sprint-status.yaml` sont modifiés par cette story.
- `npm run build` et `npm run lint` passent sans erreur ni avertissement (aucune régression, cohérent avec l'absence de changement de code).

### File List

Aucun fichier source modifié (audit et vérification uniquement — voir Completion Notes). Fichiers de suivi mis à jour :

- `_bmad-output/implementation-artifacts/2-8-jouer-seul-sans-inviter-personne.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-14 : Audit et vérification complets (Tasks 1 à 3) — confirmation que FR-20 (jouer seul) était déjà entièrement satisfait par l'implémentation existante des Stories 2.1 à 2.7 (aucune borne basse sur le nombre de joueurs côté serveur, aucun message d'attente côté client, `AvatarStack` déjà correct pour 1 joueur). Vérifié par script Node bout-en-bout sur données réelles (lancer → rejoindre seul → cocher → vainqueur → clôturer). Aucune modification de code source nécessaire. `npm run build`/`npm run lint` passent. Statut passé à "review".
- 2026-07-14 : Contre-vérification (revue légère, sans diff de code applicatif à examiner) — relecture adversariale du trigger `detecter_victoire` (aucune dépendance à d'autres joueurs), de l'absence de fonctionnalité "quitter la partie" (pas de régression possible du roster vers 0), et de l'absence de flash "en attente" pendant le chargement (`chargement` gate le rendu). Aucune faille trouvée, conclusion de la story confirmée. Statut passé à "done".
