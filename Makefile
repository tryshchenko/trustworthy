# Common tasks. Requires Go 1.26+, Node 20.19+ and pnpm 10.

TEST_DATABASE_URL ?= postgres://postgres:test@localhost:55432/postgres?sslmode=disable

.PHONY: build web server dev test test-db db-up db-down docker clean

build: web server ## Build the dashboard and the server binary

web: ## Build the dashboard into internal/web/dist
	pnpm install --frozen-lockfile
	pnpm build

server: ## Build ./trustworthy (embeds the dashboard)
	CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o trustworthy ./cmd/trustworthy

dev: ## Run the dashboard dev server (proxies the API to :8080)
	pnpm dev

test: ## Unit tests (Go + dashboard)
	go test ./...
	pnpm --filter @trustworthy/web test

test-db: db-up ## Unit + PostgreSQL integration tests
	TEST_DATABASE_URL='$(TEST_DATABASE_URL)' go test -count=1 ./...

db-up: ## Disposable PostgreSQL for tests on :55432
	@docker start tw-test-pg >/dev/null 2>&1 || docker run -d --name tw-test-pg -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:17-alpine >/dev/null
	@until docker exec tw-test-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

db-down:
	docker rm -f tw-test-pg

docker: ## Build the production image
	docker build -t trustworthy:latest .

clean:
	rm -rf trustworthy node_modules web/node_modules third_party/orbit-ui/packages/*/dist
	find internal/web/dist -mindepth 1 ! -name .gitkeep -delete
