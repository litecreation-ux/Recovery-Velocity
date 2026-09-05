---
name: Playwright on Replit Nix
description: Runtime setup required for local Playwright browser tests in this workspace.
---

Local Playwright tests require both the Playwright Chromium binary and the browser shared libraries provided by the workspace Nix configuration.

**Why:** Installing `@playwright/test` alone left Chromium unable to launch: first the browser binary was absent, then Nix shared libraries such as GLib, GBM, XKB Common, and ALSA were unresolved.

**How to apply:** In a fresh workspace, install the Playwright Chromium binary through the artifact package before running browser tests. Keep the browser runtime packages in the workspace Nix configuration, and use `ldd` on the downloaded headless-shell binary if launch errors identify another missing library.