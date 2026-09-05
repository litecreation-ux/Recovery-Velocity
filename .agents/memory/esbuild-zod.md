---
name: esbuild zod/v4 resolution
description: Why API server routes cannot import from zod/v4 subpath
---

The API server uses esbuild to bundle. esbuild cannot resolve the `zod/v4` subpath export, producing: `ERROR: Could not resolve "zod/v4"`.

**Why:** The `zod/v4` subpath is a Zod package export condition not supported by esbuild's default resolver in this workspace configuration.

**How to apply:** Any route or lib file in `artifacts/api-server/src/` that needs Zod validation must either: (a) use `@workspace/api-zod` generated schemas, or (b) write plain TypeScript type-guard validation without importing Zod at all.
