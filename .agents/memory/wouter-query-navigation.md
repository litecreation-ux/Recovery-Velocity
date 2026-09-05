---
name: Wouter query navigation
description: Query-string behavior when selecting a specific record through Wouter navigation
---

When a route needs to select a specific record from a query parameter, read `window.location.search` rather than assuming the value is included in Wouter's `useLocation()` string.

**Why:** In this RVP setup, `useLocation()` exposed the pathname while the query string remained available only through the browser location. Reading the wrong value caused a linked incident to fall back to the queue's default record.

**How to apply:** Keep query parameters in the link target and parse them from `window.location.search` in the destination component; verify the destination with a deep-link screenshot or browser test.