---
name: Post-merge setup timeout
description: Environment-specific guidance for the automatic dependency and schema setup after task merges
---

The automatic post-merge setup needs a timeout buffer above the normal dependency install plus database schema check runtime. A 20-second limit is too low for this workspace; 60 seconds provides a practical buffer while keeping failures bounded.

**Why:** A successful setup was terminated solely because package installation exceeded the configured limit, even though the script was non-interactive and completed normally when given more time.

**How to apply:** When post-merge logs show dependency installation progressing normally but timing out, increase the configured post-merge timeout before changing the setup commands.