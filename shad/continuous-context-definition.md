# Continuous Context Window Across Sessions: Definition & Evaluation Criteria

## Definition

**Continuous context window across sessions** means that Shad maintains coherent, retrievable, and actionable context from previous reasoning cycles across multiple independent runs, enabling the system to:

1. **Recall** what was learned, attempted, and concluded in prior sessions without explicit re-input
2. **Build** on successful patterns and avoid repeated exploration of dead ends
3. **Track** task decomposition state and partial results across session boundaries
4. **Reason** about task evolution and interdependencies over time
5. **Verify** consistency between current reasoning and documented decisions from prior work

In essence: **Each session inherits the cognitive state of previous sessions**, treating the vault + run history as a persistent "long-term memory" that grounds new work.

---

## Core Requirements (What Must Persist)

### 1. **Execution Artifacts & Decisions**

- **What to save**: Completed subtask results, verification outcomes, decomposition patterns
- **Where**: Run history (JSON manifests) + vault-indexed session summaries
- **Format**: JSONL + markdown exports in `~/.shad/history/` and optional vault-integrated index
- **Retention**: Full history by default; configurable retention windows (e.g., last 30 runs)

### 2. **Reasoning Traces & Rationales**

- **What to save**: Why a decomposition was chosen, trade-offs considered, alternative paths rejected
- **Where**: `~/.shad/history/<run_id>/trace.jsonl` + exportable markdown summaries
- **Format**: Structured node metadata (strategy rationale, confidence scores, failure modes)
- **Retention**: Last 50 runs indexed; older runs archived to vault

### 3. **Domain Knowledge Integration**

- **What to save**: Vault state snapshots, retrieval patterns that worked, collection scope
- **Where**: Vault metadata + QMD cache state
- **Format**: Index fingerprints, successful retrieval queries, latency baselines
- **Retention**: Evergreen; invalidate on vault mutation

### 4. **Type Contracts & Import Graphs**

- **What to save**: Export manifests from software strategy runs (symbol locations, type signatures)
- **Where**: `~/.shad/history/<run_id>/exports.json` + optional vault-indexed API reference
- **Format**: Structured type maps (module → symbol → type signature)
- **Retention**: Last 10 successful builds; cache invalidates on changes

### 5. **Verification & Test Outcomes**

- **What to save**: Test pass/fail rates per subtask, linting errors by category, type check results
- **Where**: Run history + optional vault-indexed test suite index
- **Format**: Histograms of verification outcomes, delta reports
- **Retention**: Last 30 runs for trend analysis

---

## Retrieval Accuracy Metrics

### **Precision** (correctness of retrieved context)

- **Definition**: Fraction of retrieved artifacts that are relevant to the current task
- **Target**: ≥ 85% (at least 85% of retrieved runs/traces are actionable)
- **Measurement**: Manual review + automated heuristics (task tag overlap, time decay weighting)
- **Implementation**:
  - Hybrid scoring: (vault semantic match + run metadata tag match + recency)
  - Config: `memory.qmd.limits.maxResults = 6` → cap low-value results

### **Recall** (coverage of useful context)

- **Definition**: Fraction of all relevant prior runs that retrieval returns for a given query
- **Target**: ≥ 80% for same-domain queries, ≥ 60% for cross-domain synthesis
- **Measurement**: Compare results against hand-labeled "gold set" of relevant runs
- **Implementation**:
  - Broadened candidate pool before scoring (candidateMultiplier = 4)
  - Multi-term expansion (query → {original, synonyms, task tags})

### **Latency of Recall**

- **Definition**: Time from query to retrievable results (excludes LLM reasoning)
- **Target**: < 500 ms for history queries, < 2 sec for vault synthesis
- **Measurement**: `memory_search` call duration per query
- **Implementation**:
  - Local SQLite for run history (fast index)
  - QMD + sqlite-vec for vault (hybrid retrieval + vector acceleration)
  - Configurable timeout: `memory.qmd.limits.timeoutMs = 4000`

---

## Integration Points

### 1. **CLI Integration** (`shad run`)

```bash
# Automatic context injection
shad run "Build feature X" --vault ~/MyVault
  # ↓ Retrieves runs tagged with 'feature' or related domains
  # ↓ Injects prior decisions into strategy skeleton
  # ↓ Deduplicates subtasks vs. prior attempts
```

**Mechanism**:

- Pre-run: Query history for semantically similar tasks
- Mid-run: Snippet injection at decomposition phase
- Post-run: Auto-tag results with extracted domain labels

**Config**:

