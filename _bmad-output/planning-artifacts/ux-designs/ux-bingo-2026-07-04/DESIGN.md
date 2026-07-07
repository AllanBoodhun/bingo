---
title: bingo
status: final
created: 2026-07-04
updated: 2026-07-04
name: Carnet de fête
description: Bingo à phrases personnalisées, habillé comme un carnet de fête bricolé à la main — papier crème, encre chaude, découpes légèrement de travers.
colors:
  paper-bg: '#F7EFDD'
  paper-card: '#FFFDF6'
  ink: '#4A3222'
  ink-soft: '#8A7256'
  terracotta: '#C1502E'
  mustard: '#E8A33D'
  sage: '#8A9A5B'
  line: '#DDD0B0'
typography:
  display:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.2'
  headline:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.25'
  body:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.4'
  body-sm:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
  label-caps:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 11px
    fontWeight: '700'
    letterSpacing: 0.04em
  caption:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 11px
    fontWeight: '400'
    letterSpacing: 0.01em
rounded:
  sm: 9px
  DEFAULT: 12px
  md: 14px
  lg: 18px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  screen-margin: 20px
components:
  grid-cell:
    background: '{colors.paper-card}'
    border: '1.5px solid {colors.ink}'
    borderRadius: 'irrégulier — voir §Shapes, hors échelle {rounded}'
    rotation: '-1.2deg à 1.2deg, aléatoire par case'
    checkedMark: 'coche encre {colors.terracotta}, coin haut-droit'
  cta-primary:
    background: '{colors.terracotta}'
    color: '{colors.paper-card}'
    borderRadius: '{rounded.lg}'
    shadow: '3px 3px 0 {colors.ink}'
  cta-secondary:
    background: 'transparent'
    color: '{colors.ink}'
    border: '1.5px dashed {colors.line}'
    borderRadius: '{rounded.DEFAULT}'
  live-badge:
    border: '1.5px dashed {colors.mustard}'
    color: '{colors.ink-soft}'
    dot: '{colors.mustard}, pulsation douce'
  toast:
    border: '1.5px dashed {colors.sage}'
    background: '{colors.paper-card}'
    rotation: '0.4deg'
  avatar-stack:
    background: '{colors.terracotta}, {colors.sage}, {colors.mustard} (rotation cyclique par joueur)'
    color: '{colors.paper-card}'
    border: '2px solid {colors.paper-bg}'
    borderRadius: '{rounded.full}'
    overlap: '-7px'
  banner-reminder:
    border: '1.5px dashed {colors.sage}'
    background: '{colors.paper-card}'
    color: '{colors.ink}'
    borderRadius: '{rounded.DEFAULT}'
  cta-close-game:
    background: 'transparent'
    color: '{colors.terracotta}'
    border: '1.5px dashed {colors.terracotta}'
    borderRadius: '{rounded.DEFAULT}'
---

## Brand & Style

bingo se présente comme un **carnet de fête bricolé à la main** — l'objet qu'on aurait rempli au feutre la veille d'un mariage, pas un tableau de bord. L'imperfection est assumée : rotations légères, découpes irrégulières, bordures en pointillés façon papier découpé aux ciseaux. Le ludique ne passe pas par la couleur vive ou la stimulation, mais par la chaleur et l'intimité — un objet familial, pas un jeu vidéo.

Registre : chaleureux, complice, chuchoté plutôt que crié. L'interface ne doit jamais rivaliser avec l'attention du joueur pendant un vrai événement qui se déroule sous ses yeux.

## Colors

- **Papier (`{colors.paper-bg}`)** — fond principal, kraft/crème avec une texture pointillée discrète en arrière-plan. Jamais blanc pur : toujours ce ton chaud.
- **Papier carte (`{colors.paper-card}`)** — surface des cases, cartes et champs de saisie ; légèrement plus clair que le fond pour créer un contraste doux.
- **Encre (`{colors.ink}`)** — texte, bordures pleines, coques de téléphone dans les maquettes. La seule couleur "dure" du système.
- **Terracotta (`{colors.terracotta}`)** — accent primaire : CTA principaux, coche des cases cochées, nom de marque. Utilisé avec parcimonie pour rester repérable.
- **Moutarde (`{colors.mustard}`)** — accent secondaire : indicateur "en direct", état de tension (case proche de compléter une ligne). N'est jamais utilisée pour une action cliquable.
- **Sauge (`{colors.sage}`)** — accent tertiaire : confirmations douces, bordures pointillées décoratives (notifications, listes).
- **Ligne (`{colors.line}`)** — bordures hairline sur les éléments papier (champs, chips non actifs).

**Ne jamais** utiliser un rond plein saturé pour marquer un état — testé et explicitement rejeté (trop dur, masque la lisibilité). Voir §Do's and Don'ts.

**Contraste :** le texte encre (`{colors.ink}`) sur papier (`{colors.paper-bg}` ou `{colors.paper-card}`) doit respecter un ratio minimum WCAG AA (4.5:1) — c'est le cas avec les valeurs ci-dessus. Les accents (terracotta, moutarde, sauge) servent d'indicateurs visuels, jamais seuls porteurs de texte critique à lire.

## Typography

