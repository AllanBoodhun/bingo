---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/specs/spec-bingo/SPEC.md
  - _bmad-output/specs/spec-bingo/glossary.md
  - _bmad-output/planning-artifacts/prds/prd-bingo-2026-07-03/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-bingo-2026-07-04/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bingo-2026-07-04/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bingo-2026-07-04/EXPERIENCE.md
---

# bingo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bingo, decomposing the requirements from the SPEC/PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Le créateur peut créer une grille en choisissant une taille N×N (N entre 3 et 5) ; le nombre de phrases doit égaler N×N avant validation.
FR-2: Le créateur donne un nom à chaque grille créée.
FR-3: Le créateur peut modifier le texte d'une phrase à tout moment, y compris en partie ; la correction se répercute en temps réel sur tous les joueurs déjà distribués ; la position de la phrase dans les grilles déjà distribuées ne change pas.
FR-4: Le créateur peut dupliquer une grille existante en une nouvelle grille modifiable indépendamment.
FR-5: Le créateur peut lancer une partie à partir d'une grille validée ; une fois lancée, la taille de la grille ne peut plus être modifiée (le texte des phrases reste modifiable, FR-3).
FR-6: Au lancement, le système distribue aléatoirement les phrases dans la grille de chaque joueur ; deux joueurs de la même partie n'ont jamais la même disposition.
FR-7: Le système génère un lien/code de partie unique, partageable hors app.
FR-8: Un joueur peut rejoindre une partie via le lien/code, avec ou sans compte (mode invité, pseudo temporaire) ; une partie accepte entre 1 et 6 joueurs (créateur inclus) ; le lien est réutilisable, pas à usage unique.
FR-9: Le créateur peut rejoindre sa propre partie en tant que joueur.
FR-10: Chaque joueur peut cocher/décocher une case de sa grille à tout moment ; le cochage est déclaratif, sans validation centrale.
FR-11: Le système détecte quand un joueur complète une ligne, colonne, ou diagonale, et déclare ce joueur vainqueur ; en cas de quasi-simultanéité, tous sont co-vainqueurs sans départage strict ; la détection ne clôture pas la partie automatiquement.
FR-12: Tous les joueurs voient le(s) nom(s) du/des vainqueur(s) en temps réel dès détection, sans action manuelle ; la partie reste ouverte tant que le créateur ne l'a pas clôturée.
FR-13: Le créateur peut clôturer la partie manuellement à tout moment ; une fois clôturée, tous les joueurs voient l'état "partie terminée".
FR-14: Si le créateur n'a pas clôturé une partie où un vainqueur est déjà déclaré, il en est informé/rappelé à sa prochaine visite.
FR-15: Un joueur qui perd puis retrouve sa connexion retrouve automatiquement sa grille et son état de jeu (cases cochées, vainqueur éventuel), sans avoir à rejoindre à nouveau ; aucune perte de progression.
FR-16: Un utilisateur peut créer un compte pour sauvegarder ses grilles.
FR-17: Un utilisateur connecté peut consulter la liste de ses grilles créées, identifiées par leur nom.
FR-18: Un utilisateur connecté peut lancer une nouvelle partie à partir d'une grille existante sans en retaper le contenu.
FR-19: Un joueur invité (sans compte) ne conserve aucun historique de parties après la fin de la partie.
FR-20: Le créateur peut lancer une partie et y jouer seul, sans inviter personne ni attendre d'autres joueurs — le jeu solo est un chemin explicitement supporté, pas un cas limite accidentel. (Ajouté après revue, 2026-07-04.)

### NonFunctional Requirements

NFR-1: La propagation d'un cochage, d'une correction de phrase (FR-3), d'une déclaration de vainqueur, ou d'une clôture de partie doit être perçue par les joueurs en quelques secondes maximum, sans rafraîchissement manuel.
NFR-2: L'application est une PWA installable, pensée mobile-first (usage principal : téléphone en main pendant un événement en direct).
NFR-3: Contre-métrique délibérée (SPEC success signal / SM-C1) : ne pas sur-investir dans la scalabilité (parties simultanées, joueurs par partie) au-delà des besoins réels d'un groupe d'amis/famille — pas d'infra multi-région, pas de staging.

### Additional Requirements

