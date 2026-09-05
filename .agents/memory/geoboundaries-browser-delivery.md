---
name: geoBoundaries browser delivery
description: Correct browser-safe source URL for verified Caribbean ADM1 boundary geometry
---

For live client-side geoBoundaries ADM1 maps, use the revision-pinned `media.githubusercontent.com/media/...` geometry URL rather than `raw.githubusercontent.com` or the GitHub `/raw/` redirect.

**Why:** The GitHub `/raw/` endpoint fails browser CORS during its redirect, while `raw.githubusercontent.com` can return a Git LFS pointer (`version https…`) instead of GeoJSON. The media host serves the actual GeoJSON with browser CORS enabled.

**How to apply:** Keep a revision-pinned media URL, validate that the response contains a GeoJSON feature collection, and retain a marker-only fallback if the boundary source is unavailable.