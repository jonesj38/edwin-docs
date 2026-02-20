---
summary: "CLI reference for `edwin agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `edwin agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
edwin agents list
edwin agents add work --workspace ~/.edwin/workspace-work
edwin agents set-identity --workspace ~/.edwin/workspace --from-identity
edwin agents set-identity --agent main --avatar avatars/edwin.png
edwin agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.edwin/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
edwin agents set-identity --workspace ~/.edwin/workspace --from-identity
```

Override fields explicitly:

```bash
edwin agents set-identity --agent main --name "Edwin" --emoji "🦞" --avatar avatars/edwin.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Edwin",
          theme: "personal AI",
          emoji: "🦞",
          avatar: "avatars/edwin.png",
        },
      },
    ],
  },
}
```