Stack fondationnel imposé par la spine d'architecture (ARCHITECTURE-SPINE.md) — équivalent d'un starter pour l'Epic 1 / Story 1 :
- Frontend : React 19.2.7 + Vite 8.1.3 + vite-plugin-pwa 1.3.0, composants 100% sur-mesure (aucune librairie UI).
- Backend : Supabase Cloud (Postgres 17 + Realtime + Auth), @supabase/supabase-js 2.110.0.
- Hébergement : Vercel (frontend statique), un seul environnement de production.

Décisions d'architecture à respecter dans l'implémentation :
- AD-3 : détection de victoire par fonction/trigger Postgres (SECURITY DEFINER) — jamais côté client.
- AD-5 : identité des invités via l'auth anonyme Supabase, session persistée côté client.
- AD-6 : les Cases référencent une Phrase par clé étrangère, jamais une copie du texte.
- AD-7 : temps réel exclusivement via Supabase Realtime Postgres Changes sur `parties`, `cases`, `grilles`, `phrases`, `parties_vainqueurs` — pas de canal Broadcast séparé.
- AD-8 : propriété d'écriture par ligne via RLS (Joueur : `cases.checked` uniquement ; Créateur : `grilles`, `phrases.texte`, `parties.statut` ; aucun INSERT client sur `joueurs`/`cases`/`parties_vainqueurs`).
- AD-9 : une fonction serveur unique `rejoindre_partie` (SECURITY DEFINER) gère l'arrivée d'un joueur ET la distribution de ses cases, en vérifiant le plafond de 6 joueurs.
- AD-10 : la reconnexion doit toujours recharger l'état complet avant de réabonner Realtime (fetch-then-subscribe), jamais l'inverse.

Modèle de données (ERD de la spine) : tables `grilles`, `phrases`, `parties`, `joueurs`, `cases`, `parties_vainqueurs` — schéma et migrations SQL à créer dans `supabase/migrations/`.

### UX Design Requirements

UX-DR1: Implémenter le design system "carnet de fête" (DESIGN.md) — tokens couleur (paper-bg, paper-card, ink, ink-soft, terracotta, mustard, sage, line), typographie Georgia seule sur toute l'échelle (display, headline, body, body-sm, label-caps, caption), échelle d'espacement et de rayons (`rounded`). Un seul thème clair en v1, pas de mode sombre.

