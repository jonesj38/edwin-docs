# Shad Context Continuity Documentation

This directory contains comprehensive documentation for implementing and evaluating **continuous context window across sessions** in Shad.

## Documents

### 1. [continuous-context-definition.md](./continuous-context-definition.md)

**What to build and how to measure success**

Defines "continuous context window across sessions" with:

- **Core requirements**: What must persist across runs (execution artifacts, reasoning traces, domain knowledge, type contracts, verification outcomes)
- **Retrieval accuracy metrics**: Precision (≥ 85%), Recall (≥ 80%), Latency (< 500 ms)
- **Integration points**: CLI, RLM Engine, Gateway, Edwin Memory System
- **Usability metrics**: Latency, accuracy, discoverability, transparency
- **Success criteria thresholds**: 5 phases from MVP to full coherence
- **Implementation checkpoints**: Step-by-step validation tests
- **Monitoring & observability**: Key metrics, dashboards, logging

**Key Insight**: Context continuity means Shad treats the vault + run history as a persistent "long-term memory" that grounds new work. Each session should inherit the cognitive state of previous sessions.

---

### 2. [implementation-roadmap.md](./implementation-roadmap.md)

**How to build it in phases**

Sequences implementation into 5 bi-weekly phases:

| Phase              | Goal                | Key Deliverables                                              |
| ------------------ | ------------------- | ------------------------------------------------------------- |
| **1** (Weeks 1-2)  | Foundation          | Run history persisted, keyword search, CLI transparency       |
| **2** (Weeks 3-4)  | Semantic Retrieval  | QMD integration, session summaries, pre-run context injection |
| **3** (Weeks 5-6)  | Agent-Integrated    | Mid-run context, confidence boosting, subtask deduplication   |
| **4** (Weeks 7-8)  | Gateway Integration | Shad API, Redis caching, Edwin memory integration             |
| **5** (Weeks 9-10) | Full Coherence      | Context decay, cross-domain learning, unified dashboard       |

Each phase includes:

- Specific tasks with implementation details
- Success metrics and acceptance criteria
- Concrete tests to validate each feature
- Risk mitigation strategies

---

### 3. [shad-context-continuity.md](../../../.claude/projects/-home-jake-Desktop-edwin/memory/shad-context-continuity.md) (Auto-Memory)

**Quick reference for future sessions**

Condensed summary in auto-memory directory:

- 1-sentence definition + key concepts
- 5 categories of what persists (quick table)
- Retrieval accuracy targets
- 4 integration points (tl;dr)
- 5 success phases at a glance
- 5 key monitoring metrics
- 5 implementation checkpoints

Auto-loaded in future conversations for fast context recall.

---

## Quick Start

### For Planning

1. Read [continuous-context-definition.md](./continuous-context-definition.md) to understand **what** needs to work
2. Review [implementation-roadmap.md](./implementation-roadmap.md) for the **5-phase plan**
3. Use success criteria thresholds as your goal posts

### For Implementation

1. Start with **Phase 1: Foundation** (weeks 1-2)
   - Persist run history to disk
   - Implement keyword search
   - Add `--show-context-sources` CLI flag
2. Move to **Phase 2: Semantic Retrieval** once Phase 1 passes all tests
3. Continue sequentially; each phase is built on prior phases

### For Validation

Use the **Implementation Checkpoints** in each phase's test section:

```bash
# Example (Phase 1)
shad run "Test task" --vault ~/TestVault
ls -la ~/.shad/history/$(date +%Y%m%d)*
shad search "test task" --history  # < 1 second?
```

---

## Key Concepts

### What is "Continuous Context"?

Shad should remember:

- ✅ What tasks it has accomplished (and how)
- ✅ What patterns worked vs. didn't
- ✅ What trade-offs were considered
- ✅ What verification issues were encountered

So that when a new task arrives:

- ✅ It retrieves relevant prior runs automatically
- ✅ It reuses successful patterns
- ✅ It avoids known dead ends
- ✅ All without explicit user input (though transparency is critical)

### The 5 Things That Must Persist

1. **Execution Artifacts** → What was produced (code, summaries, outputs)
2. **Reasoning Traces** → Why decisions were made (decomposition trees, chosen strategies)
3. **Domain Knowledge** → What patterns work in this domain (retrieval patterns, vault structure)
4. **Type Contracts** → Symbol maps for code generation consistency
5. **Verification Outcomes** → What passed/failed and why (trends per subtask type)

### The 4 Integration Points

1. **CLI** (`shad run`) → Prime strategy skeleton with prior runs
2. **RLM Engine** → Boost confidence, refine decomposition mid-run
3. **Gateway** → Cache contexts, serve via API to Edwin
4. **Edwin Memory** → Index Shad runs in vault, agents can query history

