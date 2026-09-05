# Recovery Velocity Platform

Recovery Velocity Platform (RVP) is a Caribbean disaster preparedness,
incident coordination, and recovery operations platform. It helps emergency
management organizations track readiness, coordinate field work, communicate
during incidents, and maintain an auditable operational picture.

**Production:** [rvp.jwmsystems.com](https://rvp.jwmsystems.com)

## Capabilities

- Parish-level preparedness and resilience views for Jamaica
- Country-scoped operations for the wider Caribbean
- Incident and Unified Command coordination
- Resource requests, logistics, dispatch, and recovery assignments
- Operational communications, acknowledgements, and radio traffic logs
- Offline message outbox with explicit delivery states
- Public alert review, approval, and low-bandwidth public access
- Citizen reports, human review gates, and audit history
- Invitation-based, organization-scoped access through Clerk
- Anonymous public parish and public alert pages

Jamaica is currently the only country with verified parish-level operational
data. Other supported Caribbean countries remain country-scoped until verified
local coverage is available.

## Technology

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Wouter, TanStack Query
- **API:** Express 5 and TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Clerk
- **API contracts:** OpenAPI with generated React clients and Zod validators
- **Production:** Google Cloud Run, Cloud SQL, Artifact Registry, and Secret
  Manager

The React application and API are deployed as one Cloud Run service. The API is
served under `/api`, preserving same-origin authentication, API requests, and
Server-Sent Events.

## Repository layout

```text
artifacts/
  api-server/       Express API
  rvp/              React web application
lib/
  api-client-react/ Generated React API client
  api-spec/         OpenAPI source of truth
  api-zod/          Generated request validators
  db/               Drizzle schema and database package
```

## Local development

### Requirements

- Node.js
- pnpm 10
- PostgreSQL
- Clerk development credentials

Install dependencies:

```sh
pnpm install
```

Provide the required environment variables through Replit Secrets or your local
environment. At minimum, the API requires `DATABASE_URL`; Clerk requires its
publishable and secret keys. Never commit credentials or `.env` files.

Start the API and frontend in separate terminals:

```sh
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/rvp run dev
```

## Common commands

```sh
# Typecheck the workspace
pnpm run typecheck

# Build all packages and artifacts
pnpm run build

# Run API tests
pnpm --filter @workspace/api-server run test

# Apply the development database schema
pnpm --filter @workspace/db run push

# Regenerate clients and validators after OpenAPI changes
pnpm --filter @workspace/api-spec run codegen
```

After changing `lib/api-spec/openapi.yaml`, regenerate the clients before
editing dependent API routes or frontend code.

## Public routes

- `/public/parishes` — public resilience information
- `/public/alerts` — approved, unexpired public alerts
- `/api/healthz` — service health check

## Google Cloud deployment

Production deployment instructions, required Google Cloud resources, Secret
Manager names, Cloud SQL configuration, and Clerk domain requirements are
documented in [README.gcp.md](./README.gcp.md).

The production deployment uses:

- Project: `rvp-prod`
- Region: `us-east1`
- Cloud Run service: `recovery-velocity-platform`
- Custom domain: `https://rvp.jwmsystems.com`