```json5
{
  memory: {
    sessions: { enabled: true, retentionDays: 90 },
    query: {
      hybrid: { enabled: true, vectorWeight: 0.7, textWeight: 0.3 },
      historicalContext: { enabled: true, maxRunsRetrieved: 5 },
    },
  },
}
```

### 2. **Agent Integration** (RLM Engine)

```python
# Inside decomposition loop:
prior_similar_tasks = obsidian.search_runs("current task description", limit=3)
if prior_similar_tasks:
    # Extract: successful decompositions, failed paths, verification outcomes
    strategy_skeleton = refine_skeleton_from_prior(skeleton, prior_similar_tasks)
    confidence_boost = calculate_confidence_from_priors(prior_similar_tasks)
```

**Mechanism**:

- Decomposition: Boost confidence scores based on prior success
- Subtask generation: Reuse known-good patterns, skip known-bad paths
- Retrieval strategy: Auto-tune search params (qmd vs. filesystem) based on prior latency

**Config**:

```json5
{
  rlm: {
    decomposition: {
      contextual: {
        enabled: true,
        priorTasksToConsult: 3,
        confidenceBoostFactor: 1.2,
      },
    },
  },
}
```

### 3. **Gateway Integration** (async context propagation)

```
CLI Request
   ↓
[Shad Server] ← Redis cache of recent runs
   ├─ Check: Is this a continuation? (same workspace/vault?)
   ├─ Inject: Relevant prior context into LLM system prompt
   └─ Execute: RLM with enriched strategy skeleton
   ↓
Redis: Cache subtask results for reuse
```

**Mechanism**:

- Shad API exposes `/sessions/{session_id}/context` → returns curated prior runs + metadata
- Gateway calls Shad API before invoking RLM
- Results cached in Redis with TTL (default: 24h)

**Config**:

```json5
{
  cache: {
    enabled: true,
    provider: "redis",
    ttl: 86400,
    keyNamespace: "shad:context:",
  },
}
```

### 4. **Edwin Memory System Integration**

