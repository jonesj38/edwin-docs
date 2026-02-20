# Shad Evaluation Framework: Continuous Context Vision Metrics

**Purpose**: Define explicit, measurable criteria for evaluating Shad's ability to maintain working memory and cross-session continuity, detect failure modes, and assess context fidelity.

**Status**: Normative specification for empirical assessment.

---

## 1. Working Memory Recall Metrics

### 1.1 Retrieval Accuracy

**Definition**: Proportion of queries that retrieve contextually relevant, accurate information.

**Metrics**:

| Metric                         | Formula                                           | Target | Failure Threshold |
| ------------------------------ | ------------------------------------------------- | ------ | ----------------- |
| **Precision@k**                | (relevant docs in top-k) / k                      | ≥0.80  | <0.60             |
| **Recall@k**                   | (relevant docs retrieved) / (total relevant docs) | ≥0.75  | <0.50             |
| **MRR (Mean Reciprocal Rank)** | avg(1 / rank of first relevant)                   | ≥0.85  | <0.60             |
| **NDCG@k**                     | Normalized discounted cumulative gain             | ≥0.78  | <0.55             |

**Measurement Procedure**:

1. For each Shad query in a session:
   - Log the query text and retrieved documents
   - Have human evaluator mark each result as "relevant", "partially relevant", or "irrelevant"
   - Calculate rank position of first relevant result
2. Aggregate across all queries in session
3. Compare against baseline (prior sessions, similar tasks)

**Relevance Definition**:

- **Relevant**: Document answers the query, provides needed context, or enables task progress
- **Partially Relevant**: Contains some useful information but incomplete or tangential
- **Irrelevant**: Does not address the query

---

### 1.2 Context Freshness (Recency)

**Definition**: Proportion of retrieved context that reflects current state of vault/codebase.

**Metrics**:

| Metric                 | Definition                                              | Target  | Failure Threshold |
| ---------------------- | ------------------------------------------------------- | ------- | ----------------- |
| **Stale Rate**         | (docs from >30 days ago) / total retrieved              | ≤0.15   | >0.40             |
| **Vault Sync Lag**     | Time since last vault content hash match                | <1 hour | >24 hours         |
| **Cache Hit Validity** | (cache hits with valid context_hash) / total cache hits | ≥0.95   | <0.80             |
| **Shadow Index Drift** | (shadow index entries) - (actual vault sources) / total | ≤0.05   | >0.20             |

**Measurement Procedure**:

1. Track document retrieval timestamps vs. document modification times
2. Monitor vault content hash changes (from SPEC.md §3.5)
3. Verify cache key validity before retrieval
4. Periodically audit shadow index against actual vault state

**Critical Events**:

- Cache hit returns data from vault that changed → log as "context stale"
- Vault ingested new source, but old version cached → log as "shadow index drift"
- Retrieved doc timestamp >30 days old → increment stale count

---

### 1.3 Retrieval Latency

**Definition**: Time from retrieval request to result delivery.

**Metrics**:

| Metric                 | Definition                  | Target | Warning | Failure |
| ---------------------- | --------------------------- | ------ | ------- | ------- |
| **p50 Latency**        | Median retrieval time       | <500ms | >800ms  | >2s     |
| **p99 Latency**        | 99th percentile             | <2s    | >3s     | >5s     |
| **Cache Hit Latency**  | Latency when cache_hit=true | <50ms  | >100ms  | >200ms  |
| **Cold Start Latency** | First retrieval in session  | <1s    | >2s     | >5s     |

**Measurement Procedure**:

1. Instrument RetrievalLayer with start/end timestamps
2. Disaggregate by: cache hit, hybrid search, bm25, vector, reranking
3. Collect percentiles over rolling 1-hour window
4. Alert if p99 exceeds failure threshold

**Interpretation**:

- p50 >800ms suggests inefficient search backend or vault too large
- p99 spikes during same task indicate context contention
- Cache hits >100ms indicate Redis latency issues

---

### 1.4 Contextual Coherence

**Definition**: Quality of retrieved context relative to query; does it form a coherent narrative or answer?

**Metrics**:

| Metric                   | Definition                                              | Measurement                                         | Target |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------- | ------ |
| **Semantic Consistency** | Cosine similarity between query and retrieved docs      | Embed query + docs, compute avg pairwise similarity | ≥0.72  |
| **Coverage Score**       | Does retrieval span required domains/layers?            | Human: does set of docs cover all aspects of query? | ≥0.80  |
| **Contradiction Rate**   | % of retrieved docs that directly contradict each other | Human: spot-check for conflicting info              | ≤0.05  |
| **Citation Integrity**   | References in synthesis match retrieved sources         | Trace citations back to original docs               | ≥0.98  |