UX-DR2: Construire les composants sur mesure suivants (aucune librairie UI) : `grid-cell` (rotation aléatoire -1.2° à 1.2°, coins irréguliers par case, coche encre terracotta coin haut-droit, liseré moutarde en état "tension"), `cta-primary`, `cta-secondary`, `cta-close-game`, `live-badge` (pastille pointillée moutarde, point pulsant doux), `toast` (notification transitoire pointillée sauge), `banner-reminder` (persistante), `avatar-stack` (jusqu'à 3 avatars + compteur, rotation de couleurs par joueur), champ de phrase éditable en ligne, sélecteur de taille en chips (3×3 à 5×5).

UX-DR3: Implémenter l'architecture de l'information à 5 surfaces sans barre d'onglets (navigation en pile) : Bibliothèque de grilles, Connexion/Compte, Création de grille, Rejoindre une partie, Grille en direct. Un invité cliquant un lien de partie atterrit directement sur "Grille en direct" sans jamais voir la Bibliothèque ni l'écran de connexion. "Vainqueur déclaré" est un état superposé de "Grille en direct", pas une surface séparée.

UX-DR4: Gérer explicitement chacun des états listés dans EXPERIENCE.md (§State Patterns) : grille incomplète (compteur "5/25", CTA désactivé), bibliothèque vide (message d'invitation, pas de tableau vide silencieux), grille validée sans partie lancée (actions Relancer/Dupliquer), saisie du pseudo (transition immédiate, pas d'écran d'attente), lien de partie invalide (message explicite, pas de redirection silencieuse), partie pleine à 6 joueurs (message dédié, pas d'accès lecture seule), partie active sans vainqueur (CTA clôture déjà visible), vainqueur déclaré partie ouverte (overlay non bloquant), partie clôturée (lecture seule), reconnexion (restauration silencieuse, pas de rechargement visible), rappel de partie en cours (bannière en tête de bibliothèque), historique invité (aucune surface "mes parties").

UX-DR5: Respecter les primitives d'interaction : tap uniquement pour cocher/décocher (pas de long-press, pas de swipe) ; tap sur une phrase en création pour édition en place ; pas de pull-to-refresh. Interdits explicites : animations d'ouverture longues, spinners visibles sur actions courantes (cocher, rejoindre), confirmations modales sur actions réversibles.

UX-DR6: Respecter le plancher d'accessibilité : cibles de tap ≥44px sur toutes les cases y compris en grille 5×5 ; l'état "coché" ne repose jamais sur la couleur seule (coche encre + position fixe comme signal primaire) ; l'annonce du vainqueur est un élément persistant à l'écran, jamais seulement transitoire ; l'ordre de focus/lecture suit l'ordre naturel de la grille malgré les rotations décoratives.

UX-DR7: Appliquer la voix et le ton définis (microcopie chaleureuse, tutoiement, phrases courtes ; ex. "Ta grille est prête !" plutôt que "Grille créée avec succès.") et utiliser les termes du glossaire produit (Grille, Partie, Case, Vainqueur, Joueur invité) tels quels, avec majuscule quand ils désignent l'entité produit.

### FR Coverage Map

FR-1: Epic 1 - Création de grille (taille N×N, N entre 3 et 5)
FR-2: Epic 1 - Nommage de grille
FR-3: Epic 1 - Modification d'une phrase à tout moment, propagation temps réel
FR-4: Epic 1 - Duplication de grille
FR-5: Epic 2 - Lancement de partie depuis une grille validée
FR-6: Epic 2 - Distribution aléatoire des phrases par joueur
FR-7: Epic 2 - Génération du lien de partie
FR-8: Epic 2 - Rejoindre une partie (avec/sans compte, de 1 à 6 joueurs)
FR-9: Epic 2 - Le créateur comme joueur
FR-10: Epic 2 - Cochage déclaratif
FR-11: Epic 2 - Détection de victoire (co-vainqueurs)
FR-12: Epic 2 - Notification de vainqueur, partie reste ouverte
FR-13: Epic 2 - Clôture de partie par le créateur
FR-14: Epic 2 - Rappel de partie en cours non clôturée
FR-15: Epic 2 - Reconnexion après coupure, état restauré
FR-16: Epic 1 - Création de compte
FR-17: Epic 1 - Bibliothèque de grilles
FR-18: Epic 2 - Relance d'une grille existante (même mécanisme que FR-5, entrée depuis la Bibliothèque)
FR-19: Epic 2 - Pas d'historique pour les invités
FR-20: Epic 2 - Jouer seul, sans inviter personne

## Epic List

### Epic 1: Grilles et bibliothèque
Le créateur peut créer un compte, construire, nommer, corriger et dupliquer des grilles de phrases personnalisées, et les retrouver dans sa bibliothèque pour les réutiliser plus tard.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-16, FR-17

### Epic 2: Partie en temps réel
Le créateur lance une partie depuis une grille validée (fraîchement créée ou reprise de sa bibliothèque) et invite ses proches par lien ; chacun (avec ou sans compte) rejoint avec sa grille personnelle mélangée, coche ses cases en temps réel, voit le(s) vainqueur(s) s'afficher dès qu'une ligne est complétée, et le créateur clôture la partie quand il le décide — avec reconnexion transparente en cas de coupure réseau. Jouer seul, sans inviter personne, est un chemin valide au même titre qu'une partie à plusieurs.
**FRs covered:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-18, FR-19, FR-20

## Epic 1: Grilles et bibliothèque

Le créateur peut créer un compte, construire, nommer, corriger et dupliquer des grilles de phrases personnalisées, et les retrouver dans sa bibliothèque pour les réutiliser plus tard.

### Story 1.1: Mise en place du projet et création de compte

As a futur créateur,
I want créer un compte,
So that je peux sauvegarder mes grilles.

**Acceptance Criteria:**

**Given** le projet bingo n'existe pas encore
**When** l'environnement est initialisé
**Then** le projet React + Vite + vite-plugin-pwa est connecté à un projet Supabase (Auth + Postgres + Realtime), conforme à la spine (AD-1, AD-2)
**And** le design system "carnet de fête" (tokens couleur/typo, thème clair unique) est en place et appliqué à l'écran Connexion/Compte

**Given** je suis sur l'écran Connexion/Compte sans compte
**When** je saisis un identifiant et un mot de passe et valide
**Then** un compte est créé via Supabase Auth et je suis connecté

**Given** j'ai déjà un compte
**When** je me connecte avec mes identifiants corrects
**Then** j'accède à ma Bibliothèque

### Story 1.2: Créer une grille

As a créateur connecté,
I want créer une grille en choisissant sa taille et en la nommant,
So that je prépare un nouveau jeu à phrases personnalisées.

**Acceptance Criteria:**

**Given** je suis connecté
**When** je choisis "Nouvelle grille", sélectionne une taille via les chips (3×3 à 5×5) et saisis un nom
**Then** une nouvelle grille est créée et associée à mon compte

**Given** une grille en cours de création
**When** je saisis mes phrases une à une
**Then** un compteur affiche "X / N²" et la grille n'est validée que lorsque le nombre de phrases égale exactement N×N (FR-1)

**And** le champ de phrase suit le pattern "tap pour éditer en place", pas d'écran séparé (UX-DR5)
**And** le sélecteur de taille utilise les chips du design system : bordure pointillée à l'état inactif, fond terracotta plein à l'état actif (UX-DR2)

### Story 1.3: Corriger une phrase à tout moment

As a créateur,
I want modifier le texte d'une phrase de ma grille à tout moment,
So that je corrige une coquille sans tout retaper.

**Acceptance Criteria:**

**Given** une grille qui m'appartient (validée ou non)
**When** je tape une phrase existante
**Then** je peux éditer son texte en place et l'enregistrer

**Given** une correction enregistrée
**When** je recharge la grille
**Then** le nouveau texte est affiché et la position de la phrase dans la grille ne change jamais suite à une correction de texte

**And** seul le créateur propriétaire de la grille peut modifier une phrase — appliqué via RLS (AD-8)
**And** la propagation en temps réel de cette correction vers des grilles déjà distribuées à des joueurs est traitée dans l'Epic 2 (nécessite les tables `parties`/`cases`, hors périmètre de cette story)

### Story 1.4: Dupliquer une grille

As a créateur,
I want dupliquer une grille existante,
So that je l'adapte à un nouvel événement sans repartir de zéro.

**Acceptance Criteria:**

**Given** une grille existante m'appartenant
**When** je choisis "Dupliquer"
**Then** une nouvelle grille indépendante est créée avec la même taille et les mêmes phrases, sous un nom modifiable

**Given** la grille dupliquée
**When** je modifie ses phrases
**Then** la grille originale n'est pas affectée, et réciproquement

**And** l'action "Dupliquer" est accessible depuis la Bibliothèque

### Story 1.5: Consulter sa bibliothèque de grilles

As a créateur connecté,
I want voir la liste de mes grilles créées,
So that je les retrouve facilement.

**Acceptance Criteria:**

**Given** je suis connecté et j'ai créé au moins une grille
**When** j'ouvre la Bibliothèque
**Then** je vois la liste de mes grilles identifiées par leur nom

**Given** je n'ai encore créé aucune grille
**When** j'ouvre la Bibliothèque
**Then** je vois un message d'invitation à créer ma première grille plutôt qu'un tableau vide silencieux (UX-DR4)

**And** une grille validée affiche l'action "Dupliquer" (l'action "Relancer" arrive avec l'Epic 2)

## Epic 2: Partie en temps réel

Le créateur lance une partie depuis une grille validée (fraîchement créée ou reprise de sa bibliothèque) et invite ses proches par lien ; chacun (avec ou sans compte) rejoint avec sa grille personnelle mélangée, coche ses cases en temps réel, voit le(s) vainqueur(s) s'afficher dès qu'une ligne est complétée, et le créateur clôture la partie quand il le décide — avec reconnexion transparente en cas de coupure réseau. Jouer seul, sans inviter personne, est un chemin valide au même titre qu'une partie à plusieurs.

### Story 2.1: Lancer une partie et obtenir un lien

As a créateur,
I want lancer une partie à partir d'une grille validée et obtenir un lien à partager,
So that j'invite mes proches à jouer.

**Acceptance Criteria:**

**Given** une grille validée (pool complet) m'appartenant
**When** je lance la partie
**Then** une Partie est créée en base référencée à cette grille, avec un statut "en_cours" et un code/lien unique généré

**Given** une partie lancée
**When** je consulte à nouveau la grille source
**Then** sa taille ne peut plus être modifiée (le texte des phrases reste modifiable, cf Story 1.3)

**And** le lien de partie est réutilisable — plusieurs joueurs peuvent l'utiliser pour rejoindre, ce n'est pas un lien à usage unique
**And** l'action "Relancer" est disponible depuis la Bibliothèque sur une grille existante et déclenche ce même mécanisme de lancement (FR-18), sans retaper le contenu de la grille

### Story 2.2: Rejoindre une partie et recevoir sa grille personnelle

As a joueur (créateur ou invité),
I want rejoindre une partie via le lien et recevoir ma grille personnelle mélangée,
So that je commence à jouer.

**Acceptance Criteria:**

**Given** un lien/code de partie valide et moins de 6 joueurs déjà inscrits
**When** un utilisateur (avec ou sans compte) rejoint
**Then** la fonction serveur `rejoindre_partie` (SECURITY DEFINER, AD-9) l'inscrit comme Joueur et distribue aléatoirement les phrases du pool de la grille dans ses Cases, sans jamais reproduire la disposition d'un autre joueur de la même partie

**Given** une partie qui compte déjà 6 joueurs
**When** un 7e utilisateur tente de rejoindre
**Then** il voit "Cette Partie est complète (6 joueurs max)" à la place du champ pseudo — pas d'accès en lecture seule

**Given** un invité sans compte
**When** il rejoint
**Then** il utilise l'auth anonyme Supabase (AD-5) et saisit un pseudo temporaire, sans création de compte imposée
**And** dès qu'il valide son pseudo, la transition vers Grille en direct est immédiate, sans écran d'attente affiché (UX-DR4)

**Given** le créateur qui vient de lancer sa partie
**When** il rejoint sa propre partie
**Then** il devient un Joueur comme les autres, via ce même mécanisme (FR-9)

**Given** un lien/code de partie mal formé ou correspondant à aucune partie existante
**When** un utilisateur tente d'y accéder
**Then** il voit le message "Cette Partie n'existe plus ou le lien est incorrect" — pas de redirection silencieuse vers la Bibliothèque (UX-DR4)

### Story 2.3: Jouer en temps réel — cocher ses cases et suivre la partie

As a joueur,
I want cocher mes cases et voir en temps réel ce qui se passe pour les autres joueurs,
So that je vis la partie comme un moment partagé pendant l'événement.

**Acceptance Criteria:**

**Given** je suis un Joueur dans une partie en cours
**When** je tape une case de ma grille
**Then** son état change immédiatement — pas de spinner, pas de confirmation modale — et est écrit dans `cases.checked`, RLS limitant l'écriture à mes propres cases (AD-8)

**Given** un autre joueur de la même partie coche une case
**When** son cochage est enregistré
**Then** je vois apparaître une notification transitoire ("Karim vient de cocher une Case") en quelques secondes maximum (NFR-1), via un abonnement Supabase Realtime Postgres Changes (AD-7) — pas de canal Broadcast séparé

**Given** le créateur corrige le texte d'une phrase de la grille pendant que je suis dans la partie (Story 1.3)
**When** la correction est enregistrée
**Then** je vois le nouveau texte s'afficher sur ma case correspondante en quelques secondes maximum (NFR-1), via l'abonnement Realtime sur la table `phrases` (AD-6, AD-7) — sans recharger la page, complétant ainsi FR-3 pour les joueurs déjà en partie

**And** le badge "en direct" reste visible en permanence tant que la partie est active
**And** la pile d'avatars affiche les joueurs de la partie (jusqu'à 3 avatars + un compteur, ex. "+3"), jamais plus de 6 au total (UX-DR2)

