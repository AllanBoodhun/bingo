-- Permet au créateur de supprimer une de ses grilles depuis la Bibliothèque.
-- `phrases.grille_id`/`parties.grille_id` référencent déjà `grilles(id) on delete cascade`
-- (Stories 1.2/2.1) : supprimer une grille supprime donc automatiquement en cascade
-- ses phrases, ainsi que toute Partie lancée pour cette grille (et par ricochet
-- joueurs/cases/parties_vainqueurs de ces parties, déjà en cascade depuis les
-- Stories 2.2/2.4) — aucune ligne orpheline possible, rien à faire de plus ici.
create policy "Créateur supprime ses grilles" on grilles
  for delete using (compte_id = auth.uid());

grant delete on grilles to authenticated;
