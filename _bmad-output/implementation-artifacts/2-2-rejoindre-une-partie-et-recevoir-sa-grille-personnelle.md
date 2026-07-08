---
baseline_commit: NO_VCS
---

# Story 2.2: Rejoindre une partie et recevoir sa grille personnelle

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a joueur (créateur ou invité),
I want rejoindre une partie via le lien et recevoir ma grille personnelle mélangée,
so that je commence à jouer.

## Acceptance Criteria

1. **Given** un lien/code de partie valide et moins de 6 joueurs déjà inscrits
   **When** un utilisateur (avec ou sans compte) rejoint
   **Then** la fonction serveur `rejoindre_partie` (SECURITY DEFINER, AD-9) l'inscrit comme Joueur et distribue aléatoirement les phrases du pool de la grille dans ses Cases, sans jamais reproduire la disposition d'un autre joueur de la même partie

2. **Given** une partie qui compte déjà 6 joueurs
   **When** un 7e utilisateur tente de rejoindre
   **Then** il voit "Cette Partie est complète (6 joueurs max)" à la place du champ pseudo — pas d'accès en lecture seule

3. **Given** un invité sans compte
   **When** il rejoint
   **Then** il utilise l'auth anonyme Supabase (AD-5) et saisit un pseudo temporaire, sans création de compte imposée
   **And** dès qu'il valide son pseudo, la transition vers Grille en direct est immédiate, sans écran d'attente affiché (UX-DR4)

4. **Given** le créateur qui vient de lancer sa partie
   **When** il rejoint sa propre partie
   **Then** il devient un Joueur comme les autres, via ce même mécanisme (FR-9)

5. **Given** un lien/code de partie mal formé ou correspondant à aucune partie existante
   **When** un utilisateur tente d'y accéder
   **Then** il voit le message "Cette Partie n'existe plus ou le lien est incorrect" — pas de redirection silencieuse vers la Bibliothèque (UX-DR4)

## Tasks / Subtasks

