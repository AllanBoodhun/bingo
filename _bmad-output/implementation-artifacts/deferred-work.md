## Deferred from: code review of story-1-1-mise-en-place-du-projet-et-creation-de-compte (2026-07-07)

- Messages d'erreur génériques sans trace de l'erreur réelle (`error.message`/`error.status` jamais loggés en console ou télémétrie) dans `AuthScreen.tsx` — observabilité limitée en cas de souci en production. Pattern pré-existant, priorité basse.

## Deferred from: code review of story-1-2-creer-une-grille (2026-07-07)

- `grilles.taille` reste modifiable via l'API après composition (aucune UI ne l'expose, mais la policy RLS `update` ne le restreint pas) — le verrouillage réel (FR-5) dépend de l'existence de `parties`, prévue en Story 2.1.
- Une édition de phrase non confirmée est perdue si on clique "Retour à la Bibliothèque" pendant l'édition — pas de perte de données déjà persistées, juste la correction en cours.
- Messages d'erreur génériques sans log de l'erreur réelle dans `CreationGrilleScreen.tsx` — même pattern que Story 1.1, observabilité, priorité basse.
- État `pending` partagé entre ajout et édition de phrase (pas de flags séparés par opération) — désynchronisation UI mineure possible en cas d'actions concurrentes.
- Pas de région `aria-live` sur le compteur "X/N²" ni le message de complétion — amélioration accessibilité.
- Pas de reprise d'une grille en cours de composition après navigation — dépend de la Bibliothèque (liste des grilles), Story 1.5.