Une seule famille dans tout le produit — **Georgia** (serif) — pour l'effet "écriture sur papier". Pas de sans-serif système en contraste : la cohérence prime sur l'optimisation stricte de lisibilité aux très petites tailles.

- `{typography.display}` — titres d'écran (ex. "Nouvelle Grille").
- `{typography.headline}` — titres de section, nom de partie.
- `{typography.body}` — texte courant, phrases de grille en taille confortable (hors contrainte de maquette miniature).
- `{typography.body-sm}` — texte dense (cases de petite grille 7x7/8x8).
- `{typography.label-caps}` — étiquettes de champ, petites majuscules trackées.
- `{typography.caption}` — texte auxiliaire, italique bienvenu pour la voix chaleureuse (ex. sous-titres d'écran).

## Layout & Spacing

Écran mobile unique (voir `EXPERIENCE.md.Foundation`), marge d'écran `{spacing.screen-margin}` (20px) constante. La grille de jeu occupe l'espace disponible en `display:grid`, cases carrées, `gap` de `{spacing.2}` entre elles. Les écrans de formulaire (création de grille) empilent verticalement, pas de colonnes multiples — cohérent avec un carnet qu'on remplit ligne par ligne.

## Elevation & Depth

Pas d'ombres portées douces façon Material — le système préfère les **ombres plates décalées** (`3px 3px 0 {colors.ink}`) sur les CTA principaux, qui évoquent une carte posée sur la table plutôt qu'un élément flottant à l'écran. Les champs et listes utilisent des bordures en pointillés plutôt que des ombres pour suggérer la texture papier.

## Shapes

Chaque case de grille a une **rotation aléatoire légère** (entre -1,2° et 1,2°) et des **rayons de coin dépareillés** (entre 9px et 15px, un rayon différent par coin) générés par case — comme si chacune avait été découpée aux ciseaux séparément. Cette micro-variation est volontairement **hors de l'échelle `{rounded}`** : c'est un effet de texture propre à la case, pas un palier réutilisable ailleurs. Aucune case ne doit avoir exactement la même forme que sa voisine. Les boutons et champs, eux, suivent l'échelle nommée (`{rounded.lg}` à `{rounded.DEFAULT}`), jamais d'angles vifs (0px) ni de pilule parfaite (`{rounded.full}`) sauf pour les badges/chips ronds explicitement décoratifs.

Référence visuelle : `mockups/direction-artisanal.html` (formes de case en contexte), `mockups/carnet-checkmark-variants.html` (détail de la coche).

## Components

- **Case de grille (`grid-cell`)** — carte papier, bordure encre pleine, rotation + coins irréguliers (voir Shapes). État coché : une coche à l'encre terracotta dessinée dans le coin haut-droit de la case, sans jamais recouvrir le texte de la phrase (décision explicite — voir `EXPERIENCE.md`). État "tension" (case proche de compléter une ligne) : liseré intérieur moutarde.
- **CTA principal (`cta-primary`)** — fond terracotta, texte papier-carte, ombre plate décalée encre. Réservé aux actions qui font avancer la partie (Lancer la Partie, Rejoindre).
- **CTA secondaire (`cta-secondary`)** — transparent, bordure pointillée, texte encre. Actions secondaires (Annuler, Dupliquer).
- **CTA clôture de partie (`cta-close-game`)** — même famille visuelle que le CTA secondaire, mais liseré terracotta plutôt que ligne, pour signaler que c'est une action déclarée et volontaire du créateur, sans pour autant avoir le poids visuel du CTA principal (ce n'est pas l'action que la majorité des joueurs voient).
- **Badge "en direct" (`live-badge`)** — pastille pointillée moutarde avec point pulsant doux — jamais agressif ou clignotant vite.
- **Notification transitoire (`toast`)** — carte pointillée sauge légèrement pivotée, apparaît en bas d'écran pour les événements de partie ("Karim vient de cocher une Case"), disparaît d'elle-même.
- **Bannière de rappel (`banner-reminder`)** — même famille que `toast` mais persistante (ne disparaît pas seule) — utilisée uniquement pour le rappel de partie en cours dans la Bibliothèque.
- **Pile d'avatars (`avatar-stack`)** — cercles superposés (chevauchement -7px), une couleur d'accent différente par avatar en rotation (terracotta / sauge / moutarde) pour distinguer les joueurs sans dépendre de photos de profil.
- **Champ de phrase** — ligne éditable, bordure pointillée ligne, numérotée.
- **Sélecteur de taille (chips)** — bordure pointillée ligne à l'état inactif, fond terracotta plein à l'état actif.

## Do's and Don'ts

- **Do** — rotations et découpes irrégulières sur les cases ; une seule couleur d'accent dominante par écran (terracotta) ; texte toujours lisible en priorité sur l'effet décoratif.
- **Do** — la coche d'état "case cochée" en haut à droite, jamais superposée au texte de la phrase.
- **Don't** — pas de rond plein saturé pour marquer un état (testé, rejeté : trop dur visuellement, masquait la lisibilité).
- **Don't** — pas de second thème sombre en v1 (décision explicite — un seul thème clair pour l'instant).
- **Don't** — pas de dégradés glossy, pas d'ombres Material douces, pas d'angles parfaitement carrés : tout ce qui évoque le "logiciel d'entreprise" casse l'effet carnet.
