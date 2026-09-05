---
name: Google Maps connection scope
description: Clarifies the difference between the workspace Google Maps MCP connection and application runtime access.
---

The installed Google Maps Platform custom MCP connection exposes documentation and instruction tools to the agent, but it does not provide application code with a Places API client or credential.

**Why:** Treating the installed MCP connection as an app runtime integration left live Places responses unavailable even though the integration appeared connected.

**How to apply:** Use MCP tools for Google Maps documentation. For server-side Places API requests, require a securely stored Google Maps Platform API key with Places API (New) enabled; never expose that key to browser code.