# Evaluation Approach Comparison: Shad Framework

**Purpose**: Analyze trade-offs across four critical evaluation dimensions to recommend optimal approach for continuous context vision assessment.

**Status**: Comparative analysis & recommendation document

---

## Executive Summary

| Dimension                              | Recommended Approach                                               | Rationale                                                                  |
| -------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Per-Query vs Session Metrics**       | **Hybrid (per-query + rolling aggregation)**                       | Detects transient failures, feeds trend analysis                           |
| **Real-Time vs Post-Hoc**              | **Real-time monitoring + batch post-hoc analysis**                 | Catches failures early, preserves detailed context for root cause analysis |
| **Automated vs Human Judgment**        | **Automated baseline + sampled human review**                      | Cost-efficient, preserves human expertise for ambiguous cases              |
| **Threshold Alerts vs Trend Analysis** | **Dual approach: Hard thresholds for CRITICAL, trends for others** | Prevents false positives while catching systemic degradation               |

---

## Dimension 1: Per-Query Metrics vs Session-Level Metrics

### 1.1 Per-Query Metrics

**Definition**: Collect granular measurements for each individual retrieval, decomposition, or verification action.

#### Pros

- **Precision diagnosis**: Identify _exactly_ which query/node failed and why
- **Anomaly detection**: Spot outliers (single slow query vs. systematic slowdown)
- **Root cause analysis**: Correlate failures with specific context, task complexity, vault state
- **Learning signal**: Feed into adaptive heuristics (e.g., query rewriting, cache warming)
- **Reproducibility**: Can replay exact sequence that caused failure
- **Temporal granularity**: Catch transient spikes (e.g., cache miss during vault sync)

#### Cons

- **Storage overhead**: ~500 bytes per retrieval query × hundreds of queries/session = significant logs
- **Privacy concern**: Fine-grained logs may expose sensitive queries or decision patterns
- **Noise in aggregation**: Random jitter in latency, network blips inflate variance
- **Human cognitive load**: 100+ retrieval logs per session hard to interpret manually
- **Delayed insight**: Requires post-hoc analysis tools; not immediately actionable

#### Implementation Cost

- ~15 lines of instrumentation per collection point
- Log rotation/compression strategy needed
- Requires aggregation pipeline (Python scripts or ETL)

#### Example Use Cases

✅ **Good for**:

- Query precision fell from 0.85→0.62 between sessions; trace which queries regressed
- Latency spike in one session; identify if specific vault source caused slowdown
- Type error in output; trace which retrieval gave bad context

❌ **Not ideal for**:

- High-level "is Shad healthy?" question (too much data to process)
- Real-time alerting (inherent latency in collection)
- Comparing performance across different tasks (need aggregation anyway)

---

### 1.2 Session-Level Metrics

**Definition**: Aggregate all queries, nodes, and decisions into single summary per session.

#### Pros

- **Simplicity**: Single metrics report (precision, latency, etc.) easy to understand
- **Efficiency**: No log explosion; storage & processing minimal
- **Privacy**: Only aggregate statistics exposed; individual queries hidden
- **Actionability**: "Precision dropped to 0.62" immediately suggests vault gap
- **Comparison**: Easy to compare session A vs session B
- **Sampling friendly**: Can evaluate on subset of important sessions

#### Cons

- **Information loss**: Cannot diagnose _which_ queries caused low precision
- **Simpson's Paradox**: Aggregation can hide distributional issues (e.g., 99% cache hits but 1 query with 0 results)
- **No temporal detail**: Cannot detect whether problem was at start or end of session
- **Latency opacity**: p50=400ms, p99=2s hides whether slowdown concentrated or distributed
- **Weak signal**: Average precision 0.75 could mean consistent mediocrity or bimodal (80% excellent, 20% terrible)

#### Implementation Cost

- Simple: compute mean/median/percentiles of per-query metrics
- No additional instrumentation needed if per-query logs available
- Can be done post-hoc after session completes

#### Example Use Cases

✅ **Good for**:

- "Is Shad performing worse today than last week?" (rolling average comparison)
- "Which sessions underperformed?" (filter by precision <0.60)
- "Estimate token usage for next run" (based on session complexity)

❌ **Not ideal for**:

