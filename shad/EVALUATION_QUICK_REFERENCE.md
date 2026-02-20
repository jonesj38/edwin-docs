# Shad Evaluation Quick Reference

**TL;DR**: How to measure if Shad's continuous context vision is working.

---

## The Three Evaluation Domains

### 1️⃣ Working Memory (Per-Session)

**Q: Is Shad retrieving the right context?**

| Metric           | What to Check                             | Good             | Bad   |
| ---------------- | ----------------------------------------- | ---------------- | ----- |
| **Precision@10** | Of top 10 results, how many are relevant? | ≥80%             | <60%  |
| **Latency p99**  | 99th percentile retrieval time            | <2s              | >5s   |
| **Stale Rate**   | % of results >30 days old                 | ≤15%             | >40%  |
| **Coherence**    | Do results form coherent answer to query? | ≥0.85 similarity | <0.60 |

**How to Check**:

```bash
# After a run, check metrics
cat ~/.shad/history/Runs/<run_id>/metrics/retrieval_metrics.jsonl | \
  jq '.[] | {query, num_results, latency_ms, precision}'

# For human eval (10% of queries)
cat ~/.shad/history/Runs/<run_id>/analysis/coherence_scores.json | \
  jq '.session_coherence'
```

---

### 2️⃣ Cross-Session Continuity (Between Sessions)

**Q: Does Shad remember and reuse prior decisions?**

| Metric                   | What to Check                          | Good            | Bad  |
| ------------------------ | -------------------------------------- | --------------- | ---- |
| **Context Reuse**        | # context packets from prior runs      | ≥2 per session  | 0    |
| **Manifest Stability**   | File changes between runs              | ≤5% delta       | >20% |
| **Decision Consistency** | Does decomposition tree match prior?   | ≥95% similarity | <70% |
| **Session Isolation**    | Does context from other tasks leak in? | ≤10% overlap    | >40% |

**How to Check**:

```bash
# Check context reuse
cat ~/.shad/history/Runs/<run_id>/metrics/context_continuity.json | \
  jq '.context_reuse'

# Check manifest stability (compare two runs)
diff -u \
  ~/.shad/history/Runs/<old_run_id>/artifacts/manifest.json \
  ~/.shad/history/Runs/<new_run_id>/artifacts/manifest.json | \
  grep '^[+-]' | wc -l  # Should be small

# Check session isolation
cat ~/.shad/history/Runs/<run_id>/metrics/context_continuity.json | \
  jq '.vault_state.source_overlap'
```

---

### 3️⃣ Failure Modes (Issues Found)

**Q: When and how does Shad break?**

| Failure Mode            | Detection                             | Action                            |
| ----------------------- | ------------------------------------- | --------------------------------- |
| **Empty Results**       | retrieval returns 0 docs              | Review vault gaps; add sources    |
| **Type Errors**         | Verification finds undefined types    | Check contracts node completeness |
| **Stale Context**       | cache_hit=true but content changed    | Clear cache, re-ingest vault      |
| **Circular Dependency** | DAG not acyclic                       | Review decomposition logic        |
| **Citation Unresolved** | Synthesis claims unsupported by vault | Add missing source                |

**How to Check**:

```bash
# List all failures in a run
cat ~/.shad/history/Runs/<run_id>/errors/failure_log.jsonl | \
  jq '.[] | select(.severity == "CRITICAL")'

# Count by type
cat ~/.shad/history/Runs/<run_id>/errors/failure_log.jsonl | \
  jq '.failure_type' | sort | uniq -c

# Check for unresolved citations
cat ~/.shad/history/Runs/<run_id>/analysis/citations.json | \
  jq '.citations_unresolved'
```

---

## Quick Health Check (5 min)

Run after each session:

