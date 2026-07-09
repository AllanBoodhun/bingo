---
baseline_commit: NO_VCS
---

# Story 2.3: Jouer en temps réel — cocher ses cases et suivre la partie

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a joueur,
I want cocher mes cases et voir en temps réel ce qui se passe pour les autres joueurs,
so that je vis la partie comme un moment partagé pendant l'événement.

## Acceptance Criteria

1. **Given** je suis un Joueur dans une partie en cours
   **When** je tape une case de ma grille
   **Then** son état change immédiatement — pas de spinner, pas de confirmation modale — et est écrit dans `cases.checked`, RLS limitant l'écriture à mes propres cases (AD-8)

2. **Given** un autre joueur de la même partie coche une case
   **When** son cochage est enregistré
   **Then** je vois apparaître une notification transitoire ("Karim vient de cocher une Case") en quelques secondes maximum (NFR-1), via un abonnement Supabase Realtime Postgres Changes (AD-7) — pas de canal Broadcast séparé

3. **Given** le créateur corrige le texte d'une phrase de la grille pendant que je suis dans la partie (Story 1.3)
   **When** la correction est enregistrée
   **Then** je vois le nouveau texte s'afficher sur ma case correspondante en quelques secondes maximum (NFR-1), via l'abonnement Realtime sur la table `phrases` (AD-6, AD-7) — sans recharger la page, complétant ainsi FR-3 pour les joueurs déjà en partie

   **And** le badge "en direct" reste visible en permanence tant que la partie est active
   **And** la pile d'avatars affiche les joueurs de la partie (jusqu'à 3 avatars + un compteur, ex. "+3"), jamais plus de 6 au total (UX-DR2)

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — écriture de `cases.checked`, publication Realtime (AC: #1, #2, #3)
  - [x] Générer via `supabase migration new cocher_case_temps_reel`
  - [x] Policy `"Joueur coche ses propres cases"` on `cases` : `for update using (exists (select 1 from joueurs j where j.id = cases.joueur_id and j.auth_user_id = auth.uid())) with check (exists (select 1 from joueurs j where j.id = cases.joueur_id and j.auth_user_id = auth.uid()));` — référence `joueurs`, pas `cases` elle-même : pas de risque de récursion RLS ici (contrairement aux policies `select` de la Story 2.2), inutile de passer par une fonction `security definer`
  - [x] `grant update (checked) on cases to authenticated;` — **grant colonne par colonne**, pas `grant update on cases` : c'est ce qui empêche concrètement un client de modifier `phrase_id`/`position`/`joueur_id` via la même requête PATCH (AD-8 : "le Joueur ne peut écrire que le champ `checked`"), la policy RLS seule ne restreint que les *lignes*, jamais les *colonnes*
  - [x] **Activer Realtime** (vérifié en base locale au moment de la rédaction de cette story : `select * from pg_publication_tables where pubname = 'supabase_realtime';` ne renvoie aucune ligne — aucune table n'est publiée) : `alter publication supabase_realtime add table cases;` et `alter publication supabase_realtime add table phrases;` — sans cette étape, `.channel(...).on('postgres_changes', ...)` ne recevra jamais aucun événement, silencieusement (pas d'erreur, juste rien ne se passe). Périmètre strictement limité à `cases`/`phrases` pour cette story ; `parties`/`joueurs`/`grilles`/`parties_vainqueurs` seront ajoutées par les stories qui en ont besoin (2.4 à 2.6) — ne pas tout publier d'un coup par anticipation
  - [x] Aucune `REPLICA IDENTITY FULL` nécessaire sur `cases`/`phrases` : le tuple `new` d'un événement `UPDATE` contient déjà toutes les colonnes de la ligne après modification quel que soit le réglage de `REPLICA IDENTITY` (celui-ci n'affecte que la complétude du tuple `old`, non utilisé par cette story)
  - [x] Appliquer avec `supabase migration up`

