---
name: Orval mixed path and query parameters
description: Documents a generator collision caused by operations that combine path and query parameters.
---

Avoid defining one OpenAPI operation with both path and query parameters in this workspace. Prefer a path-only category endpoint or a separate query-only endpoint.

**Why:** Orval v8 generates the same operation-derived `*Params` name in both the Zod operation module and generated TypeScript types, causing a duplicate export failure in the API Zod barrel.

**How to apply:** When an existing path endpoint needs a filter, model the filtered lookup as a separate endpoint unless the generator configuration has first been changed and verified to emit distinct names.