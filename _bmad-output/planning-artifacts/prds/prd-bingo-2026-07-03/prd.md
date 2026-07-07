---
title: bingo
status: final
created: 2026-07-03
updated: 2026-07-04
---

# PRD: bingo

## 0. Document Purpose

Ce PRD s'adresse d'abord à l'auteur du projet lui-même (créateur et PM du produit), en vue d'alimenter les étapes suivantes (architecture, découpage en epics/stories). Il s'appuie sur le [Product Brief bingo](../../briefs/brief-bingo-2026-07-03/brief.md), qu'il ne duplique pas : les sections de contexte marché et de différenciation restent dans le brief. Vocabulaire ancré dans le Glossaire (§3) ; fonctionnalités groupées avec exigences fonctionnelles (FR) imbriquées et numérotées globalement.

## 1. Vision

bingo transforme le bingo classique en un jeu social à phrases personnalisées, joué en temps réel entre proches pendant un événement partagé — un mariage, un dîner de famille, une soirée. Le créateur écrit les phrases qui définissent le jeu ("Le père de la mariée va pleurer"), choisit une taille de grille, et lance une partie que ses proches rejoignent en un clic, aussi naturellement qu'on crée un groupe WhatsApp pour l'occasion. Chacun coche sur son téléphone ce qu'il observe, en temps réel, jusqu'à ce qu'une première ligne se dessine.

C'est un projet personnel, pour le plaisir de jouer et de construire — pas une startup en devenir. La barre de succès est simple : le construire, le tester en conditions réelles, et que ça marche.

## 2. Target User

### 2.1 Jobs To Be Done

- En tant que créateur, je veux préparer une animation de groupe originale pour un événement, sans effort de préparation lourd (pas d'impression, pas de PDF à envoyer).
- En tant que créateur, je veux retrouver et réutiliser mes grilles précédentes pour un nouvel événement, sans repartir de zéro.
- En tant qu'invité, je veux rejoindre le jeu en quelques secondes depuis un lien, sans friction d'inscription.
- En tant que joueur, je veux vivre l'événement normalement tout en gardant un œil ludique dessus, en cochant ce que j'observe au fur et à mesure.

### 2.2 Non-Users (v1)

- Les organisateurs professionnels d'événements (team-building d'entreprise, animateurs de classe) — le ton, les phrases et l'usage restent pensés pour un groupe d'amis/famille informel, pas pour un cadre professionnel ou pédagogique.

### 2.3 Key User Journeys

- **UJ-1. Léa monte le bingo du mariage de sa sœur**
  - **Persona + contexte :** Léa organise une animation pour le mariage de sa sœur ce week-end.
  - **État initial :** elle ouvre bingo sur son téléphone, crée un compte (ou se connecte).
  - **Parcours :** elle choisit une taille de grille (5x5), nomme sa grille ("Bingo mariage de Julie"), tape ses phrases une à une jusqu'à en avoir autant que de cases, valide la grille, puis lance une partie — l'app génère un lien de partie.
  - **Climax :** elle envoie le lien dans le groupe WhatsApp de la famille juste avant la cérémonie.
  - **Résolution :** elle rejoint elle-même la partie comme joueuse ; sa grille personnelle (phrases redistribuées aléatoirement) s'affiche, prête à jouer.
  - **Cas limite :** elle repère une coquille dans une phrase après validation — elle la corrige depuis l'app, et la correction se répercute en temps réel sur la grille de tous les joueurs déjà dans la partie.

