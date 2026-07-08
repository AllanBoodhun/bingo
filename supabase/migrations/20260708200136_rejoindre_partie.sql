create table joueurs (
  id uuid primary key default gen_random_uuid(),
  partie_id uuid not null references parties(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  compte_id uuid references auth.users(id) on delete set null,
  pseudo text not null check (char_length(trim(pseudo)) > 0 and char_length(pseudo) <= 40),
  created_at timestamptz not null default now(),
  unique (partie_id, auth_user_id)
);

create index joueurs_partie_id_idx on joueurs (partie_id);

create table cases (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references joueurs(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  position int not null check (position >= 0),
  checked boolean not null default false,
  unique (joueur_id, position)
);

create index cases_joueur_id_idx on cases (joueur_id);

alter table joueurs enable row level security;
alter table cases enable row level security;

-- Fonctions d'aide RLS en SECURITY DEFINER : une policy select sur `joueurs` qui
-- s'auto-référence directement (sans passer par une fonction) est le déclencheur
-- classique de "infinite recursion detected in policy for relation" chez
-- Supabase/Postgres. Encapsuler la vérification dans une fonction SECURITY DEFINER
-- est le pattern recommandé pour l'éviter.
create or replace function est_dans_la_partie(p_partie_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.joueurs
    where partie_id = p_partie_id and auth_user_id = auth.uid()
  );
$$;

-- `cases` n'a pas de colonne `partie_id` propre (fidèle à l'ERD de la spine) :
-- cette fonction résout l'appartenance à la partie via le joueur propriétaire de la case.
create or replace function meme_partie_que_moi(p_joueur_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.joueurs cible
    join public.joueurs moi on moi.partie_id = cible.partie_id
    where cible.id = p_joueur_id and moi.auth_user_id = auth.uid()
  );
$$;

grant execute on function est_dans_la_partie(uuid) to authenticated;
grant execute on function meme_partie_que_moi(uuid) to authenticated;

create policy "Joueur lit les joueurs de sa partie" on joueurs
  for select using (est_dans_la_partie(partie_id));

-- Volontairement la partie entière, pas seulement ses propres cases : la Story 2.3
-- doit pouvoir observer les cases des autres joueurs via Realtime (notification
-- "X vient de cocher"). AD-8 ne restreint que l'écriture de `checked` à ses propres
-- lignes, jamais la lecture.
create policy "Joueur lit les cases de sa partie" on cases
  for select using (meme_partie_que_moi(joueur_id));

-- Comble l'angle mort documenté dans les Dev Notes de la Story 2.1 : la policy select
-- existante sur `parties` (créateur uniquement) ne suffit pas pour qu'un Joueur/invité
-- relise l'état de sa partie.
create policy "Joueur lit sa partie" on parties
  for select using (est_dans_la_partie(id));

-- Nécessaire pour que le client lise `phrases.texte` par jointure depuis ses `cases`
-- (AD-6). La policy select existante sur `phrases` (Story 1.2) ne couvre que le
-- créateur propriétaire de la grille, pas les Joueurs distribués.
create policy "Joueur lit les phrases de sa partie" on phrases
  for select using (
    exists (
      select 1 from cases c
      join joueurs j on j.id = c.joueur_id
      where c.phrase_id = phrases.id and j.auth_user_id = auth.uid()
    )
  );

-- RLS filtre les lignes mais ne remplace pas les privilèges Postgres : sans ce GRANT,
-- PostgREST refuse la requête avant même d'évaluer les policies.
-- Pas d'insert/update accordé à `authenticated` sur joueurs/cases : AD-8 interdit tout
-- INSERT client direct sur ces deux tables, seule la fonction SECURITY DEFINER
-- ci-dessous y écrit (les policies insert/update de `cases.checked` arrivent en Story 2.3).
grant select on joueurs to authenticated;
grant select on cases to authenticated;

-- Une fonction serveur unique (AD-9) gère l'arrivée d'un Joueur (créateur ou invité) :
-- vérifie le plafond de 6 joueurs, inscrit le Joueur, distribue aléatoirement les
-- phrases du pool dans ses Cases. SECURITY DEFINER + search_path = '' avec
-- identifiants qualifiés par schéma, même durcissement que
-- empecher_modification_taille_si_partie_lancee() (Story 2.1).
create or replace function rejoindre_partie(p_code_partie text, p_pseudo text)
returns public.joueurs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partie public.parties;
  v_joueur public.joueurs;
  v_nb_joueurs int;
  v_est_invite boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  -- `for update` verrouille la ligne `parties` pour la durée de la transaction :
  -- deux appels concurrents pour le même code_partie (identités différentes se
  -- disputant le plafond de 6, AD-9 ; ou même identité en double-clic/retry réseau)
  -- se sérialisent ici plutôt que de lire toutes les deux un état pré-insertion et
  -- de courir jusqu'à l'insert (race TOCTOU sur le plafond et sur l'idempotence).
  select * into v_partie from public.parties where code_partie = p_code_partie for update;
  if not found then
    raise exception 'partie_introuvable';
  end if;

  -- Idempotence : un joueur déjà inscrit qui rappelle la fonction (double-clic,
  -- réessai réseau) récupère sa ligne existante, avant toute vérification du
  -- plafond, pour ne jamais être bloqué par une partie devenue complète entre-temps
  -- ni générer une deuxième distribution de cases.
  select * into v_joueur from public.joueurs
    where partie_id = v_partie.id and auth_user_id = auth.uid();
  if found then
    return v_joueur;
  end if;

  select count(*) into v_nb_joueurs from public.joueurs where partie_id = v_partie.id;
  if v_nb_joueurs >= 6 then
    raise exception 'partie_complete';
  end if;

  insert into public.joueurs (partie_id, auth_user_id, compte_id, pseudo)
  values (
    v_partie.id,
    auth.uid(),
    case when v_est_invite then null else auth.uid() end,
    trim(p_pseudo)
  )
  returning * into v_joueur;

  insert into public.cases (joueur_id, phrase_id, position, checked)
  select v_joueur.id, phrases.id, (row_number() over (order by random()))::int - 1, false
  from public.phrases
  where phrases.grille_id = v_partie.grille_id;

  return v_joueur;
end;
$$;

-- Pas de grant à `anon` : le client s'assure d'avoir une session (compte existant ou
-- signInAnonymously()) avant d'appeler cette fonction, jamais en tant que visiteur
-- non authentifié.
grant execute on function rejoindre_partie(text, text) to authenticated;
