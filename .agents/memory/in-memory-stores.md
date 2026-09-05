---
name: In-memory operational stores
description: Operational data that still resets even though Unified Command is durable
---

Private-sector resource declarations and dispatch tasks remain in-memory and reset when the API restarts. Unified Command workspace records are database-backed and are not part of that limitation.

**Why:** Durability was added specifically for Unified Command; it did not migrate the separate resource and task stores.

**How to apply:** Do not describe resource declarations or dispatch tasks as durable, and do not assume Unified Command shares their restart behavior.