- [x] Task 2: Cocher/décocher une case, en optimiste (AC: #1)
  - [x] Dans `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx`, ajouter au type `CaseJoueur` le champ `phrase_id: string` (nécessaire au Task 4, absent du `select` actuel de la Story 2.2 — `select('id, position, checked, phrase_id, phrases(texte)')`)
  - [x] `GridCell` passe de `<div>` à `<button type="button">` (élément désormais réellement interactif, contrairement à la Story 2.2 où aucune interaction n'existait encore) : reprendre le style existant (`grid-cell`, rotation/coins irréguliers déjà en place) et ajouter les resets nécessaires à un `<button>` dans une grille (`width: 100%`, `font-family: inherit`, pas d'`appearance` par défaut visible — même niveau de reset minimal que `.cta-primary`/`.cta-secondary` dans `Button.css`, ne pas ajouter de dépendance ou de composant générique supplémentaire)
  - [x] `handleToggle(caseItem)` dans `GrilleEnDirecteScreen` (passé à `GridCell` via une prop `onToggle`) : `setCases` met à jour `checked` **immédiatement** (optimiste, aucun état `pending` ni désactivation visuelle — UX-DR5 interdit spinner/confirmation sur cette action), puis `await supabase.from('cases').update({ checked: nextChecked }).eq('id', caseItem.id)` en arrière-plan ; si `error`, **annuler** la mise à jour optimiste (remettre l'ancien `checked`) — pas de message d'erreur bloquant, l'état visuel qui revient en arrière suffit de signal (cohérent avec le principe "confiance plutôt qu'arbitrage" d'EXPERIENCE.md)
  - [x] Risque accepté et documenté (voir Dev Notes), pas à corriger dans cette story : aucune protection contre un retour réseau désordonné si l'utilisateur tape très rapidement la même case plusieurs fois de suite (dernier appel émis ≠ nécessairement dernière réponse reçue)
  - [x] Coche visuelle : `DESIGN.md.components.grid-cell.checkedMark` — élément `<span className="grid-cell__coche">✓</span>` affiché uniquement si `caseItem.checked`, positionné en absolu coin haut-droit (`.grid-cell` passe donc à `position: relative`), couleur `--color-terracotta`, **jamais superposé au texte de la phrase** (le texte reste centré, la coche est un élément séparé en overlay dans un coin)
  - [x] État "tension" (liseré moutarde, case proche de compléter une ligne) **explicitement hors périmètre** de cette story — nécessiterait de calculer côté client la complétion de lignes/colonnes/diagonales, chevauche la détection de victoire (Story 2.4, AD-3) sans qu'aucun AC de cette story ne le demande ; ne pas l'implémenter par anticipation

- [x] Task 3: Notification temps réel du cochage des autres joueurs (AC: #2)
  - [x] **Élargir le type `Joueur`** transporté depuis la jonction jusqu'à l'écran de jeu — actuellement `{ id, pseudo }` uniquement, `partie_id` (présent dans la ligne retournée par `rejoindre_partie`, cf. Story 2.2) est silencieusement jeté à la ligne `onRejoint({ id: data.id, pseudo: data.pseudo })` de `RejoindrePartieScreen.tsx:64`. Renommer en `{ id, pseudo, partieId }` (camelCase côté client, cohérent avec le reste du code TS ; `partieId: data.partie_id` à la jonction) et propager ce type élargi dans `App.tsx` (état `joueurRejoint`) et dans les props de `GrilleEnDirecteScreen`
  - [x] Dans `GrilleEnDirecteScreen`, charger une fois (pas de temps réel dessus, voir Dev Notes) la liste des joueurs de la partie : `supabase.from('joueurs').select('id, pseudo').eq('partie_id', joueur.partieId).order('created_at')` — en parallèle (`Promise.all`) du chargement des `cases` déjà existant (Story 2.2), dans le même effet `chargement`/`ignore`/`retry`
  - [x] Ouvrir **un seul** canal Realtime après le chargement initial réussi (fetch-then-subscribe, même discipline que celle qu'imposera AD-10 en Story 2.6, posée dès maintenant plutôt que réinventée plus tard) : `const channel = supabase.channel(`partie:${joueur.partieId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cases' }, handleCaseEvent).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'phrases' }, handlePhraseEvent).subscribe()`. Cleanup au démontage : `supabase.removeChannel(channel)`
  - [x] **Aucun filtre serveur par `partie_id` sur le canal** (`cases` n'a pas de colonne `partie_id`, cf. variance déjà documentée en Story 2.2) — inutile de toute façon : la policy `select` `"Joueur lit les cases de sa partie"` (Story 2.2, portée à la partie entière) s'applique déjà à la diffusion Realtime elle-même (Supabase n'envoie un événement `postgres_changes` que pour les lignes que le rôle appelant peut lire), donc l'abonnement est déjà correctement scopé à la partie du joueur sans filtre explicite — cohérent avec AD-7
  - [x] `handleCaseEvent(payload)` : ignorer si `payload.new.checked !== true` (ne notifier que sur cochage, pas décochage — l'exemple AC #2 ne couvre que "vient de cocher") et si `payload.new.joueur_id === joueur.id` (ne jamais notifier ses propres cochages, "un **autre** joueur"). Sinon, résoudre le pseudo via la liste de joueurs déjà chargée (`joueurs.find(j => j.id === payload.new.joueur_id)?.pseudo`) et déclencher le toast : `"${pseudo} vient de cocher une Case."`
  - [x] Composant `toast` interne à `GrilleEnDirecteScreen.tsx` (pas de fichier séparé, même logique de colocalisation que `GridCell` en Story 2.2) : état `toast: string | null`, un seul visible à la fois (un nouvel événement remplace le message et relance le minuteur plutôt que d'empiler, cohérent avec "un événement à la fois" d'EXPERIENCE.md), auto-disparition après ~4s (`setTimeout` + nettoyage de l'ancien timer avant d'en poser un nouveau). Style `DESIGN.md.components.toast` : carte pointillée sauge, légère rotation, ancré en bas d'écran, ne bloque jamais l'interaction avec la grille (`position: fixed`, pas de recouvrement plein écran)

- [x] Task 4: Propagation temps réel d'une correction de phrase (AC: #3)
  - [x] `handlePhraseEvent(payload)` : chercher dans `cases` (état local) une entrée dont `phrase_id === payload.new.id` ; si trouvée, `setCases` en remplaçant uniquement `phrases.texte` de cette entrée par `payload.new.texte` — pas de rechargement complet de la liste des cases
  - [x] Complète FR-3 pour les joueurs déjà en partie (le créateur pouvait déjà corriger une phrase depuis la Story 1.3, mais rien ne propageait la correction vers une grille déjà distribuée avant cette story)

- [x] Task 5: Badge "en direct" et pile d'avatars (AC: #3 — "And" badge/avatars)
  - [x] `live-badge` (`DESIGN.md.components.live-badge`) : pastille pointillée moutarde, point pulsant doux (`@keyframes` CSS simple, pas de librairie d'animation), texte "En direct". Affiché en permanence sur cet écran pour cette story — **pas encore de logique de masquage à la clôture** (`parties.statut`) : `parties.statut` n'est ni chargé ni observé par cette story, la disparition du badge à la clôture est portée par la Story 2.5
  - [x] `avatar-stack` (`DESIGN.md.components.avatar-stack`) : à partir de la liste de joueurs chargée au Task 3 (déjà en mémoire, pas de nouvelle requête), afficher jusqu'à 3 cercles superposés (chevauchement `-7px`) avec la première lettre du pseudo (majuscule), couleur cyclique terracotta/sauge/moutarde par index, puis un compteur `+N` si plus de 3 joueurs (jamais plus de 6 au total, plafond déjà garanti côté serveur par `rejoindre_partie`, Story 2.2)
  - [x] **Pas d'abonnement Realtime sur `joueurs`** pour faire vivre la pile d'avatars : `joueurs` n'apparaît pas dans la liste des tables Realtime d'AD-7 (`parties`, `cases`, `grilles`, `phrases`, `parties_vainqueurs` — `joueurs` en est absent) ; la liste chargée au montage reste donc figée pour la durée de la session de cet écran, un nouvel arrivant n'apparaît qu'au prochain (re)montage — c'est l'invariant de la spine tel qu'écrit, pas un oubli de cette story

- [x] Task 6: Vérification manuelle (AC: #1 à #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Reprendre une partie de test (Story 2.2) avec 2 joueurs déjà inscrits (2 identités = 2 sessions/tokens distincts, comme en Story 2.2)
  - [x] Joueur A : `PATCH /rest/v1/cases?id=eq.<case_id>` avec `{"checked": true}` sur une de ses propres cases → `200`, `checked` mis à jour ; tenter le même `PATCH` en incluant `"phrase_id": "..."` dans le corps → refusé (grant colonne), confirme AD-8
  - [x] Joueur A tente un `PATCH` sur une case appartenant au Joueur B → `0` ligne affectée (RLS), pas d'erreur mais aucun changement
  - [x] Ouvrir un abonnement Realtime (script ou onglet navigateur) en tant que Joueur B sur le canal `cases`/`phrases` pendant que le Joueur A coche une case → l'événement `UPDATE` est bien reçu côté B en quelques secondes ; vérifier qu'aucun événement n'est reçu pour un cochage strictement identique effectué par B lui-même dans son propre client (filtré côté client, pas testable côté RPC seul — vérifier la condition `payload.new.joueur_id === joueur.id` à la lecture du code)
  - [x] Corriger le texte d'une phrase du pool (`PATCH /rest/v1/phrases`, mécanisme Story 1.3) pendant qu'un joueur a sa `GrilleEnDirecteScreen` ouverte → le nouveau texte apparaît sur sa case sans rechargement de page
  - [x] Confirmer par lecture directe de `pg_publication_tables` que `cases` et `phrases` sont bien publiées après application de la migration
  - [x] Nettoyer les données de test créées pendant la vérification, à l'identique de la méthode déjà utilisée en Story 2.2

### Review Findings

**Patch:**

- [x] [Review][Patch] Le toast de notification de cochage disparaît silencieusement pour un joueur arrivé après le montage de l'écran — `joueursData` est une fermeture figée au chargement initial (Task 3) ; si un nouveau joueur rejoint la partie après coup et coche une case, `joueursData.find(...)` renvoie `undefined`, la garde `if (pseudoAuteur)` avale le toast entier sans rien afficher, alors qu'AD-7 interdit justement d'abonner `joueurs` en temps réel pour corriger ça autrement. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — gestionnaire d'événement `cases`] — correctif : message de repli générique ("Un joueur vient de cocher une Case.") quand le pseudo ne peut pas être résolu, plutôt que d'abandonner la notification.
- [x] [Review][Patch] `handleToggle` ne vérifie que `error`, jamais si la ligne a réellement été affectée — un `UPDATE` filtré silencieusement par RLS (ligne non trouvée pour l'appelant) renvoie un succès sans erreur ; l'état optimiste ne serait alors jamais annulé en cas de désynchronisation réelle (id de case obsolète, incohérence de données). [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — `handleToggle`] — correctif : demander la représentation (`.select()`) sur l'update et traiter un résultat vide comme un échec (même traitement que `error`).
- [x] [Review][Patch] L'échec du chargement de la liste des `joueurs` bloque tout l'écran, y compris quand les `cases` (l'essentiel, AC #1) ont été chargées avec succès — la garde combinée `casesError || joueursError || ...` traite un simple accroc réseau sur la liste des joueurs (utile seulement à l'avatar-stack/au toast) comme un échec bloquant de toute la grille. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — condition d'échec du chargement] — correctif : ne bloquer l'écran que sur l'échec des `cases` ; en cas d'échec des `joueurs`, dégrader (liste vide) sans empêcher l'affichage de la grille.
- [x] [Review][Patch] `pseudo.charAt(0)` peut produire une moitié de paire de substitution UTF-16 si le pseudo commence par un caractère hors du plan de base (emoji, etc.), affichant un glyphe cassé dans l'avatar. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — `AvatarStack`] — correctif trivial : `Array.from(pseudo)[0]` au lieu de `charAt(0)`.
- [x] [Review][Patch] `.grid-cell` (désormais un `<button>`) n'a pas de `appearance: none` — les Dev Notes de cette story affirment explicitement l'absence de chrome natif visible, mais rien dans le CSS ne le garantit au-delà des propriétés déjà explicites (fond, bordure, police). [src/features/grille-en-direct/GrilleEnDirecteScreen.css — `.grid-cell`]
- [x] [Review][Patch] Aucun état accessible n'expose le cochage sur le nouveau bouton interactif `GridCell` — seul un glyphe visuel `✓` communique l'état, aucun `aria-pressed` ni équivalent. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — `GridCell`]

**Dismissed:**

- `RejoindrePartieScreen.tsx` suppose que `data.partie_id` existe sur la réponse du RPC `rejoindre_partie` — vérifié faux positif : confirmé empiriquement pendant la vérification manuelle de cette story (et de la Story 2.2) que la fonction retourne bien la ligne `joueurs` complète, `partie_id` inclus, à chaque appel testé.
- La pile d'avatars ne reflète pas les joueurs arrivés après le montage de l'écran — décision architecturale explicite et documentée (Dev Notes de cette story) : `joueurs` est volontairement absent de la liste Realtime d'AD-7, confirmé conforme par l'Acceptance Auditor.
- Deux mises à jour optimistes concurrentes sur la même case peuvent revenir dans le désordre et laisser un état visuel divergent — risque explicitement documenté et accepté dans le Task 2 de cette story (SM-C1, pas de file d'attente/annulation de requête pour un jeu entre proches).
- Le minuteur du toast n'est pas nettoyé au démontage du composant — cohérent avec le pattern déjà accepté ailleurs dans le projet (Story 2.1 : `setState` après démontage est un no-op silencieux en React 19, pas un crash).
- Aucune contrainte d'unicité sur `pseudo` au sein d'une partie — non requis par un AC, conséquence purement cosmétique (ambiguïté visuelle sur l'initiale/le toast), cohérent avec la posture SM-C1 du projet pour un jeu entre proches de confiance.
- Migration `alter publication ... add table` sans garde d'idempotence ni migration retour — cohérent avec toutes les migrations précédentes du projet (aucune n'utilise `IF NOT EXISTS` ni de mécanisme de rollback, convention déjà établie).
- Cast non validé des payloads Realtime (`payload.new as {...}`) — cohérent avec l'absence de types générés Supabase dans tout le reste du projet (même motif déjà écarté en Story 2.2).
- `_bmad/.claude/settings.local.json` modifié dans le diff (chemins de session temporaires) — fichier de permissions géré par le harness, sans rapport avec cette story, ne sera pas inclus dans le commit.
- Majuscule à "Case" dans le texte du toast — faux positif : c'est le texte exact de l'exemple donné par l'AC #2 lui-même ("Karim vient de cocher une Case."), et la majuscule sur les termes du glossaire produit est une exigence explicite d'UX-DR7, pas une négligence.

## Dev Notes

- **Portée volontairement étroite** : cette story rend "Grille en direct" interactif et vivant, mais ne construit ni la détection de victoire (Story 2.4, AD-3), ni la clôture de partie ni le masquage du badge "en direct" à la clôture (Story 2.5), ni la reconnexion après coupure réseau (Story 2.6, AD-10 — le pattern fetch-then-subscribe posé ici au Task 3 est une fondation que 2.6 étendra, pas une implémentation de la reconnexion elle-même), ni l'état visuel "tension" (Task 2). Ne pas anticiper ces stories.
- **Première utilisation de Supabase Realtime dans ce projet** — aucun pattern existant à reprendre pour la structure du canal/abonnement, contrairement au reste de cette story où presque tout réutilise un pattern déjà établi. Le point le plus facile à oublier est l'activation de la publication (`alter publication supabase_realtime add table ...`, Task 1) : sans elle, l'abonnement `.subscribe()` réussit silencieusement mais ne reçoit jamais aucun événement — aucune erreur ne le signale, à vérifier explicitement (Task 6) plutôt que de supposer que "ça marche si `.subscribe()` ne plante pas".
- **RLS et Realtime sont liés** : la diffusion `postgres_changes` respecte les policies `select` du rôle appelant — c'est *pourquoi* la policy `"Joueur lit les cases de sa partie"` posée en Story 2.2 couvrait déjà volontairement toute la partie (pas seulement les cases du joueur courant) : cette story en récolte directement le bénéfice, aucune policy supplémentaire de lecture n'est nécessaire pour que les notifications de cochage fonctionnent.
- **Grant colonne par colonne (`grant update (checked) on cases ...`)** est le mécanisme réel qui empêche un client de modifier autre chose que `checked` — une policy RLS `using`/`with check` seule ne filtre que les *lignes* adressables, jamais les *colonnes* modifiables dans une même requête. Ne pas se contenter d'une policy RLS pour cette garantie précise d'AD-8.
- **`joueurs` n'est pas dans la liste Realtime d'AD-7** (volontairement, pas un oubli de la spine) : la pile d'avatars est donc un instantané chargé une fois, pas un flux live — cohérence à respecter, ne pas ajouter un abonnement `joueurs` "pour faire pareil que cases/phrases".
- **Optimistic update sans annulation fine** : en cas de tap très rapproché sur la même case, deux requêtes `PATCH` peuvent partir presque simultanément et revenir dans le désordre, laissant potentiellement un état final différent de la dernière intention de l'utilisateur. Risque accepté et documenté (Task 2), cohérent avec la posture du projet (SM-C1, pas de sur-ingénierie pour un jeu entre proches) — ne pas introduire de file d'attente ou d'annulation de requête pour ce cas.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs, comme toutes les stories précédentes. Le test Realtime nécessite une deuxième identité connectée simultanément (script avec deux clients `supabase-js`, ou un onglet navigateur + un appel API direct) — E2E navigateur complet toujours indisponible dans ce sandbox (limite déjà rencontrée dans toutes les stories précédentes).

### Previous Story Intelligence (Story 2.2)

- `friendlyErrorMessage()` et le pattern `try/catch/finally`/`pending` restent utilisés tels quels partout où c'est pertinent, mais **pas** pour le cochage de case (Task 2) : cette action n'a délibérément aucun état `pending` visible (UX-DR5), l'échec se traduit uniquement par l'annulation silencieuse de la mise à jour optimiste.
- Le pattern `ignore`/`retry` de l'effet de chargement (`ComposerPhrases`, repris tel quel par `GrilleEnDirecteScreen` en Story 2.2) est étendu ici pour charger `cases` et `joueurs` en parallèle plutôt que dupliqué en un second effet séparé.
- `GridCell` existe déjà (Story 2.2) avec sa rotation/ses coins irréguliers déjà calculés via `useMemo(() => ..., [])` — **ne pas retoucher ce calcul**, seulement ajouter l'interactivité et la coche par-dessus.
- Angle explicitement anticipé par la Story 2.2 (Dev Agent Record / Completion Notes) : *"2.3 devra convertir [les cases] en éléments interactifs"* — confirmé, c'est l'objet du Task 2 de cette story.
- `Joueur` tel que défini en Story 2.2 (`{ id, pseudo }`) doit être élargi (Task 3) — vérifié qu'aucun autre consommateur de ce type n'existe dans le code actuel en dehors de `RejoindrePartieScreen.tsx`, `App.tsx` et `GrilleEnDirecteScreen.tsx`.
- Rappel du piège GRANT (Stories 1.2, 2.1, 2.2) : RLS filtre les lignes mais ne remplace pas les privilèges Postgres — s'applique ici à `grant update (checked) on cases`, sans lequel PostgREST refuse tout `PATCH` avant même d'évaluer la policy.

### Project Structure Notes

```
bingo/
  src/
    App.tsx                                    # MODIFIÉ — type Joueur élargi (partieId)
    features/
      rejoindre-partie/
        RejoindrePartieScreen.tsx               # MODIFIÉ — propage partie_id vers onRejoint
      grille-en-direct/
        GrilleEnDirecteScreen.tsx               # MODIFIÉ — cochage optimiste, canal Realtime, toast, badge, avatar-stack
        GrilleEnDirecteScreen.css               # MODIFIÉ — coche, toast, live-badge, avatar-stack
  supabase/
    migrations/
      <timestamp>_cocher_case_temps_reel.sql    # NOUVEAU — policy update cases.checked, grant colonne, publication Realtime
