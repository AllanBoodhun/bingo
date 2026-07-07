---
id: SPEC-bingo
companions:
  - glossary.md
  - ../../planning-artifacts/architecture/architecture-bingo-2026-07-04/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-bingo-2026-07-04/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-bingo-2026-07-04/EXPERIENCE.md
sources:
  - ../../planning-artifacts/briefs/brief-bingo-2026-07-03/brief.md
  - ../../planning-artifacts/prds/prd-bingo-2026-07-03/prd.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# SPEC — bingo

## Why

bingo remplace le bingo papier à phrases personnalisées par un jeu multijoueur temps réel : le créateur écrit les phrases, lance une partie, ses proches la rejoignent en un clic pendant un événement partagé (mariage, dîner de famille, soirée), et chacun coche en direct ce qu'il observe jusqu'à ce qu'une ligne se dessine. C'est un projet personnel — pas une startup en devenir — dont la barre de succès est de fonctionner en conditions réelles lors d'un vrai événement vécu par l'auteur et ses proches.

## Capabilities

- **CAP-1 — Création et gestion de grille**
  - **intent:** Le créateur crée, nomme et duplique une grille NxN et rédige ses phrases, modifiables à tout moment y compris pendant une partie en cours.
  - **success:** Une grille ne peut être validée/lancée que si le nombre de phrases égale taille×taille ; une correction de phrase se répercute en temps réel sur la case correspondante de tous les joueurs déjà distribués.

- **CAP-2 — Lancement et invitation à une partie**
  - **intent:** Le créateur transforme une grille validée en partie jouable et invite ses proches par un lien/code réutilisable, avec ou sans compte.
  - **success:** La taille de grille est verrouillée une fois la partie lancée (le texte des phrases reste modifiable) ; chaque joueur reçoit une distribution aléatoire des phrases qui ne coïncide jamais avec celle d'un autre joueur de la même partie ; la partie accepte de 1 à 6 joueurs, créateur inclus.

- **CAP-5 — Jouer seul, sans inviter personne**
  - **intent:** Le créateur peut lancer une partie et la rejoindre comme seul joueur, sans attendre ni inviter d'autres joueurs.
  - **success:** Cocher, être détecté vainqueur, et clôturer fonctionnent exactement comme dans une partie à plusieurs ; aucune étape n'exige d'attendre ou d'inviter d'autres joueurs ; l'écran de jeu n'affiche aucun message d'attente de joueurs supplémentaires.

- **CAP-3 — Jeu en temps réel**
  - **intent:** Chaque joueur coche/décoche déclarativement ses cases pendant la partie ; le système détecte une ligne/colonne/diagonale complète et annonce le(s) vainqueur(s) sans clore la partie ; le créateur clôture la partie quand il le décide.
  - **success:** La propagation d'un cochage, d'une correction de phrase, d'une déclaration de vainqueur ou d'une clôture est perçue en quelques secondes maximum sans rafraîchissement manuel ; des cochages quasi simultanés produisent des co-vainqueurs sans départage strict ; une coupure réseau temporaire ne fait perdre aucune case cochée — l'état exact (cases, vainqueur déjà annoncé) est restauré à la reconnexion.

- **CAP-4 — Comptes et bibliothèque de grilles**
  - **intent:** Un utilisateur crée un compte pour retrouver, relancer ou dupliquer ses grilles précédentes sans en retaper le contenu ; un joueur invité sans compte ne conserve aucun historique après la partie.
  - **success:** La bibliothèque liste les grilles d'un compte par nom avec les actions Relancer/Dupliquer ; une bannière rappelle une partie non clôturée dont un vainqueur a déjà été déclaré.

## Constraints

- Taille de grille N×N, N entre 3 et 5.
- Une partie accepte de 1 à 6 joueurs, créateur inclus — le solo est un chemin valide, pas un cas limite accidentel.
- Le lien/code de partie est réutilisable — jamais un lien à usage unique.
- La taille de grille est verrouillée après le lancement de la partie ; le texte des phrases reste modifiable à tout moment, y compris en partie.
- Le cochage reste strictement déclaratif : aucune vérification ou arbitrage central des cases cochées.
- Un joueur invité (sans compte) ne conserve aucun historique après la fin de la partie.

## Non-goals

- Vérification ou arbitrage centralisé des cases cochées.
- Système d'amis ou recherche de contacts intra-app.
- Monétisation sous toute forme (freemium, publicité, paiement).
- Fonctionnalités orientées entreprise (team-building) ou éducation (classe).
- Départage strict en cas de victoire simultanée.
- Mode spectateur (hors MVP).
- Chat ou messagerie intégrée à la partie (hors MVP).
- Historique/statistiques des parties jouées (hors MVP — piste future si le projet continue).
- Notifications push (hors MVP).
- Grilles non carrées ou formes de victoire alternatives : blackout, formes en X (hors MVP).
- Thèmes de phrases suggérés (hors MVP — piste future si le concept fonctionne).
- Nouvelles conditions de victoire au-delà de ligne/colonne/diagonale (hors MVP).

## Success signal

bingo est réellement utilisé lors d'un événement vécu par l'auteur et ses proches (ex. un mariage), et la partie se déroule sans blocage technique du début à la fin — y compris en cas de coupure réseau temporaire. Signaux secondaires : une grille et une partie montées en quelques minutes sans documentation ; un invité sans compte qui rejoint et comprend en moins d'une minute ; un créateur qui retrouve et relance une grille précédente sans retaper ses phrases. Contre-métrique délibérée : ne pas sur-investir dans la scalabilité (parties simultanées, joueurs par partie) au-delà des besoins réels d'un groupe d'amis/famille.
