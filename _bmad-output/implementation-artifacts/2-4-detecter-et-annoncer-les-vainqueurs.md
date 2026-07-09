---
baseline_commit: 88c4526
---

# Story 2.4: Détecter et annoncer le(s) vainqueur(s)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a joueur,
I want que la victoire soit annoncée automatiquement dès qu'une ligne, colonne ou diagonale est complétée,
so that tout le monde le sache en même temps, sans ambiguïté.

## Acceptance Criteria

1. **Given** un cochage vient d'être écrit
   **When** la fonction/trigger Postgres (SECURITY DEFINER, AD-3) détecte une ligne/colonne/diagonale entièrement cochée pour ce joueur
   **Then** il est inséré dans `parties_vainqueurs` — jamais calculé ou écrit côté client

2. **Given** deux joueurs complètent une ligne gagnante quasi simultanément
   **When** la fonction traite les deux cochages
   **Then** les deux sont déclarés co-vainqueurs, sans départage strict basé sur l'ordre exact de réception

3. **Given** un vainqueur est inséré dans `parties_vainqueurs`
   **When** tous les clients abonnés à cette table (AD-7) reçoivent l'événement
   **Then** chacun voit l'overlay "Vainqueur : {nom} 🎉" apparaître en temps réel sans action manuelle, de façon persistante (UX-DR6), et peut le fermer pour continuer à voir sa grille sans que la partie ne se ferme

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — table `parties_vainqueurs`, détection de victoire, publication Realtime (AC: #1, #2)
  - [x] Générer via `supabase migration new detecter_victoire`
  - [x] `create table parties_vainqueurs (partie_id uuid not null references parties(id) on delete cascade, joueur_id uuid not null references joueurs(id) on delete cascade, declared_at timestamptz not null default now(), primary key (partie_id, joueur_id));` — clé composite `(partie_id, joueur_id)`, exactement l'ERD de la spine (`ARCHITECTURE-SPINE.md` — "co-vainqueurs modélisés par une table de jonction … jamais un champ singulier") ; la PK compose sert aussi de garde d'idempotence naturelle (voir plus bas)
  - [x] `alter table parties_vainqueurs enable row level security;` puis `create policy "Joueur lit les vainqueurs de sa partie" on parties_vainqueurs for select using (est_dans_la_partie(partie_id));` — réutiliser la fonction `est_dans_la_partie(uuid)` déjà créée en Story 2.2 (migration `20260708200136_rejoindre_partie.sql`), ne pas la redéfinir
  - [x] `grant select on parties_vainqueurs to authenticated;` — **aucun grant insert/update/delete** : AD-8 est explicite ("Aucun client — créateur inclus — n'a de droit INSERT direct sur … `parties_vainqueurs`"), seule la fonction `SECURITY DEFINER` du trigger y écrit
  - [x] Fonction `detecter_victoire()` : `security definer`, `set search_path = ''`, `language plpgsql`, identifiants qualifiés `public.xxx` (même durcissement que `rejoindre_partie` et `empecher_modification_taille_si_partie_lancee`). Corps :
    - Calculer `v_cote` : `select round(sqrt(count(*)))::int from public.cases where joueur_id = new.joueur_id` (le nombre de cases d'un joueur est toujours un carré parfait, garanti par `rejoindre_partie` en Story 2.2)
    - Ligne complète : `exists (select 1 from public.cases where joueur_id = new.joueur_id and checked group by position / v_cote having count(*) = v_cote)`
    - Colonne complète : même requête avec `group by position % v_cote`
    - Diagonale principale : `count(*) = v_cote` sur les cases cochées où `(position / v_cote) = (position % v_cote)`
    - Anti-diagonale : `count(*) = v_cote` sur les cases cochées où `(position / v_cote) + (position % v_cote) = v_cote - 1`
    - **Ne pas utiliser d'astuce modulo `position % (v_cote ± 1)`** pour les diagonales — testé mentalement et rejeté : `position % (v_cote - 1) = 0` fait remonter à la fois la position `0` (coin haut-gauche, diagonale principale) et la position `v_cote² - 1` (coin bas-droit, diagonale principale aussi) comme faux positifs sur l'anti-diagonale pour `v_cote = 3`. Utiliser exclusivement l'arithmétique `position / v_cote` (ligne) et `position % v_cote` (colonne) explicite, comme ci-dessus
    - Si une des 4 conditions est vraie : résoudre `v_partie_id` via `select partie_id from public.joueurs where id = new.joueur_id`, puis `insert into public.parties_vainqueurs (partie_id, joueur_id) values (v_partie_id, new.joueur_id) on conflict (partie_id, joueur_id) do nothing;` — le `on conflict do nothing` rend l'insertion idempotente : un joueur qui complète une 2e ligne (ou dont le trigger est ré-évalué) ne provoque jamais d'erreur de clé dupliquée
  - [x] Trigger : `create trigger detecter_victoire_apres_cochage after update on cases for each row when (old.checked is distinct from true and new.checked = true) execute function detecter_victoire();` — le `when` restreint l'exécution à la seule transition décochée→cochée : ni les décochages, ni un `UPDATE` qui laisse `checked = true` inchangé ne déclenchent une évaluation inutile
  - [x] **Activer Realtime** pour la nouvelle table : `alter publication supabase_realtime add table parties_vainqueurs;` — périmètre strictement additif à cette story (`cases`/`phrases` déjà publiées depuis la Story 2.3), ne pas publier `parties`/`joueurs` par anticipation (réservé aux Stories 2.5/2.6)
  - [x] Appliquer avec `supabase migration up`

- [x] Task 2: Charger l'état initial des vainqueurs et s'abonner en temps réel (AC: #3)
  - [x] Dans `GrilleEnDirecteScreen.tsx`, étendre le `Promise.all` du chargement initial (déjà `cases` + `joueurs` depuis la Story 2.3) avec une 3e requête : `supabase.from('parties_vainqueurs').select('joueur_id').eq('partie_id', joueur.partieId)`. **Nécessaire** même si l'AC de cette story ne décrit que le chemin temps réel : un joueur qui (re)monte cet écran après qu'un vainqueur a déjà été déclaré (ex. reload de page) ne recevrait sinon jamais l'événement `INSERT` déjà passé — l'overlay resterait invisible en violation directe d'UX-DR6 ("élément persistant … jamais seulement transitoire"). Ne pas traiter l'échec de cette requête comme bloquant pour l'écran (même dégradation que `joueurs` en Story 2.3 : liste vide en cas d'erreur, la grille reste affichable)
  - [x] Résoudre les `joueur_id` en pseudos via la liste `joueurs` déjà chargée (même `Promise.all`) : `joueurId => joueurs.find(j => j.id === joueurId)?.pseudo ?? 'Un joueur'` — même repli générique que le toast de cochage (Story 2.3, patch de revue) pour le cas où le vainqueur n'est pas (encore) dans l'instantané `joueurs`
  - [x] Sur le canal Realtime déjà ouvert (`partie:${joueur.partieId}`, fetch-then-subscribe), ajouter une 3e écoute : `.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parties_vainqueurs' }, handleVainqueurEvent)`. Pas de filtre serveur par `partie_id` — même raisonnement qu'en Story 2.3 : la policy `select` `"Joueur lit les vainqueurs de sa partie"` scope déjà la diffusion Realtime elle-même (AD-7), la table `parties_vainqueurs` a en plus directement une colonne `partie_id` (contrairement à `cases`), donc pas besoin de la jointure via `joueurs` utilisée pour le filtrage RLS des `cases`
  - [x] `handleVainqueurEvent(payload)` : `payload.new` contient `{ joueur_id, partie_id, declared_at }`. Ajouter ce `joueur_id` à l'état des vainqueurs **en dédupliquant** (un même joueur ne doit jamais apparaître deux fois dans l'overlay même si le trigger insère pour plusieurs lignes gagnantes — bien que `on conflict do nothing` empêche déjà un doublon en base, un second événement `INSERT` réel ne peut de toute façon pas se produire pour le même joueur puisque la ligne existe déjà)

- [x] Task 3: Overlay "Vainqueur" persistant et non bloquant (AC: #3)
  - [x] Composant `VainqueurOverlay` interne à `GrilleEnDirecteScreen.tsx` (même colocalisation que `GridCell`/`LiveBadge`/`AvatarStack`, pas de fichier séparé), affiché uniquement si `vainqueurs.length > 0` **et** `overlayFerme === false`
  - [x] État local : `vainqueurs: string[]` (pseudos résolus, dédupliqués), `overlayFerme: boolean` (initialisé à `false`). Le bouton "Fermer" de l'overlay met `overlayFerme` à `true` — la grille reste visible et interactive en dessous (non bloquant, FR-12/UX-DR3 : "Vainqueur déclaré" est un état superposé de Grille en direct, pas une fermeture de partie)
  - [x] Quand un **nouveau** vainqueur arrive via `handleVainqueurEvent` (Task 2) après une fermeture précédente de l'overlay, remettre `overlayFerme` à `false` : un joueur qui a fermé l'overlay pour un premier vainqueur ne doit pas manquer l'annonce d'un co-vainqueur ultérieur (UX-DR6 : l'annonce ne doit jamais être manquée). Ne **pas** rouvrir l'overlay pour un vainqueur déjà connu (dédupliqué au Task 2)
  - [x] Microcopy (glossaire produit, majuscule sur "Vainqueur(s)", UX-DR7/EXPERIENCE.md Voice&Tone — l'exemple donné "Vainqueur : Karim 🎉" est le cas à un seul nom) :
    - 1 vainqueur : `Vainqueur : {pseudo} 🎉`
    - 2 vainqueurs : `Vainqueurs : {pseudo1} et {pseudo2} 🎉`
    - 3+ vainqueurs : `Vainqueurs : {pseudo1}, {pseudo2} et {pseudo3} 🎉` (jointure `", "` puis `" et "` avant le dernier nom)
  - [x] **Aucun composant `vainqueur-overlay` n'est défini dans `DESIGN.md.components`** ni dans les mockups (`direction-artisanal.html`, `carnet-checkmark-variants.html` — vérifié, aucun des deux ne mentionne "vainqueur"/"victoire"). Décision de design à prendre dans cette story, en restant strictement dans le vocabulaire déjà établi (pas de nouveau token de couleur/rayon) : carte `paper-card`, bordure **pointillée terracotta** (`1.5px dashed var(--color-terracotta)` — terracotta et non sage/moutarde : `DESIGN.md.Colors` réserve terracotta à "l'accent primaire … utilisé avec parcimonie pour rester repérable", exactement le profil d'un événement rare et important comme une victoire ; sage est déjà pris par les confirmations douces/toast, moutarde par le badge "en direct"/l'état de tension et n'est "jamais utilisée pour une action cliquable" — or cet overlay porte un bouton "Fermer"), légère rotation façon `toast`/`banner-reminder` (`0.4deg`), positionnée en carte fixe proche du haut de l'écran (`position: fixed`, sous le header `live-badge`/`avatar-stack`, au-dessus de la grille — jamais un scrim plein écran, cohérent avec "non bloquant")
  - [x] Bouton "Fermer" : style `cta-secondary` (transparent, bordure pointillée, texte encre) déjà existant dans `src/components/Button.tsx`/`Button.css` (réutiliser tel quel, ne pas créer un nouveau variant de bouton)
  - [x] **Ne jamais** implémenter de minuteur d'auto-disparition sur cet overlay (contrairement au `toast` de la Story 2.3) : UX-DR6 est explicite — "l'annonce du vainqueur est un élément persistant à l'écran, jamais seulement transitoire". Seule une fermeture manuelle par l'utilisateur (bouton "Fermer") peut le masquer

- [x] Task 4: Vérification manuelle (AC: #1 à #3)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Reprendre une partie de test avec plusieurs identités anonymes distinctes rejointes (même méthode que Stories 2.2/2.3 : scripts Node `@supabase/supabase-js` autonomes, exécutés depuis la racine du projet, supprimés après usage)
  - [x] Joueur A (Alice24) : `PATCH` sur `cases` pour cocher les 3 cases de la ligne 0 (positions 0,1,2, `v_cote=3`) → `parties_vainqueurs` contient bien `(partie_id, joueur_id_A)` immédiatement après le dernier cochage
  - [x] Cochage d'une case supplémentaire hors ligne chez Alice (déjà vainqueur) → aucune erreur, `on conflict do nothing` absorbe la ré-détection silencieusement
  - [x] Joueur B (Bob24) : anti-diagonale (positions 2,4,6) → vainqueur détecté. Joueur C (Charlie24, rejoint dans le même script) : colonne 0 (positions 0,3,6) → vainqueur détecté. Un 4e joueur (Dave24, script séparé) : diagonale principale (positions 0,4,8) → vainqueur détecté. Les 4 branches (ligne, colonne, diagonale principale, anti-diagonale) sont chacune vérifiées au moins une fois
  - [x] Abonnement Realtime : un joueur "Watcher24" s'abonne (`.subscribe()` avec attente explicite du statut `SUBSCRIBED` avant de déclencher le cochage, pour éviter un faux négatif de timing) pendant que "Dave24" complète sa diagonale → l'événement `INSERT` avec le bon `joueur_id` est reçu côté Watcher24 en moins de 2s
  - [x] `INSERT` direct sur `parties_vainqueurs` tenté côté client authentifié (Alice24) → `403 permission denied for table parties_vainqueurs` (`code: 42501`), confirme AD-8 (aucun grant `insert`)
  - [x] Relecture du code de `GrilleEnDirecteScreen.tsx` confirmée : résolution du pseudo par repli générique (`resoudrePseudo`), dédoublonnage des vainqueurs (`current.some(...)`), réouverture de l'overlay (`setOverlayFerme(false)`) à chaque nouvel événement `INSERT`, absence de tout `setTimeout` sur `VainqueurOverlay` (contrairement au `toast`)
  - [x] Données de test nettoyées : suppression des 5 comptes anonymes de test (`Alice24`, `Bob24`, `Charlie24`, `Watcher24`, `Dave24`) via `delete from auth.users` — cascade confirmée sur `joueurs`/`cases`/`parties_vainqueurs` (tables vidées après coup, vérifié par requête directe)

### Review Findings

**Patch:**

- [x] [Review][Patch] `setOverlayFerme(false)` s'exécute inconditionnellement dans le gestionnaire `INSERT` de `parties_vainqueurs`, même quand le vainqueur reçu est déjà connu (`current.some(...)` renvoie `true`, dédoublonnage silencieux) — contredit directement l'intention posée par cette story elle-même (Task 3 : "Ne pas rouvrir l'overlay pour un vainqueur déjà connu"). Un événement redélivré par Realtime (reconnexion brève, replay) rouvrirait donc un overlay qu'un joueur venait de fermer volontairement, sans qu'aucun nouveau vainqueur n'ait réellement été ajouté. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:159-164] — correctif appliqué : ajout d'un `vainqueurIdsRef` (miroir synchrone des ids déjà connus, initialisé au chargement initial), le handler ignore désormais tout `joueur_id` déjà présent avant d'ajouter l'entrée et de rouvrir l'overlay.
- [x] [Review][Patch] Le chargement initial de `parties_vainqueurs` (`select('joueur_id')`) n'a aucun `.order(...)`, alors que les vainqueurs arrivant via l'écoute Realtime sont ajoutés dans l'ordre d'arrivée — l'ordre d'affichage des co-vainqueurs dans l'overlay ("X et Y" vs "Y et X") peut donc différer entre un client qui recharge la page et un client resté connecté qui a vu les victoires se produire en direct. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:80] — correctif appliqué : `.order('declared_at')` ajouté à la requête initiale.

**Defer:**

- [x] [Review][Defer] `select partie_id into v_partie_id from public.joueurs where id = new.joueur_id` (fonction `detecter_victoire`) n'a aucune garde si la ligne `joueurs` est introuvable — `v_partie_id` resterait `NULL` et l'`INSERT` suivant sur `parties_vainqueurs` (colonne `not null`) lèverait une exception qui ferait échouer le `PATCH` de cochage lui-même. [supabase/migrations/20260709204605_detecter_victoire.sql] — deferred, actuellement inatteignable : aucune fonctionnalité de suppression/départ de joueur n'existe encore dans l'app (aucun code ne supprime une ligne `joueurs` en cours de partie) ; à réexaminer si une story future ajoute "quitter la partie" ou "exclure un joueur".
- [x] [Review][Defer] `v_cote` (`round(sqrt(count(*)))::int`) suppose que le nombre de cases d'un joueur est toujours un carré parfait, sans garde côté serveur dans cette migration — si ce nombre est un jour non carré (aucune contrainte DB ne force `count(phrases) = taille²` avant `lancer_partie`), le regroupement `position / v_cote` / `position % v_cote` se désaligne silencieusement. [supabase/migrations/20260709204605_detecter_victoire.sql] — deferred, écart pré-existant (pas introduit par cette story) : `GrilleEnDirecteScreen.tsx` se défend déjà côté client depuis la Story 2.3 (`!Number.isInteger(Math.sqrt(casesData.length))` bloque l'écran), mais rien n'empêche `lancer_partie`/`rejoindre_partie` d'être appelés sur une grille dont le nombre de phrases ne correspond pas à `taille²` — hors périmètre de cette story de détection de victoire.
- [x] [Review][Defer] Deux cases d'un même joueur cochées via deux requêtes `PATCH` quasi simultanées (tap rapide) peuvent chacune s'exécuter dans une transaction qui ne voit pas encore l'`UPDATE` non commité de l'autre — si ces deux cases sont justement les deux dernières d'une ligne gagnante, aucune des deux exécutions du trigger ne verrait la ligne complète à cet instant précis. [supabase/migrations/20260709204605_detecter_victoire.sql] — deferred : la victoire se re-détecterait automatiquement au prochain cochage de ce joueur (le trigger réévalue l'état complet à chaque déclenchement), risque borné à "victoire non annoncée tant qu'aucune autre case n'est cochée" ; cohérent avec le risque de course déjà accepté et documenté en Story 2.3 pour les mises à jour optimistes concurrentes (SM-C1, pas de file d'attente pour un jeu entre proches).
- [x] [Review][Defer] Aucune région `aria-live`/`role="alert"` ni gestion de focus sur `VainqueurOverlay` — un lecteur d'écran ne serait pas averti automatiquement de l'apparition de l'annonce. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx — `VainqueurOverlay`] — deferred : non requis par le plancher d'accessibilité explicite de cette story (UX-DR6 exige la persistance de l'annonce, satisfaite — pas de sémantique ARIA spécifique), même catégorie de dette déjà différée pour d'autres écrans (Stories 1.2, 2.1).

**Dismissed:**

- Résolution du pseudo d'un vainqueur absent de l'instantané `joueurs` chargé au montage (repli "Un joueur") — comportement explicitement accepté et documenté dans les Dev Notes de cette story (Previous Story Intelligence), identique au repli déjà validé pour le toast de cochage en Story 2.3.
- Hypothèse d'indexation `position` 0-indexée et remplie en ordre ligne-major pour le calcul des diagonales — vérifiée exacte par recoupement avec `rejoindre_partie` (Story 2.2, `row_number() over (order by random()))::int - 1`) et avec l'ordre de rendu de la grille (`.order('position')`, Story 2.2/2.3) : aucune divergence trouvée.
- Coût de calcul du trigger (3 group-by sur les cases d'un joueur à chaque cochage) — négligeable à l'échelle de grilles 3×3 à 5×5 (SM-C1, pas de sur-ingénierie pour un jeu entre proches).
- `alter publication supabase_realtime add table parties_vainqueurs` sans garde d'idempotence — convention déjà établie et déjà écartée pour le même motif en Story 2.3 (aucune migration du projet n'utilise `IF NOT EXISTS`/rollback).
- Absence de tests automatisés sur la fonction SQL de détection ou la logique front — SM-C1, aucun framework de test imposé, cohérent avec toutes les stories précédentes.
- `formatNomsVainqueurs` indexerait hors limites sur un tableau vide — faux positif : le seul point d'appel (`VainqueurOverlay`) n'est jamais rendu avec un tableau vide, gardé par la condition parente `vainqueurs.length > 0`.
- Absence de contrainte d'unicité sur les pseudos au sein d'une partie (deux vainqueurs pourraient afficher le même nom) — non requis par un AC, déjà accepté pour le même motif en Story 2.3.
- Chevauchement visuel/`z-index` entre `.toast` (bas d'écran) et `.vainqueur-overlay` (haut d'écran) — faux positif : les deux éléments sont ancrés à des extrémités opposées de l'écran (`bottom` vs `top`), vérifié dans le CSS complet, aucun chevauchement possible.
- `overlayFerme` non persisté, réinitialisé à `false` à chaque remontage — comportement intentionnel et documenté par cette story elle-même (Task 2 : un joueur qui remonte l'écran après une victoire déjà déclarée doit revoir l'overlay, conformément à UX-DR6).
- `payload.new.joueur_id` potentiellement `undefined` dans l'événement Realtime — inatteignable : colonne `not null` en base, le tuple `new` d'un `INSERT` contient toujours toutes les colonnes (déjà établi en Story 2.3).

## Dev Notes

- **Portée volontairement étroite** : cette story détecte et annonce le(s) vainqueur(s), rien de plus. Ne construit ni la clôture de partie (Story 2.5 — le CTA "Clôturer la Partie" et le masquage du badge "en direct" restent hors périmètre), ni le rappel de partie en cours non clôturée (Story 2.5), ni la reconnexion formelle après coupure réseau (Story 2.6, AD-10 — même si cette story charge l'état initial des vainqueurs au montage par nécessité directe d'AC #3/UX-DR6, ce n'est pas une implémentation de la garantie de reconnexion complète que 2.6 formalisera pour `cases`/`parties`). Ne pas anticiper ces stories.
- **AD-3 est absolu** : aucun calcul de victoire côté client, à aucun moment — même pas une pré-vérification optimiste avant que le trigger confirme. Le client se contente d'écrire `cases.checked` (déjà fait en Story 2.3) et d'observer `parties_vainqueurs` par abonnement.
- **Le trigger tourne dans la même transaction que le `PATCH` de cochage** (`AFTER UPDATE ... FOR EACH ROW`) : toute exception non gérée dans `detecter_victoire()` ferait échouer le cochage lui-même. C'est précisément pourquoi `on conflict (partie_id, joueur_id) do nothing` est indispensable et non cosmétique — sans lui, une ré-détection (2e ligne complétée par un joueur déjà vainqueur) lèverait une erreur de clé dupliquée qui ferait échouer silencieusement le `PATCH` de cochage suivant coté client (l'update optimiste s'annulerait sans raison apparente pour l'utilisateur).
- **Pourquoi la détection par joueur individuel gère nativement les co-vainqueurs (AC #2) sans code dédié** : chaque `UPDATE` sur `cases` porte sur les cases d'un seul joueur (RLS `AD-8`), donc chaque déclenchement du trigger n'évalue que l'état de ce joueur. Deux joueurs qui complètent une ligne "en même temps" le font via deux `UPDATE` distincts sur des lignes différentes de `cases`, chacun dans sa propre transaction — Postgres ne les sérialise pas entre eux (aucun verrou partagé), donc les deux insertions dans `parties_vainqueurs` se produisent indépendamment, sans ordre imposé ni vérification croisée. Ne pas essayer d'introduire une logique de "premier arrivé" : ce serait un contresens vis-à-vis d'AC #2 et du principe directeur d'EXPERIENCE.md ("la confiance plutôt que l'arbitrage").
- **Aucun composant DESIGN.md dédié à l'annonce de vainqueur** — voir Task 3 pour la décision de design (bordure pointillée terracotta, réutilisation de `cta-secondary` pour "Fermer"). Si le design final diverge, rester dans le vocabulaire de tokens existant (`DESIGN.md.colors`/`rounded`/`spacing`) plutôt que d'introduire de nouvelles valeurs.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs, comme toutes les stories précédentes. E2E navigateur complet toujours indisponible dans ce sandbox.

### Previous Story Intelligence (Story 2.3)

- Le pattern fetch-then-subscribe (un seul `useEffect`, `Promise.all` pour le chargement initial, canal Realtime ouvert seulement après succès, cleanup `supabase.removeChannel` au démontage) est déjà en place dans `GrilleEnDirecteScreen.tsx` — cette story l'**étend** (3e requête au `Promise.all`, 3e écoute sur le canal existant), elle ne crée pas un second effet ni un second canal.
- Le repli générique pour un pseudo introuvable (`?? 'Un joueur'` / `'Un joueur'`) a été introduit en revue de la Story 2.3 pour le toast de cochage — appliquer exactement le même principe pour l'overlay de vainqueur plutôt que d'inventer un traitement différent.
- `joueurs` n'est jamais temps réel (absent d'AD-7, confirmé Story 2.3) : un joueur qui rejoint après coup peut donc rester "Un joueur" dans l'overlay s'il gagne avant d'apparaître dans un instantané `joueurs` rafraîchi — comportement accepté, cohérent avec la Story 2.3 (déjà écarté en revue pour le même type de repli sur le toast).
- Rappel du piège GRANT (Stories 1.2, 2.1, 2.2, 2.3) : RLS filtre les lignes mais ne remplace pas les privilèges Postgres — s'applique ici à l'absence totale de grant `insert`/`update`/`delete` sur `parties_vainqueurs` à `authenticated` (seul `select` est accordé, Task 1).
- La Story 2.3 a laissé l'état "tension" (liseré moutarde, case proche de compléter une ligne) explicitement hors périmètre, au motif qu'il chevauche la détection de victoire de cette story. Cette story 2.4 ne le construit pas non plus — l'AC #3 de cette story ne demande qu'un overlay au moment de la victoire complète, pas un indicateur de progression avant. Ne pas l'ajouter par anticipation.

### Project Structure Notes

```
bingo/
  src/
    features/
      grille-en-direct/
        GrilleEnDirecteScreen.tsx    # MODIFIÉ — chargement + abonnement parties_vainqueurs, VainqueurOverlay
        GrilleEnDirecteScreen.css    # MODIFIÉ — styles de l'overlay de vainqueur
  supabase/
    migrations/
      <timestamp>_detecter_victoire.sql   # NOUVEAU — table parties_vainqueurs, RLS, fonction/trigger de détection, publication Realtime
```

Aucun nouveau dossier de feature — tout le travail s'inscrit dans `grille-en-direct/` déjà créé par la Story 2.2. Réutiliser `src/components/Button.tsx` (variant `cta-secondary`/`secondary`) pour le bouton "Fermer", ne pas créer de nouveau composant bouton.

### References

- [Source: epics.md#Story 2.4: Détecter et annoncer le(s) vainqueur(s)]
- [Source: epics.md#FR-11 (détection ligne/colonne/diagonale, co-vainqueurs sans départage), FR-12 (notification temps réel, partie reste ouverte)]
- [Source: ARCHITECTURE-SPINE.md#AD-3 — détection de victoire côté serveur, #AD-7 — Realtime Postgres Changes (liste des tables incluant parties_vainqueurs), #AD-8 — RLS par ligne (aucun INSERT client sur parties_vainqueurs)]
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions — parties_vainqueurs modélisée comme table de jonction (partie_id, joueur_id, declared_at), jamais un champ singulier]
- [Source: EXPERIENCE.md#State Patterns — "Vainqueur déclaré (partie ouverte)" : overlay non bloquant, fermable, le CTA de clôture reste au même endroit]
- [Source: EXPERIENCE.md#Accessibility Floor — l'annonce du vainqueur est un élément persistant, jamais seulement transitoire]
- [Source: EXPERIENCE.md#Voice and Tone — "Vainqueur : Karim 🎉"]
- [Source: DESIGN.md#Colors — usage de terracotta comme accent primaire rare, sage réservé aux confirmations douces, moutarde jamais cliquable]
- [Source: 2-3-jouer-en-temps-reel-cocher-ses-cases-et-suivre-la-partie.md#Dev Notes — pattern fetch-then-subscribe, repli générique de pseudo, joueurs non temps réel, piège GRANT]
- [Source: supabase/migrations/20260708200136_rejoindre_partie.sql — fonction `est_dans_la_partie(uuid)` réutilisée pour la policy select de `parties_vainqueurs`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session — aucune action requise.
- Vérifié avant la migration que `pg_publication_tables` ne contenait que `phrases`/`cases` (héritage Story 2.3) ; confirmé après application que `parties_vainqueurs` y apparaît aussi.
- Vérification par deux scripts Node autonomes (`@supabase/supabase-js`, exécutés depuis la racine du projet pour résoudre `node_modules`, supprimés après usage) : le premier couvre ligne/anti-diagonale/colonne et la ré-détection idempotente sur un joueur déjà vainqueur (3 identités : Alice24, Bob24, Charlie24, réutilisant la partie de test résiduelle `code_partie=97042656`, Story 2.2/2.3) ; le second couvre spécifiquement la diagonale principale et l'abonnement Realtime avec attente explicite du statut `SUBSCRIBED` avant de déclencher le cochage (2 identités supplémentaires : Watcher24, Dave24) — un premier essai sans cette attente explicite n'avait reçu aucun événement (faux négatif de timing, pas un bug applicatif : le `.subscribe()` sans callback de statut ne garantit pas que l'abonnement est effectif avant que le script ne poursuive).
- Séquence de vérification détaillée : Alice24 coche positions 0,1,2 (ligne) → `parties_vainqueurs` contient sa ligne immédiatement ; cochage d'une case hors ligne chez Alice (déjà vainqueur) → aucune erreur (`on conflict do nothing`) ; Bob24 coche positions 2,4,6 (anti-diagonale) → détecté ; Charlie24 coche positions 0,3,6 (colonne) → détecté ; Dave24 coche positions 0,4,8 (diagonale principale) pendant que Watcher24 est abonné en Realtime → événement `INSERT` reçu avec le bon `joueur_id` en moins de 2s ; tentative d'`INSERT` direct côté client (Alice24) sur `parties_vainqueurs` → `403 permission denied` (`code 42501`), confirme AD-8.
- Nettoyage : les 5 comptes anonymes de test (Alice24, Bob24, Charlie24, Watcher24, Dave24) supprimés via `delete from auth.users` ; cascade vérifiée sur `joueurs`/`cases`/`parties_vainqueurs` (tables vides après coup pour cette partie de test).

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- Migration `supabase/migrations/20260709204605_detecter_victoire.sql` : table `parties_vainqueurs` (clé composite `partie_id`/`joueur_id`), policy `select` réutilisant `est_dans_la_partie` (Story 2.2), grant `select` seul (AD-8), fonction `detecter_victoire()` (SECURITY DEFINER) détectant ligne/colonne/diagonale principale/anti-diagonale par arithmétique explicite `position / v_cote` et `position % v_cote` (pas d'astuce modulo sur la position brute, source de faux positifs identifiée et évitée), trigger `AFTER UPDATE ... WHEN (transition décochée→cochée)` avec insertion idempotente (`on conflict do nothing`), publication Realtime activée pour `parties_vainqueurs`.
- `GrilleEnDirecteScreen.tsx` : chargement initial étendu (3e requête `parties_vainqueurs` dans le `Promise.all` déjà existant) pour qu'un joueur qui (re)monte l'écran après une victoire déjà déclarée voie quand même l'overlay (nécessaire pour UX-DR6, pas seulement le chemin temps réel décrit par l'AC) ; 3e écoute Realtime (`INSERT` sur `parties_vainqueurs`) sur le canal déjà ouvert ; état `vainqueurs`/`overlayFerme` ; composant `VainqueurOverlay` (persistant, pas d'auto-disparition, bouton "Fermer" réutilisant `Button variant="secondary"`) ; microcopy pluralisée pour les co-vainqueurs ("Vainqueur :" / "Vainqueurs : … et …") ; réouverture automatique de l'overlay sur nouveau vainqueur après une fermeture précédente.
- `GrilleEnDirecteScreen.css` : nouveau bloc `.vainqueur-overlay`/`.vainqueur-overlay__texte` — décision de design documentée en Dev Notes (aucun composant dédié dans `DESIGN.md`), bordure pointillée terracotta plutôt que sage/moutarde.
- Vérification : les 4 branches de détection (ligne, colonne, diagonale principale, anti-diagonale) et l'idempotence sur ré-détection confirmées par appels API directs ; propagation Realtime de l'événement `INSERT` confirmée bout-en-bout ; refus de l'`INSERT` client direct confirmé (AD-8). `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Données de test (5 comptes anonymes, leurs `joueurs`/`cases`/`parties_vainqueurs`) nettoyées après coup ; scripts Node temporaires supprimés.

### File List

- `supabase/migrations/20260709204605_detecter_victoire.sql` (nouveau)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` (modifié — chargement + abonnement `parties_vainqueurs`, `VainqueurOverlay`)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.css` (modifié — styles de l'overlay de vainqueur)

## Change Log

- 2026-07-09 : Implémentation complète (Tasks 1 à 4) — migration `detecter_victoire` (table `parties_vainqueurs`, RLS, fonction/trigger de détection de victoire SECURITY DEFINER, publication Realtime), chargement initial + abonnement temps réel des vainqueurs, overlay "Vainqueur"/"Vainqueurs" persistant et non bloquant. Vérifié via scripts Node de bout-en-bout couvrant les 4 branches de détection, l'idempotence, le Realtime et le refus d'écriture client directe. Statut passé à "review".
- 2026-07-09 : Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor — ce dernier n'a remonté aucune violation d'AC) — 2 patches appliqués (garde `vainqueurIdsRef` empêchant la réouverture de l'overlay sur un vainqueur déjà connu, `.order('declared_at')` sur le chargement initial des vainqueurs), 4 éléments différés vers `deferred-work.md` (garde manquante sur la résolution joueur→partie dans le trigger, hypothèse de carré parfait non gardée côté serveur, course MVCC étroite sur deux cochages quasi simultanés du même joueur, absence d'ARIA live sur l'overlay), 10 signalements écartés (dont plusieurs faux positifs vérifiés et des conventions déjà établies dans le projet). `npm run build`/`npm run lint` et un test de non-régression API repassés après les correctifs. Statut passé à "done".
