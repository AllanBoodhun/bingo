.PHONY: help up down status build lint preview reset studio

help:
	@echo "make up       - démarre Supabase local (Docker) puis le serveur de dev Vite"
	@echo "make down     - arrête l'instance Supabase locale"
	@echo "make status   - affiche l'état de l'instance Supabase locale (URLs, clés)"
	@echo "make build    - build de production (tsc + vite build)"
	@echo "make lint     - lint (oxlint)"
	@echo "make preview  - preview du build de production"
	@echo "make reset    - réinitialise la base locale (supabase db reset)"
	@echo "make studio   - affiche l'URL de Supabase Studio"

up:
	npx supabase start
	npm run dev

down:
	npx supabase stop

status:
	npx supabase status

build:
	npm run build

lint:
	npm run lint

preview:
	npm run preview

reset:
	npx supabase db reset

studio:
	@echo "http://127.0.0.1:64323"
