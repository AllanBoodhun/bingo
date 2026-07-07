create table grilles (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0 and char_length(nom) <= 100),
  taille int not null check (taille between 3 and 8),
  created_at timestamptz not null default now()
);

create table phrases (
  id uuid primary key default gen_random_uuid(),
  grille_id uuid not null references grilles(id) on delete cascade,
  texte text not null check (char_length(trim(texte)) > 0 and char_length(texte) <= 200),
  created_at timestamptz not null default now(),
  unique (grille_id, texte)
);

create index phrases_grille_id_idx on phrases (grille_id);

alter table grilles enable row level security;
alter table phrases enable row level security;

create policy "Créateur lit ses grilles" on grilles
  for select using (compte_id = auth.uid());

create policy "Créateur crée ses grilles" on grilles
  for insert with check (compte_id = auth.uid());

create policy "Créateur modifie ses grilles" on grilles
  for update using (compte_id = auth.uid()) with check (compte_id = auth.uid());

create policy "Créateur lit ses phrases" on phrases
  for select using (
    exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())
  );

create policy "Créateur crée ses phrases" on phrases
  for insert with check (
    exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())
  );

create policy "Créateur modifie ses phrases" on phrases
  for update using (
    exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())
  ) with check (
    exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())
  );

-- RLS filtre les lignes mais ne remplace pas les privilèges Postgres : sans ce GRANT,
-- PostgREST refuse la requête avant même d'évaluer les policies (permission denied for table).
grant select, insert, update on grilles to authenticated;
grant select, insert, update on phrases to authenticated;
