# CareerStack Frontend V2

Vite + React + TypeScript scaffold for CareerStack. Design-system shell arrives in a later change.

## Clone path caveat

Some checkouts nest as `Documents/careerstack-frontend-v2/careerstack-frontend-v2`. Run commands from the directory that contains `package.json` and `openspec/config.yaml`.

## Prerequisites

- Node.js 22+
- Docker + Colima for Compose (`colima start`)
- Backend API reachable (local Compose on `:3000` or staging URL)

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Status page: `/status`.

## Compose

```bash
docker compose up --build
```

Serves the production build on http://localhost:5173. Point `VITE_API_BASE_URL` at the backend (`http://localhost:3000` for local).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API origin used by the status/smoke page |
| `VITE_SENTRY_DSN` | Optional Sentry DSN (deferred until secret exists) |

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Staging deploy

Staging deploys to Netlify via GitHub Actions after merge to `main`, using GitHub Environment `staging` secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

See `netlify.toml` for build command (`npm run build`) and publish directory (`dist`).