Edwin's vault (`~/edwin/`) can optionally index Shad run history:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        sources: ["memory", "shad_runs"],
        extraPaths: ["~/.shad/history"],
        provider: "qmd",
      },
    },
  },
}
```

**Mechanism**:

- Export Shad runs as markdown summaries to `~/.shad/history/summaries/`
- Edwin memory tools (`memory_search`) index these alongside workspace memory
- Enables agent to reference "what Shad tried before" in decision-making

---

## Usability Metrics

### **Latency** (how quickly context is available)

- **Pre-run context injection**: < 2 sec (historical lookup + snippet extraction)
- **Mid-run context augmentation**: < 500 ms (in-decomposition queries)
- **Post-run context persistence**: < 1 sec (index update + cache write)
- **Measurement**: Instrument `shad_context_latency` in all three phases
- **SLA**: 95th percentile must stay < target across 100-run windows

### **Accuracy of Context Reuse**

- **Definition**: % of injected prior context that reduces execution time vs. harm from noise
- **Target**: ≥ 90% of prior context is either helpful or neutral; ≤ 10% introduces misdirection
- **Measurement**:
  - A/B test: same task with/without prior context
  - Manual review: was prior context used? Did it help?
  - Automated: did task complete faster? Did verification pass on first try?

### **Usability: Context Discoverability**

- **Definition**: Can users easily find and inspect prior runs relevant to current work?
- **Target**: Top-3 retrieval precision ≥ 85% for intent queries
- **Measurement**:
  - User surveys: "How easy was it to find relevant prior work?" (1-5 scale)
  - Retention: Are users re-discovering history, or re-running tasks?
  - CLI UX: Does `shad trace tree <run_id>` clearly show decision paths?

### **Usability: Context Transparency**

- **Definition**: Users understand what context was retrieved and why
- **Target**: All injected context includes justification (source run ID + relevance score)
- **Measurement**:
  - CLI flag: `--show-context-sources` prints all retrieved runs + scores
  - Trace mode: Decomposition nodes reference prior runs in explanations
  - Logging: `context_injection.jsonl` records what was retrieved, score, injection point

---

## Success Criteria Thresholds

### **Phase 1: Foundation (MVP)**

- [ ] Run history persists to disk (`~/.shad/history/` with JSONL + manifests)
- [ ] Basic retrieval: keyword search on run metadata (task description, strategy, tags)
- [ ] Context injection point: Pre-run only (strategy skeleton primed with prior similar tasks)
- [ ] Latency: < 5 sec end-to-end (retrieval + context formatting)
- [ ] Retention: Last 100 runs indexed

**Metrics to track**:

- Run history size growth (GB/100 runs)
- Retrieval latency percentiles (p50, p95, p99)
- Manual spot-check: "Is the retrieved context relevant?" (yes/no/partial)

### **Phase 2: Semantic Retrieval**

- [ ] QMD integration (hybrid BM25 + vector search)
- [ ] Session summaries exported to vault in markdown
- [ ] Context injection: Pre-run + mid-decomposition (refine strategy during execution)
- [ ] Latency: < 2 sec pre-run, < 500 ms mid-run
- [ ] Recall: ≥ 80% for same-domain queries
- [ ] Retention: Last 50 runs fully indexed; 100+ runs archived

**Metrics to track**:

- QMD embedding latency (ms per query)
- Precision + recall on test set of 20 domain-specific queries
- Mid-run context injection frequency (how many decomposition nodes benefit?)

### **Phase 3: Agent-Integrated Reasoning**

- [ ] RLM engine uses prior runs to refine decomposition strategy
- [ ] Confidence scores boosted by prior success (1.2x multiplier on >80% prior match)
- [ ] Verification outcomes tracked per subtask type (trends in pass/fail by category)
- [ ] Latency: < 500 ms total overhead from context integration
- [ ] Accuracy: ≥ 90% of prior context is helpful or neutral

**Metrics to track**:

- Decomposition confidence scores (histogram: pre/post-context)
- Execution time delta (same task, with/without prior context)
- Verification improvement: % of first-try passes (vs. prior baseline)
- User feedback: Did context speed up work or introduce noise?

### **Phase 4: Gateway & Memory System Integration**

- [ ] Shad API exposes `/sessions/{id}/context` endpoint
- [ ] Redis caching of context (24h TTL)
- [ ] Edwin agents can query Shad history via `memory_search`
- [ ] Latency: < 200 ms Redis cache hit, < 2 sec cache miss
- [ ] Precision: ≥ 85% of agent-initiated context queries return actionable snippets

**Metrics to track**:

- Redis cache hit rate (target: ≥ 80% on repeated queries)
- Agent `memory_search` precision when querying Shad history
- End-to-end context availability (time from agent query to usable snippet)

### **Phase 5: Full Cross-Session Coherence**

- [ ] All integration points (CLI, RLM, gateway, memory) working in tandem
- [ ] Context decay function: recent runs (< 1 week) ranked 2x higher
- [ ] Cross-task learning: e.g., auth pattern from Project A helps Project B
- [ ] Latency: All integration points < target (pre-run < 2s, mid-run < 500ms, cache < 200ms)
- [ ] Accuracy: ≥ 90% of injected context is helpful or neutral across diverse tasks
- [ ] Recall: ≥ 85% for same-domain, ≥ 65% for cross-domain queries

**Metrics to track**:

- Multi-run validation: Task time reduction (% faster with context vs. cold start)
- Cross-domain transferability: Can auth patterns from Project A be applied to Project C?
- Long-term user engagement: Are users relying on historical context? (tracking `--show-context-sources` usage)

---

## Implementation Checkpoints

### **Checkpoint 1: Persistence & Indexing**

```bash
# Verify run history is saved and indexed
shad run "Test task" --vault ~/TestVault
ls -la ~/.shad/history/$(date +%Y%m%d)*
# → Should see: run.jsonl, trace.jsonl, manifest.json, summary.md

# Verify search works
shad search "test task" --history
# → Should find the run we just created
```

**Pass criteria**:

- Run artifacts saved correctly
- Keyword search finds the run within < 1 sec
- Summary markdown is readable and actionable

### **Checkpoint 2: Retrieval Quality**

```bash
# Run 5 similar tasks, measure retrieval
for i in {1..5}; do
  shad run "Build API with authentication" --vault ~/TestVault --tag auth
  sleep 2
done

# Query: Check if new runs retrieved prior auth patterns
shad search "authentication pattern" --history --show-scores
# → Should return previous auth runs with scores > 0.7
```

**Pass criteria**:

- ≥ 80% of retrieved results are from auth-tagged runs
- Scores are monotonic (no reversals)
- Retrieval latency < 500 ms

### **Checkpoint 3: Context Injection**

```bash
# Run with context injection enabled
shad run "Add user management feature" --vault ~/TestVault \
  --show-context-sources

# Check output
# → Should show:
#   - "Retrieved prior runs: run-123, run-456"
#   - "Injecting context: [User auth pattern from run-123]"
#   - Decomposition includes subtasks reused from prior runs
```

**Pass criteria**:

- Context sources printed clearly
- Decomposition references prior runs
- No false positive injections (unrelated runs filtered out)

### **Checkpoint 4: Latency Validation**

```bash
# Measure latency across all integration points
shad run "Complex task" --vault ~/TestVault \
  --metrics latency

