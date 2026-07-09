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

## Deferred from: code review of story-2-1-lancer-une-partie-et-obtenir-un-lien (2026-07-08)

- La policy `select` sur `parties` ne couvre que le créateur — un futur Joueur/invité qui ouvre le lien partagé ne pourra pas relire l'état de la partie via cette policy seule ; explicitement à la charge de la Story 2.2.
- Pas de garde `ignore` dans `handleLancerPartie`/`handleRelancer` contre un démontage du composant pendant l'appel réseau — même pattern déjà accepté pour `handleDupliquer` en Story 1.4.
- Erreurs Supabase non loggées (`error` ignoré, seul un message générique est affiché) — pattern pré-existant déjà différé dans toutes les stories précédentes.
- Collision d'unicité sur `code_partie` sans retry automatique côté client — probabilité négligeable sur 8 caractères hexadécimaux.
- Double-clic sur "Copier le lien" dans la fenêtre de 2 secondes réinitialise prématurément l'état "Lien copié !" — cosmétique mineur.
- Course théorique entre une modification de `taille` et un insert `parties` non encore commité dans une transaction concurrente — non atteignable via l'UI actuelle, risque négligeable à l'échelle de ce projet (SM-C1).
- Pas de confirmation accessible (`aria-live`) pour l'action "Copier le lien" — même catégorie de dette d'accessibilité déjà différée ailleurs (Story 1.2).
- Le panneau "partie lancée" n'a pas de bouton pour le fermer ou rappeler le lien une fois affiché — amélioration UX non requise par les AC de cette story.

## Deferred from: code review of story-2-4-detecter-et-annoncer-les-vainqueurs (2026-07-09)

- `select partie_id into v_partie_id from public.joueurs where id = new.joueur_id` (fonction `detecter_victoire`) n'a aucune garde si la ligne `joueurs` est introuvable — lèverait une exception `NOT NULL` sur l'`INSERT` suivant. Inatteignable actuellement (aucune fonctionnalité de suppression/départ de joueur n'existe) ; à réexaminer si une story future ajoute "quitter la partie" ou "exclure un joueur".
- `v_cote` (`round(sqrt(count(*)))::int`) suppose un nombre de cases toujours carré parfait, sans garde côté serveur dans le trigger de détection de victoire — écart pré-existant (aucune contrainte DB ne force `count(phrases) = taille²` avant `lancer_partie`), le client s'en protège déjà (Story 2.3) mais pas ce nouveau trigger serveur.
- Deux cases d'un même joueur cochées via deux `PATCH` quasi simultanés peuvent chacune s'exécuter sans voir l'`UPDATE` non commité de l'autre — si ce sont les deux dernières cases d'une ligne gagnante, la victoire n'est pas détectée à cet instant précis (se re-détecte automatiquement au prochain cochage de ce joueur). Risque de même catégorie que la course déjà acceptée sur les mises à jour optimistes concurrentes (Story 2.3, SM-C1).
- Aucune région `aria-live`/`role="alert"` ni gestion de focus sur l'overlay "Vainqueur" — amélioration accessibilité au-delà du plancher explicite de cette story (UX-DR6 exige la persistance, pas la sémantique ARIA), même catégorie de dette déjà différée ailleurs (Stories 1.2, 2.1).
