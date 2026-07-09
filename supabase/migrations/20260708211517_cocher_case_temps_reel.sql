-- Un Joueur ne peut écrire (UPDATE) que sur ses propres lignes `cases` (AD-8).
-- Référence `joueurs`, pas `cases` elle-même : pas de risque de récursion RLS ici
-- (contrairement aux policies select de la Story 2.2), inutile de passer par une
-- fonction SECURITY DEFINER pour ce cas.
create policy "Joueur coche ses propres cases" on cases
  for update using (
    exists (select 1 from joueurs j where j.id = cases.joueur_id and j.auth_user_id = auth.uid())
  ) with check (
    exists (select 1 from joueurs j where j.id = cases.joueur_id and j.auth_user_id = auth.uid())
  );

-- Grant colonne par colonne, pas `grant update on cases` : c'est ce qui empêche
-- concrètement un client de modifier `phrase_id`/`position`/`joueur_id` via la même
-- requête PATCH (AD-8 : "le Joueur ne peut écrire que le champ checked") — une policy
-- RLS seule ne restreint que les lignes adressables, jamais les colonnes modifiables.
grant update (checked) on cases to authenticated;

-- Active Realtime Postgres Changes (AD-7) pour ces deux tables. Sans cette étape,
-- .channel(...).on('postgres_changes', ...) se souscrit "avec succès" mais ne reçoit
-- jamais aucun événement, silencieusement. Périmètre strictement limité à cases/phrases
-- pour cette story ; parties/joueurs/grilles/parties_vainqueurs seront ajoutées par les
-- stories qui en ont besoin (2.4 à 2.6).
alter publication supabase_realtime add table cases;
alter publication supabase_realtime add table phrases;