---

## Success Metrics at a Glance

| Metric                  | Target              | Why                              |
| ----------------------- | ------------------- | -------------------------------- |
| **Retrieval Precision** | ≥ 85%               | Most retrieved runs are relevant |
| **Retrieval Recall**    | ≥ 80% (same-domain) | Find most related prior work     |
| **Latency (history)**   | < 500 ms            | Don't stall execution            |
| **Context Accuracy**    | ≥ 90% helpful       | Injected context aids, not harms |
| **Cache Hit Rate**      | ≥ 80%               | Reuse reduces redundant lookups  |

---

## Configuration Template

```json5
{
  shad: {
    history: {
      enabled: true,
      storePath: "~/.shad/history",
      retentionDays: 90,
    },
    contextRetrieval: {
      enabled: true,
      provider: "qmd", // hybrid BM25 + vector
      timeoutMs: 4000,
    },
    integration: {
      cli: { enabled: true },
      agent: { confidenceBoost: 1.2 },
      gateway: { cacheProvider: "redis", cacheTtl: 86400 },
      memory: { enabled: true },
    },
  },
}
```

Full config template in [continuous-context-definition.md](./continuous-context-definition.md#configuration-template).

---

## Monitoring Checklist

- [ ] **Retrieval latency**: Instrument and alert if p95 > 1 second
- [ ] **Context precision**: Manual sampling of top 3 results; target ≥ 85% relevant
- [ ] **Cache hit rate**: Redis stats; target ≥ 80%
- [ ] **Disk usage**: Monitor `~/.shad/history/` size; alert if > 5 GB
- [ ] **Index freshness**: Metadata timestamp; alert if > 15 min stale
- [ ] **User feedback**: Track "was context helpful?" in logs; target ≥ 90%

---

## FAQ

**Q: Doesn't this just cache results? Why is it "reasoning"?**
A: It's not just caching outputs. Shad uses prior runs to inform _strategy choices_:

- Reuse successful decomposition patterns
- Boost confidence for known-good subtask types
- Deduplicate work (don't solve the same problem twice)
- Extract lessons learned for cross-domain transfer

**Q: What if context is stale or wrong?**
A: Multiple safeguards:

1. Recency weighting (recent runs ranked 2x higher)
2. Confidence scoring (only boost if prior success > 80%)
3. Transparency (all injected context sources shown via `--show-context-sources`)
4. User feedback collection (track if context was helpful)
5. A/B testing (validate context improves outcomes)

**Q: How much disk space will this use?**
A: Roughly 5-10 MB per run (depends on code size):

- 100 runs: 500 MB - 1 GB
- 1000 runs: 5-10 GB
  Retention policy: keep last 100 runs indexed, archive older runs. Config is tunable.

**Q: Can I opt out?**
A: Yes, always:

- `--no-context` flag disables context injection for a single run
- Config: `contextRetrieval.enabled = false` disables globally
- `--show-context-sources` always shows what was retrieved, so users can audit

**Q: How does this integrate with Edwin?**
A: Shad run summaries are exported to vault and indexed by Edwin's memory system:

- Edwin agents can query Shad history via `memory_search` tool
- Example: agent asks "What auth patterns have we tried?" → retrieves Shad runs
- Information flows both ways: Shad uses Edwin's long-term memory, agents use Shad's run history

---

## Timeline

- **Weeks 1-2**: Phase 1 (Foundation) → basic persistence + keyword search
- **Weeks 3-4**: Phase 2 (Semantic) → QMD + session summaries
- **Weeks 5-6**: Phase 3 (RLM integration) → agent reasoning with priors
- **Weeks 7-8**: Phase 4 (Gateway/Memory) → API + Edwin integration
- **Weeks 9-10**: Phase 5 (Full coherence) → decay, cross-domain, dashboard

---

## Related Documentation

- [Shad README](~/.shad/repo/README.md) — Overall architecture
- [Edwin Memory](../concepts/memory.md) — Vault layout, memory flush, QMD backend
- [RLM Engine](~/.shad/repo/services/shad-api/README.md) — Core reasoning loop
- [Memory Schema](../../src/memory/memory-schema.ts) — Indexing & retrieval internals

---

## Contact & Questions

For questions or clarifications:

1. Refer to the detailed sections in [continuous-context-definition.md](./continuous-context-definition.md)
2. Check the phase-specific details in [implementation-roadmap.md](./implementation-roadmap.md)
3. Use [shad-context-continuity.md](../../../.claude/projects/-home-jake-Desktop-edwin/memory/shad-context-continuity.md) for quick reference

---

**Last Updated**: 2025-02-05
**Status**: Definition & roadmap complete; ready for Phase 1 implementation