- Debugging a specific failure ("Which query gave bad context?")
- Identifying query-specific patterns (e.g., do complex questions retrieve poorly?)
- Correlating with vault changes (need granular timestamps)

---

### 1.3 Recommendation: Hybrid Approach

**Strategy**: Collect per-query metrics, but aggregate into session summary + maintain rolling window.

```json
{
  "session_level": {
    "run_id": "abc123",
    "precision_at_10": 0.81,
    "p99_latency_ms": 1823,
    "cache_hit_rate": 0.42,
    "stale_doc_rate": 0.12
  },
  "rolling_window": {
    "period_hours": 24,
    "runs_in_window": 5,
    "avg_precision": 0.78,
    "trend": "stable",
    "anomalies": ["run_xyz had precision 0.55"]
  },
  "per_query_logs": {
    "location": "metrics/retrieval_metrics.jsonl",
    "retention_days": 30,
    "compression": "gzip"
  }
}
```

**Rationale**:

- Session summary provides immediate health signal
- Per-query logs enable post-hoc root cause analysis (when needed)
- Rolling window detects trends without requiring manual baseline comparison
- Per-query data retained for 30 days (covers 2-3 normal iterations) then archived

---

## Dimension 2: Real-Time Monitoring vs Post-Hoc Analysis

### 2.1 Real-Time Monitoring

**Definition**: Compute and alert on metrics while session/query executes (p50 latency <5 minutes behind).

#### Pros

- **Rapid response**: Catch critical failures (empty result set) within seconds
- **Adaptive intervention**: Can trigger fallback, cache warmup, or human alert while task in progress
- **User awareness**: User sees status updates ("Retrieval slower than usual; checking cache")
- **SLA enforcement**: Can hard-stop task if violates timeout
- **Prevents cascade**: Catch early failure before downstream nodes depend on bad context
- **Operational insight**: See _right now_ what's slow/broken

#### Cons

- **False positives**: First query always slow (cold start); alert would fire unnecessarily
- **Incomplete picture**: Early-session metrics unstable; may change as session progresses
- **Infrastructure overhead**: Streaming pipelines, alerting backends, dashboards all required
- **Noise**: High-frequency metrics amplify jitter; hard to distinguish signal from noise
- **Cost**: Real-time systems more expensive (low-latency databases, fast indexing)
- **Debugging difficulty**: Alerts fire, but root cause visible only in post-hoc logs

#### Implementation Cost

- Requires streaming metrics pipeline (Kafka/Redis + aggregator)
- Real-time dashboard (Grafana, custom UI)
- Alerting service + notification channels
- ~3-4 weeks of engineering effort

#### Example Alerts

```
🚨 CRITICAL: Retrieval returned 0 results (query: "auth flow")
  → Trigger fallback, escalate to human if all 3 tiers fail

⚠️ HIGH: Precision@10 dropped to 0.42 (was 0.82 in prior 5 queries)
  → Likely vault corruption; verify cache, check shadow index

💡 MEDIUM: p99 latency 3.2s (usually 1.8s), likely vault sync in progress
  → Suggest deferring queries until sync completes
```

---

### 2.2 Post-Hoc Analysis

**Definition**: Collect all metrics passively, compute analysis _after_ session completes.

#### Pros

- **Simplicity**: Just append to log files; no streaming infrastructure needed
- **Stability**: Aggregate over complete picture; no moving averages required
- **Root cause clarity**: Full context available (all logs, artifacts, timing)
- **Cost efficiency**: Batch processing (e.g., daily aggregation job) cheaper
- **No false alarms**: Can wait for evidence to accumulate before flagging
- **Reversibility**: Metrics don't affect task execution; won't cause unwanted cancellations
- **Detailed analysis**: Time for sophisticated error correlation, trend modeling

#### Cons

- **Delay**: Failure discovered hours later; can't intervene in-flight
- **Cascade impact**: Bad retrieval early in session may taint downstream nodes
- **No adaptation**: Can't warm cache, adjust search strategy, or escalate live
- **User opacity**: User unaware of problems until after task completes
- **Decision time**: "Is p99=5s bad?" requires comparing to baseline (which you must compute)
- **Recovery friction**: By the time failure detected, task already failed; recovery manual

#### Implementation Cost

