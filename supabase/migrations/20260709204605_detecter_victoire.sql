-- Table de jonction des co-vainqueurs (jamais un champ singulier sur `parties`,
-- cf. ARCHITECTURE-SPINE.md#Consistency Conventions). Clé composite (partie_id,
-- joueur_id) : sert aussi de garde d'idempotence naturelle pour le trigger ci-dessous.
create table parties_vainqueurs (
  partie_id uuid not null references parties(id) on delete cascade,
  joueur_id uuid not null references joueurs(id) on delete cascade,
  declared_at timestamptz not null default now(),
  primary key (partie_id, joueur_id)
);

alter table parties_vainqueurs enable row level security;

-- Réutilise la fonction SECURITY DEFINER `est_dans_la_partie` déjà créée en Story 2.2
-- (migration 20260708200136_rejoindre_partie.sql) plutôt que de la redéfinir.
create policy "Joueur lit les vainqueurs de sa partie" on parties_vainqueurs
  for select using (est_dans_la_partie(partie_id));

-- Aucun grant insert/update/delete à `authenticated` : AD-8 interdit tout INSERT
-- client direct sur parties_vainqueurs, seule la fonction SECURITY DEFINER du
-- trigger ci-dessous y écrit.
grant select on parties_vainqueurs to authenticated;

-- Détection de victoire côté serveur (AD-3) : calcule si le joueur qui vient de
-- cocher une case complète une ligne, une colonne ou une diagonale, et l'inscrit
-- dans parties_vainqueurs. SECURITY DEFINER + search_path = '' avec identifiants
-- qualifiés par schéma, même durcissement que rejoindre_partie (Story 2.2) et
-- empecher_modification_taille_si_partie_lancee (Story 2.1).
create or replace function detecter_victoire()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cote int;
  v_partie_id uuid;
  v_gagnant boolean := false;
begin
  -- Le nombre de cases d'un joueur est toujours un carré parfait (garanti par
  -- rejoindre_partie, Story 2.2).
  select round(sqrt(count(*)))::int into v_cote
  from public.cases where joueur_id = new.joueur_id;

  -- Ligne complète : au moins un groupe de v_cote cases cochées partageant le
  -- même quotient position/v_cote.
  select exists (
    select 1 from public.cases
    where joueur_id = new.joueur_id and checked
    group by position / v_cote
    having count(*) = v_cote
  ) into v_gagnant;

  -- Colonne complète : même principe avec le reste position % v_cote.
  if not v_gagnant then
    select exists (
      select 1 from public.cases
      where joueur_id = new.joueur_id and checked
      group by position % v_cote
      having count(*) = v_cote
    ) into v_gagnant;
  end if;

  -- Diagonale principale (ligne == colonne) et anti-diagonale (ligne + colonne
  -- == v_cote - 1), en arithmétique explicite position/v_cote et position%v_cote —
  -- pas d'astuce modulo sur la position brute : `position % (v_cote - 1) = 0`
  -- confondrait à tort les coins de la diagonale principale (positions 0 et
  -- v_cote²-1) avec l'anti-diagonale.
  if not v_gagnant then
    select
      count(*) filter (where (position / v_cote) = (position % v_cote)) = v_cote
      or count(*) filter (where (position / v_cote) + (position % v_cote) = v_cote - 1) = v_cote
    into v_gagnant
    from public.cases
    where joueur_id = new.joueur_id and checked;
  end if;

  if v_gagnant then
    select partie_id into v_partie_id from public.joueurs where id = new.joueur_id;

    -- on conflict do nothing : rend l'insertion idempotente. Un joueur qui
    -- complète une 2e ligne (ou dont le trigger est ré-évalué) ne doit jamais
    -- provoquer d'erreur de clé dupliquée — le trigger tourne dans la même
    -- transaction que le cochage, une exception ici ferait échouer le PATCH
    -- côté client.
    insert into public.parties_vainqueurs (partie_id, joueur_id)
    values (v_partie_id, new.joueur_id)
    on conflict (partie_id, joueur_id) do nothing;
  end if;

  return new;
end;
$$;

-- Ne se déclenche que sur la transition décochée -> cochée : ni les décochages,
-- ni un UPDATE qui laisse checked = true inchangé, ne provoquent une évaluation.
create trigger detecter_victoire_apres_cochage
after update on cases
for each row
when (old.checked is distinct from true and new.checked = true)
execute function detecter_victoire();

-- Active Realtime Postgres Changes (AD-7) pour cette nouvelle table. Périmètre
-- strictement additif à cette story : cases/phrases déjà publiées (Story 2.3),
-- parties/joueurs restent hors périmètre (réservées aux Stories 2.5/2.6).
alter publication supabase_realtime add table parties_vainqueurs;
