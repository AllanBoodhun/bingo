-- Corrige `supprimerGrille` (BibliothequeScreen.tsx) qui échouait avec un 400 dès
-- qu'une grille avait au moins une partie lancée. Le trigger
-- `verrouiller_phrases_apres_lancement` (supprimer_phrase.sql) bloque la
-- suppression d'une phrase tant qu'une partie existe pour sa grille — mais ce
-- garde-fou, pensé pour un `delete from phrases` direct, se déclenchait aussi
-- pendant la suppression en cascade des phrases lors d'un `delete from grilles`,
-- où une partie existe forcément déjà. Le cascade FK (trigger AFTER DELETE sur
-- grilles) supprime d'abord la ligne `grilles`, donc au moment où ce trigger
-- s'exécute pendant une cascade, `old.grille_id` ne référence plus aucune ligne
-- dans `grilles` : ça suffit à distinguer suppression directe (grille toujours
-- présente, garde-fou maintenu) de suppression en cascade (grille déjà supprimée,
-- on laisse passer).
create or replace function empecher_suppression_phrase_si_partie_lancee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.grilles where id = old.grille_id)
     and exists (select 1 from public.parties where grille_id = old.grille_id) then
    raise exception 'Impossible de supprimer une phrase : une partie a déjà été lancée pour cette grille.';
  end if;
  return old;
end;
$$;