**Measurement Procedure**:

1. For 10% of queries per session (random sample):
   - Embed query using same model as qmd reranker
   - Embed each retrieved doc (take first 512 tokens)
   - Calculate cosine similarity of each to query
   - Average similarity across top-10 results
2. Have evaluator assess coverage (binary: yes/no)
3. Check if any two docs contradict on factual claims
4. When synthesis generated, verify all citations

---

## 2. Cross-Session Continuity Metrics

### 2.1 Context Retention

**Definition**: Ability to recall and reuse decisions, artifacts, and state across sessions.

**Metrics**:

| Metric                    | Definition                                                           | Measurement                                                 | Target              |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| **Replay Completeness**   | Can past decisions/artifacts be fully reconstructed?                 | `shad resume <run_id>`: compare dag.json equality           | ≥0.99               |
| **Manifest Stability**    | File manifest changes between runs on same task                      | Git diff of output manifests                                | ≤0.05 (5% variance) |
| **Artifact Preservation** | Generated artifacts available for reuse in next session              | Check if artifacts directory persists, referenced correctly | ≥0.98               |
| **Session Linkage**       | Successfully link current session to prior run via run_id/vault_hash | Verify session metadata in History/                         | 100%                |

**Measurement Procedure**:

1. Run `shad run <goal>` → capture run_id
2. Without modification, run `shad resume <run_id>` → compare:
   - DAG structure (node count, task names, dependencies)
   - Status of each node (should be SKIP if cached)
   - Output manifests (file paths, hashes)
3. Measure deviation as:
   ```
   delta_manifest = (files added + files removed) / total_files
   ```
4. Check artifacts/ directory for:
   - Completeness (no dangling references)
   - File size consistency

---

### 2.2 Temporal Coherence

**Definition**: Consistency of context interpretation and reasoning across time; does Shad maintain a unified view?

**Metrics**:

| Metric                   | Definition                                                    | Measurement                                          | Target |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| **Decision Consistency** | Same query in session N produces same decision as session N-1 | Log routing decisions (decomposition tree), compare  | ≥0.95  |
| **Type Evolution**       | Do inferred types stay consistent or gracefully evolve?       | Track type_hash from contracts-first node            | ≥0.90  |
| **Vocabulary Drift**     | Does Shad use consistent terminology across sessions?         | Embedding similarity of extracted terms              | ≥0.85  |
| **Conclusion Stability** | Does synthesis reach same conclusions when re-running?        | Compare final synthesis text (semantic, not lexical) | ≥0.88  |

**Measurement Procedure**:

