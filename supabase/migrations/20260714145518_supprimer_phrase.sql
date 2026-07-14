create policy "Créateur supprime ses phrases" on phrases
  for delete using (
    exists (select 1 from grilles g where g.id = phrases.grille_id and g.compte_id = auth.uid())
  );

grant delete on phrases to authenticated;

-- Une phrase déjà distribuée dans les Cases des joueurs (dès qu'une Partie existe pour
-- cette grille) ne doit jamais être supprimable : `cases.phrase_id references phrases(id)
-- on delete cascade` (Story 2.2) supprimerait silencieusement la case correspondante chez
-- TOUS les joueurs déjà distribués, cassant leur grille (taille effective < taille² côté
-- client). Même principe et même durcissement que
-- empecher_modification_taille_si_partie_lancee (Story 2.1) : SECURITY DEFINER,
-- search_path = '', identifiants qualifiés par schéma.
create or replace function empecher_suppression_phrase_si_partie_lancee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.parties where grille_id = old.grille_id) then
    raise exception 'Impossible de supprimer une phrase : une partie a déjà été lancée pour cette grille.';
  end if;
  return old;
end;
$$;

create trigger verrouiller_phrases_apres_lancement
before delete on phrases
for each row
execute function empecher_suppression_phrase_si_partie_lancee();
