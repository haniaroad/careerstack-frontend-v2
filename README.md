# CareerStack Frontend V2

Vite + React + TypeScript app with the CareerStack design system, Firebase auth/onboarding flows, and an authenticated application shell wired to session/workspace APIs.

## Clone path caveat

Some checkouts nest as `Documents/careerstack-frontend-v2/careerstack-frontend-v2`. Run commands from the directory that contains `package.json` and `openspec/config.yaml`.

## Prerequisites

- Node.js 22+
- Docker + Colima for Compose (`colima start`)
- Backend API reachable (local Compose on `127.0.0.1:3000` or staging URL). Prefer `127.0.0.1` over `localhost` — Design OS also defaults to port 3000 on IPv6, and macOS `localhost` can resolve there and return HTML instead of the API.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Unauthenticated visitors land on `/sign-in`.

Useful routes:

- `/sign-in`, `/auth/complete`, `/onboarding`, `/invite/:token`, `/welcome`, `/organizations/new` — AuthLayout (outside the shell)
- `/home`, `/explore`, `/my-work`, `/inbox`, `/profile` — shell destinations (require completed onboarding)
- `/status` — API health smoke page (outside the shell)
- `/dev/design-system` — token/component gallery with preview shell stubs (local and staging only)

For local UI without Firebase, set `VITE_AUTH_STUB=true` and run the backend with `FIREBASE_AUTH_STUB=true`.

## Component imports

Product UI should import from `@/components` (CareerStack wrappers). Raw shadcn/Radix primitives live under `@/components/ui` and are not the public feature API.

## Compose

```bash
docker compose up --build
```

Serves the production build on http://localhost:5173. Point `VITE_API_BASE_URL` at the backend (`http://127.0.0.1:3000` for local).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API origin for session/onboarding/workspace calls (`http://127.0.0.1:3000` locally; avoid bare `localhost` when Design OS is also on :3000) |
| `VITE_SENTRY_DSN` | Optional Sentry DSN (deferred until secret exists) |
| `VITE_ENABLE_DESIGN_SYSTEM_PREVIEW` | Optional override to show `/dev/design-system` |
| `VITE_FIREBASE_*` | Staging Firebase web config (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`) |
| `VITE_AUTH_STUB` | Local stub auth (`true`) when Firebase is not configured |
| `VITE_MIXPANEL_TOKEN` | Optional Mixpanel token for non-PII activation events |

Firebase authorized domains for staging should include `localhost` and the Netlify staging host.

## Local Firebase + Compose

Compose runs the API as `RAILS_ENV=production`, so `FIREBASE_AUTH_STUB` is ignored. For real Google / magic-link testing against Compose:

1. Create `careerstack-backend-v2/.env` (Compose reads this; `.env.example` alone is not enough).
2. Set `FIREBASE_PROJECT_ID=careerstack-staging`.
3. Recreate the API: `docker compose up -d --force-recreate api`.

Point the frontend at `VITE_API_BASE_URL=http://127.0.0.1:3000` (prefer `127.0.0.1` over `localhost` when Design OS also uses port 3000).

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Staging deploy

Staging deploys to Netlify via GitHub Actions after merge to `main`. The workflow builds in Actions (Vite bakes `VITE_*` at build time), then uploads `dist` — Netlify site env vars alone will not configure Firebase.

GitHub Environment **`staging`** needs:

**Secrets**
- `NETLIFY_AUTH_TOKEN`

**Variables**
- `NETLIFY_SITE_ID`
- `VITE_API_BASE_URL` — staging API origin (Cloud Run)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `STAGING_SITE_URL` — optional smoke-check override
- `VITE_MIXPANEL_TOKEN` / `VITE_SENTRY_DSN` / `VITE_ENABLE_DESIGN_SYSTEM_PREVIEW` — optional

Firebase Authentication authorized domains must include `localhost` and the Netlify staging host (`*.netlify.app`).

See `netlify.toml` for publish directory (`dist`). After changing staging variables, re-run **Deploy staging** (or merge to `main`) so a new build picks them up.
