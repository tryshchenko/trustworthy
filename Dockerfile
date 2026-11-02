# syntax=docker/dockerfile:1.7
# Trustworthy — a single static binary with the dashboard embedded.

# ---------------------------------------------------------------- dashboard
FROM node:22-alpine AS web
WORKDIR /src
RUN npm install -g pnpm@10.18.3
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile
COPY web web
RUN mkdir -p internal/web && pnpm build

# ------------------------------------------------------------------- server
FROM golang:1.26-alpine AS server
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd cmd
COPY internal internal
COPY --from=web /src/internal/web/dist internal/web/dist
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/trustworthy ./cmd/trustworthy

# ------------------------------------------------------------------ runtime
# Distroless: no shell, no package manager, runs as an unprivileged user.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /out/trustworthy /usr/local/bin/trustworthy
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["/usr/local/bin/trustworthy", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/trustworthy"]
