# Contributing

## Setup

1. Fork and clone the repo.
2. Run `docker compose up --build` to start all services.

## Workflow

1. Create a branch: `feat/my-feature`, `fix/bug-name`, `docs/update`.
2. Make changes, commit with clear messages.
3. Push and open a Pull Request against `main`.
4. Fill in the PR template.

## Frontend (without Docker)

```bash
cd frontend && npm install && npm run dev
```

## Backend (without Docker)

```bash
cd backend && go mod download && go run main.go
```
