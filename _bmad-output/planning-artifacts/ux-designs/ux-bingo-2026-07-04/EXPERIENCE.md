---
title: bingo
status: final
created: 2026-07-04
updated: 2026-07-04
sources:
  - ../../prds/prd-bingo-2026-07-03/prd.md
  - ../../briefs/brief-bingo-2026-07-03/brief.md
---

# bingo — Experience Spine

## Foundation

PWA (progressive web app), surface unique, **mobile-first** — l'usage principal est un téléphone en main pendant un événement en direct (mariage, dîner de famille, soirée — les exemples ci-dessous sont illustratifs, l'app n'est pas spécifique au mariage). Pas de système d'UI hérité (shadcn, MUI...) — composants construits sur mesure pour l'identité "carnet de fête" de `DESIGN.md`. Aucun mode sombre en v1 : un seul thème clair (décision explicite — voir `.memlog.md`).

**Principe directeur : la confiance plutôt que l'arbitrage.** bingo est un jeu entre proches, pas une compétition arbitrée (voir brief, PRD Non-Goals). Ce principe motive directement plusieurs choix de cette spine : pas de confirmation avant de cocher une case, co-vainqueurs sans ordre de priorité affiché en cas de simultanéité, pas de vérification centrale des cases cochées. Tout nouvel écran ou interaction doit rester cohérent avec ce principe plutôt que d'introduire de l'arbitrage.

## Information Architecture

| Surface | Atteint depuis | Objectif |
|---|---|---|
| Bibliothèque de grilles | Ouverture app (créateur connecté) | Lister ses grilles, en relancer une ou en créer une nouvelle (PRD FR-16, FR-17) |
| Connexion / Compte | Bibliothèque (non connecté), ou toute action nécessitant un compte | Créer un compte / se connecter (FR-16) |
| Création de grille | Bibliothèque → "Nouvelle grille" ou "Dupliquer" | Définir taille, nom, phrases (FR-1 à FR-4) |
| Rejoindre une partie | Lien de partie externe (invité, hors app) | Entrer un pseudo, rejoindre sans compte (FR-8) |
| Grille en direct | Lancement de partie (créateur) ou lien rejoint (invité) | Cocher des cases, suivre la partie, voir le vainqueur, clôturer (FR-6, FR-9 à FR-15) |

Pas de barre d'onglets : l'app est trop petite pour en justifier une. Navigation en pile simple. Un invité sans compte qui clique un lien de partie **atterrit directement sur "Grille en direct"** — il ne voit jamais la Bibliothèque ni l'écran de connexion (friction minimale, cohérent avec FR-8).

"Vainqueur déclaré" n'est pas une surface séparée : c'est un **état superposé** de "Grille en direct" (voir §State Patterns) — la partie reste au même endroit, elle change juste d'état, cohérent avec FR-12/FR-13 (la détection du vainqueur ne ferme pas la partie).

→ Référence de composition : `mockups/direction-artisanal.html` (grille en direct + création de grille), `mockups/carnet-checkmark-variants.html` (traitement de la case cochée). Les spines gagnent en cas de conflit avec les mockups — notamment, le mockup affiche "10 joueurs" à titre illustratif, généré avant la décision du plafond à 6 joueurs (FR-8) ; c'est le tableau `Component Patterns` ci-dessous qui fait foi.

## Voice and Tone

Microcopy. La voix et la posture esthétique vivent dans `DESIGN.md.Brand & Style`.

| Do | Don't |
|---|---|
| "Ta grille est prête !" | "Grille créée avec succès." |
| "Karim vient de cocher une Case." | "Mise à jour en temps réel : état de case modifié." |
| "Vainqueur : Karim 🎉" | "PARTIE TERMINÉE — GAME OVER" |
| "Une Partie est toujours en cours — tu veux la clôturer ?" | "Action requise : 1 partie active détectée." |
| Phrases courtes, chaleureuses, au tutoiement. | Vocabulaire technique, codes d'erreur bruts, ton corporate. |

Le nom des entités du Glossaire PRD (Grille, Partie, Case, Vainqueur, Joueur invité) s'utilise tel quel dans les microcopies, avec une majuscule quand il désigne l'entité produit — cohérence avec le PRD.

## Component Patterns