1. **Decision Consistency**:
   - For same high-level task, check `decisions/decomposition.json`
   - Measure tree edit distance (# insertions/deletions to transform tree A → B)
   - If distance ≤ 2 and top-level strategy identical, score as consistent
2. **Type Evolution**:
   - Extract JSON schema from contracts node in each run
   - Compute schema diff (added/removed fields, type changes)
   - Log breaking changes separately from safe evolution
3. **Vocabulary Drift**:
   - Extract key terms from each synthesis
   - Embed and compute cosine distance of term vectors
   - Flag if distance >0.25 (significant drift)
4. **Conclusion Stability**:
   - Embed synthesis text from two runs
   - Compute cosine similarity
   - If >0.80, consider conclusions stable

---

### 2.3 Session Boundary Recognition

**Definition**: Shad correctly understands where one task ends and another begins; isolation without over-segmentation.

**Metrics**:

| Metric                | Definition                                                            | Measurement                                           | Target |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| **Session Isolation** | Does context from session N leak into session N+1?                    | Cross-correlation of retrieved docs between runs      | ≤0.10  |
| **Boundary Accuracy** | Correctly identified where prior context ends and new begins          | Human: review session logs, mark boundaries           | ≥0.95  |
| **Hard Dep Scoping**  | Hard dependencies correctly scoped to current task (no over-reaching) | DAG analysis: hard_deps reference only relevant nodes | ≥0.98  |
| **Soft Dep Reuse**    | Soft dependencies appropriately brought forward across sessions       | Does context packet summary appear in next session?   | ≥0.75  |

**Measurement Procedure**:

1. **Session Isolation**:
   - Run task A, collect retrieved vault references
   - Run unrelated task B, collect references
   - Compute Jaccard similarity of reference sets
   - Should be ≤0.10 (minimal overlap)
2. **Boundary Accuracy**:
   - Review session logs (events.jsonl) around transition points
   - Mark: "context reused appropriately" vs. "context bled through"
   - Count accurate vs. inaccurate
3. **Hard Dep Scoping**:
   - Parse dag.json for each run
   - For each hard_dep edge, verify:
     - Both nodes belong to same strategy skeleton
     - Dependency is documented in task description
   - Flag edges that seem overly broad
4. **Soft Dep Reuse**:
   - Track if context packets from node X in session N appear referenced in session N+1
   - Measure as % of context packets that persist across runs

---

## 3. Failure Modes & Gap Detection

### 3.1 Retrieval Failures

**Definition**: Shad unable to find needed context or returns irrelevant results.

**Failure Criteria**:

| Scenario                | Detection Method                                   | Severity |
| ----------------------- | -------------------------------------------------- | -------- |
| **Empty Result Set**    | Retrieval returns 0 documents                      | CRITICAL |
| **All Irrelevant**      | Retrieval precision@10 <0.30                       | HIGH     |
| **Latency Spike**       | p99 latency >5s (3x baseline)                      | MEDIUM   |
| **Cache Stale**         | Cache_hit=true but context_hash mismatch           | MEDIUM   |
| **Fallback Exhaustion** | All three tiers (regen → direct → checkpoint) fail | CRITICAL |

**Measurement Procedure**:

1. Log every retrieval call with:
   - `query`, `num_results`, `cache_hit`, `latency_ms`, `precision@10`
2. Daily report:
   ```json
   {
     "empty_result_count": 0,
     "low_precision_queries": [],
     "latency_spikes": [],
     "stale_cache_count": 0,
     "fallback_exhausted_count": 0
   }
   ```
3. Alert threshold: >1 CRITICAL or >5 HIGH per session

---

### 3.2 Decomposition Failures

**Definition**: DAG construction or node execution fails; tasks don't decompose sensibly.

**Failure Criteria**:

| Scenario                | Detection                                     | Severity |
| ----------------------- | --------------------------------------------- | -------- |
| **Circular Dependency** | DAG is not acyclic                            | CRITICAL |
| **Impossible Node**     | Node has conflicting requirements             | HIGH     |
| **Strategy Mismatch**   | Selected strategy incompatible with task      | MEDIUM   |
| **Over-Decomposition**  | Tree depth exceeds max_depth limit            | MEDIUM   |
| **Under-Decomposition** | Single node too large (>40k tokens estimated) | MEDIUM   |

**Measurement Procedure**:

1. After decomposition, before execution:
   - Topological sort DAG; if fails → CRITICAL
   - Check node constraints (e.g., `software` strategy requires `contracts-first` node)
   - Compare task keywords to strategy skeleton
   - Measure tree depth vs. max_depth
   - Estimate tokens per node from task complexity
2. Log violations with evidence

---

### 3.3 Consistency Violations

**Definition**: Generated output violates stated contracts (types, imports, schema).

**Failure Criteria**:

| Scenario               | Detection                           | Severity |
| ---------------------- | ----------------------------------- | -------- |
| **Type Error**         | Generated code has undefined types  | CRITICAL |
| **Import Error**       | Referenced modules not in manifest  | CRITICAL |
| **Schema Mismatch**    | Output JSON doesn't match contracts | HIGH     |
| **Orphaned Reference** | Code references nonexistent symbol  | HIGH     |
| **Merge Conflict**     | Conflict marker in generated file   | CRITICAL |

**Measurement Procedure**:

1. Verification layer runs post-generation:
   - Parse generated code/data
   - Check types against contracts-first output
   - Verify all imports present in manifest
   - Schema validation
   - Grep for merge conflict markers
2. Report by:
   - `file_path`
   - `error_type`
   - `severity`
   - `suggested_repair`

---

### 3.4 Context Gaps

**Definition**: Missing or incomplete information needed to complete task.

**Failure Criteria**:

| Indicator               | Measurement                                              | Threshold                 | Action           |
| ----------------------- | -------------------------------------------------------- | ------------------------- | ---------------- |
| **Unresolved Citation** | Synthesis claims unsupported by vault                    | >0 instances              | MEDIUM           |
| **Implicit Assumption** | Task assumes domain knowledge not in vault               | Human judgment            | HIGH if critical |
| **Stale Example**       | Retrieved code example outdated (>2 major versions back) | Date check                | MEDIUM           |
| **Incomplete Coverage** | Retrieved context covers <60% of required domains        | Semantic analysis         | HIGH             |
| **No Authority Source** | Topic covered but no authoritative/recent reference      | Source quality score <0.5 | MEDIUM           |

**Measurement Procedure**:

1. **Unresolved Citation**:
   - Extract all [cite: ...] markers from synthesis
   - Verify each cite ID exists in artifacts/
   - Unresolved → flag
2. **Implicit Assumption**:
   - Human reviewer: does synthesis assume knowledge not in vault?
   - Examples: "as we discussed in auth system" without auth context
3. **Stale Example**:
   - Extract version numbers from retrieved code
   - If current major version ≥ retrieved+2, flag
4. **Coverage**:
   - Map required domains from task decomposition
   - Check if at least 1 retrieved doc covers each domain
   - Coverage% = covered_domains / required_domains
5. **Authority Score**:
   - Favor official docs, recent updates (≤6 months)
   - Penalize Stack Overflow, blog posts, old examples
   - Score = (authority + recency) / 2

---

## 4. Continuous Monitoring Dashboards

### 4.1 Real-Time Health Checks

**Metrics Published Every 5 Minutes**:

```json
{
  "timestamp": "2026-02-05T14:23:15Z",
  "session_id": "current",
  "health": {
    "retrieval": {
      "p50_latency_ms": 385,
      "p99_latency_ms": 1823,
      "cache_hit_rate": 0.42,
      "empty_result_rate": 0.0,
      "avg_precision_at_10": 0.82,
      "status": "healthy"
    },
    "decomposition": {
      "nodes_executed": 7,
      "nodes_failed": 0,
      "avg_tree_depth": 2.1,
      "max_depth": 3,
      "status": "healthy"
    },
    "consistency": {
      "verification_failures": 0,
      "repair_attempts": 0,
      "cache_stale_count": 0,
      "status": "healthy"
    },
    "context": {
      "sessions_linked": 1,
      "context_packets_reused": 2,
      "stale_doc_rate": 0.08,
      "status": "healthy"
    }
  },
  "alerts": [],
  "suggestions": ["Cache hit rate lower than usual (0.42 vs. avg 0.55); consider vault ingestion"]
}
```

### 4.2 Post-Run Analysis Report

**Generated After Each Run**:

```json
{
  "run_id": "abc123",
  "summary": {
    "goal": "Build API for user management",
    "duration_ms": 245000,
    "status": "SUCCESS",
    "tokens_used": 67500
  },
  "retrieval_metrics": {
    "queries_issued": 18,
    "avg_precision_at_10": 0.81,
    "cache_hit_rate": 0.56,
    "avg_latency_ms": 420,
    "stale_doc_rate": 0.12
  },
  "decomposition_metrics": {
    "nodes": 14,
    "depth": 3,
    "cache_reuse": 3,
    "strategy_selected": "software",
    "strategy_confidence": 0.92
  },
  "consistency_metrics": {
    "type_violations": 0,
    "import_errors": 0,
    "schema_mismatches": 0,
    "repair_iterations": 1
  },
  "context_continuity": {
    "prior_run_linked": true,
    "prior_run_id": "xyz789",
    "context_packets_reused": 2,
    "new_context_learned": 5
  },
  "gaps_detected": [],
  "recommendations": [
    "p99 latency elevated; consider vault optimization",
    "Cache hit rate improving; 5 new context packets learned"
  ]
}
```

---

## 5. Threshold & Alert Policy

### 5.1 Alert Severity Levels

| Level        | Condition                                                   | Action                                              |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------- |
| **CRITICAL** | Retrieval returns 0 results; DAG circular; Type error       | Halt execution, human review                        |
| **HIGH**     | Precision <0.30; Consistency violation; Unresolved citation | Continue but flag in report; review before next run |
| **MEDIUM**   | Latency spike; Stale doc >40%; Strategy drift >0.20         | Log, monitor trend, suggest optimization            |
| **LOW**      | Cache miss; Minor vocabulary drift; Coverage >80%           | Log only, no action required                        |

### 5.2 Rolling Window Aggregation

**Daily Aggregate** (24-hour rolling window):

- Count by severity and category
- Flag if:
  - CRITICAL > 0
  - HIGH > 5
  - Trend (yesterday's total × 1.5)

**Weekly Aggregate** (7-day rolling window):

- Track baseline metrics for comparison
- Flag deviations >10% from rolling average
- Identify patterns (e.g., Friday latency spikes)

---

## 6. Evaluation Checklist for New Features

When adding features to Shad, verify:

- [ ] **Retrieval**: Precision/recall/latency measured for new retrieval strategy?
- [ ] **Decomposition**: DAG structure validated; no circular deps introduced?
- [ ] **Consistency**: Verification layer handles new output type?
- [ ] **Sessions**: Cross-session reuse tested; isolation verified?
- [ ] **Gaps**: Coverage scan includes new vault sources?
- [ ] **Regression**: Prior baseline metrics still met?

---

## References

- **SPEC.md**: Architecture, decision log, metrics payload structure
- **PLAN.md**: Implementation phases, verification layer details
- **Verification Layer (SPEC.md §2.3)**: Syntax, type, import, schema checks
- **History artifacts**: `metrics/summary.json`, `dag.json`, `events.jsonl`
