-- Bibliothèque pour un joueur-compte invité : la nouvelle section "Parties auxquelles
-- je participe" doit pouvoir afficher nom/taille de la grille d'une partie rejointe
-- chez un autre créateur. Seule policy select existante sur `grilles` ("Créateur lit
-- ses grilles", Story 1.2) : `compte_id = auth.uid()` — un joueur non-créateur n'a
-- donc aujourd'hui aucun moyen de lire cette grille, malgré les policies "Joueur lit
-- sa partie"/"Joueur lit les phrases de sa partie" déjà en place (Story 2.2) pour le
-- reste du parcours. Policy permissive additionnelle (OR avec l'existante, comportement
-- RLS par défaut) : lecture seule, réutilise `est_dans_la_partie()` (SECURITY DEFINER,
-- Story 2.2) sans nouvelle fonction. Jamais de policy update/delete sur `parties`/
-- `grilles` pour un non-créateur (Never de la spec) : ce lot n'en ajoute aucune (la
-- policy delete plus bas ne porte que sur `joueurs`, pas sur `parties`/`grilles`).
create policy "Joueur lit les grilles des parties auxquelles il participe" on grilles
  for select using (
    exists (
      select 1 from parties p
      where p.grille_id = grilles.id and est_dans_la_partie(p.id)
    )
  );

-- Revue de code (bad_spec) : l'anonyme→compte de PartieActiveScreen.tsx/joueurStorage.ts
-- (voir migration précédente) rejoue rejoindre_partie sous la nouvelle identité au lieu
-- de migrer l'ancienne, ce qui laisse l'ancienne ligne joueurs (anonyme) orpheline --
-- jamais relisible par l'app (jeton perdu), elle continuerait pourtant à compter dans
-- le plafond de 6 joueurs d'une partie. Cette policy permet à un invité anonyme
-- (jamais un compte réel : compte_id is null l'exclut structurellement) de supprimer
-- sa PROPRE ligne -- utilisée par AuthScreen.tsx au moment où cette identité se
-- transforme en compte réel, via un client temporaire authentifié avec l'ancien jeton
-- (encore valide à ce moment précis). Ne concerne que joueurs, jamais parties/grilles
-- (Never de la spec toujours respecté).
create policy "Invité nettoie sa propre ligne joueur" on joueurs
  for delete using (auth_user_id = auth.uid() and compte_id is null);

grant delete on joueurs to authenticated;
