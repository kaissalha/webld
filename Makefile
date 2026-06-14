# Help command
.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: env
env: ## Pull environment variables from Vercel
	cd apps/webapp && \
	bunx vercel link --yes --scope kais-salhas-projects --project webld && \
	bunx vercel env pull


# Dev command
.PHONY: db
db: ## Start the database
	NODE_ENV=development docker compose up

# Reset database command
.PHONY: reset_db
reset_db:
	docker-compose run --rm app-db dropdb -h app-db -U webld webld --force
	docker-compose run --rm app-db createdb -h app-db -U webld webld
	$(MAKE) migrate


.PHONY: migrate
migrate: ## Apply pending database migrations
	bunx dotenv-cli -e apps/webapp/.env.local -- bun --filter @webld/db migrate

.PHONY: studio
studio: ## Open Drizzle Studio
	bunx dotenv-cli -e ./apps/webapp/.env.local -- bun --filter @webld/db studio

.PHONY: update-deps
update-deps: ## Update dependencies to latest (including patch) across monorepo
	bunx taze latest -r -wi && \
	npx skills@latest update