```bash
#!/bin/bash
RUN_ID=$1

echo "=== RETRIEVAL HEALTH ==="
jq '.[] | {latency_ms, cache_hit, num_results}' \
  ~/.shad/history/Runs/$RUN_ID/metrics/retrieval_metrics.jsonl | \
  jq -s '{
    avg_latency: (map(.latency_ms) | add / length),
    cache_hit_rate: (map(.cache_hit) | map(select(.) | 1) | length / length),
    empty_results: (map(select(.num_results == 0)) | length)
  }'

echo -e "\n=== CONSISTENCY HEALTH ==="
jq '.violations | length' ~/.shad/history/Runs/$RUN_ID/metrics/decomposition_metrics.json

echo -e "\n=== FAILURES ==="
jq '.severity' ~/.shad/history/Runs/$RUN_ID/errors/failure_log.jsonl | sort | uniq -c

echo -e "\n=== CONTINUITY ==="
jq '{
  context_reused: .context_reuse.context_packets_reused,
  prior_linked: (.prior_runs | length > 0)
}' ~/.shad/history/Runs/$RUN_ID/metrics/context_continuity.json
```

---

## Metric Baseline Reference

| Metric               | Baseline | Warning | Critical |
| -------------------- | -------- | ------- | -------- |
| Precision@10         | 0.82     | <0.72   | <0.60    |
| p99 Latency          | 1.2s     | >2.5s   | >5s      |
| Stale Rate           | 0.10     | >0.25   | >0.40    |
| Cache Hit Rate       | 0.55     | <0.40   | <0.20    |
| Type Violations      | 0        | >2      | >5       |
| Unresolved Citations | 0        | >1      | >3       |
| Manifest Delta       | 0.03     | >0.10   | >0.20    |
| Session Isolation    | 0.05     | >0.15   | >0.40    |

**How to Use**:

- Green (baseline): System operating normally
- Yellow (warning): Monitor trend, investigate if consistent
- Red (critical): Halt, human review required

---

## Daily Monitoring Checklist

```
□ Run post-session health check ↑
  └─ Compare to baseline; note any warnings

□ Check failure log for CRITICAL
  └─ If any: investigate + add to run report

□ Verify cache validity
  └─ Run: shad run --cache-validate

□ Audit vault sync (weekly)
  └─ Run: shad sources status
  └─ Check shadow_index_drift < 0.05

□ Review stale docs (weekly)
  └─ Count docs >30 days old
  └─ Plan refresh or archive

□ Check citations in synthesis (per run)
  └─ jq '.citations_unresolved' analysis/citations.json
  └─ Should be 0; if >0, add sources
```

---

## Interpreting Common Findings

### "Precision is 0.65 — why?"

**Likely causes**:

1. **Vault gap**: Query topic missing from vault
   - Check: `shad search "<topic>" -l 10`
   - If empty: add sources with `shad sources add <url>`

2. **Poor query formulation**: Node asks vague question
   - Check: retrieval_metrics.jsonl for query text
   - Suggest: more specific query hints in decomposition

3. **Search backend mismatch**: Query needs vector search, system used BM25
   - Check: retrieval_metrics.jsonl `search_mode` field
   - Try: `shad run --retriever hybrid` (default)

### "Context packets not reusing"

**Likely causes**:

1. **Vault changed**: Source content modified → context invalid
   - Check: context_continuity.json `vault_hash`
   - Fix: run `shad sources sync` to update index

2. **Task too different**: New task unrelated to prior context
   - This is OK; check if soft_deps appropriately ignored

3. **Prior run had low quality**: Context packet summary poor
   - Check: prior run's synthesis quality
   - Consider: manual context packet curation

### "Type errors in generated code"

**Likely causes**:

1. **Contracts node incomplete**: Missing field definitions
   - Check: decomposition decisions for contracts-first node
   - Ensure it runs before implementation nodes

2. **Merge conflict**: Code generator produced bad syntax
   - Check: repair iterations in consistency_violations.jsonl
   - If repair failed: may need manual merge

3. **Import error**: Type defined but not exported
   - Check: verification_results.jsonl for import errors
   - Verify: export_index in first pass of generation