Comportemental. Les specs visuelles vivent dans `DESIGN.md.Components`.

| Composant (`DESIGN.md`) | Usage | Règles comportementales |
|---|---|---|
| Case de grille (`grid-cell`) | Grille en direct | Tap pour cocher/décocher (FR-10). Pas de confirmation. Changement immédiat, pas d'animation longue. |
| CTA principal (`cta-primary`) | Lancer la Partie, Rejoindre | Une seule action principale par écran, jamais deux CTA de même poids visuel côte à côte. |
| Champ de phrase | Création de grille | Ligne éditable à tout moment, y compris après validation et pendant une partie en cours (FR-3) — pas de mode "lecture seule" post-validation. |
| Sélecteur de taille (chips) | Création de grille | Chips 3×3 à 5×5 (FR-1). Changement de taille désactivé après lancement d'une partie (FR-5) — le chip devient non interactif, pas caché. |
| Badge "en direct" (`live-badge`) | Grille en direct | Visible en permanence pendant qu'une partie est active. Disparaît seulement à la clôture (FR-13). |
| Pile d'avatars (`avatar-stack`) | Grille en direct | Affiche jusqu'à 3 joueurs + compteur (ex. "+3") — jamais plus de 6 au total, plafond de la Partie (FR-8). |
| Notification transitoire (`toast`) | Grille en direct | Un événement à la fois ("X vient de cocher"), auto-disparition après quelques secondes. Ne bloque jamais l'interaction avec la grille. |
| Bannière de rappel (`banner-reminder`) | Bibliothèque (créateur) | Apparaît uniquement si une partie du créateur a un vainqueur déclaré mais n'a pas été clôturée (FR-14). |
| CTA clôture de partie (`cta-close-game`) | Grille en direct (créateur uniquement) | Disponible à tout moment pendant qu'une partie est active, pas seulement après un vainqueur (FR-13) — voir §State Patterns. |

## State Patterns

| État | Surface | Traitement |
|---|---|---|
| Grille incomplète | Création de grille | Le CTA "Lancer la Partie" reste désactivé tant que le nombre de phrases ≠ taille×taille (FR-1). Compteur visible ("5 / 25"). |
| Bibliothèque vide | Bibliothèque | Premier lancement, aucune grille créée : message d'invitation à créer la première grille, pas de tableau vide silencieux. |
| Grille validée, partie non lancée | Bibliothèque | Grille listée avec ses deux actions : "Relancer" et "Dupliquer" (FR-17, FR-4). |
| Saisie du pseudo | Rejoindre une partie | Pseudo saisi → transition immédiate vers "Grille en direct" (traitement interne, pas d'écran d'attente affiché). |
| Lien de partie invalide | Rejoindre une partie | Lien mal formé ou partie inexistante : message "Cette Partie n'existe plus ou le lien est incorrect", pas de redirection silencieuse vers la Bibliothèque. |
| Case cochée / non cochée | Grille en direct | Distinction par la coche encre (§DESIGN.md), jamais par la couleur seule (accessibilité). |
| Partie active, pas encore de vainqueur | Grille en direct | Le créateur voit déjà le CTA "Clôturer la Partie" (FR-13 : clôture possible à tout moment, pas seulement après une victoire). |
| Partie pleine (6 joueurs) | Rejoindre une partie | Un 7ᵉ arrivant sur le lien voit "Cette Partie est complète (6 joueurs max)" à la place du champ pseudo — pas d'accès en lecture seule (FR-8). |
| Vainqueur déclaré (partie ouverte) | Grille en direct | Overlay "Vainqueur" par-dessus la grille (FR-12), non bloquant — un joueur peut le fermer et continuer à voir sa grille. Le CTA "Clôturer la Partie" du créateur reste au même endroit qu'avant la victoire (FR-13). |
| Partie clôturée | Grille en direct | Tous les joueurs voient l'état "Partie terminée" ; la grille reste consultable en lecture seule. |
| Reconnexion après coupure | Grille en direct | Restauration silencieuse de l'état exact (cases cochées, vainqueur déjà annoncé) — pas de rechargement visible, pas de perte de progression (FR-15). |
| Rappel de partie en cours | Bibliothèque | Bannière pointillée sauge en tête de liste si une partie du créateur a un vainqueur non clôturé (FR-14). |
| Historique invité | — (aucune surface) | Un Joueur invité sans compte ne voit aucun historique de parties après la fin d'une Partie — il n'y a pas de surface "mes parties" pour lui (FR-19). |