### Story 2.4: Détecter et annoncer le(s) vainqueur(s)

As a joueur,
I want que la victoire soit annoncée automatiquement dès qu'une ligne, colonne ou diagonale est complétée,
So that tout le monde le sache en même temps, sans ambiguïté.

**Acceptance Criteria:**

**Given** un cochage vient d'être écrit
**When** la fonction/trigger Postgres (SECURITY DEFINER, AD-3) détecte une ligne/colonne/diagonale entièrement cochée pour ce joueur
**Then** il est inséré dans `parties_vainqueurs` — jamais calculé ou écrit côté client

**Given** deux joueurs complètent une ligne gagnante quasi simultanément
**When** la fonction traite les deux cochages
**Then** les deux sont déclarés co-vainqueurs, sans départage strict basé sur l'ordre exact de réception

**Given** un vainqueur est inséré dans `parties_vainqueurs`
**When** tous les clients abonnés à cette table (AD-7) reçoivent l'événement
**Then** chacun voit l'overlay "Vainqueur : {nom} 🎉" apparaître en temps réel sans action manuelle, de façon persistante (UX-DR6), et peut le fermer pour continuer à voir sa grille sans que la partie ne se ferme

### Story 2.5: Clôturer la partie et rappel de partie en cours

As a créateur,
I want clôturer la partie quand je le décide, et être rappelé si j'oublie après une victoire,
So that je ne laisse pas une partie ouverte indéfiniment.

