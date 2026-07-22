---
title: bingo
status: final
created: 2026-07-04
updated: 2026-07-22
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
    fontFamily: '"Nunito", sans-serif'
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.2'
  headline:
    fontFamily: '"Nunito", sans-serif'
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.25'
  body:
    fontFamily: '"Nunito", sans-serif'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.4'
  body-sm:
    fontFamily: '"Nunito", sans-serif'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
  label-caps:
    fontFamily: '"Nunito", sans-serif'
    fontSize: 11px
    fontWeight: '700'
    letterSpacing: 0.04em
  caption:
    fontFamily: '"Nunito", sans-serif'
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
    background: '{colors.paper-card}'
    color: '{colors.ink}'
    border: '2px solid {colors.ink}'
    borderRadius: '{rounded.DEFAULT}'
    shadow: '3px 3px 0 {colors.ink}'
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
    background: '{colors.paper-card}'
    color: '{colors.ink}'
    border: '2px solid {colors.ink}'
    borderRadius: '{rounded.DEFAULT}'
    shadow: '3px 3px 0 {colors.ink}'
    accentTint: '{colors.sage}, teinte de fond légère pour distinguer une carte "partie active" par rapport à une carte grille neutre'
  cta-close-game:
    background: '{colors.ink}'
    color: '{colors.paper-card}'
    borderRadius: '{rounded.DEFAULT}'
    shadow: '3px 3px 0 {colors.ink}'
  card:
    background: '{colors.paper-card}'
    border: '2px solid {colors.ink}'
    borderRadius: '{rounded.DEFAULT}'
    shadow: '3px 3px 0 {colors.ink}'
  status-chip:
    border: '1.5px dashed {colors.terracotta}'
    color: '{colors.terracotta}'
    borderRadius: '{rounded.full}'
    dot: '{colors.terracotta}'
  sticky-action-bar:
    background: '{colors.paper-card}'
    borderTop: '2px solid {colors.ink}'
    borderRadius: '{rounded.lg} {rounded.lg} 0 0'
  brand-mark:
    type: 'illustration bespoke (asset image, non reconstruite en CSS) — voir §Brand & Style'
---

## Brand & Style

bingo se présente comme un **carnet de fête bricolé à la main** — l'objet qu'on aurait rempli au feutre la veille d'un mariage, pas un tableau de bord. L'imperfection est assumée : rotations légères, découpes irrégulières, bordures en pointillés façon papier découpé aux ciseaux. Le ludique ne passe pas par la couleur vive ou la stimulation, mais par la chaleur et l'intimité — un objet familial, pas un jeu vidéo.

Registre : chaleureux, complice, chuchoté plutôt que crié. L'interface ne doit jamais rivaliser avec l'attention du joueur pendant un vrai événement qui se déroule sous ses yeux.

**Marque (`{components.brand-mark}`)** — wordmark "2000 Super Bingo" (grand numéral estompé en fond, script "Super" et lettrage gras "Bingo" en surimpression). Illustration bespoke fournie en asset image (pas de reconstruction typographique en CSS), affichée en en-tête de tous les écrans, y compris pendant une Partie en direct (décision confirmée — voir `.memlog.md` 2026-07-22). Le déploiement effectif sur les écrans de jeu suit la décision de portée ci-dessous.

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

Une seule famille dans tout le produit — **Nunito** (Google Font, sans-serif arrondie) — **mis à jour 2026-07-22**, remplace Georgia (override de la décision du 2026-07-04, confirmé par les maquettes fournies par le user). À charger via Google Fonts (poids 400/600/700/800 au minimum pour couvrir `body` à `display`) ou en self-hosted si l'app veut éviter une dépendance réseau externe — choix d'implémentation libre, pas une décision de spine.

