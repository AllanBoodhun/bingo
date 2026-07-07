---
baseline_commit: NO_VCS
---

# Story 1.1: Mise en place du projet et création de compte

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a futur créateur,
I want créer un compte,
so that je peux sauvegarder mes grilles.

## Acceptance Criteria

1. **Given** le projet bingo n'existe pas encore
   **When** l'environnement est initialisé
   **Then** le projet React + Vite + vite-plugin-pwa est connecté à un projet Supabase (Auth + Postgres + Realtime), conforme à la spine (AD-1, AD-2)
   **And** le design system "carnet de fête" (tokens couleur/typo, thème clair unique) est en place et appliqué à l'écran Connexion/Compte

2. **Given** je suis sur l'écran Connexion/Compte sans compte
   **When** je saisis un identifiant et un mot de passe et valide
   **Then** un compte est créé via Supabase Auth et je suis connecté

3. **Given** j'ai déjà un compte
   **When** je me connecte avec mes identifiants corrects
   **Then** j'accède à ma Bibliothèque

## Tasks / Subtasks

- [x] Task 1: Scaffolder le projet (AC: #1)
  - [x] Initialiser un projet Vite + React + TypeScript (`npm create vite@latest . -- --template react-ts`), puis aligner les versions sur `React 19.2.7` / `Vite 8.1.3` dans `package.json` (cf. Stack de la spine)
  - [x] Installer `vite-plugin-pwa@1.3.0`, le configurer en `registerType: 'autoUpdate'`, avec un manifest (`name`/`short_name`: "bingo", `theme_color`/`background_color` alignés sur les tokens `paper-bg`/`terracotta` de DESIGN.md, icônes placeholder à défaut d'assets définitifs)
  - [x] Créer la structure de dossiers de la Structural Seed : `src/features/{auth,bibliotheque}/`, `src/lib/supabase/`, `src/components/`, `supabase/migrations/` (dossier vide à ce stade, voir Dev Notes)
  - [x] Installer `@supabase/supabase-js@2.110.0`

- [x] Task 2: Connecter le projet Supabase (AC: #1)
  - [x] Provisionner un projet Supabase (Postgres 17 + Auth + Realtime) — **local** via `supabase init` + `supabase start` (Docker), choix de l'utilisateur au lieu du Cloud pour cette story ; voir Dev Notes
  - [x] Déclarer `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (nomenclature `publishable`, pas `anon` — voir Dev Notes) dans `.env.local` (gitignoré) et fournir un `.env.example` sans valeurs réelles
  - [x] Créer `src/lib/supabase/client.ts` exportant une instance unique `createClient(url, publishableKey)`, importée partout ailleurs plutôt que ré-instanciée

- [x] Task 3: Implémenter les tokens du design system "carnet de fête" (AC: #1)
  - [x] Traduire les tokens de DESIGN.md (couleurs `paper-bg`/`paper-card`/`ink`/`ink-soft`/`terracotta`/`mustard`/`sage`/`line`, typographie Georgia unique sur les 6 échelles, `rounded`, `spacing`) en variables réutilisables (ex. CSS custom properties globales)
  - [x] Un seul thème clair — ne pas prévoir de mode sombre (Do's and Don'ts, DESIGN.md)

- [x] Task 4: Construire l'écran Connexion/Compte (AC: #1, #2, #3)
  - [x] Créer `src/features/auth/` : formulaire identifiant + mot de passe couvrant à la fois création de compte et connexion
  - [x] Création de compte via `supabase.auth.signUp(...)` ; connexion via `supabase.auth.signInWithPassword(...)` — **pas** d'auth anonyme ici (l'auth anonyme est réservée aux invités, AD-5, introduite en Epic 2)
  - [x] Appliquer la voix/ton du produit aux messages de succès/erreur (EXPERIENCE.md § Voice and Tone) — pas de code d'erreur brut, pas de ton corporate
  - [x] Après succès (création de compte ou connexion), rediriger vers la Bibliothèque

- [x] Task 5: Stub d'écran Bibliothèque (AC: #3)
  - [x] Créer `src/features/bibliotheque/` avec un écran minimal servant uniquement de cible de redirection post-connexion
  - [x] Ne pas anticiper la liste des grilles, le message d'invitation à créer sa première grille, ni la bannière de rappel — ce contenu est le périmètre de la Story 1.5, hors scope ici

- [x] Task 6: Vérification manuelle (AC: #1, #2, #3)
  - [x] `npm run build` réussit
  - [x] Créer un compte depuis l'écran Connexion/Compte → utilisateur connecté et redirigé vers le stub Bibliothèque
  - [x] Se déconnecter, se reconnecter avec les mêmes identifiants → accès à la Bibliothèque
  - [x] Vérifier que le manifest PWA et le service worker sont générés (installabilité)

## Dev Notes

- **Portée volontairement étroite** : cette story est l'équivalent d'un starter pour tout l'Epic 1/2 (AD-1, AD-2). Ne pas créer les tables `grilles`/`phrases` ni leur RLS ici — c'est le périmètre de la Story 1.2. Le dossier `supabase/migrations/` doit exister mais peut rester vide ou ne contenir que des réglages de projet (ex. extensions), pas le schéma applicatif.
- **Pas de table `comptes` à créer.** L'ERD de la spine référence un `compte_id` (`uuid`) sur `grilles`/`joueurs`, mais ne définit aucune table `comptes` séparée : un compte créateur correspond directement à un utilisateur `auth.users` de Supabase Auth. Ne pas réinventer une table de comptes applicative — l'identité vient entièrement de Supabase Auth (FR-16 : "le mécanisme d'authentification précis reste un détail d'implémentation").
- **Nomenclature de clé Supabase** : utiliser la clé `publishable` (`sb_publishable_...`), pas l'ancienne `anon`. La clé `secret` ne doit jamais apparaître dans le bundle client ni dans un fichier commité. [Source: ARCHITECTURE-SPINE.md#State & cross-cutting]
- **Auth email/mot de passe uniquement** dans cette story. L'auth anonyme Supabase (AD-5) sert exclusivement aux joueurs invités et sera implémentée avec la Story 2.2 — ne pas la construire par anticipation ici.
- Aucun framework de test n'est imposé par l'architecture ni le PRD (projet personnel, SM-C1 : ne pas sur-investir). Vérification manuelle suffisante pour cette story, conformément aux critères de succès du PRD (§7, SM-2).

### Project Structure Notes

Structure cible (Structural Seed de la spine) :

```
bingo/
  src/
    features/
      auth/                 # Connexion / Compte (cette story)
      bibliotheque/          # Stub cette story, contenu complet en Story 1.5
    lib/
      supabase/
        client.ts            # instance unique du client Supabase
    components/               # composants partagés du design system (à enrichir story par story)
  supabase/
    migrations/                # dossier prêt, schéma applicatif à partir de la Story 1.2
  .env.local                    # non commité — VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
  .env.example
```

Aucune variance connue à date — premier code du projet.

### Latest Technical Notes

- `vite-plugin-pwa` (config minimale) : `VitePWA({ registerType: 'autoUpdate', manifest: {...} })` génère manifest + service worker (workbox). En React, `virtual:pwa-register/react` expose un hook `useRegisterSW` si on veut gérer les mises à jour ; non requis pour satisfaire l'AC de cette story (installabilité de base suffit), mais disponible si besoin.
- Supabase migre les clés `anon`/`service_role` vers `publishable`/`secret` (nouvelles clés en place depuis juillet 2025, clés legacy supprimées fin 2026) — la spine impose déjà `publishable` ; ne pas suivre un tutoriel qui utilise encore `anon`.
- `supabase.auth.signInAnonymously()` existe côté SDK mais ne concerne pas cette story (voir Dev Notes ci-dessus).

### References

- [Source: epics.md#Story 1.1: Mise en place du projet et création de compte]
- [Source: ARCHITECTURE-SPINE.md#AD-1 — Backend Supabase, #AD-2 — Frontend React + Vite + vite-plugin-pwa, #Stack, #Structural Seed, #State & cross-cutting]
- [Source: prd.md#FR-16 : Création de compte]
- [Source: DESIGN.md#Colors, #Typography, #Do's and Don'ts]
- [Source: EXPERIENCE.md#Information Architecture, #Voice and Tone]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `docker ps` échouait initialement ("failed to connect to the docker API ... no such file or directory") ; résolu après que l'utilisateur a démarré le daemon Docker.
- `supabase start` a d'abord échoué sur le port `54322` : "Ports are not available ... bind: An attempt was made to access a socket in a way forbidden by its access permissions" — restriction réseau propre à Docker Desktop/WSL2 (plage de ports exclue côté Windows), pas un port réellement occupé. Contournement : tous les ports du stack local remappés de `543xx` vers `643xx` dans `supabase/config.toml`.
- Vérification bout-en-bout automatisée avec Playwright (Chromium) contre l'instance Supabase locale réelle (signup, redirection Bibliothèque, déconnexion, reconnexion, message d'erreur sur mauvais mot de passe) — tous les scénarios passent. Playwright n'est pas ajouté aux dépendances du projet (outil de vérification ponctuel, exécuté hors du repo).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Toutes les tasks (1 à 6) implémentées et vérifiées.
- Connexion Supabase : local via `supabase init` + `supabase start` (choix de l'utilisateur plutôt que Cloud) ; ports remappés en `643xx` dans `supabase/config.toml` suite à un conflit de port propre à l'environnement Docker/WSL2 (voir Debug Log).
- `.env.local` renseigné avec l'URL et la clé `publishable` de l'instance locale (nomenclature imposée par la spine).
- Vérification manuelle (Task 6) réalisée via un navigateur headless (Playwright/Chromium) piloté par script, contre le vrai backend Supabase local plutôt qu'en simulant les appels : création de compte, redirection Bibliothèque, déconnexion, reconnexion avec les mêmes identifiants, et message d'erreur clair sur mot de passe incorrect — tous vérifiés avec succès. `npm run build` réussit et génère `manifest.webmanifest` + `sw.js`.

### File List

- `package.json` (modifié — nom du projet, dépendances `@supabase/supabase-js`, `vite-plugin-pwa`, versions figées)
- `index.html` (modifié — titre, theme-color)
- `vite.config.ts` (modifié — plugin VitePWA)
- `.gitignore` (scaffold Vite, inchangé — couvre déjà `*.local`)
- `.env.example` (nouveau)
- `.env.local` (nouveau, non commité — URL + clé publishable de l'instance Supabase locale)
- `src/vite-env.d.ts` (nouveau)
- `src/index.css` (modifié)
- `src/App.tsx` (modifié — routage basé sur la session Supabase)
- `src/main.tsx` (inchangé, scaffold Vite)
- `src/styles/tokens.css` (nouveau)
- `src/lib/supabase/client.ts` (nouveau)
- `src/components/Button.tsx` (nouveau)
- `src/components/Button.css` (nouveau)
- `src/features/auth/AuthScreen.tsx` (nouveau)
- `src/features/auth/AuthScreen.css` (nouveau)
- `src/features/bibliotheque/BibliothequeScreen.tsx` (nouveau)
- `src/features/bibliotheque/BibliothequeScreen.css` (nouveau)
- `public/favicon.svg` (modifié — icône bingo carnet de fête, réutilisée comme icône PWA placeholder)
- `supabase/config.toml` (nouveau — généré par `supabase init`, ports remappés en `643xx`)
- `supabase/migrations/.gitkeep` (nouveau)

## Change Log

- 2026-07-06 : Implémentation complète (Tasks 1 à 6) — scaffolding React/Vite/PWA, connexion Supabase locale, design system, écran Connexion/Compte, stub Bibliothèque. Statut passé à "review".
