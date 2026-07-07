---
baseline_commit: NO_VCS
---

# Story 1.4: Dupliquer une grille

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a créateur,
I want dupliquer une grille existante,
so that je l'adapte à un nouvel événement sans repartir de zéro.

## Acceptance Criteria

1. **Given** une grille existante m'appartenant
   **When** je choisis "Dupliquer"
   **Then** une nouvelle grille indépendante est créée avec la même taille et les mêmes phrases, sous un nom modifiable

2. **Given** la grille dupliquée
   **When** je modifie ses phrases
   **Then** la grille originale n'est pas affectée, et réciproquement

3. **And** l'action "Dupliquer" est accessible depuis la Bibliothèque

## Tasks / Subtasks

- [x] Task 1: Conserver la `taille` de chaque grille dans l'état de la Bibliothèque (AC: #1)
  - [x] Dans `src/features/bibliotheque/BibliothequeScreen.tsx`, ajouter `taille: number` au type `Grille` et le conserver dans le résultat du `useEffect` de chargement (`grillesData` la récupère déjà via `select('id, nom, taille')`, elle est juste jetée après le calcul de `validee` aujourd'hui)

- [x] Task 2: Implémenter la duplication réelle derrière le bouton "Dupliquer" (AC: #1, #2)
  - [x] Remplacer le stub `handleDupliquer` (Story 1.5 : `setMessage('Bientôt disponible !')`) par une fonction `handleDupliquer(grille: Grille)` qui :
    1. Insère une nouvelle ligne `grilles` : `{ nom: \`${grille.nom} (copie)\`, taille: grille.taille }` (`compte_id` par défaut côté serveur, cf. Story 1.2 — ne jamais le passer depuis le client)
    2. Récupère les phrases de la grille source : `supabase.from('phrases').select('texte').eq('grille_id', grille.id)`
    3. Insère en une seule requête batch les phrases de la nouvelle grille : `supabase.from('phrases').insert(phrasesSource.map(p => ({ grille_id: nouvelleGrilleId, texte: p.texte })))` — chaque phrase dupliquée est une toute nouvelle ligne (nouvel `id`), jamais une référence à la ligne originale
    4. En cas de succès, redéclenche le chargement existant (`setRetry(n => n + 1)`) pour que la grille dupliquée apparaisse dans la liste avec son statut "validée" recalculé — ne pas gérer l'insertion dans l'état local à la main
  - [x] `try/catch/finally` autour de l'ensemble de l'opération, état `pending` désactivant le bouton "Dupliquer" concerné pendant l'opération, message d'erreur générique (`friendlyErrorMessage`) en cas d'échec à n'importe quelle étape
  - [x] Aucune nouvelle policy RLS : les policies `insert` sur `grilles`/`phrases` (Story 1.2) couvrent déjà ce cas — le nouveau compte_id est toujours celui de l'utilisateur courant, la nouvelle `grille_id` référencée par les phrases appartient à une grille qu'il vient lui-même de créer

- [x] Task 3: Vérification manuelle (AC: #1, #2, #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Dupliquer une grille validée (via l'API, en reproduisant exactement les appels de `handleDupliquer`) : une nouvelle grille "Grille source (copie)" créée, même taille (3), 9 phrases insérées (donc immédiatement "validée")
  - [x] Modifier une phrase de la grille dupliquée : vérifié via l'API que l'originale ne contient pas le nouveau texte (`[]`) ; réciproquement, modifier une phrase de l'originale et vérifié que la copie ne le contient pas non plus (`[]`) — indépendance confirmée dans les deux sens
  - [x] "Dupliquer" reste accessible uniquement depuis la Bibliothèque, sur les grilles validées (comportement inchangé de la Story 1.5, non cassé par cette story)

### Review Findings

**Patch:**

- [x] [Review][Patch] Grille orpheline en cas d'échec partiel — si l'insert de la grille réussit mais que la lecture ou l'insertion des phrases échoue ensuite, la nouvelle grille (0 phrase, jamais "validée") reste en base indéfiniment sans aucun moyen de la supprimer (aucune fonctionnalité de suppression n'existe dans l'app). Ajouté une suppression compensatoire de la grille nouvellement créée dans les branches d'échec après son insertion [src/features/bibliotheque/BibliothequeScreen.tsx:123-147]
- [x] [Review][Patch] `dupliquantId` était une chaîne unique — dupliquer la grille A puis, pendant que l'opération est encore en cours, dupliquer la grille B réactivait le bouton de A avant la fin de sa propre opération. Remplacé par un `Set<string>` (`dupliquantIds`) des grilles en cours de duplication [src/features/bibliotheque/BibliothequeScreen.tsx]
- [x] [Review][Patch] Le nom de la copie (`${nom} (copie)`) pouvait dépasser la limite de 100 caractères de la contrainte `check` sur `grilles.nom` si le nom source en était déjà proche. Ajouté `nomDeLaCopie()` qui tronque pour respecter la limite [src/features/bibliotheque/BibliothequeScreen.tsx]

**Deferred:**

- [x] [Review][Defer] `handleDupliquer` n'a pas de garde `ignore` façon `charger()` — si le composant est démonté (navigation, déconnexion) pendant l'opération, les `setState` qui suivent s'exécutent quand même sur un composant démonté (sans effet en React 19, juste un travail perdu, pas un crash) [src/features/bibliotheque/BibliothequeScreen.tsx:112-155] — deferred, faible probabilité et impact bénin

**Dismissed:**

- "Nom modifiable" (AC1) — écarté : aucune UI de renommage n'existe nulle part dans l'app (ni pour les copies, ni pour les grilles originales), et aucune story actuelle n'en prévoit une. "Modifiable" est interprété comme une propriété du modèle de données (RLS l'autorise), pas une capacité utilisateur immédiate — cohérent avec le reste du produit à ce stade.
- Ambiguïté `.single()` sur l'insert (RLS permissive en insert mais restrictive en select) — déjà écarté avec le même raisonnement en Story 1.2 (traitement uniforme et sûr déjà en place).
- Pas de vérification explicite de propriété de la grille source au-delà de la RLS — décision architecturale assumée (AD-8, RLS comme seule autorité), cohérent avec les revues précédentes.
- Fetch non paginé des grilles/phrases — même code hérité de la Story 1.5, déjà différé là-bas, pas un problème introduit par cette story.
- Rechargement complet de la liste après duplication plutôt qu'une mise à jour locale ciblée — décision explicite des Dev Notes de cette story (réutiliser le chargement existant).
- Pas d'indicateur de chargement visible pendant la duplication/le rechargement — cohérent avec la décision produit "pas de spinner" (EXPERIENCE.md) ; le bouton concerné est déjà désactivé immédiatement.
- Messages d'erreur génériques sans log de l'erreur réelle — même pattern déjà différé dans toutes les stories précédentes.
- Calcul client de `validee` par comptage de lignes — déjà couvert par la contrainte d'unicité `(grille_id, texte)` (Story 1.2), pas un nouveau risque.
- Pas de région `aria-live` sur le message d'erreur — même élément `message` déjà signalé et différé en Story 1.2, pas nouveau ici.
- Double-clic sur le même bouton avant que `disabled` ne se propage — scénario de très faible probabilité, cohérent avec le seuil déjà appliqué aux autres boutons du projet (ex. "Réessayer", différé en Story 1.5).

## Dev Notes

- **Contexte d'ordonnancement** : cette story suit désormais la Story 1.5 (inversion décidée le 2026-07-07, voir `1-5-consulter-sa-bibliotheque-de-grilles.md#Dev Notes`). Le bouton "Dupliquer" existe déjà dans `BibliothequeScreen.tsx` (scaffoldé en 1.5) : cette story se limite à remplacer son `onClick` stub par la vraie logique — **aucune nouvelle UI, aucune nouvelle policy RLS**.
- **Le bouton "Dupliquer" n'apparaît que sur les grilles `validee`** (Story 1.5, AC3) — la grille source a donc toujours exactement `taille × taille` phrases ; la duplication produit systématiquement une grille immédiatement "validée" elle aussi (pas de cas où la copie serait incomplète).
- **Nom de la copie** : `"{nom original} (copie)"`. L'AC demande un nom "modifiable", pas une saisie de nom avant duplication — la RLS existante (Story 1.2, `update` sur `grilles.nom`) rend déjà ce nom modifiable ; ne pas construire de fonctionnalité de renommage ici, elle n'est demandée par aucun AC.
- **Indépendance garantie par construction** (AC2) : chaque phrase de la copie est une nouvelle ligne insérée avec un nouvel `id` et la nouvelle `grille_id` — jamais un partage de ligne avec l'originale. Rien à vérifier côté schéma, juste confirmer par le test manuel que l'insertion respecte bien ce principe.
- **Rafraîchir plutôt que manipuler l'état local** : après une duplication réussie, redéclencher le chargement existant (`setRetry`) plutôt que d'insérer manuellement la nouvelle grille dans l'état — réutilise le calcul de `validee` déjà en place, évite un état dupliqué/divergent.
- **Pas de saisie du nombre de phrases ni de la taille** : les deux sont copiés tels quels depuis la grille source, aucune UI supplémentaire.
- Aucune migration SQL nécessaire.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API directs, comme pour les stories précédentes.

### Previous Story Intelligence (Story 1.5 — la plus pertinente ici, malgré son numéro plus élevé)

- `BibliothequeScreen.tsx` (Story 1.5) contient déjà : le pattern chargement/erreur/retry (`chargement`, `chargementEchoue`, `retry`, garde `ignore`), le calcul dérivé de `validee` (comptage de `phrases` par `grille_id`, comparaison à `taille²`), et le bouton "Dupliquer" avec `aria-label` par grille (patch de revue) — à réutiliser tel quel, ne pas dupliquer la logique de chargement.
- `handleDupliquer` actuel (stub) : `setMessage('Bientôt disponible !')` avec auto-effacement après 3s (patch de revue Story 1.5) — cette story remplace le CORPS de la fonction, en gardant la signature compatible avec l'appel `onClick={() => handleDupliquer(grille)}` (le stub actuel ne prenait pas la grille en paramètre, il faudra l'ajouter).
- `friendlyErrorMessage()` et le pattern `try/catch/finally` avec état `pending` sont identiques dans tout le projet depuis la Story 1.1 — les reproduire sans variation.
- Contrainte `taille between 3 and 5` (correct-course, 2026-07-07) — sans impact direct ici, la taille est copiée telle quelle depuis une grille déjà valide.

### Project Structure Notes

Aucun nouveau fichier. Seul `src/features/bibliotheque/BibliothequeScreen.tsx` est modifié.

Aucune variance connue à date.

### References

- [Source: epics.md#Story 1.4: Dupliquer une grille]
- [Source: prd.md#FR-4 : Duplication de grille]
- [Source: ARCHITECTURE-SPINE.md#AD-8 — RLS]
- [Source: 1-5-consulter-sa-bibliotheque-de-grilles.md — bouton "Dupliquer" scaffoldé, pattern chargement/erreur/retry]
- [Source: 1-2-creer-une-grille.md#Dev Notes — `compte_id` par défaut, contrainte d'unicité `(grille_id, texte)` à garder en tête pour l'insertion batch]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- E2E navigateur toujours indisponible dans ce sandbox — vérification par appels directs à l'API REST Supabase reproduisant exactement la séquence de `handleDupliquer` (insert grille copie → select phrases source → insert batch phrases copie), avec le compte de test `admin@test.com`.
- Indépendance (AC2) vérifiée dans les deux sens : modification d'une phrase de la copie sans effet sur l'originale, et modification d'une phrase de l'originale sans effet sur la copie (requêtes de contrôle renvoyant `[]` dans les deux cas).
- Données de test ("Grille source", "Grille source (copie)") nettoyées après coup.

### Completion Notes List

- Toutes les tasks (1 à 3) implémentées et vérifiées.
- `handleDupliquer(grille)` remplace le stub de la Story 1.5 : insert `grilles` (nom "{nom} (copie)", `compte_id` par défaut), select des phrases source, insert batch dans la copie, puis `setRetry` pour rafraîchir la liste via le chargement déjà en place.
- État `dupliquantId` ajouté pour désactiver uniquement le bouton "Dupliquer" de la grille en cours de duplication (pas toutes les lignes).
- Aucune migration SQL, aucune nouvelle policy RLS — les policies `insert` de la Story 1.2 couvraient déjà ce cas.

### File List

- `src/features/bibliotheque/BibliothequeScreen.tsx` (modifié — `taille` ajoutée au type `Grille`, `handleDupliquer` implémenté, état `dupliquantId`)

## Change Log

- 2026-07-07 : Implémentation complète (Tasks 1 à 3) — duplication réelle d'une grille et de ses phrases derrière le bouton scaffoldé en Story 1.5, indépendance vérifiée dans les deux sens. Statut passé à "review".
- 2026-07-07 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — décision résolue ("nom modifiable" = propriété RLS, pas d'UI de renommage à construire), 3 patches appliqués (suppression compensatoire de la grille en cas d'échec partiel, `Set` au lieu d'une chaîne unique pour gérer plusieurs duplications concurrentes, troncature du nom à 100 caractères), 1 point différé. `npm run build`/`npm run lint` et vérification API (troncature confirmée) revérifiés après correctifs. Statut passé à "done".