**Acceptance Criteria:**

**Given** je suis le créateur d'une partie active
**When** je tape "Clôturer la Partie" (disponible à tout moment, pas seulement après une victoire)
**Then** `parties.statut` passe à "terminee" — seul le créateur peut écrire ce champ (AD-8)

**Given** la partie clôturée
**When** n'importe quel joueur la consulte
**Then** il voit l'état "Partie terminée" et la grille reste consultable en lecture seule

**Given** une partie dont un vainqueur a été déclaré mais que je n'ai pas encore clôturée
**When** je reviens sur l'app (Bibliothèque)
**Then** une bannière pointillée sauge me le rappelle en tête de liste

### Story 2.6: Reconnexion après coupure réseau

As a joueur,
I want retrouver automatiquement ma grille et son état exact après une coupure réseau,
So that je ne perds pas ma progression pendant l'événement.

**Acceptance Criteria:**

**Given** je perds ma connexion pendant une partie puis la retrouve
**When** l'app se reconnecte
**Then** elle recharge d'abord l'état complet (mes cases, le statut de la partie, les vainqueurs éventuels) avant de rouvrir l'abonnement Realtime — jamais l'inverse (AD-10)

**Given** cette restauration
**When** elle se termine
**Then** aucune case précédemment cochée n'est perdue et aucun rechargement visible n'apparaît (restauration silencieuse)

