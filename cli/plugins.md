---
summary: "CLI reference for `edwin plugins` (list, install, enable/disable, doctor)"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
title: "plugins"
---

# `edwin plugins`

Manage Gateway plugins/extensions (loaded in-process).

Related:

- Plugin system: [Plugins](/plugin)
- Plugin manifest + schema: [Plugin manifest](/plugins/manifest)
- Security hardening: [Security](/gateway/security)

## Commands

```bash
edwin plugins list
edwin plugins info <id>
edwin plugins enable <id>
edwin plugins disable <id>
edwin plugins doctor
edwin plugins update <id>
edwin plugins update --all
```

Bundled plugins ship with Edwin but start disabled. Use `plugins enable` to
activate them.

All plugins must ship a `edwin.plugin.json` file with an inline JSON Schema
(`configSchema`, even if empty). Missing/invalid manifests or schemas prevent
the plugin from loading and fail config validation.

### Install

```bash
edwin plugins install <path-or-spec>
```

Security note: treat plugin installs like running code. Prefer pinned versions.

Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Use `--link` to avoid copying a local directory (adds to `plugins.load.paths`):

```bash
edwin plugins install -l ./my-plugin
```

### Update

```bash
edwin plugins update <id>
edwin plugins update --all
edwin plugins update <id> --dry-run
```

Updates only apply to plugins installed from npm (tracked in `plugins.installs`).
