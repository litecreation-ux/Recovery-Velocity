# Recovery Velocity Platform (RVP)

A disaster preparedness and recovery coordination dashboard for Jamaica, used by emergency management agencies to monitor readiness per parish.

## Run & Operate

- `pnpm --filter @workspace/rvp run dev` — run the frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, React Leaflet (map), Tailwind CSS, Wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (tables: citizen_reports, review_items, audit_log)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/` — Drizzle table definitions (citizen_reports, review_items, audit_log)
- `artifacts/api-server/src/routes/` — Express route handlers (parishes, dashboard, review, agents, audit)
- `artifacts/api-server/src/lib/parishes-data.ts` — static parish data (readiness scores, bottlenecks)
- `artifacts/api-server/src/lib/static-data.ts` — hurricane events, recovery forecasts, agents, seeds
- `artifacts/rvp/src/` — React frontend
- `artifacts/rvp/src/lib/jamaica-geojson.ts` — hardcoded simplified Jamaica parish polygons (GeoJSON)
- `artifacts/rvp/src/components/dashboard/JamaicaMap.tsx` — React Leaflet map component

## Architecture decisions

- Parish data (readiness scores, bottlenecks, recovery forecasts, hurricane events, agents) is served as static data from the API server — no DB table needed since these are curated fixed values.
- `citizen_reports`, `review_items`, and `audit_log` are stored in PostgreSQL — these are the mutable, user-driven data.
- Jamaica parish polygons are hardcoded as simplified GeoJSON in the frontend — external GeoJSON URLs were unreliable in the sandbox environment.
- Orval v8 generates `zod.int()` (Zod v4 syntax) for `type: integer` fields; the workspace uses Zod v3, so all integer fields in the OpenAPI spec use `type: number` instead.

## Product

- **OPS Dashboard**: Interactive Jamaica map (React Leaflet) with color-coded readiness scores per parish. Selecting a parish (dropdown or map click) updates: readiness card, recovery forecast, historical hurricane events, citizen field reports.
- **Review Gate**: Human approval/rejection queue for evacuation plans, resource requests, infrastructure alerts, and citizen reports — all labeled by parish.
- **Agent Monitor**: Status display for 7 AI agents + full audit log with parish context.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Use `type: number` (not `type: integer`) in OpenAPI spec for all integer-valued fields — Orval v8 generates `zod.int()` which only exists in Zod v4, causing typecheck failures.
- Never fetch GeoJSON from `wmgeolab/geoBoundaries` GitHub raw URLs — that origin returns HTML/redirect responses in the sandbox. Use the hardcoded `jamaica-geojson.ts` instead.
- Run `pnpm --filter @workspace/api-spec run codegen` after every spec change before touching routes or frontend hooks.