**And** ce comportement s'applique à chaque (re)montage de l'écran Grille en direct, pas seulement au premier chargement

### Story 2.7: Pas d'historique pour les invités

As a joueur invité sans compte,
I want ne conserver aucune trace de mes parties après leur fin,
So that je reste cohérent avec le principe "pas de compte imposé pour un jeu ponctuel".

**Acceptance Criteria:**

**Given** un joueur invité (session anonyme) a participé à une partie désormais clôturée ou quittée
**When** il revient sur l'app
**Then** il ne voit aucune surface "mes parties" ni trace d'historique de cette partie

**And** cela ne s'applique jamais à un créateur avec compte, qui retrouve toujours ses grilles et parties passées via la Bibliothèque

### Story 2.8: Jouer seul, sans inviter personne

As a créateur,
I want lancer une partie et y jouer seul, sans inviter personne,
So that je peux profiter du jeu même sans autres joueurs disponibles, sans attendre ni forcer une invitation.

**Acceptance Criteria:**

**Given** une grille validée m'appartenant
**When** je lance une partie et la rejoins comme seul joueur
**Then** je peux cocher mes cases, être détecté vainqueur, et clôturer la partie exactement comme dans une partie à plusieurs — aucune étape n'exige d'attendre ou d'inviter d'autres joueurs (FR-20)

**Given** je suis seul dans la partie
**When** je consulte l'écran Grille en direct
**Then** aucun message n'indique une attente de joueurs supplémentaires ; la pile d'avatars affiche uniquement moi-même

**And** FR-8 est reformulé en conséquence : une Partie accepte entre 1 et 6 joueurs, créateur inclus — le minimum de 1 rend le jeu solo explicitement valide, pas un cas limite accidentel
