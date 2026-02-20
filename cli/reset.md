---
summary: "CLI reference for `edwin reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `edwin reset`

Reset local config/state (keeps the CLI installed).

```bash
edwin reset
edwin reset --dry-run
edwin reset --scope config+creds+sessions --yes --non-interactive
```
