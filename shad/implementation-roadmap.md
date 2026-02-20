# Continuous Context Window: Implementation Roadmap

## Executive Summary

Enable Shad to maintain persistent, retrievable, and actionable context across independent runs so that each new task benefits from lessons learned in prior sessions. This roadmap sequences implementation into 5 phases, each building coherence with clear success metrics.

---

## Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish baseline persistence and basic retrieval

### Deliverables

- ✅ Run history persisted to disk in structured format (JSONL + JSON manifests)
- ✅ Basic metadata extraction (task description, strategy, tags, timestamp)
- ✅ Keyword search over run history
- ✅ CLI integration point: `shad run --show-context-sources` flag

### Tasks

1. **History Storage Schema**
   - Location: `~/.shad/history/<YYYYMMDD>_<run_id>/`
   - Files: `run.jsonl` (event log), `trace.jsonl` (decomposition), `manifest.json` (outputs)
   - Metadata: task, strategy, tags, duration, status, verification outcomes
   - Implement retention policy: last 100 runs indexed, older archived to `archive/`

2. **Metadata Extraction**
   - Parse task description → extract domain labels (auth, api, frontend, etc.)
   - Extract strategy skeleton name + root decomposition rationale
   - Tag verification outcomes by subtask type
   - Calculate confidence scores (% of subtasks that passed verification)

3. **Keyword Indexing**
   - Build SQLite FTS table over run metadata (description, tags, outputs)
   - Query interface: `search_runs(query: str) → List[RunMetadata]`
   - Sort by recency + relevance score

4. **CLI Integration**
   - `shad run "task" --show-context-sources` → before execution, print top 3 similar runs
   - Format: `[Retrieving context... Found 2 prior runs]\n1. run-123: "Build auth system" (87% match)\n2. run-456: "User API" (73% match)`
   - No context injection yet; just transparency

### Success Metrics

- [ ] 100+ runs can be archived without performance degradation
- [ ] Keyword search < 1 second
- [ ] Manual review: top 3 retrieved runs are relevant ≥ 80% of the time
- [ ] CLI flag works with no errors
- [ ] Disk usage: < 500 MB for 100 runs

### Tests

```bash
# Test 1: Persistence
shad run "Build REST API with authentication" --vault ~/test
ls ~/.shad/history/*/manifest.json  # Should exist

# Test 2: Keyword retrieval
shad search "authentication" --history  # Should find the auth run
shad search "REST API" --history       # Should also find it

# Test 3: CLI integration
shad run "New auth task" --vault ~/test --show-context-sources
# Output should list the prior auth runs

# Test 4: Latency
time shad search "random query" --history  # < 1 second
```

---

## Phase 2: Semantic Retrieval (Weeks 3-4)

**Goal**: Improve retrieval quality with hybrid search + export summaries

### Deliverables

- ✅ QMD hybrid search (BM25 + vector embeddings) over run history
- ✅ Session summaries exported to vault in markdown format
- ✅ Refined context injection: pre-run only (strategy skeleton primed)
- ✅ Monitoring: latency + precision logging

### Tasks

1. **QMD Integration for Runs**
   - Export run summaries as markdown: `~/.shad/history/summaries/<run_id>.md`
   - Format: task, strategy, key subtasks, verification outcomes, lessons learned
   - Create QMD collection: `qmd collection add ~/.shad/history/summaries --name shad_runs`
   - Integrate `qmd query` into `search_runs()` function
   - Config parameter: `retriever.backend = "qmd"` (fallback: sqlite if unavailable)

2. **Hybrid Search Implementation**
   - Combine: BM25 (exact tokens) + vector (semantic similarity)
   - Weight: 0.6 vector + 0.4 text (tunable)
   - Return top 5 runs with confidence scores
   - Log each query to `context_retrieval.jsonl` for metrics

3. **Context Injection: Pre-Run**
   - On `shad run` startup:
     - Query: task description (1-2 sentences)
     - Retrieve: top 3 semantically similar prior runs
     - Extract: strategy used, key subtask names, verification pass rate
     - Inject into system prompt for initial strategy selection
   - Mechanism: Append to LLM system prompt before decomposition phase

4. **Session Summary Export**
   - After run completion, auto-generate markdown:

   ```markdown
   # Run: <task> (<run_id>)

   **Strategy**: <name>
   **Status**: <success|partial|failed>
   **Verification**: <% pass>

   ## Subtasks

   - <name> (✓/✗)
   - <name> (✓/✗)

   ## Key Insights

   <LLM-extracted lessons learned>

   ## Prior Runs Consulted

   - run-123 (why helpful)
   - run-456 (trade-off considered)
   ```