```

Aucun nouveau dossier de feature — tout le travail de cette story s'inscrit dans `grille-en-direct/` déjà créé par la Story 2.2, plus une petite propagation de donnée à travers `rejoindre-partie/` et `App.tsx`.

### References

- [Source: epics.md#Story 2.3: Jouer en temps réel — cocher ses cases et suivre la partie]
- [Source: prd.md#FR-3 (propagation aux joueurs déjà en partie), FR-10 : cochage déclaratif, NFR-1 : propagation en quelques secondes]
- [Source: ARCHITECTURE-SPINE.md#AD-6 — Cases référencent une Phrase, #AD-7 — Realtime Postgres Changes uniquement (liste des tables), #AD-8 — RLS par ligne (écriture `checked` uniquement)]
- [Source: EXPERIENCE.md#Component Patterns — grid-cell/live-badge/avatar-stack/toast, #State Patterns — case cochée/non cochée, #Interaction Primitives — pas de spinner ni confirmation sur le cochage]
- [Source: DESIGN.md#Components — grid-cell (checkedMark), toast, live-badge, avatar-stack]
- [Source: 2-2-rejoindre-une-partie-et-recevoir-sa-grille-personnelle.md#Dev Notes — portée du Task 2 "2.3 devra convertir en éléments interactifs", RLS `cases`/`phrases` déjà scopée à toute la partie, absence de `joueurs` dans AD-7]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session — aucune action requise.
- Vérifié avant la migration que `pg_publication_tables` ne contenait aucune ligne pour `supabase_realtime` (confirmé au moment de la rédaction de la story) ; confirmé après application que `cases`/`phrases` y apparaissent.
- Vérification par appels directs à l'API REST/RPC Supabase pour les mutations (PATCH `cases`), et par deux scripts Node autonomes (`@supabase/supabase-js`, exécutés depuis la racine du projet pour résoudre `node_modules`, supprimés après usage) pour le Realtime lui-même — un `curl` ne peut pas maintenir une connexion WebSocket, contrairement aux stories précédentes qui ne nécessitaient que du REST/RPC synchrone.
- Séquence de vérification : 2 identités anonymes (Alice23, Bob23) rejointes à la partie de test résiduelle (`code_partie=97042656`, Story 2.2). `PATCH /rest/v1/cases` sur sa propre case → `200` ; même `PATCH` en ajoutant `phrase_id` dans le corps → `403 permission denied for table cases` (confirme le grant colonne) ; `PATCH` sur la case d'un autre joueur → `200` avec `[]` (RLS bloque silencieusement, 0 ligne affectée). Script Node : client B abonné au canal `partie:<id>` reçoit bien les deux événements `UPDATE` (`checked:false` puis `checked:true`) déclenchés par le client A sur sa propre case, avec `joueur_id`/`phrase_id` présents dans `payload.new` (confirme qu'aucun `REPLICA IDENTITY FULL` n'est nécessaire). Deuxième script : le créateur corrige une phrase du pool via `PATCH /rest/v1/phrases`, le client B (abonné, aucun rapport direct avec le créateur) reçoit l'événement `UPDATE` avec le nouveau texte en quelques secondes.
- Nettoyage : texte de la phrase de test restauré à sa valeur d'origine après le test de propagation ; comptes anonymes (Alice23, Bob23) et leurs `joueurs`/`cases` supprimés après vérification (cascade via `auth.users`) ; un compte anonyme résiduel non créé par cette story (pseudo "test o", probablement une manipulation manuelle de l'utilisateur via le serveur `vite` déjà en cours d'exécution) repéré et volontairement laissé intact, comme en Story 2.2.

### Completion Notes List

- Toutes les tasks (1 à 6) implémentées et vérifiées.
- Migration `supabase/migrations/20260708211517_cocher_case_temps_reel.sql` : policy `update` sur `cases` scopée au joueur propriétaire, `grant update (checked)` colonne par colonne (AD-8), activation de la publication Realtime pour `cases`/`phrases` uniquement (AD-7, périmètre strict de cette story).
- `RejoindrePartieScreen.tsx`/`App.tsx` : type `Joueur` élargi avec `partieId`, propagé depuis la ligne retournée par `rejoindre_partie` jusqu'à `GrilleEnDirecteScreen`.
- `GrilleEnDirecteScreen.tsx` : chargement parallèle (`Promise.all`) des `cases` et de la liste des `joueurs` de la partie ; canal Realtime unique ouvert après succès du chargement (fetch-then-subscribe), deux écoutes (`cases`, `phrases`) sans filtre serveur (RLS scope déjà la diffusion) ; `GridCell` devient un `<button>` interactif avec mise à jour optimiste et annulation silencieuse en cas d'échec, coche visuelle terracotta en coin haut-droit ; toast (un seul à la fois, auto-disparition ~4s) pour les cochages des autres joueurs (jamais les siens, jamais les décochages) ; `live-badge` statique et `avatar-stack` (jusqu'à 3 + compteur, couleurs cycliques) à partir de la liste de joueurs chargée une seule fois (pas d'abonnement `joueurs`, absent d'AD-7).
- Vérification : cochage restreint à ses propres cases et à la seule colonne `checked` (AD-8) confirmé par appels API directs ; propagation Realtime des cochages et des corrections de phrase confirmée bout-en-bout via deux scripts Node avec deux identités distinctes. `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Données de test (2 comptes anonymes, leurs `joueurs`/`cases`) nettoyées après coup ; texte de phrase de test restauré à l'identique.

