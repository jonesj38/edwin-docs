---
summary: "How Edwin memory works at a high level"
read_when:
  - You want the public overview of Edwin memory
  - You want to know where memory lives and how to configure it
---

# Memory

Edwin memory is **durable, disk-backed context**.

The short version: Edwin does not rely on the model "just remembering." Important context is written to files, indexed in the background, and made searchable so future conversations can pick up where earlier ones left off.

Memory capabilities are provided by the active memory plugin. To disable memory entirely, set `plugins.slots.memory = "none"`.

## What memory gives you

- **Continuity across conversations** — useful context can survive restarts, compacted sessions, and new chats.
- **Searchable recall** — Edwin can find relevant notes and past information when it needs them.
- **Plain-file ownership** — your notes live in Markdown files you can inspect, back up, and edit.
- **Configurable scope** — you can keep the default workspace memory, add your own folders, or choose a different backend.

## Where memory lives

By default, memory lives in the agent workspace as Markdown files.

Common files:

- `memory/YYYY-MM-DD.md`
  - Daily notes and running context.
- `MEMORY.md`
  - Optional curated long-term memory.
- Additional Markdown folders/files you explicitly add in config.

These files live under the workspace (commonly `~/.edwinpai/workspace`, or whatever workspace you configure for the agent).
See [Agent workspace](/concepts/agent-workspace) for the broader file layout.

## High-level workflow

At a high level, Edwin memory works like this:

1. Important information is written to disk.
2. Edwin indexes those files in the background.
3. Later, Edwin can search that indexed memory when context is relevant.
4. The agent gets the useful results instead of depending on the raw context window alone.

That means long-term continuity comes from **files + retrieval**, not from keeping everything in active model context forever.

## Search and recall

Edwin memory can support:

- **Keyword-style recall** for exact terms and file-backed notes
- **Semantic recall** for meaning-based matches when an embedding provider or local model is configured

The exact implementation depends on your configured backend and memory plugin, but the user-facing model is simple:

- your Markdown files remain the source of truth
- indexing happens in the background
- memory recall is meant to improve continuity, not replace good note-taking

## Background updates

Memory maintenance runs asynchronously so normal usage stays responsive.

In practice, that means Edwin can refresh indexes and keep memory searchable without making every interaction wait on maintenance work. For long-running sessions, Edwin can also refresh durable memory before context is compacted so important notes are not stranded in a shrinking context window.

If you want the operational details of compaction itself, see:

- [Compaction](/concepts/compaction)
- [Session](/concepts/session)

## Backends

Edwin supports different memory backends depending on your setup.

### Builtin backend

The builtin backend keeps memory management simple and local to Edwin.

### QMD backend

If you want a more advanced local-first retrieval stack, you can opt into the QMD backend:

```json5
memory: {
  backend: "qmd"
}
```

QMD is useful when you want richer indexing over workspace memory and additional Markdown collections, while still keeping Markdown as the source of truth.

## Adding more memory sources

You can add extra Markdown paths beyond the default workspace memory.

Example:

```json5
memory: {
  backend: "qmd",
  qmd: {
    includeDefaultMemory: true,
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

This is useful for shared notes, project docs, research folders, or any other Markdown corpus you want Edwin to search.

## Semantic search setup

Semantic recall usually needs either:

- a configured API-backed embedding provider, or
- a supported local model setup

For service-safe setups, prefer putting credentials in `~/.edwinpai/.env` or the relevant config field rather than relying only on shell startup files.

## CLI commands

Useful commands:

```bash
edwin memory status
edwin memory index
edwin memory search "release checklist"
```

See [CLI memory](/cli/memory) for command details.

## Best practices

- If you want something to stick, **ask Edwin to write it down**.
- Keep durable facts clear and explicit.
- Treat the workspace as private memory and back it up accordingly.
- Keep especially sensitive material in the right private files and sessions for your setup.

## Related docs

- [Agent workspace](/concepts/agent-workspace)
- [CLI memory](/cli/memory)
- [Compaction](/concepts/compaction)
- [Session](/concepts/session)
