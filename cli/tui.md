---
summary: "CLI reference for `edwin tui` (terminal UI connected to the Gateway)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `edwin tui`

Open the terminal UI connected to the Gateway.

Related:

- TUI guide: [TUI](/tui)

## Examples

```bash
edwin tui
edwin tui --url ws://127.0.0.1:18789 --token <token>
edwin tui --session main --deliver
```
