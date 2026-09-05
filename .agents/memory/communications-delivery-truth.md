---
name: Communications delivery truth
description: Reliability rule for offline queues and fallback communication channels.
---

Never present an offline, radio, SMS, or other fallback communication as delivered merely because it was created or queued. Keep requested, sent, delivered, acknowledged, and failed states distinct.

**Why:** During network disruption, treating “submitted” as “received” can cause command staff to assume life-safety information reached its destination when it did not.

**How to apply:** Any new communications transport must update delivery state only from an explicit server or provider confirmation. Local offline records stay visibly queued, and acknowledgements remain separate from transport delivery.