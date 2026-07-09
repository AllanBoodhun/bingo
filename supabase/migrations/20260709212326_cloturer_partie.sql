-- Clôture de partie par le créateur (FR-13, AD-8) : même forme que les policies
-- existantes sur grilles/parties (chaîne de propriété via grilles.compte_id), pas de
-- fonction SECURITY DEFINER nécessaire (pas de risque de récursion RLS ici).
create policy "Créateur clôture sa partie" on parties
  for update using (
    exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid())
  ) with check (
    exists (select 1 from grilles g where g.id = parties.grille_id and g.compte_id = auth.uid())
  );

-- Grant colonne par colonne, pas `grant update on parties` : même garde-fou qu'en
-- Story 2.3 pour cases.checked — une policy RLS ne restreint que les lignes
-- adressables, jamais les colonnes modifiables dans la même requête.
grant update (statut) on parties to authenticated;

-- Angle mort comblé : la policy select existante sur parties_vainqueurs ("Joueur lit
-- les vainqueurs de sa partie", Story 2.4) dépend de est_dans_la_partie(), donc d'une
-- ligne joueurs existante. Un créateur qui n'a jamais rejoint sa propre partie comme
-- Joueur ne pourrait sinon jamais voir la bannière de rappel (AC #3). Policy
-- permissive additionnelle (OR avec l'existante, comportement RLS par défaut).
create policy "Créateur lit les vainqueurs de ses parties" on parties_vainqueurs
  for select using (
    exists (
      select 1 from parties p
      join grilles g on g.id = p.grille_id
      where p.id = parties_vainqueurs.partie_id and g.compte_id = auth.uid()
    )
  );

-- Active Realtime Postgres Changes (AD-7) pour parties : nécessaire pour que tous les
-- Joueurs voient "Partie terminée" apparaître en direct dès la clôture (AC #2), sans
-- recharger la page. Périmètre additif : cases/phrases (Story 2.3), parties_vainqueurs
-- (Story 2.4) déjà publiées ; joueurs reste hors périmètre (toujours absent d'AD-7).
alter publication supabase_realtime add table parties;