# Check timing report
# → Should show breakdown:
#   - Pre-run context lookup: < 2 sec
#   - Decomposition + mid-run injection: < 500 ms per node
#   - Post-run cache write: < 1 sec
```

**Pass criteria**:

- All timing < target
- 95th percentile over 10 runs also < target
- No regression as history grows (100+ runs)

### **Checkpoint 5: Agent Integration**

```bash
# Configure Edwin to use Shad history
echo '{"memory": {"sources": ["memory", "shad_runs"]}}' > config.json

# Run Edwin agent
edwin --config config.json

# Agent query that should retrieve Shad history
# Agent: "Remind me of auth patterns we tried before"
# → Should surface snippets from Shad history via memory_search
```

**Pass criteria**:

- Agent successfully queries Shad history
- Retrieved snippets are contextualized (include source run ID)
- Latency < 2 sec for initial fetch

---

## Monitoring & Observability

### **Key Metrics to Track**

| Metric                      | Target              | Collection                                | Alert Threshold |
| --------------------------- | ------------------- | ----------------------------------------- | --------------- |
| **Retrieval Latency (p95)** | < 500 ms            | Instrument `shad_retrieval_latency_ms`    | > 1000 ms       |
| **Context Precision**       | ≥ 85%               | Manual sampling + heuristic scoring       | < 75%           |
| **Context Recall**          | ≥ 80% (same-domain) | Test set validation                       | < 70%           |
| **Cache Hit Rate**          | ≥ 80%               | Redis stats                               | < 60%           |
| **Index Freshness**         | < 5 min             | Monitor metadata timestamp vs. latest run | > 15 min        |
| **Disk Usage**              | < 2 GB/100 runs     | Monitor `~/.shad/history/` size           | > 5 GB          |
| **Context Accuracy**        | ≥ 90% helpful       | User feedback + A/B testing               | < 80%           |

### **Dashboards**

**Shad Context Continuity Dashboard**

```
Timeline of last 50 runs with:
  - Task description + time
  - Retrieval quality (precision/recall/scores)
  - Context injection points (pre-run, mid-run, post-run)
  - Latency breakdown (retrieval, formatting, cache)
  - Verification outcomes (pass/fail trends)
  - User feedback (was context helpful?)

Available at: localhost:8000/dashboard/context-continuity
```

### **Logging**

```jsonl
# ~/.shad/logs/context-continuity.jsonl
{"timestamp": "2025-02-05T10:30:45Z", "event": "context_query", "query": "auth pattern", "retrieved_runs": 3, "precision": 0.87, "latency_ms": 412, "source": "pre_run"}
{"timestamp": "2025-02-05T10:30:46Z", "event": "context_injection", "run_id": "run-456", "decomposition_node": "implement_oauth", "confidence_boost": 1.2}
{"timestamp": "2025-02-05T10:35:22Z", "event": "context_accuracy", "user_feedback": "helpful", "run_id": "run-789"}
```

---

## Configuration Template

```json5
{
  shad: {
    // Persistence
    history: {
      enabled: true,
      storePath: "~/.shad/history",
      retentionDays: 90,
      archiveDir: "~/.shad/history/archive",
      summaryFormat: "markdown", // also: json, jsonl
    },

    // Retrieval
    contextRetrieval: {
      enabled: true,
      provider: "qmd", // or: sqlite, filesystem
      maxResultsPerQuery: 5,
      timeoutMs: 4000,
      minRelevanceScore: 0.6,
    },

    // Memory system integration
    memory: {
      sources: ["runs", "sessions"], // also: memory, vault
      export: {
        enabled: true,
        format: "markdown",
        interval: "1h",
        destination: "~/.shad/history/summaries",
      },
    },

    // Integration points
    integration: {
      cli: { enabled: true, injectAt: "pre_run", injectAt: "decomposition" },
      agent: { enabled: true, confidenceBoost: 1.2 },
      gateway: { enabled: true, cacheProvider: "redis", cacheTtl: 86400 },
      memory: { enabled: true, allowCrossDomain: true },
    },

    // Monitoring
    monitoring: {
      enabled: true,
      trackLatency: true,
      trackAccuracy: true,
      trackCacheHitRate: true,
      metricsDestination: "~/.shad/logs/metrics.jsonl",
    },
  },
}
```

---

## References

- **Shad Architecture**: [README.md](/repo/README.md) - RLM Engine, strategy skeletons, code mode
- **Edwin Memory**: [docs/concepts/memory.md](/docs/concepts/memory.md) - Vault layout, memory flush, QMD backend
- **Retrieval Patterns**: [memory-schema.ts](/src/memory/memory-schema.ts) - Indexing, FTS, hybrid search
