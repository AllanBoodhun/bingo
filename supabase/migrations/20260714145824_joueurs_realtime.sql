-- Révision d'AD-7 après test réel (voir ARCHITECTURE-SPINE.md) : `joueurs` était
-- volontairement absente des tables Realtime (Stories 2.3/2.4/2.6), au motif que la pile
-- d'avatars était un détail cosmétique acceptable en instantané figé. Un test en
-- conditions réelles a montré que ça casse aussi la résolution du pseudo d'un vainqueur
-- arrivé après le montage de l'écran (repli générique "Un joueur" au lieu du vrai nom) —
-- un impact bien plus grave qu'anticipé, pas seulement cosmétique. La policy select
-- existante ("Joueur lit les joueurs de sa partie", Story 2.2) scope déjà correctement
-- la diffusion Realtime, aucune nouvelle policy nécessaire.
alter publication supabase_realtime add table joueurs;
