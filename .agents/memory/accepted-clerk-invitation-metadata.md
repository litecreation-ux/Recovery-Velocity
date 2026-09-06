---
name: Accepted Clerk invitation metadata
description: How to safely recover an RVP assignment when external Clerk accepts an invitation without copying its metadata to the user.
---

External Clerk can mark an invitation accepted while leaving the created user's public metadata empty. Recover the assignment only from an accepted invitation whose normalized email exactly matches the user's verified primary email, then run the normal RVP assignment validation before using it.

**Why:** A legitimate invited operator reached onboarding but profile submission failed because the accepted invitation retained the complete assignment while the corresponding user record had no metadata.

**How to apply:** When a verified user has neither valid invitation metadata nor active private authority, look up accepted invitations by exact primary email. Never recover from pending, revoked, mismatched-email, or invalid assignment metadata.