5. **Monitoring Setup**
   - Log template: `{timestamp, event, query, retrieved_runs, scores, latency_ms, source}`
   - Dashboard: latency percentiles (p50, p95, p99), precision histogram
   - Alert: if latency_ms > 2000, log warning

### Success Metrics

- [ ] QMD queries < 500 ms (95th percentile)
- [ ] Recall ≥ 80% for same-domain test set (20 queries)
- [ ] Precision ≥ 85% (top 3 retrieved runs relevant)
- [ ] Session summaries auto-generated for all runs
- [ ] Context injection visible in LLM prompts (testable via `--verbose`)
- [ ] Logging comprehensive (100% of retrieval events captured)

### Tests

```bash
# Test 1: QMD availability
qmd collection list  # Should show shad_runs

# Test 2: Semantic retrieval
shad search "authentication pattern" --history --mode hybrid
# Should return runs about auth, not just keyword matches

# Test 3: Session summary generation
shad run "Build API" --vault ~/test
ls ~/.shad/history/summaries/*.md  # Should exist

# Test 4: Pre-run context injection
shad run "New auth endpoint" --vault ~/test --verbose
# Output should show: "Consulting prior runs: run-123 (0.89), run-456 (0.75)"

# Test 5: Latency under load
for i in {1..10}; do time shad search "query $i" --history; done
# 95th percentile should be < 500ms
```

---

## Phase 3: Agent-Integrated Reasoning (Weeks 5-6)

**Goal**: RLM engine actively uses prior context to refine decomposition

### Deliverables

