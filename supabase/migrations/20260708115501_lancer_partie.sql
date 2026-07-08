create type partie_statut as enum ('en_cours', 'terminee');

create table parties (
  id uuid primary key default gen_random_uuid(),
  grille_id uuid not null references grilles(id) on delete cascade,
  code_partie text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  statut partie_statut not null default 'en_cours',
  created_at timestamptz not null default now()
);

create index parties_grille_id_idx on parties (grille_id);

alter table parties enable row level security;

create policy "Créateur lit ses parties" on parties
  for select using (
    exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid())
  );

create policy "Créateur lance une partie" on parties
  for insert with check (
    exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid())
  );

-- RLS filtre les lignes mais ne remplace pas les privilèges Postgres : sans ce GRANT,
-- PostgREST refuse la requête avant même d'évaluer les policies (permission denied for table).
grant select, insert on parties to authenticated;

-- Verrouille la taille d'une grille dès qu'une Partie a été lancée pour elle (FR-5).
-- SECURITY DEFINER : la vérification d'existence ne doit pas dépendre des policies
-- select de l'utilisateur courant sur `parties` (défense en profondeur).
create or replace function empecher_modification_taille_si_partie_lancee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.taille is distinct from old.taille and exists (
    select 1 from public.parties where grille_id = old.id
  ) then
    raise exception 'Impossible de modifier la taille : une partie a déjà été lancée pour cette grille.';
  end if;
  return new;
end;
$$;

create trigger verrouiller_taille_apres_lancement
before update on grilles
for each row
execute function empecher_modification_taille_si_partie_lancee();
