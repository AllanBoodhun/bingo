## Deferred from: code review of story-1-1-mise-en-place-du-projet-et-creation-de-compte (2026-07-07)

- Messages d'erreur génériques sans trace de l'erreur réelle (`error.message`/`error.status` jamais loggés en console ou télémétrie) dans `AuthScreen.tsx` — observabilité limitée en cas de souci en production. Pattern pré-existant, priorité basse.

## Deferred from: code review of story-1-2-creer-une-grille (2026-07-07)

- `grilles.taille` reste modifiable via l'API après composition (aucune UI ne l'expose, mais la policy RLS `update` ne le restreint pas) — le verrouillage réel (FR-5) dépend de l'existence de `parties`, prévue en Story 2.1.
- Une édition de phrase non confirmée est perdue si on clique "Retour à la Bibliothèque" pendant l'édition — pas de perte de données déjà persistées, juste la correction en cours.
- Messages d'erreur génériques sans log de l'erreur réelle dans `CreationGrilleScreen.tsx` — même pattern que Story 1.1, observabilité, priorité basse.
- État `pending` partagé entre ajout et édition de phrase (pas de flags séparés par opération) — désynchronisation UI mineure possible en cas d'actions concurrentes.
- Pas de région `aria-live` sur le compteur "X/N²" ni le message de complétion — amélioration accessibilité.
- Pas de reprise d'une grille en cours de composition après navigation — dépend de la Bibliothèque (liste des grilles), Story 1.5.

## Deferred from: code review of story-1-3-corriger-une-phrase-a-tout-moment (2026-07-07)

- Pas d'annulation de la requête réseau elle-même pendant le chargement des phrases (seul son résultat est ignoré via le flag `ignore`) — `.abortSignal()` existe côté Supabase mais apporte peu de valeur pour ce projet à faible trafic.

## Deferred from: code review of story-1-5-consulter-sa-bibliotheque-de-grilles (2026-07-07)

- Pas de découpage (chunking) sur `.in('grille_id', ids)` pour une bibliothèque très volumineuse — cohérent avec SM-C1, improbable à l'échelle de ce projet.
- Pas de garde anti-double-clic sur "Réessayer" dans `BibliothequeScreen.tsx` — pattern hérité tel quel de `ComposerPhrases` (Story 1.3).
- Boutons "Nouvelle grille"/"Réessayer" non désactivés pendant la déconnexion — course de faible probabilité, impact limité.
- Erreurs non loggées (pas de `console.error`/télémétrie) dans `BibliothequeScreen.tsx` — même pattern déjà différé dans les stories précédentes.

## Deferred from: code review of story-1-4-dupliquer-une-grille (2026-07-07)

- `handleDupliquer` n'a pas de garde `ignore` façon `charger()` — si le composant est démonté pendant l'opération, les `setState` qui suivent s'exécutent sur un composant démonté (sans effet en React 19, travail perdu mais pas de crash).
