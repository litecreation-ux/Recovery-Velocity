---
name: Jamaica GeoJSON
description: Why parish polygons are hardcoded instead of fetched from an external URL
---

Jamaica parish polygons are hardcoded in `artifacts/rvp/src/lib/jamaica-geojson.ts` with `parishId` as the feature property key.

**Why:** The GeoBoundaries GitHub raw URL (`wmgeolab/geoBoundaries`) returns HTML redirect responses inside the Replit sandbox — the fetch succeeds with a non-JSON body, causing a parse error. External GeoJSON CDNs are unreliable in this environment.

**How to apply:** If parish boundary data needs updating, edit `jamaica-geojson.ts` directly. Do not attempt to fetch it at runtime from any external URL.
