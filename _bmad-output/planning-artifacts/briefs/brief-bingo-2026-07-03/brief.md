---
title: Product Brief — bingo
status: ready
created: 2026-07-03
updated: 2026-07-03
---

# Product Brief : bingo

## Résumé exécutif

**bingo** est une PWA qui réinvente le jeu de bingo classique : au lieu de chiffres, les joueurs cochent des **phrases personnalisées** créées pour l'occasion — un mariage, un dîner de famille, une soirée entre amis. Le créateur écrit un pool de phrases ("Le père de la mariée va pleurer", "Tonton Michel va chanter du Renaud"), choisit une taille de grille, puis invite ses proches via un simple lien. Chaque joueur reçoit une grille où les phrases sont réparties aléatoirement, et coche en temps réel ce qu'il observe pendant que l'événement se déroule — le détail du mécanisme est décrit plus bas.

C'est un jeu social à consommer *pendant* un moment vécu ensemble, pas un outil de team-building ni un générateur de cartes à imprimer. L'ambition est volontairement modeste : un projet personnel pour proposer une nouvelle façon de jouer à un moment donné avec ses proches, sans objectif de croissance ou de monétisation.

## Le problème

Le bingo à phrases personnalisées existe déjà en version papier ou via des générateurs de grilles statiques (type Bingo Baker ou Canva). Ces outils s'arrêtent à la génération de la grille : il faut ensuite l'imprimer ou l'envoyer en PDF ; chacun coche sur son support sans lien entre les grilles ; et personne ne sait qui a gagné avant de comparer à la fin. Ça marche, mais ça casse le rythme d'un moment vécu en groupe — un mariage, une soirée — où on voudrait que le jeu suive l'instant en temps réel, sans avoir à préparer un papier à l'avance ni interrompre la soirée pour vérifier les grilles.

## La solution

bingo remplace le papier par une expérience multijoueur en temps réel :

1. **Créer** — le créateur définit une taille de grille et rédige les phrases (autant de phrases que de cases).
2. **Lancer une partie** — un lien/code de partie à partager ; les joueurs invités rejoignent avec ou sans compte.
3. **Jouer** — au démarrage, les phrases sont distribuées aléatoirement dans la grille de chaque joueur. Chacun coche sur son téléphone les phrases qu'il observe se réaliser, en temps réel, pendant l'événement.
4. **Gagner** — la première personne à compléter une ligne, une colonne ou une diagonale termine la partie.
5. **Retrouver** — les créateurs de compte retrouvent leurs grilles précédentes pour les rejouer ou les adapter à un nouvel événement.

Le cochage reste déclaratif (chacun coche pour soi, sans validation centrale) : c'est un jeu entre proches basé sur la confiance, pas une compétition arbitrée.

## Ce qui différencie bingo

D'après un tour d'horizon rapide du marché, les outils existants se répartissent en deux familles : des **générateurs de grilles statiques/imprimables** (Bingo Baker, My Free Bingo Cards, ClassTools, Bingo Card Creator, Canva) sans vraie synchronisation entre joueurs, et une poignée d'**outils temps réel verrouillés sur un seul secteur d'usage précis** (Buzzword Bingo App et Stream Bingo pour les réunions d'entreprise ou le streaming Twitch).

Aucun des outils identifiés ne combine les trois éléments de bingo : **temps réel + comptes persistants + grilles réutilisables**, pour un usage généraliste entre proches. Ce n'est pas une différenciation technique complexe ni un avantage concurrentiel difficile à reproduire (un « moat ») — c'est une combinaison simple que le marché actuel n'adresse pas directement pour ce cas d'usage précis.

## À qui s'adresse bingo

**Utilisateur principal : le créateur de grille.** Quelqu'un qui organise ou participe à un événement social (mariage, anniversaire, repas de famille, soirée) et veut ajouter une couche de jeu léger et complice à ce moment, sans effort de préparation lourd.

**Utilisateur secondaire : le joueur invité.** Un proche qui reçoit un lien, rejoint la partie en quelques secondes (avec ou sans compte), et joue sur son téléphone pendant que l'événement se déroule. Pour lui, la friction doit être proche de zéro — pas de création de compte imposée pour un jeu ponctuel.

## Critères de succès

Les critères restent volontairement simples, centrés sur l'usage réel :

- Le créateur peut monter une grille et lancer une partie en quelques minutes.
- Un joueur invité peut rejoindre une partie sans friction (pas de compte obligatoire).
- Le jeu est effectivement utilisé lors d'un événement réel vécu par l'auteur et ses proches (le vrai test : "on l'a sorti à un mariage et ça a marché").
- Les grilles créées sont retrouvables et réutilisables depuis un compte.

## Périmètre (v1)

**Inclus :**
- Création de grille : taille configurable (3x3, 5x5, 6x6, etc.), saisie libre des phrases.
- Distribution aléatoire des phrases dans la grille de chaque joueur au lancement de la partie.
- Lancement de partie et invitation par lien/code.
- Jeu en temps réel : cochage déclaratif par chaque joueur sur sa propre grille.
- Détection et annonce du gagnant (ligne/colonne/diagonale complète).
- Comptes utilisateurs pour les créateurs, avec historique des grilles créées.
- Participation en tant qu'invité (sans compte) pour les joueurs.
- PWA : installable, pensée mobile-first (usage principal : téléphone en main pendant un événement).

**Explicitement hors scope v1 :**
- Vérification/arbitrage centralisé des cases cochées (reste déclaratif).
- Système d'amis ou recherche de contacts intra-app.
- Monétisation (pas de freemium, pas de paiement prévu).
- Fonctionnalités orientées entreprise/éducation (l'usage cible reste amis/famille).

## Vision

Si l'idée prend, bingo devient le réflexe qu'on a en tête avant un événement social entre proches — au même titre qu'on crée un groupe WhatsApp pour l'occasion, on crée une partie de bingo. Pas d'ambition au-delà de ça pour l'instant : c'est un projet pour le plaisir de jouer et de construire, pas une startup en devenir. Si l'usage réel (un mariage, une soirée) confirme que le concept fonctionne, les prochaines pistes naturelles restent ouvertes (nouvelles conditions de victoire, thèmes de phrases suggérés, historique des parties jouées) — mais rien n'est engagé au-delà du v1.
