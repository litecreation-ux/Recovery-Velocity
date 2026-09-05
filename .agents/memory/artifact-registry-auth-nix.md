---
name: Artifact Registry auth on Nix
description: How to authenticate Docker pushes when gcloud config references a helper binary that is absent from the Replit Nix shell.
---

When `docker-credential-gcloud` is unavailable, do not keep retrying `gcloud auth configure-docker`. Use `gcloud auth print-access-token` with `docker login` under a temporary, isolated `DOCKER_CONFIG`, push the image with the same config, then delete it.

**Why:** The gcloud CLI can be authenticated and authorized while Docker still fails every push because its configured credential helper executable is not on `PATH`. A normal `docker login` also fails while that helper remains configured.

**How to apply:** Use this only for Artifact Registry pushes from a Replit Nix shell showing a missing `docker-credential-gcloud` executable. Keep the config temporary so the short-lived access token is not persisted in the workspace.