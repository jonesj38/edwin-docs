---
summary: "How Edwin organizes sources, disciplines, and knowledge runs around Shad and QMD."
read_when:
  - You want to understand the Knowledge feature in Edwin Desktop or other Edwin surfaces
  - You need the difference between memory, sources, disciplines, and runs
---

# Knowledge

Edwin's **Knowledge** system is the layer that turns raw material into reusable, inspectable working context.

It is broader than chat memory and narrower than the entire agent runtime.

A good mental model is:

- **Memory** = things Edwin should remember durably
- **Knowledge** = bodies of material Edwin can search, curate, and synthesize
- **Tasks/agents** = work performed using that knowledge

## The three main objects

### Sources

A **source** is where knowledge comes from.

Examples:

- a local folder of markdown or code
- a synced export
- a website snapshot
- a notes repository
- a Shad/QMD collection input path

Sources answer:

> What material is available to work from?

Typical source metadata includes:

- origin path or URL
- source type
- schedule
- preset
- collection path
- last sync status

### Disciplines

A **discipline** is a curated body of knowledge and method.

A discipline is not just raw content. It describes:

- which collections matter for a domain
- what evidence policy should apply
- what artifact kinds are expected
- what freshness/status the discipline has
- what notes or snapshots travel with it

Disciplines answer:

> What organized knowledge bundle should Edwin use for this kind of work?

Examples:

- product strategy
- tax preparation
- security architecture
- desktop identity core

### Runs

A **knowledge run** is a Shad execution trace over a collection or discipline-relevant body of material.

Runs are useful because they preserve:

- the goal
- the collection path
- the strategy used
- token usage
- the summary/result
- the final report markdown

Runs answer:

> What happened when Edwin worked through this knowledge?

## How the pieces fit together

```text
Sources -> Collections -> Disciplines -> Knowledge Runs -> Reusable context
```

In practice:

1. You configure **sources**.
2. Those sources become searchable **collections**.
3. You group collections into **disciplines**.
4. Shad produces **runs** over that material.
5. Edwin surfaces the results for later inspection and reuse.

## Relationship to memory

Knowledge is **not** the same thing as memory.

Use **memory** for:

- preferences
- daily notes
- relationship or project continuity
- small durable facts Edwin should keep available

Use **Knowledge** for:

- larger source corpora
- curated domains of expertise
- synthesis outputs and reports
- inspectable prior research or analysis runs

If you're deciding where something belongs:

- if it is a durable note Edwin should remember directly, it belongs in memory
- if it is source material Edwin should work from or synthesize, it belongs in Knowledge

See [Memory](/concepts/memory).

## Relationship to QMD and Shad

The current implementation uses two adjacent systems:

- **QMD** for collection/index visibility
- **Shad** for deeper synthesis runs and reports

A practical breakdown:

- QMD is the search/index substrate
- Shad is the run/synthesis substrate
- Edwin surfaces the user-facing model of sources, disciplines, and runs

## Knowledge in Edwin Desktop

Edwin Desktop currently exposes a **Knowledge** screen with three tabs:

- **Sources**
- **Disciplines**
- **Runs**

Current backing stores:

- Shad sources: `~/.shad/sources.yaml`
- Shad runs: `~/.shad/history/Runs/`
- Desktop discipline registry: `~/.edwinpai/knowledge/disciplines.json`

That means the current implementation is compositional:

- sources/runs come from the Shad toolchain
- disciplines come from Edwin/Desktop metadata

## Example discipline file

Desktop currently reads discipline records from:

- `~/.edwinpai/knowledge/disciplines.json`

Example:

```json
{
  "disciplines": [
    {
      "id": "security-architecture",
      "name": "Security Architecture",
      "description": "Security model, auth boundaries, and threat analysis.",
      "selectedCollections": ["security-docs", "incident-notes"],
      "status": "active",
      "createdAt": "2026-04-26T00:00:00Z",
      "updatedAt": "2026-04-26T00:00:00Z",
      "latestRunId": "run_456",
      "artifactKinds": ["report", "decision-log"],
      "evidencePolicy": "cite-sources",
      "freshnessLabel": "fresh",
      "sourceSnapshot": "Snapshot captured after security review ingest.",
      "runtimeAttachmentPolicy": "attach-on-demand",
      "notesMarkdown": "Use for security design and threat-model work.",
      "artifactPaths": [
        "/home/jake/.shad/history/Runs/run_456/final.report.md"
      ]
    }
  ]
}
```

## When other Edwins should use this model

Other Edwins, tooling, and companion apps should reason about Knowledge using these boundaries:

- **Sources** = intake
- **Collections** = indexed/searchable substrate
- **Disciplines** = curated runtime metadata
- **Runs** = evidence and synthesis history

Do not assume one file or one index is the entire source of truth.

## Troubleshooting checklist

If a Knowledge screen is empty or incomplete, check:

- `~/.shad/sources.yaml` exists
- `~/.shad/history/Runs/` contains runs
- `~/.edwinpai/knowledge/disciplines.json` exists
- `qmd` is installed and on `PATH`

## Current limitations

The current Knowledge system is useful but still evolving.

Known limitations:

- discipline authoring is still mostly file-driven
- collection and sync lifecycle are not fully owned by every Edwin surface
- architecture is more mature than the UX in some places
- not every surface documents or automates the same workflow yet

## See also

- [Memory](/concepts/memory)
- [Agent workspace](/concepts/agent-workspace)
- [Shad docs](/shad/README)