### File List

- `supabase/migrations/20260708211517_cocher_case_temps_reel.sql` (nouveau)
- `src/App.tsx` (modifié — type `Joueur` élargi avec `partieId`)
- `src/features/rejoindre-partie/RejoindrePartieScreen.tsx` (modifié — propage `partie_id` vers `onRejoint`)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` (modifié — cochage optimiste, canal Realtime, toast, live-badge, avatar-stack)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.css` (modifié — coche, toast, live-badge, avatar-stack, header)

## Change Log

- 2026-07-08 : Implémentation complète (Tasks 1 à 6) — migration `cocher_case_temps_reel` (policy update `cases.checked`, grant colonne, publication Realtime pour `cases`/`phrases`), cochage optimiste avec coche visuelle, notifications temps réel des cochages des autres joueurs (toast), propagation temps réel des corrections de phrase, badge "en direct" et pile d'avatars. Vérifié via appels API directs et deux scripts Node de bout-en-bout pour le Realtime (deux identités distinctes). Statut passé à "review".
- 2026-07-08 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor — ce dernier n'a remonté aucune violation d'AC) — 6 patches appliqués (repli générique du toast pour un joueur arrivé après le montage, détection d'un succès-fantôme filtré par RLS sur le cochage via `.select()`, échec de la liste des joueurs découplé du blocage de la grille, `Array.from` au lieu de `charAt` pour l'initiale d'avatar, `appearance: none` sur `.grid-cell`, `aria-pressed` sur le bouton de case), 9 signalements écartés (dont un faux positif vérifié empiriquement, et plusieurs risques déjà explicitement documentés/acceptés dans cette story ou conformes à des conventions déjà établies ailleurs dans le projet). `npm run build`/`npm run lint` et un test de non-régression API repassés après les correctifs. Statut passé à "done".