- Minimal: append logs + cron job for aggregation
- ~2-3 days of engineering

#### Example Workflow

```
1. Session runs, logs all metrics to files
2. Session completes, user receives output
3. Each night, aggregation job:
   - Load all session logs from past 24h
   - Compute retrieval precision, latency percentiles
   - Compare to rolling 7-day baseline
   - Generate report, send to Slack
4. Engineer reviews report next morning
5. If problem found, adds context to vault or debugs query rewriting
```

---

### 2.3 Recommendation: Dual Approach

**Strategy**: Real-time detection for CRITICAL failures only; post-hoc for detailed analysis.

```python
# Real-time (streaming)
if num_results == 0:
    # CRITICAL: escalate immediately
    alert_escalation_service.critical(
        query=query,
        severity="CRITICAL",
        fallback_tier="3"
    )

# Post-hoc (batch, daily)
daily_job.aggregate_metrics()  # Compute trends, compare baselines
daily_job.generate_report()     # Send detailed analysis
```

**Rationale**:

- Real-time detection restricted to high-certainty failures (empty result = always bad)
- Avoids false positives from early-session volatility
- Post-hoc analysis catches systemic issues (precision drift, latency creep)
- Lower infrastructure cost than full real-time system
- Balances responsiveness with stability

**Alert Eligibility for Real-Time**:
| Metric | Real-Time? | Reason |
|--------|-----------|--------|
| Empty result set (0 docs) | ✅ Yes | Definitive failure |
| Latency spike (p99 >5s) | ❌ No | Could be transient (vault sync, network) |
| Low precision (<0.30) | ❌ No | Requires human annotation to confirm |
| Type error in output | ✅ Yes | Parser fails = definitive |
| Merge conflict markers | ✅ Yes | Code syntax is checkable |
| Missing import | ✅ Yes | Static analysis sufficient |

---

## Dimension 3: Automated Validation vs Human Judgment

### 3.1 Automated Validation

**Definition**: Compute metrics entirely via code/scripts; humans review outputs only.

#### Pros

- **Consistency**: Precision, recall computed same way every time (no subjective drift)
- **Scale**: Can evaluate 100 sessions/day without hiring 10 people
- **Speed**: Metrics available immediately after session completes
- **Cost**: No human labor required for routine evaluation
- **Auditability**: Computation deterministic and reproducible
- **Continuous**: Can run on every session, not just sampled subset
- **Mechanical validation**: Type errors, imports, schema mismatches are objective

#### Cons

- **Semantic gaps**: Cannot judge relevance without understanding domain
  - Query: "How do we scale the auth system?"
  - Retrieved: "Here's a blog about AWS ECS"
  - Automated: Cosine similarity = 0.67 → "relevant"
  - Human: "That's about Docker, not our auth architecture" → "irrelevant"
