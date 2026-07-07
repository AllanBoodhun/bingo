# Glossaire — bingo

Vocabulaire produit (PRD) et son pont vers les tables de la spine d'architecture (`ARCHITECTURE-SPINE.md`).

| Terme produit | Définition | Table associée |
| --- | --- | --- |
| **Grille** | Ensemble nommé de phrases, de taille N×N, créé par un utilisateur. Réutilisable pour plusieurs parties. | `grilles` |
| **Phrase** | Texte libre défini par le créateur, associé à une case de la grille. | `phrases` |
| **Partie** | Session de jeu en temps réel démarrée à partir d'une grille validée, avec un ensemble de joueurs, un lien de partie, et un état (en cours / terminée). | `parties` |
| **Créateur** | Utilisateur avec compte qui crée une grille et lance une partie. | `grilles.compte_id` |
| **Joueur** | Participant à une partie, avec ou sans compte (le créateur est aussi un joueur de sa propre partie). | `joueurs` |
| **Joueur invité** | Joueur sans compte, identifié par un pseudo temporaire pour la durée de la partie. | `joueurs` (auth anonyme) |
| **Case** | Emplacement de la grille personnelle d'un joueur, associé à une phrase du pool et à un état coché/non coché. | `cases` |
| **Distribution aléatoire** | Répartition des phrases du pool dans les cases de chaque joueur au moment où il rejoint la partie, différente d'un joueur à l'autre. | `cases` (générées par la fonction serveur, voir spine AD-9) |
| **Ligne gagnante** | Ligne, colonne, ou diagonale entièrement cochée sur la grille personnelle d'un joueur. | calculée par la spine AD-3 |
| **Vainqueur** | Joueur (ou joueurs, en cas de simultanéité) ayant complété une ligne gagnante en premier. | `parties_vainqueurs` |
