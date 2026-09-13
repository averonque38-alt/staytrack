# StayTrack Property Operations

StayTrack is a thesis-ready property operations workspace for recording occupancy, finance, maintenance, projections, scenarios, and cooperative activity without preloaded sample records.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/staytrack run dev` — run the StayTrack web app
- `pnpm --filter @workspace/staytrack run typecheck` — typecheck the StayTrack frontend
- `pnpm --filter @workspace/staytrack run build` — create the Netlify-ready static build
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/staytrack/src/App.tsx` — StayTrack routes, local-first data model, forms, calculations, and reports
- `artifacts/staytrack/src/index.css` — StayTrack visual theme and responsive shell styles
- `artifacts/staytrack/src/assets/` — supplied StayTrack logo and login background assets
- `netlify.toml` — direct static deployment settings for Netlify

## Architecture decisions

- The first build is local-first: records and the operator session are stored in browser localStorage so the app can deploy as a static Netlify site without seeded data.
- All operational collections start empty; dashboards and derived reports show intentional empty states until the operator enters source records.
- Settings includes JSON export/import and reset so thesis data can move between browsers and be cleared safely.
- The supplied logo is used on the login screen and the supplied property photo is used as its background.

## Product

The app covers locations, units, bookings, income, expenses, cash flow, budget vs actual, projections, profitability, location analysis, maintenance, peak/off-peak performance, monthly summaries, scenario analysis, cooperative/member records, reports, and workspace settings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The current static deployment stores data per browser. A shared multi-user cloud database and production auth provider can be connected in a later phase.
- Do not add sample or template records to the initial data store.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
