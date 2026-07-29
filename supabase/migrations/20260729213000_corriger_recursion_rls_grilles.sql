-- Incident production (2026-07-29) : la policy "Joueur lit les grilles des parties
-- auxquelles il participe" (migration 20260729190000) interrogeait `parties` en clair
-- (`exists (select 1 from parties p where ...)`) depuis une policy `grilles` — or la
-- policy déjà existante "Créateur lit ses parties" (Story 2.1) interroge `grilles` en
-- retour, refermant une boucle : lire `grilles` → évalue la policy → interroge
-- `parties` → évalue SA policy → interroge `grilles` → ... Récursion infinie détectée
-- par Postgres sur TOUTE lecture de `grilles`, y compris "Mes grilles" pour le
-- créateur — panne totale en production (500 sur PostgREST), pas seulement pour le
-- nouveau scénario. C'est exactement le piège documenté dans les Dev Notes de la
-- Story 2.2 ("piège RLS auto-référencée") : la fonction SECURITY DEFINER
-- `est_dans_la_partie()` existe précisément pour l'éviter en encapsulant la
-- vérification cross-table, ce que la migration précédente n'a pas fait. Corrigé ici
-- en remplaçant la policy par la même approche.
drop policy "Joueur lit les grilles des parties auxquelles il participe" on grilles;

create or replace function joueur_lit_cette_grille(p_grille_id uuid) returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.parties p
    where p.grille_id = p_grille_id and public.est_dans_la_partie(p.id)
  );
$$;

grant execute on function joueur_lit_cette_grille(uuid) to authenticated;

create policy "Joueur lit les grilles des parties auxquelles il participe" on grilles
  for select using (joueur_lit_cette_grille(grilles.id));