- ✅ Mid-run context injection (during decomposition phase)
- ✅ Confidence score boosting based on prior success
- ✅ Deduplication of subtasks across runs
- ✅ Verification outcome trending (what's improving/degrading?)

### Tasks

1. **Decomposition-Phase Retrieval**
   - After initial strategy skeleton generated, query: "What similar decompositions succeeded?"
   - Retrieve: prior runs with same/similar strategy
   - Extract: successful decomposition patterns, failed subtask names
   - Refine: strategy skeleton with insights (e.g., "combine X+Y subtasks" or "split Z into 3 parts")

2. **Confidence Boosting**
   - For each subtask, query: "Was this type of subtask successful before?"
   - Tag subtasks by type: (strategy, name, rough scope)
   - Boost confidence: `initial_confidence * (1 + success_rate_from_priors)`
   - Config: `rlm.decomposition.contextual.confidenceBoostFactor = 1.2` (20% boost for known-good subtasks)
   - Log boost reason: `{subtask_id, prior_run_id, prior_success_rate, boost_applied}`

3. **Subtask Deduplication**
   - Track: which subtasks have identical signatures across runs
   - Query: "Did we already solve this exact subtask?"
   - If yes: reuse result (skip generation + verification)
   - Log: `{subtask_hash, reused_from_run_id, time_saved_ms}`

4. **Verification Trending**
   - Aggregate: pass/fail outcomes per subtask type
   - Per-run: extract verification report (what failed + why)
   - Dashboard: histograms of pass rates over time (improvement tracking)
   - Alert: if pass rate for a subtask type drops > 10%, investigate

### Success Metrics

- [ ] Decomposition refinement visible in trace: prior runs referenced, skeleton updated
- [ ] Confidence scores boosted for known-good subtask types (≥ 1.1x multiplier observed)
- [ ] Subtask deduplication: ≥ 5% of subtasks skipped (reused from prior) over 50-run window
- [ ] Zero regression: same task + context completes ≤ old_time
- [ ] Verification trending: can identify improving/degrading patterns
- [ ] Mid-run latency: < 500 ms per decomposition query

### Tests

```bash
# Test 1: Mid-run context injection
shad run "Build API with auth" --vault ~/test --verbose
# Output should show decomposition refinement points: "Incorporating prior patterns..."

# Test 2: Confidence boosting
shad run "New auth endpoint" --vault ~/test --show-confidence
# Output: confidence scores with boost reasons (e.g., "1.2x from prior OAuth success")

# Test 3: Subtask deduplication
shad run "Rebuild API (same structure)" --vault ~/test --show-reused
# Should show: "Reused 2 subtasks from run-X, saved 3.5 min"

# Test 4: Verification trending
shad dashboard  # metrics view
# Should show pass rate trend for OAuth subtask type (is it stable? improving?)

# Test 5: No regression
time shad run "Task A" --vault ~/test
time shad run "Task A" --vault ~/test --context-from <run_id>
# 2nd should be ≤ 1st (context overhead < 1%)
```

---

## Phase 4: Gateway & Memory System Integration (Weeks 7-8)

**Goal**: Shad context flows through Edwin stack

### Deliverables

- ✅ Shad API `/sessions/{id}/context` endpoint
- ✅ Redis caching of recent contexts (24h TTL)
- ✅ Edwin memory tools (`memory_search`) index Shad runs
- ✅ Gateway pre-request context augmentation

### Tasks

1. **Shad API Endpoint**
   - Route: `GET /sessions/{run_id}/context?limit=5&min_score=0.6`
   - Response: curated prior runs + metadata

   ```json
   {
     "run_id": "run-789",
     "retrieved_runs": [
       {
         "id": "run-123",
         "task": "Build auth system",
         "strategy": "software",
         "score": 0.87,
         "summary_path": "~/.shad/history/summaries/run-123.md",
         "key_insights": ["OAuth patterns", "token refresh"]
       }
     ],
     "timestamp": "2025-02-05T10:30:00Z"
   }
   ```

2. **Redis Caching**
   - Key: `shad:context:{run_id}:{query_hash}`
   - TTL: 86400 seconds (24 hours)
   - Eviction policy: LRU (keep hot runs)
   - Metrics: track hit/miss rate (target: ≥ 80% hit)

3. **Edwin Memory Integration**
   - Export run summaries to Edwin workspace: `~/clawd/shad-runs/`
   - Configure: `agents.defaults.memorySearch.extraPaths = ["~/clawd/shad-runs"]`
   - When agent queries memory (e.g., "What auth patterns have we tried?"), Shad history surfaces
   - Mechanism: Memory tools (`memory_search`, `memory_get`) work on Shad exports like any memory file

4. **Gateway Pre-Request Augmentation**
   - On Edwin request arrival:
     - Check: `?shad_context=yes` flag or config default
     - Call Shad API: `/sessions/{workspace_id}/context`
     - Append to LLM system prompt: "Prior work on similar tasks: [summaries]"
     - Result: agent's first turn is informed by Shad history

### Success Metrics

- [ ] Shad API available + responds < 200 ms (95th percentile)
- [ ] Redis cache hit rate ≥ 80% on repeated context requests
- [ ] Edwin agents successfully query Shad history via `memory_search` (test: "auth patterns")
- [ ] Gateway context augmentation adds < 500 ms latency
- [ ] Zero errors in context propagation (100 runs logged, 100 retrieved correctly)

### Tests

```bash
# Test 1: Shad API
curl http://localhost:8000/sessions/run-789/context
# Should return JSON with prior runs

# Test 2: Redis caching
# Make 2 identical requests, measure latency
# 2nd should be < 200ms, 1st > 200ms (if cold)

# Test 3: Edwin memory integration
edwin --config config.json
# Agent: "What authentication patterns have we tried before?"
# Agent should retrieve snippets from Shad runs via memory_search

# Test 4: Gateway augmentation
curl -X POST http://localhost:8000/run \
  -d '{"prompt": "Build user management", "shad_context": true}'
# Measure latency: should be < 500ms additional

# Test 5: Error handling
# Bring Shad API down, retry gateway request
# Should fallback gracefully, no context but continues
```

---

## Phase 5: Full Cross-Session Coherence (Weeks 9-10)

**Goal**: Unified context system with decay, cross-domain learning, and unified monitoring

### Deliverables

- ✅ Context decay function (recent > old)
- ✅ Cross-task learning (auth pattern from Project A helps Project B)
- ✅ Unified dashboard (runs, context, metrics, trends)
- ✅ All integration points hitting targets simultaneously

### Tasks

1. **Context Decay Function**
   - Boost recent runs (< 1 week): 2.0x multiplier
   - Boost moderate (1-4 weeks): 1.5x
   - Baseline (> 4 weeks): 1.0x
   - Formula: `score = base_relevance * decay_multiplier(age)`
   - Config: `memory.decay.recentDays = 7, moderateDays = 28, baselineMultiplier = 1.0`

2. **Cross-Domain Transfer**
   - For subtask queries, expand beyond exact match:
     - Query domain: "Build auth for REST API"
     - Also retrieve: "Implement OAuth for mobile app" (same pattern, different context)
   - Extract: pattern name (OAuth, JWT, session-based)
   - Tag: pattern library entry (reusable across projects)
   - Risk: only boost cross-domain if pattern match > 0.75

3. **Unified Dashboard**
   - URL: `http://localhost:8000/dashboard/context-continuity`
   - Displays:
     - Timeline of last 50 runs (cards: task, strategy, status, retrieval quality)
     - Context retrieval heatmap (when was context most valuable?)
     - Verification trending (pass rates by subtask type)
     - Cache metrics (hit rate, latency, size)
     - Cross-domain transfer opportunities (patterns detected in multiple projects)
   - Real-time: updates as runs complete + metrics flow in

4. **Comprehensive Validation**
   - A/B test: run same task 5 times with context, 5 times without
   - Measure: execution time, verification pass rate, context accuracy (user feedback)
   - User survey: "How much did prior context help?" (1-5 scale, free text)
   - Track: which context types most valuable (strategy vs. patterns vs. verification outcomes)

### Success Metrics

- [ ] Decay function applied: recent runs ranked 2x higher (verify in logs)
- [ ] Cross-domain transfer: ≥ 65% recall for cross-project pattern queries
- [ ] Dashboard available, all metrics updated in real-time
- [ ] A/B test results: with-context ≥ 15% faster, ≥ 20% higher first-pass verification rate
- [ ] User satisfaction: ≥ 90% find context helpful or neutral
- [ ] All integration points simultaneously at target latency
- [ ] Zero context injection errors (manual spot-check: 100 injections reviewed)

### Tests

```bash
# Test 1: Decay function
shad search "auth" --history --show-scores
# Recent runs (< 1 week) should have 2x higher scores than old ones

# Test 2: Cross-domain transfer
# Create vault with: Project A (auth), Project B (payments)
# Retrieve: "payments pattern" should find auth pattern if it's similar
shad search "secure payment handling" --history
# Should suggest: "OAuth tokenization from Project A could apply"

# Test 3: Dashboard
open http://localhost:8000/dashboard/context-continuity
# Should show timeline, heatmap, trends, real-time metrics

# Test 4: A/B validation (5 cold, 5 warm)
time shad run "Build user service (cold)" --vault ~/test --no-context
time shad run "Build user service (warm)" --vault ~/test --context-from prior
# Warm should be 15% faster on average

# Test 5: User feedback collection
# Parse logs for "context_accuracy" events
grep context_accuracy ~/.shad/logs/*.jsonl | jq '.user_feedback' | sort | uniq -c
# ≥ 90% should be "helpful" or "neutral"
```

---

## Success Criteria Summary

| Criterion                   | Phase 1 | Phase 2   | Phase 3   | Phase 4                      | Phase 5                     |
| --------------------------- | ------- | --------- | --------- | ---------------------------- | --------------------------- |
| **Retrieval Latency (p95)** | < 5 sec | < 2 sec   | < 1.5 sec | < 1 sec                      | < 500 ms                    |
| **Precision**               | ~70%    | ≥ 85%     | ≥ 85%     | ≥ 85%                        | ≥ 85%                       |
| **Recall**                  | ~60%    | ≥ 80%     | ≥ 80%     | ≥ 80%                        | ≥ 85% (same), ≥ 65% (cross) |
| **Context Accuracy**        | N/A     | N/A       | ≥ 90%     | ≥ 90%                        | ≥ 90%                       |
| **Integration Points**      | CLI     | CLI + RLM | CLI + RLM | CLI + RLM + Gateway + Memory | All + cross-domain          |
| **Monitoring**              | Basic   | Logging   | Trending  | Caching + health             | Dashboard + A/B tests       |

---

## Risk Mitigation

| Risk                                    | Mitigation                                                      | Checkpoint |
| --------------------------------------- | --------------------------------------------------------------- | ---------- |
| **Stale/incorrect context injection**   | Confidence scoring, user feedback, A/B testing                  | Phase 2    |
| **Context bloat (disk/memory growth)**  | Retention policy (100 runs), archival, compression              | Phase 1    |
| **Latency regression as history grows** | Index optimization, caching, async updates                      | Phase 2    |
| **Cross-domain false positives**        | High match threshold (0.75+), domain tagging, manual review     | Phase 5    |
| **API/cache unavailability**            | Graceful fallback (continue without context), status monitoring | Phase 4    |
| **User confusion from context noise**   | `--show-context-sources` flag, explanation in injected text     | Phase 2    |

---

## Rollout Strategy

### Internal Validation (Phase 1-2)

- Run on Jake's personal projects (Edwin, task management, etc.)
- Iterate on retrieval quality + UX
- Fix bugs before wider release

### Beta Release (Phase 3-4)

- Enable for opt-in users (`--context-enabled` flag)
- Collect feedback + metrics
- Refine cross-domain logic

### General Availability (Phase 5)

- Ship as default feature (off by default, easy to enable)
- Include configuration guide + monitoring dashboard
- Publish success stories + best practices

---

## References

- **Shad README**: [~/.shad/repo/README.md](/repo/README.md)
- **Edwin Memory**: [/docs/concepts/memory.md](/docs/concepts/memory.md)
- **RLM Engine**: [~/.shad/repo/services/shad-api/README.md](/services/shad-api/README.md)
