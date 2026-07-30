-- `NOT VALID` : pas d'environnement Supabase local pour vérifier l'état réel des
-- données avant d'appliquer en prod — Postgres n'exécute ce CHECK que sur les futurs
-- INSERT/UPDATE, jamais sur les lignes existantes (certaines dépassent déjà 50
-- caractères, saisies avant ce resserrage). Aucun risque de migration cassée ni de
-- ligne existante invalidée.
alter table phrases drop constraint phrases_texte_check;
alter table phrases add constraint phrases_texte_check
  check (char_length(trim(texte)) > 0 and char_length(texte) <= 50) not valid;