- **UJ-2. Karim rejoint la partie depuis le cocktail**
  - **Persona + contexte :** Karim reçoit le lien dans le groupe WhatsApp pendant le cocktail, avant la cérémonie.
  - **État initial :** pas de compte, sur son téléphone.
  - **Parcours :** il clique le lien, arrive directement dans la partie en tant qu'invité (pseudo rapide, pas d'inscription), voit sa grille personnelle générée.
  - **Climax :** pendant la cérémonie, il voit le père de la mariée pleurer et coche la case correspondante en temps réel.
  - **Résolution :** il complète une ligne avant les autres ; l'app annonce à tous les joueurs qu'il a gagné, mais la partie reste ouverte jusqu'à ce que Léa (la créatrice) décide de la clôturer.
  - **Cas limite :** un autre joueur complète sa ligne quasi au même moment — les deux sont déclarés co-vainqueurs, sans départage strict (jeu d'ambiance, pas de compétition arbitrée).

- **UJ-3. Léa réutilise une grille pour un autre événement**
  - **Persona + contexte :** quelques mois plus tard, Léa organise un dîner de famille et se souvient de sa grille "Bingo mariage de Julie".
  - **État initial :** connectée à son compte.
  - **Parcours :** elle va dans ses grilles créées, retrouve la grille par son nom, et choisit soit de relancer une partie telle quelle, soit de la dupliquer pour modifier les phrases avant de relancer.
  - **Climax :** elle relance une nouvelle partie à partir d'une grille existante, sans tout retaper.
  - **Résolution :** un nouveau lien de partie est généré, elle invite les nouveaux joueurs.

## 3. Glossaire

- **Grille** — ensemble nommé de phrases, de taille NxN, créé par un utilisateur. Réutilisable pour plusieurs parties.
- **Phrase** — texte libre défini par le créateur, associé à une case de la grille.
- **Partie** — session de jeu en temps réel démarrée à partir d'une grille validée, avec un ensemble de joueurs, un lien de partie, et un état (en cours / terminée).
- **Créateur** — utilisateur avec compte qui crée une grille et lance une partie.
- **Joueur** — participant à une partie, avec ou sans compte (le créateur est aussi un joueur de sa propre partie).
- **Joueur invité** — joueur sans compte, identifié par un pseudo temporaire pour la durée de la partie.
- **Case** — emplacement de la grille personnelle d'un joueur, associé à une phrase du pool de la grille et à un état coché/non coché.
- **Distribution aléatoire** — répartition des phrases du pool de la grille dans les cases de chaque joueur au lancement de la partie, différente d'un joueur à l'autre.
- **Ligne gagnante** — ligne, colonne, ou diagonale entièrement cochée sur la grille personnelle d'un joueur.
- **Vainqueur** — joueur (ou joueurs, en cas de simultanéité) ayant complété une ligne gagnante en premier.

## 4. Features

### 4.1 Création et gestion de grille

**Description :** Le créateur définit une grille réutilisable : une taille, un nom, et un pool de phrases. Réalise UJ-1, UJ-3.

#### FR-1 : Création de grille

Le créateur peut créer une grille en choisissant une taille NxN (3x3, 4x4 ou 5x5). Réalise UJ-1.

**Conséquences (testables) :**
- La taille doit être un carré NxN, avec N compris entre 3 et 5.
- Le nombre de phrases doit être égal à N×N avant que la grille puisse être validée.

#### FR-2 : Nommage de grille

Le créateur donne un nom à chaque grille créée. Réalise UJ-3.

#### FR-3 : Modification d'une phrase à tout moment

Le créateur peut modifier le texte d'une phrase de sa grille à tout moment, y compris pendant qu'une partie est en cours. Réalise UJ-1 (cas limite).

**Conséquences (testables) :**
- La correction est répercutée en temps réel sur la case correspondante de tous les joueurs déjà dans la partie.
- La position de la phrase dans les grilles déjà distribuées ne change pas — seul le texte est mis à jour.

#### FR-4 : Duplication de grille

Le créateur peut dupliquer une grille existante pour créer une nouvelle grille modifiable indépendamment de l'originale. Réalise UJ-3.

### 4.2 Lancement et invitation à une partie

**Description :** Le créateur transforme une grille validée en partie jouable, et y invite ses proches sans friction. Réalise UJ-1, UJ-2.

#### FR-5 : Lancement de partie

Le créateur peut lancer une partie à partir d'une grille validée (pool de phrases complet). Réalise UJ-1.

**Conséquences (testables) :**
- Une fois qu'une partie a été lancée à partir d'une grille, la taille de cette grille ne peut plus être modifiée (le texte des phrases reste modifiable, voir FR-3).

#### FR-6 : Distribution aléatoire des phrases

Au lancement d'une partie, le système distribue aléatoirement les phrases du pool dans la grille personnelle de chaque joueur, de sorte que deux joueurs de la même partie n'aient jamais la même disposition. Réalise UJ-1, UJ-2.

#### FR-7 : Génération du lien de partie

Le système génère un lien (ou code) de partie unique que le créateur peut partager en dehors de l'app (WhatsApp, SMS, etc.). Réalise UJ-1.

#### FR-8 : Rejoindre une partie

Un joueur peut rejoindre une partie via le lien/code, avec ou sans compte (mode invité avec pseudo temporaire). Réalise UJ-2.

**Conséquences (testables) :**
- Une partie accepte entre 1 et 6 joueurs (créateur inclus).
- Le lien de partie est réutilisable : plusieurs joueurs peuvent l'utiliser pour rejoindre, ce n'est pas un lien à usage unique.

**Out of Scope :**
- Pas de recherche de contacts ni de système d'amis intra-app (voir §5 Non-Goals).

#### FR-9 : Le créateur comme joueur

Le créateur peut rejoindre sa propre partie en tant que joueur, au même titre que les invités. Réalise UJ-1.

#### FR-20 : Jouer seul, sans inviter personne

Le créateur peut lancer une partie et y jouer seul, sans inviter ni attendre d'autres joueurs. Réalise UJ-1 (variante solo).

**Conséquences (testables) :**
- Cocher, être détecté vainqueur, et clôturer la partie fonctionnent à l'identique d'une partie à plusieurs joueurs.
- Aucune étape du parcours n'exige d'attendre ou d'inviter d'autres joueurs ; aucun message d'attente de joueurs supplémentaires ne s'affiche.

### 4.3 Jeu en temps réel

**Description :** Pendant l'événement, chaque joueur coche sa grille en temps réel ; le système détecte la victoire et notifie tout le monde, mais c'est le créateur qui décide quand la partie se termine réellement. Réalise UJ-2.

#### FR-10 : Cochage déclaratif

Chaque joueur peut cocher ou décocher une case de sa grille personnelle à tout moment pendant la partie. Réalise UJ-2.

**Conséquences (testables) :**
- Le cochage est déclaratif : aucune validation centrale ne vérifie qu'un événement décrit par la phrase s'est réellement produit.

#### FR-11 : Détection de victoire

Le système détecte quand un joueur complète une ligne, une colonne, ou une diagonale, et déclare ce joueur vainqueur. Réalise UJ-2.

**Conséquences (testables) :**
- Si plusieurs joueurs complètent une ligne gagnante de façon quasi simultanée, tous sont déclarés co-vainqueurs — pas de départage strict basé sur l'ordre exact de réception.
- La détection d'un vainqueur ne met pas fin à la partie automatiquement (voir FR-12).

#### FR-12 : Notification de vainqueur

Tous les joueurs voient le(s) nom(s) du/des vainqueur(s) en temps réel dès qu'une ligne gagnante est détectée, sans action manuelle de leur part. La partie reste ouverte tant que le créateur ne l'a pas explicitement terminée. Réalise UJ-2.

#### FR-13 : Clôture de partie par le créateur

Le créateur peut mettre fin à la partie manuellement à tout moment, notamment après qu'un vainqueur a été déclaré. Réalise UJ-2.

**Conséquences (testables) :**
- Une fois la partie clôturée par le créateur, tous les joueurs voient l'état "partie terminée".

#### FR-14 : Rappel de partie en cours

Si le créateur n'a pas clôturé une partie alors qu'un vainqueur y a déjà été déclaré, il en est informé ou rappelé lors de sa prochaine visite sur l'app.

#### FR-15 : Reconnexion après coupure

Un joueur qui perd sa connexion puis la retrouve pendant une partie retrouve automatiquement sa grille et son état de jeu (cases cochées, vainqueur éventuel déjà annoncé), sans avoir à rejoindre la partie à nouveau. Réalise UJ-2.

**Conséquences (testables) :**
- Une coupure de connexion temporaire (ex : wifi de salle de mariage) ne fait pas perdre au joueur ses cases déjà cochées.

**Feature-specific NFRs :**
- La propagation d'un cochage, d'une correction de phrase (FR-3), d'une déclaration de vainqueur, ou d'une clôture de partie doit être perçue par les joueurs en quelques secondes maximum, sans rafraîchissement manuel.

### 4.4 Comptes et bibliothèque de grilles

**Description :** Les créateurs retrouvent et réutilisent leurs grilles d'un événement à l'autre. Réalise UJ-3.

#### FR-16 : Création de compte

Un utilisateur peut créer un compte pour sauvegarder ses grilles. Réalise UJ-1, UJ-3.

**Conséquences (testables) :**
- Un compte est identifié de façon unique (ex : email ou pseudo) — le mécanisme d'authentification précis reste un détail d'implémentation, hors du périmètre de ce PRD.

#### FR-17 : Bibliothèque de grilles

Un utilisateur connecté peut consulter la liste de ses grilles créées, identifiées par leur nom. Réalise UJ-3.

#### FR-18 : Relance d'une grille existante

Un utilisateur connecté peut lancer une nouvelle partie à partir d'une grille existante sans en retaper le contenu. Réalise UJ-3.

#### FR-19 : Pas d'historique pour les invités

Un joueur invité (sans compte) ne conserve pas d'historique de parties après la fin de la partie.

## 5. Non-Goals (Explicit)

- Pas de vérification ou d'arbitrage centralisé des cases cochées — le jeu reste basé sur la confiance entre proches (voir FR-10).
- Pas de système d'amis ou de recherche de contacts intra-app — l'invitation passe uniquement par lien/code (voir FR-8).
- Pas de monétisation : pas de freemium, pas de publicité, pas de paiement, à aucun horizon prévu pour ce projet.
- Pas de fonctionnalités orientées entreprise (team-building) ou éducation (classe) — le ton et l'usage restent grand public/informel.
- Pas de départage strict en cas de victoire simultanée (voir FR-11) — assumé comme acceptable pour un jeu d'ambiance.

## 6. MVP Scope

### 6.1 In Scope

- Création de grille : taille configurable, nom, saisie libre des phrases (FR-1, FR-2).
- Modification d'une phrase à tout moment, y compris en partie (FR-3).
- Duplication de grille (FR-4).
- Lancement de partie, distribution aléatoire, lien de partie (FR-5, FR-6, FR-7).
- Rejoindre une partie avec ou sans compte, de 1 à 6 joueurs (FR-8, FR-9).
- Cochage déclaratif en temps réel, détection de victoire, notification de vainqueur, clôture de partie par le créateur, rappel de partie en cours, reconnexion après coupure (FR-10 à FR-15).
- Comptes utilisateurs et bibliothèque de grilles réutilisables (FR-16 à FR-19).
- Jouer seul, sans inviter personne (FR-20).
- PWA installable, pensée mobile-first (usage principal : téléphone en main pendant un événement).

### 6.2 Out of Scope for MVP

- Mode spectateur (suivre une partie sans y jouer).
- Chat ou messagerie intégrée à la partie.
- Historique/statistiques des parties jouées et gagnées. [NOTE POUR PM : pourrait être une suite naturelle si le projet continue après le premier vrai test terrain.]
- Notifications push (rappel avant une partie, alerte de victoire hors app).
- Grilles non carrées ou formes de victoire alternatives (blackout, formes en X, etc.) — v1 se limite à ligne/colonne/diagonale sur grille carrée.
- Thèmes de phrases suggérés (l'app propose des phrases toutes faites par thème). [NOTE POUR PM : piste citée dans le brief comme suite naturelle si le concept fonctionne.]
- Nouvelles conditions de victoire au-delà de ligne/colonne/diagonale. [NOTE POUR PM : même origine — brief §Vision.]

## 7. Success Metrics

Projet personnel — critères volontairement simples :

**Primaire**
- **SM-1** : bingo est réellement utilisé lors d'un événement vécu par l'auteur et ses proches (ex : un mariage), et la partie se déroule sans blocage technique du début à la fin — y compris en cas de coupure réseau temporaire. Valide FR-5 à FR-15.

**Secondaire**
- **SM-2** : le créateur peut monter une grille et lancer une partie en quelques minutes, sans documentation ni aide extérieure. Valide FR-1, FR-2, FR-5, FR-7.
- **SM-3** : un invité sans compte rejoint et comprend comment jouer en moins d'une minute. Valide FR-8.
- **SM-4** : le créateur retrouve et relance une grille précédente sans avoir à retaper ses phrases. Valide FR-17, FR-18.

**Contre-métriques (à ne pas optimiser)**
- **SM-C1** : ne pas sur-investir dans la scalabilité (nombre de parties simultanées, nombre de joueurs par partie) au-delà des besoins réels d'un groupe d'amis/famille — ce n'est pas un produit à faire grandir. Contrebalance SM-1.

## 8. Open Questions & Assumptions

Aucune question ouverte ni hypothèse non confirmée à ce stade. Les points en suspens du premier brouillon (bornes de taille de grille, nombre max de joueurs, réutilisation du lien, changement de taille en cours de partie, clôture de partie) ont tous été tranchés et intégrés aux FR ci-dessus (FR-1, FR-8, FR-5, FR-13/FR-14). Les deux hypothèses initiales (bornes 3x3–8x8, absence d'historique pour les invités) ont été confirmées par l'utilisateur et sont intégrées comme faits dans FR-1 et FR-19.