## Interaction Primitives

- Tap pour cocher/décocher une case — pas de long-press, pas de swipe sur la grille.
- Tap sur une phrase en mode création pour l'éditer en place (pas d'écran séparé).
- Pas de pull-to-refresh : tout est poussé en temps réel, un rafraîchissement manuel n'a pas de sens ici.
- **Banni** : animations d'ouverture longues, spinners de chargement visibles sur les actions courantes (cocher une case, rejoindre), confirmations modales pour des actions réversibles (cocher/décocher).

## Accessibility Floor

Comportemental. Le contraste visuel vit dans `DESIGN.md`.

- Cibles de tap ≥ 44px sur toutes les cases de grille, y compris en grille 5×5 (la plus dense).
- L'état "coché" ne repose jamais sur la couleur seule : la coche encre (icône + position fixe) reste le signal primaire, cohérent avec le rejet du rond de couleur plein (§DESIGN.md Do's and Don'ts).
- L'annonce du vainqueur (FR-12) est un élément persistant à l'écran, jamais seulement une notification transitoire qui pourrait être manquée.
- Ordre de focus/lecture suit l'ordre naturel de la grille (gauche à droite, haut en bas) malgré les rotations visuelles décoratives — l'irrégularité de `DESIGN.md.Shapes` est purement visuelle, jamais dans l'ordre de tabulation.

## Key Flows

Mêmes personas que le PRD — identifiants UJ repris à l'identique.

### UJ-1. Léa monte le bingo du mariage de sa sœur

1. Léa ouvre bingo, se connecte (surface **Connexion / Compte**).
2. Elle arrive sur **Bibliothèque de grilles**, tape "Nouvelle grille".
3. Sur **Création de grille** : choisit 5×5, nomme "Bingo mariage de Julie", saisit ses phrases une à une (compteur 25/25 quand complet).
4. Le CTA "Lancer la Partie" s'active ; elle le tape.
5. **Climax :** un lien de partie est généré ; elle le copie et l'envoie dans le groupe WhatsApp familial.
6. **Résolution :** elle rejoint elle-même la partie, atterrit sur **Grille en direct** avec sa grille personnelle mélangée.

**Cas limite :** elle repère une coquille après validation — elle tape la phrase concernée (même en partie déjà lancée), la corrige ; le changement se propage en temps réel à tous les joueurs déjà connectés (FR-3).

### UJ-2. Karim rejoint la partie depuis le cocktail

1. Karim reçoit le lien WhatsApp, le tape.
2. Il atterrit directement sur **Rejoindre une partie** — saisit un pseudo, pas de compte.
3. Transition immédiate vers **Grille en direct** : sa grille personnelle s'affiche, mélangée différemment de celle de Léa.
4. Pendant la cérémonie, il voit "Le père de la mariée va pleurer" se produire, tape la case correspondante — la coche encre apparaît en haut à droite.
5. **Climax :** il complète une ligne ; l'overlay "Vainqueur : Karim 🎉" apparaît pour tous les joueurs connectés, sans fermer la partie.
6. **Résolution :** il ferme l'overlay, continue de voir sa grille ; la partie reste "en cours" jusqu'à ce que Léa la clôture.

**Cas limite :** un autre joueur complète sa ligne quasi simultanément — les deux noms apparaissent comme co-vainqueurs dans l'overlay, sans ordre de priorité affiché.

### UJ-3. Léa réutilise une grille pour un autre événement

1. Quelques mois plus tard, Léa ouvre bingo, atterrit sur **Bibliothèque de grilles**.
2. Elle retrouve "Bingo mariage de Julie" par son nom.
3. **Climax :** elle tape "Relancer" (partie identique) ou "Dupliquer" (pour adapter les phrases à ce nouvel événement) — dans les deux cas, sans retaper le contenu depuis zéro.
4. **Résolution :** un nouveau lien de partie est généré depuis **Création de grille** (si dupliqué) ou directement (si relancé telle quelle) ; elle invite les nouveaux joueurs.
