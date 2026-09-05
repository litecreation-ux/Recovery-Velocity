---
name: Codegen workflow
description: Steps required after any OpenAPI spec change
---

After any change to `lib/api-spec/openapi.yaml`:

1. Run `pnpm --filter @workspace/api-spec run codegen` — regenerates `lib/api-client-react/src/generated/api.ts` and `lib/api-zod/src/generated/api.ts`, then typechecks libs.
2. Restart the API server workflow (`artifacts/api-server: API Server`).
3. Restart the frontend web workflow (`artifacts/rvp: web`) after codegen when it is running. Orval briefly removes and recreates generated files; Vite HMR can otherwise log transient missing-module or invalid-hook errors.

**Why:** The frontend hooks and backend Zod validators are both generated from the spec. Stale generated files cause typecheck failures and runtime errors, and a clean web restart prevents Vite from retaining the codegen file-replacement transition.

**How to apply:** Never manually edit the generated files. Always go through the spec → codegen pipeline.

When an operation has both path and query parameters, Orval's Zod and model generators can each export the same `{OperationId}Params` name through `@workspace/api-zod`, causing a TypeScript export collision.

**Why:** The Zod generator uses that name for path validation while the client model generator uses it for query parameters.

**How to apply:** Prefer a required scenario or discriminator as an additional path segment when practical. If path-plus-query is necessary, verify generated barrel exports immediately after codegen before implementing consumers.
