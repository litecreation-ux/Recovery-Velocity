---
name: AI mutual-aid safety boundary
description: Approval and lifecycle rules for AI-assisted regional mutual-aid planning suggestions.
---

AI-assisted regional aid drafts may be approved internally as planning documents, but the resulting mutual-aid record must remain `requested` with counterpart approval `pending`. Suggested countries are planning options, not confirmed providers.

**Why:** Internal Incident Command approval verifies the request, not another country's capacity, willingness, acceptance, transport commitment, or ETA. Presenting an AI suggestion as committed or approved fabricates operational authority.

**How to apply:** Require a separate, structured official counterpart confirmation with evidence before any AI-originated aid record can become approved, committed, en route, or delivered. Until that workflow exists, reject those transitions server-side.