- `{typography.display}` — titres d'écran (ex. "Nouvelle Grille").
- `{typography.headline}` — titres de section, nom de partie.
- `{typography.body}` — texte courant, phrases de grille en taille confortable (hors contrainte de maquette miniature).
- `{typography.body-sm}` — texte dense (cases de petite grille 4x4/5x5).
- `{typography.label-caps}` — étiquettes de champ, petites majuscules trackées.
- `{typography.caption}` — texte auxiliaire, italique bienvenu pour la voix chaleureuse (ex. sous-titres d'écran).

## Layout & Spacing

Écran mobile unique (voir `EXPERIENCE.md.Foundation`), marge d'écran `{spacing.screen-margin}` (20px) constante. La grille de jeu occupe l'espace disponible en `display:grid`, cases carrées, `gap` de `{spacing.2}` entre elles. Les écrans de formulaire (création de grille) empilent verticalement, pas de colonnes multiples — cohérent avec un carnet qu'on remplit ligne par ligne.

## Elevation & Depth

Pas d'ombres portées douces façon Material — le système garde les **ombres plates décalées** (`3px 3px 0 {colors.ink}`), qui évoquent une carte posée sur la table plutôt qu'un élément flottant à l'écran. **Évolution 2026-07-22** : cette ombre, initialement réservée au CTA principal, s'étend maintenant à toute surface structurante — les trois familles de boutons (`cta-primary`, `cta-secondary`, `cta-close-game`) et les cartes de contenu (`card`, `banner-reminder`) portent toutes une bordure pleine encre et la même ombre décalée, pour un rendu "papier découpé et posé" cohérent sur l'ensemble d'un écran plutôt que réservé à une seule action.

La bordure en pointillés ne disparaît pas : elle se recentre sur un rôle plus précis, celui du **contrôle à bascule non sélectionné** (`size-chip` à l'état inactif) et des badges de statut décoratifs (`status-chip`, `live-badge`) — jamais sur un bouton d'action, une carte ou un champ de saisie, qui passent tous en bordure pleine + ombre. Les champs de saisie (`Champ de phrase`, `Nom de la grille`) suivent ce même changement : bordure pleine encre, sans ombre (réservée aux boutons et cartes).

[ASSUMPTION] Les valeurs exactes (épaisseur de bordure, décalage d'ombre) sont estimées par cohérence avec l'échelle existante à partir des exports PNG (`imports/BibiothèqueScreen.png`, `imports/CreationGrille.png`, `imports/EditionGrille.png`) ; à vérifier contre le fichier source (Figma ou équivalent) si une mesure au pixel près est nécessaire avant implémentation.

**Divergence temporaire** : `toast` (notification transitoire en Grille en direct, écran non encore maquetté dans cette évolution) garde son traitement pointillé sage d'origine — il rejoindra la même famille que `banner-reminder` quand Grille en direct sera maquetté à son tour (voir portée ci-dessous).

## Shapes

Chaque case de grille a une **rotation aléatoire légère** (entre -1,2° et 1,2°) et des **rayons de coin dépareillés** (entre 9px et 15px, un rayon différent par coin) générés par case — comme si chacune avait été découpée aux ciseaux séparément. Cette micro-variation est volontairement **hors de l'échelle `{rounded}`** : c'est un effet de texture propre à la case, pas un palier réutilisable ailleurs. Aucune case ne doit avoir exactement la même forme que sa voisine. Les boutons et champs, eux, suivent l'échelle nommée (`{rounded.lg}` à `{rounded.DEFAULT}`), jamais d'angles vifs (0px) ni de pilule parfaite (`{rounded.full}`) sauf pour les badges/chips ronds explicitement décoratifs.

Référence visuelle : `mockups/direction-artisanal.html` (formes de case en contexte), `mockups/carnet-checkmark-variants.html` (détail de la coche).

## Components

- **Case de grille (`grid-cell`)** — carte papier, bordure encre pleine, rotation + coins irréguliers (voir Shapes). État coché : une coche à l'encre terracotta dessinée dans le coin haut-droit de la case, sans jamais recouvrir le texte de la phrase (décision explicite — voir `EXPERIENCE.md`). État "tension" (case proche de compléter une ligne) : liseré intérieur moutarde.
- **CTA principal (`cta-primary`)** — fond terracotta, texte papier-carte, sans bordure, ombre plate décalée encre (inchangé). Action qui fait avancer le plus (Lancer la Partie, Rejoindre, Relancer, Créer/Enregistrer la grille).
- **CTA secondaire (`cta-secondary`)** — **mis à jour 2026-07-22** : fond papier-carte (plein, non transparent), bordure pleine encre, ombre plate décalée encre — même poids visuel que le CTA principal, distingué par la couleur de fond. Actions neutres qui ne font pas avancer ni ne ferment rien (Modifier, Dupliquer).
- **CTA clôture (`cta-close-game`)** — **mis à jour 2026-07-22** : fond encre plein, texte papier-carte, ombre plate décalée encre (même famille visuelle que les deux autres CTA, distingué par la couleur de fond sombre). Rôle élargi au-delà de la seule clôture de partie : toute action qui **termine, retire ou annule** délibérément quelque chose à l'initiative du créateur — Clôturer la Partie, Supprimer une grille, Annuler une saisie en cours. Le poids visuel fort (fond plein sombre) signale le caractère définitif/volontaire de l'action, sans jamais utiliser un rouge d'alerte agressif — reste dans la palette encre du système.
- **Badge "en direct" (`live-badge`)** — pastille pointillée moutarde avec point pulsant doux — jamais agressif ou clignotant vite.
- **Badge de statut (`status-chip`)** — **nouveau 2026-07-22** — pastille pointillée terracotta avec point plein, même forme que `live-badge` mais couleur terracotta et usage différent : indicateur d'état sur une carte de liste (ex. "En cours" sur une grille de la Bibliothèque), pas l'indicateur "en direct" pendant une Partie.
- **Notification transitoire (`toast`)** — carte pointillée sauge légèrement pivotée, apparaît en bas d'écran pour les événements de partie ("Karim vient de cocher une Case"), disparaît d'elle-même. Traitement visuel inchangé pour l'instant (voir divergence temporaire, §Elevation & Depth).
- **Bannière de rappel (`banner-reminder`)** — **mis à jour 2026-07-22** : rejoint la famille `card` (bordure pleine encre, ombre plate décalée), teinte de fond sauge légère conservée pour distinguer une carte "partie active" d'une carte grille neutre. N'est plus dans la même famille visuelle que `toast` (voir divergence temporaire ci-dessus) — utilisée pour le rappel de partie en cours et pour toute carte de partie active dans la Bibliothèque.
- **Pile d'avatars (`avatar-stack`)** — cercles superposés (chevauchement -7px), une couleur d'accent différente par avatar en rotation (terracotta / sauge / moutarde) pour distinguer les joueurs sans dépendre de photos de profil.
- **Carte (`card`)** — **nouveau 2026-07-22** — fond papier-carte, bordure pleine encre, ombre plate décalée encre. Traitement générique de toute carte de contenu structurant (grille dans la liste de la Bibliothèque). Remplace l'ancien traitement pointillé non documenté de ces cartes.
- **Barre d'action fixe (`sticky-action-bar`)** — **nouveau 2026-07-22** — bandeau fixé en bas d'écran, fond papier-carte, bordure pleine encre en haut, coins arrondis côté haut uniquement. Contient les deux CTA de conclusion d'un formulaire (ex. "Créer la grille" / "Annuler", "Enregistrer" / "Annuler") — toujours un `cta-primary` et un `cta-close-game` côte à côte, jamais plus de deux actions.
- **Champ de phrase / champ de formulaire** — **mis à jour 2026-07-22** : bordure pleine encre (au lieu de pointillée), fond papier-carte, sans ombre (l'ombre reste réservée aux boutons et cartes, voir §Elevation & Depth). S'applique à tout champ texte du produit (nom de grille, phrase, etc.), ligne éditable, numérotée pour les phrases.
- **Sélecteur de taille (chips)** — inchangé : bordure pointillée ligne à l'état inactif, fond terracotta plein à l'état actif. Seul contrôle du système à garder la bordure pointillée sur une surface interactive (voir §Elevation & Depth).

## Do's and Don'ts

- **Do** — rotations et découpes irrégulières sur les cases ; une seule couleur d'accent dominante par écran (terracotta) ; texte toujours lisible en priorité sur l'effet décoratif.
- **Do** — la coche d'état "case cochée" en haut à droite, jamais superposée au texte de la phrase.
- **Don't** — pas de rond plein saturé pour marquer un état (testé, rejeté : trop dur visuellement, masquait la lisibilité).
- **Don't** — pas de second thème sombre en v1 (décision explicite — un seul thème clair pour l'instant).
- **Don't** — pas de dégradés glossy, pas d'ombres Material douces, pas d'angles parfaitement carrés : tout ce qui évoque le "logiciel d'entreprise" casse l'effet carnet.
- **Do** — **2026-07-22** : bordure pleine + ombre plate décalée sur tout bouton et toute carte de contenu — un seul et même traitement pour les trois CTA et pour les cartes, cohérent sur tout un écran.
- **Don't** — **2026-07-22** : ne pas mélanger bordure pointillée et ombre sur un même élément — le pointillé signale une surface non structurante (chip inactif, badge de statut), jamais une action ou un contenu.

Référence visuelle : `imports/BibiothèqueScreen.png`, `imports/CreationGrille.png`, `imports/EditionGrille.png` (voir `reconcile-bibliotheque-screen.md`, `reconcile-creation-grille.md`, `reconcile-edition-grille.md` pour le détail de la réconciliation).
