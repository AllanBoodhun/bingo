-- Annule FR-5 : la taille d'une grille et ses phrases doivent rester modifiables à
-- tout moment, qu'une partie ait déjà été lancée ou non (parité avec FR-3, qui
-- autorisait déjà l'édition du texte des phrases à tout moment).
--
-- Les cases déjà distribuées aux joueurs (table `cases`) ne référencent pas
-- `grilles.taille` : les écrans de jeu (GrilleEnDirecteScreen, GrilleAdversaireScreen)
-- déduisent le côté de la grille de `sqrt(cases.length)`, pas de `grilles.taille`. Une
-- partie déjà en cours continue donc de fonctionner avec les cases qui lui ont été
-- distribuées au moment du `rejoindre_partie`, indépendamment des modifications
-- ultérieures de la grille source.
drop trigger if exists verrouiller_taille_apres_lancement on grilles;
drop function if exists empecher_modification_taille_si_partie_lancee();

drop trigger if exists verrouiller_phrases_apres_lancement on phrases;
drop function if exists empecher_suppression_phrase_si_partie_lancee();