---

## Tuning Shad for Your Context

### If Precision is Low (<0.70)

1. **Check vault content**:

   ```bash
   shad search "your topic" -v ~/vault -l 5
   # Check results quality
   ```

2. **Add high-quality sources**:

   ```bash
   shad sources add https://official-docs.com/api
   shad sources add ~/my-patterns  # Local directory
   ```

3. **Use Code Mode for complex queries**:
   - Strategy hint: enable `code_mode: true` in run config
   - LLM generates custom retrieval scripts

### If Latency is High (>2s p99)

1. **Check vault size**:

   ```bash
   shad sources status
   # Check "total_documents" and "index_size_mb"
   ```

2. **Switch retriever** (if available):

   ```bash
   shad run "goal" --retriever bm25  # Faster, less accurate
   shad run "goal" --retriever hybrid --max-parallel 4
   ```

3. **Enable caching**:
   ```bash
   shad server start  # Starts Redis
   # Subsequent runs reuse cache
   ```

### If Manifest Keeps Changing

1. **Lock schema early**:
   - Ensure contracts-first node produces stable output
   - Check: are types, fields consistent across runs?

2. **Reduce decomposition variability**:
   - Use explicit `--strategy software` (vs. heuristic)
   - Disable LLM-driven splits: `--strategy-lock`

3. **Review synthesis logic**:
   - Are optional nodes producing unnecessary changes?
   - Consider: `--verify strict` to gate unstable output

---

## When to Escalate to Human Review

| Condition                   | Action                                          |
| --------------------------- | ----------------------------------------------- |
| **CRITICAL failure**        | Review run_report, add context, retry           |
| **Precision <0.50**         | Audit vault; consider domain expertise needed   |
| **Manifest delta >0.20**    | Code generation unstable; review contracts node |
| **Unresolved citations >3** | Missing vault sources; plan ingestion           |
| **Type violations >5**      | Verification too strict or contracts too loose  |
| **Latency p99 >5s**         | Investigate search backend; scale Redis         |
| **Circular dependency**     | Decomposition logic error; report as bug        |

---

## One-Liners for Common Tasks

```bash
# Compare two runs
diff \
  <(jq -s sort ~/.shad/history/Runs/run1/metrics/retrieval_metrics.jsonl | jq '.[] | .query') \
  <(jq -s sort ~/.shad/history/Runs/run2/metrics/retrieval_metrics.jsonl | jq '.[] | .query')

# Get all failures from past 24h
find ~/.shad/history/Runs -mtime -1 -name 'failure_log.jsonl' -exec cat {} \; | jq '.failure_type' | sort | uniq -c

# Audit citation integrity across runs
for run in ~/.shad/history/Runs/*/; do
  unresolved=$(jq '.citations_unresolved' $run/analysis/citations.json)
  if [ $unresolved -gt 0 ]; then
    echo "Run $(basename $run): $unresolved unresolved citations"
  fi
done

# Monitor retrieval backend performance
jq -s 'group_by(.retrieval_backend) | map({backend: .[0].retrieval_backend, avg_latency: (map(.latency_ms) | add / length)})' \
  ~/.shad/history/Runs/latest/metrics/retrieval_metrics.jsonl

# Export daily metrics
jq -s '{
  date: now | todate,
  precision_avg: map(.precision) | add / length,
  latency_p99: sort_by(.latency_ms)[-1].latency_ms,
  stale_rate: (map(select(.is_stale) | 1) | length) / length
}' ~/.shad/history/Runs/*/metrics/retrieval_metrics.jsonl
```

---

## Further Reading

- **EVALUATION_FRAMEWORK.md**: Full metric definitions and thresholds
- **METRICS_COLLECTION.md**: Implementation guide, log schemas
- **Shad SPEC.md**: Architecture, decision rationale
- **Shad README.md**: Quick start, examples

---

**Last Updated**: 2026-02-05
**Author**: Edwin (CTO)
**Status**: Operational
