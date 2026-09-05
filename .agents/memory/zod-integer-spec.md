---
name: OpenAPI Zod helper limits
description: OpenAPI constructs that generate Zod v4-only helpers in a Zod v3 workspace
---

Use `type: number` (not `type: integer`) for all integer-valued fields in `lib/api-spec/openapi.yaml`.

**Why:** Orval v8.23 generates `zod.int()` for `type: integer` fields, but `zod.int()` only exists in Zod v4. The workspace runs Zod v3 (`^3.25.76`), so `zod.int()` calls cause typecheck failures.

**How to apply:** Any time you add a new field that holds a whole number (id, count, score, etc.), use `type: number` in the spec.

Do not add `format: email` to OpenAPI string fields in this workspace. Keep the schema as `type: string` and validate the email explicitly in the server route.

**Why:** Orval v8.23 generates `zod.email()` for email-formatted strings, but that top-level helper is unavailable in the workspace's Zod v3 package and breaks generated-library typechecks.

**How to apply:** Validate email syntax in the API handler before storing or forwarding it, while keeping request and response email fields as plain strings in the OpenAPI contract.
