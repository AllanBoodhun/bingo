-- Refonte de la Bibliothèque (2026-07-22) : la carte "Partie en cours" affiche
-- désormais le nombre de joueurs et le nom du vainqueur, pas seulement le lien.
-- Même angle mort que celui comblé pour parties_vainqueurs en Story 2.5
-- (20260709212326_cloturer_partie.sql) : la policy select existante sur `joueurs`
-- ("Joueur lit les joueurs de sa partie", Story 2.2) dépend de est_dans_la_partie(),
-- donc d'une ligne joueurs existante pour l'auth.uid() courant. Un créateur qui n'a
-- jamais rejoint sa propre partie comme Joueur ne pourrait sinon jamais lire le
-- nombre de joueurs ni résoudre le pseudo du vainqueur depuis la Bibliothèque.
-- Policy permissive additionnelle (OR avec l'existante, comportement RLS par défaut).
create policy "Créateur lit les joueurs de ses parties" on joueurs
  for select using (
    exists (
      select 1 from parties p
      join grilles g on g.id = p.grille_id
      where p.id = joueurs.partie_id and g.compte_id = auth.uid()
    )
  );
