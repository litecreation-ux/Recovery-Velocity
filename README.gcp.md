# Google Cloud Run deployment

This repository deploys the React app and API as one public Cloud Run service:
`recovery-velocity-platform` in `us-east1`. The API is available at `/api`;
the container health endpoint is `GET /api/healthz`.

## One-time Google Cloud setup

Select project `rvp-prod` and enable the required APIs:

```sh
gcloud config set project rvp-prod
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  sqladmin.googleapis.com
gcloud artifacts repositories create rvp-services \
  --repository-format=docker --location=us-east1
```

Create these Secret Manager secrets and add a current version to each. Do not
put their values in source control or Cloud Build substitutions:

```text
rvp-db-password
rvp-clerk-secret-key
rvp-clerk-publishable-key
rvp-session-secret
```

The deployment expects a PostgreSQL 16 Cloud SQL instance named `rvp-postgres`,
a database named `rvp`, and an application user named `rvp_app`. Grant the
Cloud Run runtime service account `Cloud SQL Client` and `Secret Manager Secret
Accessor` on the required secrets. The Cloud Build service account needs
permission to build/push to Artifact Registry, deploy Cloud Run, attach the
runtime service account, and attach the Cloud SQL instance.

## Deploy

`_APP_ORIGIN` must be the HTTPS origin users will access. For a first deploy,
use the expected stable Cloud Run URL shown by Cloud Run after creating the
service, then redeploy with that exact URL; alternatively use a verified custom
domain. `_CLERK_PUBLISHABLE_KEY` is intentionally a build substitution because
Vite embeds it in browser code; the same public key is also supplied to the API
from Secret Manager at runtime.

```sh
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_APP_ORIGIN=https://YOUR_SERVICE_URL,_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PUBLIC_KEY
```

Cloud Build derives the project from `$PROJECT_ID`; do not edit the build file
to add credentials or secret values. The build deploys with a 3600-second
request timeout for SSE, scale-to-zero enabled, and concurrency 40.

Use an externally managed Clerk application for Google Cloud deployment;
Replit-managed Clerk keys and its production proxy only work on Replit-hosted
publishes. In external Clerk, add `_APP_ORIGIN` to allowed origins and configure
the corresponding sign-in/sign-up redirect URLs. If using the Cloud Run URL,
include its exact HTTPS origin (no path). Optional integrations may additionally require
`SENDGRID_FROM_EMAIL`, `INCIDENT_COMMAND_ALERT_EMAIL`, `GOOGLE_MAPS_API_KEY` or
`GOOGLE_MAPS_PLATFORM_API_KEY`; they are not required for the base deployment.