- [x] Task 1: Migration Postgres — tables `joueurs`/`cases`, RLS, fonction `rejoindre_partie` (AC: #1, #2, #3, #4, #5)
  - [x] Générer via `supabase migration new rejoindre_partie`
  - [x] Table `joueurs` : `id uuid primary key default gen_random_uuid()`, `partie_id uuid not null references parties(id) on delete cascade`, `auth_user_id uuid not null references auth.users(id) on delete cascade`, `compte_id uuid references auth.users(id) on delete set null` (nullable — `null` pour un invité, `auth.uid()` pour un compte persistant ; distinction posée maintenant car elle sera lue telle quelle par la Story 2.7 pour masquer l'historique des invités, ne pas la reconstruire plus tard), `pseudo text not null check (char_length(trim(pseudo)) > 0 and char_length(pseudo) <= 40)`, `created_at timestamptz not null default now()`, `unique (partie_id, auth_user_id)` (empêche une même identité de compter deux fois dans le plafond de 6, voir Dev Notes)
  - [x] `create index joueurs_partie_id_idx on joueurs (partie_id);`
  - [x] Table `cases` : `id uuid primary key default gen_random_uuid()`, `joueur_id uuid not null references joueurs(id) on delete cascade`, `phrase_id uuid not null references phrases(id) on delete cascade` (jamais de copie du texte, AD-6), `position int not null check (position >= 0)`, `checked boolean not null default false`, `unique (joueur_id, position)`
  - [x] `create index cases_joueur_id_idx on cases (joueur_id);`
  - [x] `alter table joueurs enable row level security; alter table cases enable row level security;`
  - [x] Fonction `est_dans_la_partie(p_partie_id uuid) returns boolean` : `language sql`, `security definer`, `set search_path = ''`, `stable` — `select exists (select 1 from public.joueurs where partie_id = p_partie_id and auth_user_id = auth.uid());`. **Obligatoire en `security definer`** : une policy `select` sur `joueurs` qui s'auto-référence directement (sans passer par cette fonction) est le piège RLS classique Supabase (récursion) — encapsuler la vérification dans une fonction `security definer` est le pattern recommandé pour l'éviter, ne pas écrire de policy auto-référencée en clair
  - [x] Fonction `meme_partie_que_moi(p_joueur_id uuid) returns boolean` : même style (`sql`, `security definer`, `set search_path = ''`, `stable`) — `select exists (select 1 from public.joueurs cible join public.joueurs moi on moi.partie_id = cible.partie_id where cible.id = p_joueur_id and moi.auth_user_id = auth.uid());` — sert uniquement à la policy `select` de `cases` (qui n'a pas de `partie_id` direct, voir ERD de la spine)
  - [x] `grant execute on function est_dans_la_partie(uuid) to authenticated; grant execute on function meme_partie_que_moi(uuid) to authenticated;`
  - [x] Policy select `"Joueur lit les joueurs de sa partie"` on `joueurs` : `using (est_dans_la_partie(partie_id))`
  - [x] Policy select `"Joueur lit les cases de sa partie"` on `cases` : `using (meme_partie_que_moi(joueur_id))` — volontairement **la partie entière**, pas seulement ses propres cases : la Story 2.3 doit pouvoir observer les cases des autres joueurs via Realtime (notification "X vient de cocher"), et AD-8 ne restreint que l'**écriture** à `checked` sur ses propres lignes, jamais la lecture
  - [x] Policy select supplémentaire `"Joueur lit sa partie"` on `parties` : `using (est_dans_la_partie(id))` — **comble l'angle mort documenté dans les Dev Notes de la Story 2.1** : la policy `select` existante sur `parties` (créateur uniquement) ne suffit pas pour qu'un Joueur/invité relise l'état de sa partie
  - [x] Policy select supplémentaire `"Joueur lit les phrases de sa partie"` on `phrases` : `using (exists (select 1 from cases c join joueurs j on j.id = c.joueur_id where c.phrase_id = phrases.id and j.auth_user_id = auth.uid()))` — nécessaire pour que le client lise `phrases.texte` par jointure depuis ses `cases` (AD-6) ; la policy `select` existante sur `phrases` (Story 1.2) ne couvre que le créateur propriétaire de la grille, pas les Joueurs distribués
  - [x] `grant select on joueurs to authenticated; grant select on cases to authenticated;` — **ne pas** accorder `insert`/`update` sur `joueurs`/`cases` à `authenticated` : AD-8 interdit explicitement tout INSERT client direct sur ces deux tables, seule la fonction `security definer` ci-dessous y écrit (les policies `insert`/`update` de `cases.checked` arrivent en Story 2.3, hors périmètre ici)
  - [x] Fonction `rejoindre_partie(p_code_partie text, p_pseudo text) returns joueurs` : `language plpgsql`, `security definer`, `set search_path = ''`, identifiants qualifiés par schéma (`public.parties`, `public.joueurs`, `public.cases`, `public.phrases`), même durcissement que `empecher_modification_taille_si_partie_lancee()` (Story 2.1) :
    1. `select * into v_partie from public.parties where code_partie = p_code_partie;` — si `not found`, `raise exception 'partie_introuvable';` (AC #5)
    2. Idempotence : `select * into v_joueur from public.joueurs where partie_id = v_partie.id and auth_user_id = auth.uid(); if found then return v_joueur; end if;` — **avant** la vérification du plafond, pour qu'un joueur déjà inscrit qui rappelle la fonction (double-clic, réessai réseau) ne soit jamais bloqué par une partie devenue complète entre-temps ni ne génère une deuxième distribution de cases
    3. `select count(*) into v_nb_joueurs from public.joueurs where partie_id = v_partie.id; if v_nb_joueurs >= 6 then raise exception 'partie_complete'; end if;` (AC #2)
    4. `insert into public.joueurs (partie_id, auth_user_id, compte_id, pseudo) values (v_partie.id, auth.uid(), case when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then null else auth.uid() end, trim(p_pseudo)) returning * into v_joueur;` — la distinction invité/compte se lit sur le claim JWT `is_anonymous` posé par l'auth anonyme Supabase (AD-5), jamais reconstruite côté client
    5. `insert into public.cases (joueur_id, phrase_id, position, checked) select v_joueur.id, phrase_id, (row_number() over (order by random()))::int - 1, false from public.phrases where grille_id = v_partie.grille_id;` — mélange aléatoire garanti indépendant par joueur (AC #1), positions 0-indexées contiguës
    6. `return v_joueur;`
  - [x] `grant execute on function rejoindre_partie(text, text) to authenticated;` — **pas** de grant à `anon` : le client s'assure d'avoir une session (compte existant ou `signInAnonymously()`, voir Task 2) avant d'appeler cette fonction, jamais en tant que visiteur non authentifié
  - [x] Appliquer avec `supabase migration up`

- [x] Task 2: Écran "Rejoindre une partie" (AC: #2, #3, #4, #5)
  - [x] Nouveau dossier `src/features/rejoindre-partie/` (nom imposé par la Structural Seed de la spine)
  - [x] `RejoindrePartieScreen.tsx` : props `{ codePartie: string; onRejoint: (joueur: { id: string; pseudo: string }) => void }`. État `pseudo`, `pending`, `message: string | null`, `etatTerminal: 'introuvable' | 'complete' | null`
  - [x] `handleRejoindre(event)` : `event.preventDefault()`, reprendre exactement le pattern `try/catch/finally` + `pending` de `AuthScreen.tsx`/`CreationGrilleScreen.tsx` (ne pas en créer une variante) :
    1. `const { data: { session } } = await supabase.auth.getSession(); if (!session) { const { error } = await supabase.auth.signInAnonymously(); if (error) { setMessage(...); return; } }` — ne signer anonymement **qu'au moment du submit**, jamais au montage de l'écran (ne pas créer un utilisateur anonyme juste parce que quelqu'un a ouvert un lien invalide et n'a rien soumis)
    2. `const { data: joueur, error } = await supabase.rpc('rejoindre_partie', { p_code_partie: codePartie, p_pseudo: pseudo.trim() })` — la fonction retourne une ligne unique (`returns joueurs`, pas `setof`), `data` est directement l'objet `joueurs`, pas besoin de `.single()`
    3. Sur erreur : tester `error.message` avec le même style regex que `friendlyErrorMessage()` existant — `/partie_introuvable/` → `setEtatTerminal('introuvable')`, `/partie_complete/` → `setEtatTerminal('complete')`, sinon `setMessage(friendlyErrorMessage())` générique (réessai possible, formulaire conservé)
    4. Sur succès : `onRejoint(joueur)`
  - [x] Rendu : si `etatTerminal === 'introuvable'`, afficher **uniquement** "Cette Partie n'existe plus ou le lien est incorrect." (pas de champ pseudo) — AC #5. Si `etatTerminal === 'complete'`, afficher **uniquement** "Cette Partie est complète (6 joueurs max)." (pas de champ pseudo) — AC #2. Sinon, afficher le formulaire pseudo (`input` requis, `maxLength={40}`, `disabled={pending}`) + `Button variant="primary"` "Rejoindre" (`cta-primary`, seule action principale de l'écran, cohérent avec Component Patterns d'EXPERIENCE.md) + `message` générique éventuel au-dessus
  - [x] Pas d'écran d'attente entre la validation du pseudo et la transition (AC #3) : `onRejoint` bascule directement l'écran parent, pas d'état intermédiaire "en cours de connexion" visible (le `pending` désactive juste le formulaire pendant l'appel, comme partout ailleurs dans le projet)
  - [x] `RejoindrePartieScreen.css` : réutiliser les tokens de `tokens.css` (`--color-paper-bg`, `--color-ink`, `--font-family`, etc.), même structure de classes que `AuthScreen.css` (écran de formulaire simple, une seule colonne)

- [x] Task 3: Routage `?partie=` + écran "Grille en direct" minimal (AC: #1, #3, #4)
  - [x] Dans `App.tsx` : `function lireCodePartieDepuisURL(): string | null { return new URLSearchParams(window.location.search).get('partie'); }`, appelée une fois via `useState(() => lireCodePartieDepuisURL())` pour capturer le code au premier rendu
  - [x] **Avant** tout autre `if` (avant même `loading`/`!session`) : si un code de partie est présent dans l'URL, l'app affiche `RejoindrePartieScreen` puis, une fois `onRejoint` déclenché, `GrilleEnDirecteScreen` — dans les deux cas en contournant `AuthScreen` et `BibliothequeScreen`, qu'une session existe déjà ou non (AC #3 : l'invité n'atterrit jamais sur la Bibliothèque ; ce même contournement s'applique aussi au créateur déjà connecté qui ouvre son propre lien, AC #4 — pas de branchement différent selon que l'utilisateur a un compte ou non, cohérent avec "il devient un Joueur comme les autres")
  - [x] État local dans `App.tsx` : `const [joueurRejoint, setJoueurRejoint] = useState<{ id: string; pseudo: string } | null>(null)` — si `codePartieRejoint && !joueurRejoint`, rendre `<RejoindrePartieScreen codePartie={codePartieRejoint} onRejoint={setJoueurRejoint} />` ; si `joueurRejoint`, rendre `<GrilleEnDirecteScreen joueur={joueurRejoint} />`
  - [x] Nouveau dossier `src/features/grille-en-direct/` (nom imposé par la Structural Seed)
  - [x] `GrilleEnDirecteScreen.tsx` : props `{ joueur: { id: string; pseudo: string } }`. Au montage, `supabase.from('cases').select('id, position, checked, phrases(texte)').eq('joueur_id', joueur.id).order('position')` (jointure vers `phrases` conforme à AD-6 — ne jamais stocker/lire le texte autrement que par cette jointure), état `chargement`/`cases` suivant le même pattern `ignore`/`retry` que `ComposerPhrases` (`CreationGrilleScreen.tsx`)
  - [x] Rendu grille : `const cote = Math.sqrt(cases.length)`, conteneur `display:grid; grid-template-columns: repeat(cote, 1fr); gap: var(--space-2)` (Layout & Spacing, `DESIGN.md`). Chaque case (`grid-cell`) : fond `--color-paper-card`, bordure `1.5px solid var(--color-ink)`, rotation aléatoire -1.2° à 1.2° et rayons de coin dépareillés 9-15px par coin (`DESIGN.md.Shapes`) — **calculer ces valeurs aléatoires une seule fois par case avec `useMemo(() => ..., [caseItem.id])`**, jamais à chaque rendu (sinon les cases tremblent visuellement à chaque re-render déclenché par un état non lié, ex. un futur toast en Story 2.3)
  - [x] Éléments de cette story **volontairement absents** de cet écran (portée serrée, voir Dev Notes) : pas de tap pour cocher (Story 2.3), pas de `live-badge`/`avatar-stack`/`toast` (données non chargées ici — `parties.statut` et la liste des autres joueurs, Story 2.3/2.5), pas d'overlay vainqueur (Story 2.4), pas d'abonnement Realtime ni de logique de reconnexion (Story 2.3/2.6, AD-10 s'applique à partir de là). Header simple : "Tu joues sous le nom {joueur.pseudo}" + la grille
  - [x] `GrilleEnDirecteScreen.css` : tokens du design system, pas de composants non listés ci-dessus

- [x] Task 4: Vérification manuelle (AC: #1 à #5)
  - [x] `npm run build` et `npm run lint` passent
  - [x] Reprendre une grille de test validée, lancer une partie (mécanisme Story 2.1) pour obtenir un `code_partie`
  - [x] Appeler `rejoindre_partie` en reproduisant `handleRejoindre` pour 3 identités différentes (le compte créateur, un compte anonyme, un 2e compte anonyme) : 3 lignes `joueurs` distinctes, chacune avec ses propres `cases` (mêmes `phrase_id` que le pool mais `position` mélangée différemment — comparer les triplets `(phrase_id, position)` entre les 3 joueurs pour confirmer qu'aucun n'a la même disposition, AC #1)
  - [x] Vérifier `compte_id` : `null` pour les 2 identités anonymes, égal à `auth_user_id` pour le compte créateur (AC #3, #4)
  - [x] Rappeler `rejoindre_partie` une 2e fois avec la même identité (même token) déjà inscrite : retourne la même ligne `joueurs` (même `id`), aucune ligne `cases` supplémentaire créée — confirme l'idempotence
  - [x] Inscrire 6 joueurs au total sur la même partie, puis tenter un 7e : `rejoindre_partie` échoue avec `partie_complete`, aucune ligne `joueurs`/`cases` créée pour ce 7e appel (AC #2)
  - [x] Appeler `rejoindre_partie` avec un `p_code_partie` inexistant : échoue avec `partie_introuvable` (AC #5)
  - [x] Depuis l'identité d'un joueur inscrit, `select` direct sur `cases`/`phrases`/`parties` (hors RPC) : lit ses propres cases, les phrases référencées, et sa partie — confirme que les nouvelles policies suffisent au rendu de `GrilleEnDirecteScreen` sans passer par le RPC
  - [x] Depuis un compte non inscrit à cette partie, tenter les mêmes `select` : aucune ligne retournée (RLS bloque, pas d'erreur mais résultat vide)
  - [x] Nettoyer les données de test (lignes `joueurs`/`cases` et comptes anonymes créés pendant la vérification), à l'identique de la méthode déjà utilisée en Story 2.1 (`psql`/`auth.users`)

### Review Findings

**Patch:**

- [x] [Review][Patch] `rejoindre_partie` ne vérifie jamais que le pool de `phrases` de la grille est non vide avant de distribuer les `cases` — si une `partie` référence une grille avec 0 (ou moins de N²) phrases, la fonction insère quand même une ligne `joueurs` et 0 (ou peu) lignes `cases`, puis retourne un succès. Côté client, `GrilleEnDirecteScreen` calcule `cote = Math.round(Math.sqrt(cases.length))` : avec `cases.length = 0`, `cote = 0` → `grid-template-columns: repeat(0, 1fr)` (CSS invalide) et un écran vide, indiscernable d'un chargement bloqué, sans aucun message d'erreur. [supabase/migrations/20260708200136_rejoindre_partie.sql:138-150, src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:57,80-96] — **décision (Allan, revue du 2026-07-08)** : correctif **client uniquement** — rendre `GrilleEnDirecteScreen` défensif face à un résultat vide/non carré (éviter le CSS invalide, afficher un message plutôt qu'un écran vide silencieux) ; pas de garde serveur ajoutée dans `rejoindre_partie`, pour rester cohérent avec la convention déjà établie du projet de ne jamais valider la complétude d'une grille côté base (Stories 1.2 à 2.1).
- [x] [Review][Patch] Race TOCTOU sur le plafond de 6 joueurs et sur la double-soumission idempotente — `select count(*) ... if v_nb_joueurs >= 6` puis l'`insert` sont deux instructions séparées sans verrou de ligne ; deux appels concurrents (identités différentes) peuvent tous deux lire un compte < 6 avant que l'un des deux ne commit, dépassant le plafond — cas explicitement cité comme à prévenir par AD-9 ("une course entre deux INSERT concurrents"). De même, deux appels concurrents de la **même** identité (double-clic, retry réseau) passent tous deux le `select ... if found then return` avant que l'un des deux insère, et le second lève une `unique_violation` brute (non interceptée), que le client `RejoindrePartieScreen` ne reconnaît pas (regex limitée à `partie_introuvable`/`partie_complete`) et affiche donc comme une erreur générique alors que la jonction a en fait réussi. [supabase/migrations/20260708200136_rejoindre_partie.sql:118-150]
- [x] [Review][Patch] `?partie=` vide dans l'URL (lien mal formé du type `?partie=` sans valeur) contourne silencieusement l'AC #5 — `URLSearchParams.get('partie')` renvoie `""`, une chaîne vide est falsy en JS, donc `if (codePartieRejoint)` dans `App.tsx` ne déclenche jamais l'écran "Rejoindre une partie" et l'app retombe sur le flux normal (Bibliothèque/Connexion) au lieu d'afficher "Cette Partie n'existe plus ou le lien est incorrect." [src/App.tsx:17-19,64]
- [x] [Review][Patch] Bouton "Réessayer" de `GrilleEnDirecteScreen` n'utilise pas le composant `Button` partagé (`<button className="cta-primary">` écrit à la main) alors que `RejoindrePartieScreen` et tous les écrans précédents du projet utilisent systématiquement `Button`. [src/features/grille-en-direct/GrilleEnDirecteScreen.tsx:80-82]

**Dismissed:**

- `friendlyErrorMessage()` dupliqué à l'identique dans `RejoindrePartieScreen.tsx` et `GrilleEnDirecteScreen.tsx` — cohérent avec la convention déjà établie et documentée du projet (petits helpers dupliqués plutôt qu'une abstraction partagée prématurée, cf. Story 2.1).
- Classe CSS `.grid-cell` non préfixée par un nom d'écran (`screen__element`) — délibéré : `grid-cell` est le nom du composant tel que défini dans `DESIGN.md.components`, même convention que les classes globales `cta-primary`/`cta-secondary` déjà utilisées par `Button.tsx`.
- Noms de table non qualifiés par schéma (`cases`/`joueurs` au lieu de `public.cases`/`public.joueurs`) dans la clause `using` de la policy "Joueur lit les phrases de sa partie" — cohérent avec les policies déjà écrites en Story 1.2/2.1 (ex. `"Créateur lit ses parties"` référence `grilles` sans préfixe) ; seules les fonctions `SECURITY DEFINER` (`search_path = ''`) exigent la qualification complète.
- `_bmad/.claude/settings.local.json` modifié dans le diff — fichier de permissions géré par le harness, sans rapport avec cette story, ne sera pas inclus dans le commit de la story.
- `useMemo` avec un tableau de dépendances vide (`[]`) au lieu de `[caseItem.id]` tel qu'écrit dans le Dev Notes de Task 3 — écart déjà documenté et assumé dans le Dev Agent Record (équivalent fonctionnel grâce à `key={caseItem.id}` sur le composant parent, évite un avertissement `oxlint`).
- `GrilleEnDirecteScreen` affiche `return null` pendant le chargement de ses `cases` (bref écran vide entre la transition et l'affichage de la grille) — même pattern `return null` pendant `chargement` utilisé à l'identique sur tous les écrans du projet depuis la Story 1.2, conforme à l'interdiction UX-DR5 des spinners visibles sur les actions courantes.
- Double cast `data as unknown as CaseJoueur[]` sur la réponse Supabase — cohérent avec l'absence de types générés pour ce projet (client Supabase créé sans générique `Database`) sur tout le reste du code.

## Dev Notes

- **Portée volontairement étroite** : cette story fait entrer un Joueur dans la partie et lui montre sa grille en lecture seule. Elle ne construit ni le cochage de case (`cases.checked` en écriture, Story 2.3), ni les notifications/abonnements Realtime (Story 2.3), ni la détection de victoire (Story 2.4), ni la clôture (Story 2.5), ni la reconnexion (Story 2.6, AD-10). Les policies `select` posées ici sur `joueurs`/`cases`/`parties`/`phrases` sont en revanche déjà dimensionnées pour ces stories suivantes (lecture à l'échelle de la partie entière, pas seulement de ses propres lignes) — ne pas les restreindre à "mes propres données uniquement" sous prétexte que rien ne l'exploite encore dans cette story.
- **AD-9 dit "une fonction serveur *unique*"** : ne pas ajouter de fonction séparée pour "vérifier si une partie est joignable avant de soumettre le pseudo". Le champ pseudo reste affiché par défaut ; c'est l'échec de l'appel `rejoindre_partie` (au submit) qui bascule l'écran vers les états "introuvable"/"complète" en remplacement du formulaire, jamais un aller-retour de pré-vérification séparé.
- **Piège RLS auto-référencée** : une policy `select` sur `joueurs` écrite directement en `using (exists (select 1 from joueurs ...))` est le déclencheur classique de "infinite recursion detected in policy for relation" chez Supabase/Postgres. La story impose de passer par les fonctions `security definer` `est_dans_la_partie`/`meme_partie_que_moi` (pattern officiellement recommandé par Supabase pour ce cas) — ne pas revenir à une policy auto-référencée en clair même si elle semble fonctionner en test rapide.
- **Auth anonyme = rôle `authenticated`** : `supabase.auth.signInAnonymously()` authentifie sous le rôle Postgres `authenticated` (pas `anon`), avec le claim JWT `is_anonymous: true`. Tous les GRANT de cette story visent `authenticated` — aucun GRANT vers `anon` n'est nécessaire ni voulu (voir refus explicite du grant `anon` sur `rejoindre_partie` au Task 1).
- **`compte_id` nullable sur `joueurs`** encode directement "a un historique consultable" vs "invité éphémère" — c'est la donnée que la Story 2.7 lira telle quelle pour masquer toute surface "mes parties" aux invités (FR-19). Ne pas la dériver autrement (ex. table à part, flag booléen séparé) : le champ existe déjà dans l'ERD de la spine précisément pour ça.
- **`unique (partie_id, auth_user_id)` sur `joueurs`** : sans cette contrainte + la vérification d'idempotence dans `rejoindre_partie`, un rechargement de page ou un double-clic sur "Rejoindre" créerait une 2e ligne `joueurs` (et une 2e distribution de `cases`) pour la même personne, gonflant artificiellement le plafond de 6 et cassant "ma grille" (laquelle des deux distributions est la bonne ?). C'est un vrai risque d'intégrité, traité maintenant — contrairement à la persistance "je reviens direct sur ma Grille en direct sans retaper mon pseudo après un rechargement", qui elle reste explicitement hors périmètre (Story 2.6 / AD-10 : ce sera le (re)montage de l'écran qui redemandera l'état complet, pas un mécanisme ad hoc introduit ici).
- **`?partie=` reste dans l'URL après un join réussi** — pas de nettoyage d'URL (`history.replaceState`) dans cette story : l'état `joueurRejoint` vit en mémoire React (comme le reste du routage de `App.tsx`, qui ne s'est jamais appuyé sur l'URL ailleurs). Un rechargement de page redemandera donc le pseudo (rejoint idempotent côté serveur, juste pas transparent côté client) — assumé, cf. point précédent.
- **Aucune policy `select` élargie sur `grilles`** dans cette story : `GrilleEnDirecteScreen` déduit le nombre de colonnes de la grille via `Math.sqrt(cases.length)`, pas besoin de lire `grilles.taille`/`grilles.nom`. Ne pas ajouter de policy pour afficher le nom de la grille sur cet écran — non requis par les AC, surface RLS supplémentaire non justifiée ici.
- Aucun framework de test imposé (SM-C1) — vérification manuelle et appels API/RPC directs, comme toutes les stories précédentes.

### Previous Story Intelligence (Story 2.1)

- `friendlyErrorMessage()` générique + le pattern `try/catch/finally` avec état `pending` sont identiques depuis la Story 1.1 — les reproduire sans variation. Le mapping d'erreur par regex sur `error.message` (comme `AuthScreen.tsx` le fait déjà pour "invalid login credentials"/"already registered") est le pattern à suivre pour distinguer `partie_introuvable`/`partie_complete` d'une erreur générique.
- Convention du lien posée en Story 2.1 : `${window.location.origin}?partie=${code_partie}` — cette story est celle qui lui donne un sens réel, ne pas réinventer une autre forme d'URL/routing (toujours pas de `react-router` dans le projet).
- Angle mort explicitement documenté par la Story 2.1 : la policy `select` sur `parties` ne couvrait que le créateur — cette story le corrige (Task 1).
- Rappel du piège GRANT (Story 1.2, 2.1) : RLS filtre les lignes mais ne remplace pas les privilèges Postgres — sans `grant select`/`grant execute` explicite à `authenticated`, PostgREST refuse la requête avant même d'évaluer les policies. S'applique ici aux 2 nouvelles tables et aux 3 nouvelles fonctions.
- `set search_path = ''` + identifiants qualifiés par schéma (`public.xxx`) à l'intérieur des fonctions `security definer` : convention posée par `empecher_modification_taille_si_partie_lancee()` en Story 2.1, à reproduire pour les 3 nouvelles fonctions de cette story.

### Git Intelligence Summary

- Commits récents (`c44df27` story 2.1, `4b54b00` stories 1.4-1.5, `d410e9c` réduction grille max 8×8→5×5, `e71ee4d` story 1.3) : chaque story = un commit unique couvrant migration + écran(s) + éventuel correctif de revue. Aucune convention de commit multiple par story observée — un seul commit "bmad - story X.Y" est le pattern établi.
- Chaque migration précédente suit strictement `supabase migration new <nom_court>` (jamais de nom de fichier écrit à la main) et est appliquée via `supabase migration up` (jamais `db reset`, qui effacerait les comptes de test existants) — à reproduire ici.

### Project Structure Notes

```
bingo/
  src/
    App.tsx                    # MODIFIÉ — lecture de ?partie= dans l'URL, contourne Auth/Bibliothèque
    features/
      rejoindre-partie/        # NOUVEAU — écran "Rejoindre une partie"
        RejoindrePartieScreen.tsx
        RejoindrePartieScreen.css
      grille-en-direct/        # NOUVEAU — écran "Grille en direct" (lecture seule dans cette story)
        GrilleEnDirecteScreen.tsx
        GrilleEnDirecteScreen.css
  supabase/
    migrations/
      <timestamp>_rejoindre_partie.sql   # NOUVEAU — tables joueurs/cases, RLS élargie sur parties/phrases, fonctions SECURITY DEFINER
```

Alignée sur la Structural Seed de la spine (noms de dossiers `rejoindre-partie`/`grille-en-direct` imposés, tables `joueurs`/`cases` de l'ERD).

**Variance connue et assumée** : `cases` n'a pas de colonne `partie_id` propre (fidèle à l'ERD de la spine, qui ne la liste pas) — la policy `select` de `cases` passe par la fonction `meme_partie_que_moi(joueur_id)` plutôt que par une colonne dénormalisée. Une alternative aurait été d'ajouter `cases.partie_id` pour simplifier les futures requêtes Realtime (Story 2.3) ; décision explicite de ne pas dévier de l'ERD sans nécessité prouvée (YAGNI, SM-C1) — à reconsidérer seulement si la Story 2.3 rencontre un besoin de requêtage concret qui le justifie.

### References

- [Source: epics.md#Story 2.2: Rejoindre une partie et recevoir sa grille personnelle]
- [Source: prd.md#FR-6, FR-8, FR-9 : distribution, rejoindre une partie, le créateur comme joueur]
- [Source: ARCHITECTURE-SPINE.md#AD-5 — auth anonyme, #AD-6 — Cases référencent une Phrase, #AD-8 — RLS par ligne, #AD-9 — fonction unique rejoindre_partie, #ERD (tables joueurs, cases)]
- [Source: EXPERIENCE.md#Information Architecture — Rejoindre une partie atteint uniquement depuis un lien externe, #State Patterns — saisie du pseudo, partie pleine, lien invalide, #Key Flows UJ-2]
- [Source: DESIGN.md#Components — grid-cell, cta-primary, #Shapes — rotation et coins irréguliers, #Layout & Spacing — display:grid]
- [Source: 2-1-lancer-une-partie-et-obtenir-un-lien.md#Dev Notes — convention du lien ?partie=, angle mort RLS sur parties, pattern search_path='']

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Stack Supabase local déjà démarré en début de session (containers `Up`, healthy) — aucune action requise.
- Bug trouvé et corrigé pendant la vérification manuelle : la fonction `rejoindre_partie` référençait `phrase_id` dans le `select` de distribution des cases, alors que la clé primaire de `phrases` s'appelle `id` (`{"code":"42703","message":"column \"phrase_id\" does not exist"}`). Corrigé en `select v_joueur.id, phrases.id, ...` dans le fichier de migration, puis resynchronisé sur la base locale via un `create or replace function` direct (pas de `db reset`, cohérent avec la pratique établie) avant de reprendre la vérification.
- `enable_anonymous_sign_ins = false` par défaut dans `supabase/config.toml` bloquait `signInAnonymously()` (`anonymous_provider_disabled`) — passé à `true` (requis par AD-5, pas seulement pour ce test). **Action requise côté Supabase Cloud (production) avant déploiement** : ce flag ne couvre que l'instance locale ; le provider "Anonymous Sign-ins" doit être activé manuellement dans le Dashboard Supabase Cloud du projet (Authentication → Providers), sinon `signInAnonymously()` échouera en production alors même que le code applicatif est correct.
- Stack local redémarré (`supabase stop` puis `supabase start`) pour appliquer le changement de `config.toml` — les données (grilles/parties de test) ont été préservées (volume Docker persistant), pas de perte constatée.
- Vérification par appels directs à l'API REST/Auth/RPC Supabase (E2E navigateur toujours indisponible dans ce sandbox, même limite que toutes les stories précédentes), avec le compte `admin@test.com` (créateur) et une partie de test résiduelle (`code_partie=97042656`, grille "test" 3×3, 9 phrases) déjà présente en base depuis la vérification de la Story 2.1.
- Séquence : `rejoindre_partie` en créateur (`compte_id = auth_user_id`) puis en 2 invités anonymes distincts (`compte_id = null`) → 3 lignes `joueurs`, 27 lignes `cases` (9 par joueur), comparaison des triplets `(pseudo, position, phrase_id)` confirmant 3 dispositions distinctes (AC #1). Rappel de `rejoindre_partie` avec la même identité déjà inscrite → même `id` renvoyé, toujours 9 `cases` (idempotence confirmée). Complétion à 6 joueurs puis tentative d'un 7e → échec `partie_complete` (AC #2), total resté à 6. Code de partie inexistant → échec `partie_introuvable` (AC #5). Lecture directe (`select`) de `cases`/`phrases`/`parties` par un joueur inscrit → résultats complets (confirme que `GrilleEnDirecteScreen` peut se passer du RPC pour l'affichage) ; mêmes lectures par un compte non inscrit → résultats vides (RLS confirmée) ; tentative d'`insert` direct sur `joueurs` par un compte non inscrit → `403 permission denied for table joueurs` (AD-8 confirmée, aucun GRANT insert accordé).
- Nettoyage après vérification : les 7 comptes anonymes créés pendant les tests supprimés (`delete from auth.users`, cascade sur `joueurs`/`cases`), la ligne `joueurs` de test créée pour `admin@test.com` supprimée directement — le compte `admin@test.com` lui-même conservé (compte de test partagé), ainsi que les 3 `parties` résiduelles de la Story 2.1 (non créées par cette story, laissées intactes).

### Completion Notes List

- Toutes les tasks (1 à 4) implémentées et vérifiées.
- Migration `supabase/migrations/20260708200136_rejoindre_partie.sql` : tables `joueurs`/`cases`, RLS (policies élargies sur `parties`/`phrases` comblant l'angle mort de la Story 2.1), fonctions `SECURITY DEFINER` `est_dans_la_partie`/`meme_partie_que_moi` (évitent la récursion RLS) et `rejoindre_partie` (inscription idempotente + distribution mélangée + plafond de 6). Appliquée via `supabase migration up`.
- `supabase/config.toml` : `enable_anonymous_sign_ins` passé à `true` (AD-5) — changement de configuration nécessaire en plus de la migration SQL, à reproduire côté Supabase Cloud avant déploiement (voir Debug Log).
- `RejoindrePartieScreen.tsx`/`.css` (nouveau, `src/features/rejoindre-partie/`) : formulaire pseudo, `signInAnonymously()` au submit uniquement, appel RPC `rejoindre_partie`, états "introuvable"/"complète" remplaçant le formulaire, erreur générique sinon.
- `GrilleEnDirecteScreen.tsx`/`.css` (nouveau, `src/features/grille-en-direct/`) : grille personnelle en lecture seule (`display:grid`, colonnes déduites de `Math.sqrt(cases.length)`), style `grid-cell` (rotation + coins irréguliers) calculé une fois par case. Écart mineur assumé par rapport au Dev Notes : `useMemo` utilisé avec un tableau de dépendances vide (`[]`) plutôt que `[caseItem.id]` — équivalent fonctionnel puisque le composant `GridCell` est monté avec `key={caseItem.id}` par son parent (une nouvelle instance, donc un nouveau calcul, n'existe que pour une nouvelle case), et évite un avertissement `oxlint(react-hooks/exhaustive-deps)` ("dépendance inutilisée") sur la dépendance non référencée dans le corps de la fonction.
- `App.tsx` : lecture de `?partie=` au premier rendu, contournement d'`AuthScreen`/`BibliothequeScreen` pour router directement vers `RejoindrePartieScreen` puis `GrilleEnDirecteScreen`, sans distinction créateur/invité (AC #3, #4).
- Vérification : 3 dispositions de grille distinctes confirmées pour 3 identités différentes (AC #1), `compte_id` correctement `null`/non-`null` selon invité/compte (AC #3, #4), idempotence du rejoin, plafond de 6 strictement appliqué (AC #2), message d'erreur sur code invalide (AC #5), lectures RLS conformes pour un joueur inscrit et bloquées pour un outsider, écriture directe sur `joueurs` bloquée (AD-8). `npm run build`/`npm run lint` passent sans erreur ni avertissement.
- Bug de développement trouvé et corrigé avant la fin de la vérification (colonne `phrase_id` inexistante dans `phrases`, voir Debug Log) — corrigé dans le fichier de migration avant tout commit, aucune trace du bug dans le SQL final.
- Données de test créées pendant la vérification (7 comptes anonymes, 1 ligne `joueurs` pour le compte créateur) nettoyées après coup ; les données résiduelles de la Story 2.1 (comptes `admin@test.com`/`lea.test...`, 3 `parties`) laissées intactes, non créées par cette story.

### File List

- `supabase/migrations/20260708200136_rejoindre_partie.sql` (nouveau)
- `supabase/config.toml` (modifié — `enable_anonymous_sign_ins = true`)
- `src/App.tsx` (modifié — routage `?partie=`, contournement Auth/Bibliothèque)
- `src/features/rejoindre-partie/RejoindrePartieScreen.tsx` (nouveau)
- `src/features/rejoindre-partie/RejoindrePartieScreen.css` (nouveau)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.tsx` (nouveau)
- `src/features/grille-en-direct/GrilleEnDirecteScreen.css` (nouveau)

- Revue de code (Blind Hunter, Edge Case Hunter, Acceptance Auditor) : 4 patches appliqués — (1) verrou `for update` sur la ligne `parties` au tout début de `rejoindre_partie`, sérialisant les appels concurrents pour un même `code_partie` (résout à la fois la race TOCTOU sur le plafond de 6, explicitement citée par AD-9, et la double-soumission idempotente qui levait une `unique_violation` brute) [`supabase/migrations/20260708200136_rejoindre_partie.sql`], (2) `App.tsx` teste désormais `codePartieRejoint !== null` au lieu d'une simple troncature JS — un `?partie=` vide (chaîne vide, falsy) ne contourne plus l'écran "Rejoindre une partie" ; il traverse jusqu'au RPC qui répond `partie_introuvable`, produisant le message AC #5 attendu, (3) `GrilleEnDirecteScreen` traite un résultat de `cases` vide ou non carré comme un échec de chargement (réutilise l'état `chargementEchoue` existant) plutôt que de rendre un `grid-template-columns: repeat(0, 1fr)` invalide en silence — décision utilisateur explicite de ne pas ajouter de garde côté serveur dans `rejoindre_partie` pour rester cohérent avec la convention établie (jamais de validation de complétude de grille côté base), (4) bouton "Réessayer" de `GrilleEnDirecteScreen` remplacé par le composant `Button` partagé au lieu d'un `<button>` écrit à la main. 7 signalements écartés comme bruit (conventions déjà établies ailleurs dans le projet, ou déviations déjà documentées). `npm run build`/`npm run lint` et une vérification API/RPC de non-régression repassés après les correctifs. Statut passé à "done".

## Change Log

- 2026-07-08 : Implémentation complète (Tasks 1 à 4) — migration `joueurs`/`cases` avec RLS élargie (parties/phrases) et fonctions SECURITY DEFINER (`est_dans_la_partie`, `meme_partie_que_moi`, `rejoindre_partie`), activation de l'auth anonyme (`config.toml`), écrans "Rejoindre une partie" et "Grille en direct" (lecture seule), routage `?partie=` dans `App.tsx`. Bug de colonne (`phrase_id`) trouvé et corrigé pendant la vérification, avant tout commit. Vérifié via appels API/RPC directs (3 dispositions distinctes, idempotence, plafond de 6, code invalide, isolation RLS, écriture bloquée sur `joueurs`). Statut passé à "review".
- 2026-07-08 : Revue de code — 4 patches appliqués (verrou de ligne anti-TOCTOU dans `rejoindre_partie`, gestion de `?partie=` vide, garde client sur un résultat `cases` vide/non carré, composant `Button` uniformisé), 7 signalements écartés comme conformes aux conventions déjà établies du projet. `npm run build`/`npm run lint` et vérification API de non-régression repassés. Statut passé à "done".