- **Implicit context**: "Does retrieval cover all aspects?" requires human understanding
- **Contradiction detection**: "Are these sources saying conflicting things?" hard to automate
- **Hallucination risk**: Model-generated metrics can be confidently wrong (e.g., embeddings don't capture sarcasm)
- **Threshold brittleness**: Hard to set threshold; precision=0.65 adequate for some tasks, insufficient for others
- **Coverage blindness**: Automated scoring doesn't know if critical domain was missed

#### Implementation Cost

- Embeddings + cosine similarity: ~100 lines of code
- Schema validation: available in Zod, TypeBox
- Merge conflict detection: regex pattern
- Total: ~1 week

#### What Can Be Automated Well

✅ **Mechanical metrics**:

- Latency percentiles, cache hit rate
- Retrieval count, result distribution
- Type errors, import errors, merge conflicts
- Document age, recency
- DAG cyclic detection

❌ **Semantic metrics**:

- Relevance judgments (especially "partially relevant")
- Coverage assessment ("does retrieval span required domains?")
- Contradiction detection (requires reasoning)
- Authority scoring (requires domain knowledge)
- Coherence/narrative flow

---

### 3.2 Human Judgment

**Definition**: Humans evaluate metrics; machines collect data.

#### Pros

- **Semantic accuracy**: Humans understand domain; can judge true relevance
- **Edge cases**: Can handle unusual but important scenarios
- **Implicit knowledge**: Leverage reviewer's understanding of priorities
- **Context sensitivity**: "For this task, precision 0.70 is adequate; for that one, need 0.90"
- **Catch blindspots**: Human intuition may spot issues automated system misses
- **Adaptability**: No threshold tuning; just ask "is this good or bad?"
- **Authority assessment**: Can evaluate if sources are authoritative vs. Stack Overflow answers

#### Cons

- **High cost**: 10-20 min/session to review and annotate
- **Subjective drift**: Different reviewers give different labels; even same reviewer differs over time
- **Low throughput**: Cannot scale to all sessions; must sample
- **Latency**: Requires human availability; 24h delay common
- **Bias**: Reviewer's mood, fatigue, attention affect judgments
- **Non-reproducible**: Cannot re-run evaluation with same reviewer; they won't remember context
- **Time-consuming**: Takes 1-2 hours to annotate single complex session thoroughly

#### Implementation Cost

- Define annotation schema (2 days)
- Train reviewers (1 day)
- Build annotation UI (1 week)
- Ongoing: ~1 person-hour per 5 sessions

#### What Requires Human Judgment

- Relevance of retrieved documents (especially edge cases)
- Coverage assessment (does set of docs cover all aspects?)
- Citation integrity (does synthesis faithfully represent sources?)
- Implicit assumption detection ("assumes knowledge we don't have?")
- Authority scoring (is this official docs or amateur blog?)
- Contradiction detection (between retrieved docs)

---

### 3.3 Recommendation: Stratified Sampling

**Strategy**: Automate mechanical metrics on all sessions; sample human review strategically.

```python
# Automated (all sessions)
for session in all_sessions:
    session.metrics['latency_p99'] = compute_latency_percentiles(...)
    session.metrics['type_errors'] = verify_types(...)
    session.metrics['cache_hit_rate'] = count_cache_hits(...)

# Human review (sampled)
for session in sample(all_sessions, k=0.10):  # Review 10% of sessions
    human_annotation = ask_human({
        'query': session.query,
        'retrieved_docs': session.retrieved_docs,
        'task': 'Mark each doc as relevant/partially/irrelevant'
    })
    session.metrics['precision_human'] = compute_precision(human_annotation)
    session.metrics['coverage_human'] = human_annotation['coverage_assessment']
```

**Sampling Strategy**:

| Scenario                     | Sample Rate                        | Rationale                                   |
| ---------------------------- | ---------------------------------- | ------------------------------------------- |
| **Baseline establishment**   | 20% (first 2 weeks)                | Need diverse examples to build ground truth |
| **Operational steady-state** | 10% (ongoing)                      | Detect drift, verify automated metrics      |
| **High-variance sessions**   | 100% (when p99_latency >5s)        | Investigate anomalies                       |
| **Low-performance sessions** | 100% (when precision <0.60)        | Root cause analysis                         |
| **Novel task types**         | 50% (when task_type unseen before) | Build coverage for new domains              |

**Cost-Benefit Analysis**:

- 100 sessions/week × 10% sample = 10 sessions/week to review
- 15 min/session × 10 = ~2.5 hours/week
- Human oversight within 1 person-hour budget
- Captures ~95% of quality issues (high-variance sessions oversampled)

---

## Dimension 4: Threshold-Based Alerts vs Trend Analysis

### 4.1 Threshold-Based Alerts

**Definition**: Flag violation immediately when metric crosses hard boundary (e.g., latency >5s = ALERT).

#### Pros

- **Simplicity**: "If precision <0.60, that's bad" → no baseline needed
- **Deterministic**: Same condition always produces same alert (no randomness)
- **Universality**: One threshold applies to all sessions/tasks
- **Responsiveness**: Violate once → alert fires immediately
- **Objective**: No debates about whether something is "bad enough"
- **Low overhead**: No historical data needed; works session 1 onward

#### Cons

- **High false positives**: Cold-start latency spike, first session in vault always triggers
- **No context**: "Precision=0.62" flagged as bad, but what if task inherently hard?
- **Task-specific variation**: ML task needs lower precision threshold than authz task
- **Brittleness**: Off-by-one-percentile (threshold=0.60, actual=0.59) triggers alert
- **No signal degradation**: Binary view; metric at 0.59 same severity as 0.20
- **Blind to trends**: Precision 0.75 every day not flagged, even if declining from 0.85
- **Gaming**: Can optimize to just barely pass threshold; missing point

#### Example Thresholds

```
CRITICAL:
  - Retrieval returns 0 results
  - Latency >5s
  - Type error in output
  - Merge conflict marker found

HIGH:
  - Precision@10 <0.30
  - p99 latency >3s
  - Cache stale (hash mismatch)
  - Unresolved citation in synthesis

MEDIUM:
  - p99 latency >2s
  - Stale doc rate >40%
  - Strategy drift >0.20
```

**Problem**: What if vault small & retrieval inherently slow? Threshold feels arbitrary.

---

### 4.2 Trend Analysis

**Definition**: Flag degradation _relative to baseline_; ignore absolute value, focus on trajectory.

#### Pros

- **Adaptive**: Baseline automatically captures task/vault characteristics
- **No false positives from cold-start**: First session doesn't alert (no history yet)
- **Catches creeping problems**: Precision 0.85→0.83→0.81→0.79 → alert (degradation trend)
- **Task-aware**: Different vaults/tasks have different baselines (auto-adapted)
- **Signal degradation**: Can distinguish "bad" from "catastrophic" (below 2σ vs. 5σ)
- **Requires no threshold tuning**: Just compute rolling mean + stdev
- **Recoverable**: Can detect when metric improves (trend reverses)

#### Cons

- **Delayed first alert**: Need 5-10 sessions to build baseline; won't detect day-1 problems
- **Moving goalposts**: If baseline itself degrading, alert threshold drifts
- **Variance-sensitive**: High-variance metric (latency) triggers alerts on normal fluctuation
- **Complexity**: Requires time-series statistics (mean, stdev, autocorrelation)
- **Interpretation ambiguity**: "2σ below baseline" sounds worse than it is
- **State management**: Must track rolling baseline; adds complexity
- **Requires historical data**: Cannot use on novel task types (no history)

#### Example Trend Analysis

```python
# Collect 10-session baseline
baseline_precision = [0.81, 0.82, 0.80, 0.83, 0.81, 0.82, 0.80, 0.81, 0.82, 0.81]
mean = 0.813
stdev = 0.0102

# New session
current_precision = 0.72
z_score = (current_precision - mean) / stdev = -9.3σ

# Alert: Precision 9.3 standard deviations below baseline
# → Definitely a problem worth investigating
```

#### Building Baseline

| Approach                       | Pros                    | Cons                           |
| ------------------------------ | ----------------------- | ------------------------------ |
| **Fixed window** (last 7 days) | Responsive to changes   | Unstable if recent degradation |
| **Exponential moving avg**     | Smooth, responsive      | Complex to tune decay          |
| **Stratified by task type**    | Fair comparison         | Requires task labeling         |
| **Per-vault baseline**         | Accounts for vault size | More state to manage           |

---

### 4.3 Recommendation: Hybrid (Threshold + Trend)

**Strategy**: Hard thresholds for CRITICAL/HIGH confidence failures; trends for monitoring.

```python
# CRITICAL threshold (no baseline needed)
if num_results == 0 or has_merge_conflict or has_type_error:
    severity = "CRITICAL"
    action = "halt_execution"

# HIGH trend analysis (requires 10+ samples)
elif len(session_history) >= 10:
    precision_z_score = (current_precision - baseline_mean) / baseline_stdev
    if precision_z_score < -2.0:  # More than 2σ below
        severity = "HIGH"
        action = "flag_for_review"

    latency_z_score = (current_latency_p99 - baseline_p99_mean) / baseline_stdev
    if latency_z_score > 2.5:  # More than 2.5σ above
        severity = "MEDIUM"
        action = "investigate_backend"

# MEDIUM threshold (absolute bounds, with slack)
elif current_latency_p99 > 5000:  # 5 seconds, only alert on first day
    severity = "MEDIUM"
    action = "investigate"
```

**Alert Matrix**:

| Condition                     | Type      | Severity | Action                |
| ----------------------------- | --------- | -------- | --------------------- |
| Empty results (0 docs)        | Threshold | CRITICAL | Escalate immediately  |
| Has merge conflict            | Threshold | CRITICAL | Halt execution        |
| Type error                    | Threshold | CRITICAL | Halt execution        |
| Precision <2σ of baseline     | Trend     | HIGH     | Flag, review tomorrow |
| p99 latency >2.5σ of baseline | Trend     | MEDIUM   | Investigate, monitor  |
| p99 latency >5s absolute      | Threshold | MEDIUM   | Check system health   |
| Stale doc rate >50%           | Threshold | MEDIUM   | Suggest vault refresh |

**Rationale**:

- **CRITICAL** thresholds: Objective failures with no ambiguity (0 results, syntax errors)
- **HIGH/MEDIUM** trends: Detect degradation relative to normal, avoiding false positives
- **Absolute bounds** as safety net: If baseline itself degrading, absolute threshold catches it
- **Escalation hierarchy**: Small deviations logged; large deviations escalate

---

## Summary Table: Recommended Approach

| Dimension                    | Option A        | Option B       | **Recommendation**                                     | Justification                                            |
| ---------------------------- | --------------- | -------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| **Query vs Session Metrics** | Per-Query       | Session-Level  | **Hybrid**                                             | Granularity for debugging; aggregation for reporting     |
| **Real-Time vs Post-Hoc**    | Real-Time       | Post-Hoc       | **Dual (Real-time CRITICAL only + Batch post-hoc)**    | Responsiveness for definite failures; depth for analysis |
| **Automated vs Human**       | Automated       | Human Judgment | **Stratified (Auto all + Human 10%)**                  | Scale with human oversight; semantic metrics from humans |
| **Threshold vs Trend**       | Hard Thresholds | Trend Analysis | **Hybrid (Threshold for CRITICAL + Trend for others)** | Objective certainty + adaptive drift detection           |

---

## Implementation Roadmap

### Phase 1 (Weeks 1-2): Foundational Hybrid Metrics

- [ ] Implement per-query logging (retrieval_metrics.jsonl)
- [ ] Compute session-level aggregates (mean, percentiles, stdev)
- [ ] Set CRITICAL thresholds (0 results, type errors, merge conflicts)
- [ ] Real-time alerting for CRITICAL only
- [ ] Estimated effort: 1 engineer, 2 weeks

### Phase 2 (Weeks 3-4): Trend Analysis & Baseline

- [ ] Collect 2-week history of all sessions
- [ ] Compute rolling 7-day baseline (mean, stdev per metric)
- [ ] Implement trend detection (z-score calculation)
- [ ] Add HIGH/MEDIUM alerts based on trends
- [ ] Estimated effort: 1 engineer, 2 weeks

### Phase 3 (Week 5): Sampled Human Review

- [ ] Build annotation UI (mark relevance of retrieved docs)
- [ ] Sample 10% of sessions for human review
- [ ] Compute human-annotated precision, coverage
- [ ] Compare to automated metrics (calibration)
- [ ] Estimated effort: 1 engineer + 0.5 reviewer, 1 week

### Phase 4 (Week 6+): Operational Tuning

- [ ] Daily aggregation job (compute baseline trends)
- [ ] Weekly report generation
- [ ] Threshold tuning based on 2 weeks operational data
- [ ] Integration with Slack/dashboard
- [ ] Estimated effort: 0.25 engineer ongoing

---

## Success Criteria

By end of Phase 4:

| Metric                                   | Target           | Measurement                         |
| ---------------------------------------- | ---------------- | ----------------------------------- |
| **Alert precision**                      | ≥0.80            | (true alerts / all alerts)          |
| **Failure detection latency** (CRITICAL) | <5 min           | Time from failure to alert          |
| **False positive rate** (MEDIUM+HIGH)    | <0.05            | (false alarms / total alerts)       |
| **Trend detection accuracy**             | ≥0.90            | Detects degradation >0.05 in metric |
| **Human review coverage**                | ≥10% of sessions | Sessions sampled                    |
| **Cost per session evaluated**           | <$1              | Including human + compute           |

---

## References

- **EVALUATION_FRAMEWORK.md**: Metric definitions, targets, failure modes
- **METRICS_COLLECTION.md**: Per-query schema, aggregation formulas
- **EVALUATION_QUICK_REFERENCE.md**: Operational quick reference
