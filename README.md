# bingo

Bingo à phrases personnalisées, joué en temps réel entre proches pendant un événement partagé.

Stack : React 19 + Vite + vite-plugin-pwa, Supabase (Postgres + Auth + Realtime) en local via Docker.

## Tuto de lancement

**Prérequis :** Node.js, Docker démarré.

1. **Installer les dépendances**

   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement** (uniquement au tout premier lancement)

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` doit contenir `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Une fois Supabase démarré (étape suivante), récupère les vraies valeurs avec `make status` (champs `API_URL` et `PUBLISHABLE_KEY`) et colle-les dans `.env.local`.

3. **Lancer le projet**

   ```bash
   make up
   ```

   Démarre l'instance Supabase locale (Docker) puis le serveur de dev Vite.

4. **Ouvrir l'app**

   http://localhost:5173 — tu arrives sur l'écran Connexion/Compte.

5. **Se connecter**

   Utilise le [compte de test](#compte-de-test) ci-dessous, ou crée un compte directement depuis l'écran (identifiant + mot de passe, 6 caractères minimum).

6. **Arrêter le projet**

   `Ctrl+C` pour stopper le serveur Vite, puis `make down` pour arrêter Supabase (facultatif — peut rester allumé entre deux sessions).

Autres commandes : `make help` (liste tout), `make status`, `make build`, `make lint`, `make preview`, `make reset` (réinitialise la base locale).

## Instance Supabase locale

- API : http://127.0.0.1:64321
- Studio (admin tables/auth) : http://127.0.0.1:64323
- Mailpit (emails de test) : http://127.0.0.1:64324

Ports remappés en `643xx` (voir `supabase/config.toml`).

## Compte de test

- Email : `admin@test.com`
- Mot de passe : `pass123`

Compte créé directement sur l'instance Supabase locale (pas de vérification d'email requise en local). À recréer si l'instance locale est réinitialisée (`supabase db reset`).
