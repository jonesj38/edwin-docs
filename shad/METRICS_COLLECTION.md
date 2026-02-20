# Shad Metrics Collection: Implementation Guide

**Purpose**: Operationalize the evaluation framework by providing code instrumentation patterns, data schemas, and collection procedures.

---

## 1. Instrumentation Architecture

### 1.1 Collection Points

```
Shad Execution Flow:
   └─ run.manifest.json (input config)
      └─ [RLM Engine Start]
         │
         ├─ decomposition()
         │  └─ log: decisions/decomposition.json + metrics
         │
         ├─ for each node in dag:
         │  │
         │  ├─ retrieval_layer.search()
         │  │  └─ log: retrieval_metrics.jsonl (per-query)
         │  │
         │  ├─ code_executor.execute()
         │  │  └─ log: execution_metrics.jsonl
         │  │
         │  └─ verification_layer.verify()
         │     └─ log: verification_results.jsonl
         │
         └─ synthesis()
            └─ log: synthesis_metrics.json + final.report.md

      └─ [RLM Engine End]
         └─ metrics/summary.json (aggregated)
```

### 1.2 Log Destinations

All metrics stored in `History/Runs/<run_id>/`:

```
History/Runs/<run_id>/
├── run.manifest.json              # Input config (existing)
├── events.jsonl                    # Node lifecycle (existing)
├── dag.json                        # Execution DAG (existing)
├── metrics/
│  ├── summary.json                # Aggregated metrics (enhanced)
│  ├── retrieval_metrics.jsonl      # Per-query retrieval (NEW)
│  ├── decomposition_metrics.json   # Decomposition analysis (NEW)
│  ├── consistency_metrics.jsonl    # Verification results (NEW)
│  ├── latency_profile.json         # Percentile breakdown (NEW)
│  └── context_continuity.json      # Session linkage (NEW)
├── decisions/
│  ├── decomposition.json           # (existing)
│  └── strategy_selection.json      # (NEW) confidence scores
└── analysis/
   ├── gap_report.json              # Context gap detection (NEW)
   └── coherence_scores.json        # Semantic analysis (NEW)
```

---

## 2. Retrieval Metrics Collection

### 2.1 Per-Query Logging

**When**: RetrievalLayer.search() completes

**Schema** (`metrics/retrieval_metrics.jsonl`):

```json
{
  "timestamp": "2026-02-05T14:23:15.432Z",
  "run_id": "abc123",
  "node_id": "node_7",
  "query": "How do we handle user authentication in this codebase?",
  "retrieval_backend": "hybrid",
  "search_mode": "hybrid",
  "num_results": 8,
  "num_relevant": 6,
  "latency_ms": 385,
  "cache_hit": false,
  "cache_key_valid": true,
  "results": [
    {
      "rank": 1,
      "doc_id": "auth/oauth.md",
      "vault_id": "project",
      "score": 0.94,
      "relevance": "relevant",
      "timestamp_retrieved": "2026-02-05T14:23:15Z",
      "doc_modified_at": "2026-01-15T08:00:00Z",
      "doc_age_days": 21,
      "is_stale": false
    },
    {
      "rank": 2,
      "doc_id": "patterns/auth-flow.md",
      "vault_id": "patterns",
      "score": 0.87,
      "relevance": "relevant",
      "timestamp_retrieved": "2026-02-05T14:23:15Z",
      "doc_modified_at": "2025-11-10T08:00:00Z",
      "doc_age_days": 88,
      "is_stale": false
    }
  ],
  "fallback_used": false,
  "fallback_reason": null,
  "embedding_model": "text-embedding-3-small",
  "rerank_model": "claude-haiku-4.5",
  "mismatch_reason": null
}
```

### 2.2 Computation of Metrics from Logs

**Precision@k**:

```python
def compute_precision_at_k(retrieval_logs: List[dict], k: int = 10) -> float:
    relevant_count = sum(
        1 for log in retrieval_logs
        for result in log['results'][:k]
        if result['relevance'] in ('relevant', 'partially relevant')
    )
    total_results = sum(
        min(len(log['results']), k)
        for log in retrieval_logs
    )
    return relevant_count / total_results if total_results > 0 else 0.0
```

**Recall@k**:

```python
def compute_recall_at_k(retrieval_logs: List[dict], k: int = 10) -> float:
    # Requires human-annotated ground truth for each query
    # Load from: analysis/ground_truth.jsonl
    total_relevant = sum(log.get('num_relevant', 0) for log in retrieval_logs)
    retrieved_relevant = sum(
        1 for log in retrieval_logs
        for result in log['results'][:k]
        if result['relevance'] == 'relevant'
    )
    return retrieved_relevant / total_relevant if total_relevant > 0 else 0.0
```

**Mean Reciprocal Rank**:

```python
def compute_mrr(retrieval_logs: List[dict]) -> float:
    reciprocal_ranks = []
    for log in retrieval_logs:
        for idx, result in enumerate(log['results'], 1):
            if result['relevance'] == 'relevant':
                reciprocal_ranks.append(1.0 / idx)
                break  # First relevant only
    return sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0
```

**Stale Rate**:

```python
def compute_stale_rate(retrieval_logs: List[dict], stale_threshold_days: int = 30) -> float:
    stale_count = sum(
        1 for log in retrieval_logs
        for result in log['results']
        if result.get('doc_age_days', 0) > stale_threshold_days
    )
    total_count = sum(
        len(log['results'])
        for log in retrieval_logs
    )
    return stale_count / total_count if total_count > 0 else 0.0
```

**Latency Percentiles**:

```python
import statistics

def compute_latency_percentiles(retrieval_logs: List[dict]) -> dict:
    latencies = [log['latency_ms'] for log in retrieval_logs]
    return {
        'p50': statistics.median(latencies),
        'p95': sorted(latencies)[int(len(latencies) * 0.95)],
        'p99': sorted(latencies)[int(len(latencies) * 0.99)],
        'avg': statistics.mean(latencies),
        'max': max(latencies)
    }
```

---

## 3. Decomposition Metrics Collection

### 3.1 Strategy Selection Logging

**When**: RLM heuristic selects strategy

**Schema** (`decisions/strategy_selection.json`):

```json
{
  "run_id": "abc123",
  "timestamp": "2026-02-05T14:23:10Z",
  "goal": "Build a REST API for user management",
  "heuristic_guess": "software",
  "guess_confidence": 0.89,
  "confidence_calculation": {
    "keyword_matches": {
      "build": 1,
      "api": 1,
      "rest": 1
    },
    "anti_patterns": [],
    "final_score": 0.89
  },
  "strategy_selected": "software",
  "strategy_override": false,
  "override_reason": null
}
```

### 3.2 DAG Analysis Logging

**When**: Decomposition completes

**Schema** (`metrics/decomposition_metrics.json`):

```json
{
  "run_id": "abc123",
  "timestamp": "2026-02-05T14:23:15Z",
  "total_nodes": 14,
  "max_depth": 3,
  "skeleton_used": "software",
  "analysis": {
    "has_cycles": false,
    "cycle_detection_method": "topological_sort",
    "is_acyclic": true,
    "nodes_by_depth": {
      "0": 1,
      "1": 4,
      "2": 7,
      "3": 2
    },
    "critical_path_length": 3,
    "parallelizable_nodes": 8,
    "sequential_nodes": 6,
    "avg_estimated_tokens_per_node": 4200,
    "max_estimated_tokens": 18000,
    "min_estimated_tokens": 600
  },
  "violations": [],
  "warnings": []
}
```

---

## 4. Retrieval Coherence Analysis

### 4.1 Semantic Coherence Scoring

**When**: Retrieval completes (batch process post-run)

**Schema** (`analysis/coherence_scores.json`):

```json
{
  "run_id": "abc123",
  "sample_size": 2,
  "coherence_analysis": [
    {
      "query_index": 0,
      "query": "How do we handle user authentication?",
      "query_embedding": [0.12, 0.45, ...],
      "retrieved_docs": [
        {
          "rank": 1,
          "doc_id": "auth/oauth.md",
          "similarity_to_query": 0.89,
          "semantic_relevance": "directly_answers"
        },
        {
          "rank": 2,
          "doc_id": "patterns/auth-flow.md",
          "similarity_to_query": 0.82,
          "semantic_relevance": "provides_context"
        }
      ],
      "avg_semantic_similarity": 0.855,
      "coverage_assessment": {
        "required_domains": ["auth", "oauth", "tokens"],
        "covered_domains": ["auth", "oauth", "tokens"],
        "coverage_score": 1.0,
        "evaluator": "human"
      },
      "contradiction_check": {
        "contradictions_found": 0,
        "notes": "All sources consistent on OAuth2 flow"
      }
    }
  ],
  "session_coherence": {
    "avg_semantic_similarity": 0.855,
    "avg_coverage_score": 1.0,
    "contradiction_rate": 0.0,
    "overall_coherence_score": 0.92
  }
}
```

### 4.2 Citation Integrity Check

**When**: Synthesis completes

**Schema** (`analysis/citations.json`):

```json
{
  "run_id": "abc123",
  "synthesis_section": "final.report.md",
  "citations_found": 12,
  "citations_resolved": 11,
  "citations_unresolved": 1,
  "integrity_score": 0.917,
  "details": [
    {
      "citation_id": "[cite:1]",
      "context": "OAuth2 is the standard for delegated authentication...",
      "referenced_doc": "auth/oauth.md",
      "doc_exists": true,
      "doc_in_artifacts": true,
      "doc_hash": "abc123def456",
      "status": "resolved"
    },
    {
      "citation_id": "[cite:8]",
      "context": "The refresh token rotation strategy is...",
      "referenced_doc": "auth/refresh-tokens.md",
      "doc_exists": false,
      "doc_in_artifacts": false,
      "suggested_source": "auth/oauth.md (partial coverage)",
      "status": "unresolved"
    }
  ]
}
```

---

## 5. Cross-Session Continuity Metrics

### 5.1 Session Linkage Logging

**When**: Session starts (check for prior context)

**Schema** (`metrics/context_continuity.json`):

```json
{
  "run_id": "abc123",
  "timestamp": "2026-02-05T14:23:10Z",
  "prior_runs": [
    {
      "prior_run_id": "xyz789",
      "prior_goal": "Design API schema",
      "timestamp": "2026-02-04T16:30:00Z",
      "vault_hash": "a1b2c3d4",
      "linked": true,
      "link_reason": "Same vault, related goal",
      "context_packets_available": 5
    }
  ],
  "vault_state": {
    "vault_hash": "a1b2c3d4",
    "source_count": 42,
    "modified_since_prior_run": false,
    "shadow_index_valid": true,
    "shadow_index_drift": 0.0
  },
  "context_reuse": {
    "context_packets_reused": 3,
    "context_packets_new": 2,
    "reused_artifacts": [
      {
        "artifact_id": "schema_v2.json",
        "prior_run_id": "xyz789",
        "reuse_reason": "Type contracts unchanged"
      }
    ]
  }
}
```

### 5.2 Manifest Stability Tracking

**When**: Synthesis completes (for software strategy)

**Schema** (`analysis/manifest_stability.json`):

```json
{
  "run_id": "abc123",
  "prior_run_id": "xyz789",
  "manifest_comparison": {
    "total_files_current": 14,
    "total_files_prior": 14,
    "files_unchanged": 12,
    "files_added": 1,
    "files_modified": 1,
    "files_removed": 0,
    "delta_percentage": 0.071,
    "stability_score": 0.929,
    "files_by_change_type": {
      "src/auth.ts": "modified",
      "src/types.ts": "unchanged",
      "tests/auth.test.ts": "added"
    }
  },
  "hash_comparison": [
    {
      "file": "src/auth.ts",
      "hash_prior": "abc123",
      "hash_current": "def456",
      "change": "modified",
      "diff_summary": "Added JWT validation, 45 lines changed"
    }
  ]
}
```

---

## 6. Failure Mode Detection

### 6.1 Automatic Failure Detection

**Schema** (`errors/failure_log.jsonl`):

```json
{
  "timestamp": "2026-02-05T14:23:15Z",
  "run_id": "abc123",
  "node_id": "node_7",
  "failure_type": "retrieval_empty",
  "severity": "CRITICAL",
  "query": "How do we handle distributed caching?",
  "num_results": 0,
  "attempted_backends": ["hybrid", "bm25", "vector"],
  "fallback_tier_1": {
    "attempted": true,
    "status": "failed",
    "error": "regeneration_lm_error"
  },
  "fallback_tier_2": {
    "attempted": true,
    "status": "failed",
    "error": "no_relevant_keywords"
  },
  "fallback_tier_3": {
    "attempted": true,
    "status": "waiting_for_human",
    "prompt": "No context found for 'distributed caching'. Add to vault?"
  },
  "recovery_status": "escalated_to_human"
}
```

### 6.2 Consistency Violation Detection

**When**: Verification layer runs

**Schema** (`errors/consistency_violations.jsonl`):

```json
{
  "timestamp": "2026-02-05T14:23:20Z",
  "run_id": "abc123",
  "node_id": "node_11",
  "violation_type": "undefined_type",
  "severity": "CRITICAL",
  "file": "src/user.ts",
  "line": 42,
  "code": "const user: User = { id: 1, email: 'test@example.com' };",
  "error_message": "Type 'User' not found in contracts",
  "repair_attempted": true,
  "repair_status": "success",
  "repair_action": "Added User type from contracts node",
  "repair_iterations": 1
}
```

---

## 7. Daily/Weekly Aggregation Jobs

### 7.1 Daily Summary Script

**Run**: Every 24 hours

```python
# scripts/aggregate_daily_metrics.py

import json
from pathlib import Path
from datetime import datetime, timedelta

def aggregate_daily_metrics(history_dir: Path, days_back: int = 1):
    cutoff = datetime.now() - timedelta(days=days_back)

    # Collect all runs
    runs = []
    for run_dir in history_dir.glob('Runs/*'):
        manifest = json.loads((run_dir / 'run.manifest.json').read_text())
        if datetime.fromisoformat(manifest['timestamp']) > cutoff:
            runs.append({
                'run_id': run_dir.name,
                'manifest': manifest,
                'retrieval_metrics': _load_retrieval_logs(run_dir),
                'decomposition_metrics': _load_json(run_dir / 'metrics' / 'decomposition_metrics.json'),
                'coherence': _load_json(run_dir / 'analysis' / 'coherence_scores.json'),
                'failures': _load_failures(run_dir)
            })

    # Aggregate
    daily_report = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'period_days': days_back,
        'runs_analyzed': len(runs),
        'metrics': {
            'retrieval': _aggregate_retrieval(runs),
            'decomposition': _aggregate_decomposition(runs),
            'consistency': _aggregate_consistency(runs),
            'failures': _aggregate_failures(runs)
        },
        'alerts': _generate_alerts(runs)
    }

    return daily_report
```

### 7.2 Alert Thresholds

**Alert Generation**:

```python
def _generate_alerts(runs: List[dict]) -> List[str]:
    alerts = []

    # Retrieval alerts
    retrieval_agg = _aggregate_retrieval(runs)
    if retrieval_agg['avg_precision_at_10'] < 0.60:
        alerts.append("⚠️ ALERT: Retrieval precision <0.60 (indicate vault gaps)")
    if retrieval_agg['p99_latency_ms'] > 5000:
        alerts.append("⚠️ ALERT: p99 latency >5s (check search backend)")

    # Consistency alerts
    consistency_agg = _aggregate_consistency(runs)
    critical_violations = sum(
        1 for run in runs
        for failure in run['failures']
        if failure['severity'] == 'CRITICAL'
    )
    if critical_violations > 0:
        alerts.append(f"🚨 CRITICAL: {critical_violations} critical failures (requires review)")

    # Context alerts
    for run in runs:
        gaps = _detect_context_gaps(run)
        if len(gaps) > 2:
            alerts.append(f"⚠️ Session {run['run_id']}: {len(gaps)} context gaps detected")

    return alerts
```

---

## 8. Human-in-the-Loop Annotation

### 8.1 Relevance Annotation Schema

**File**: `analysis/ground_truth.jsonl`

```json
{
  "session_id": "abc123",
  "query_index": 0,
  "query": "How do we handle user authentication?",
  "evaluator": "jake",
  "timestamp": "2026-02-05T16:00:00Z",
  "relevance_judgments": [
    {
      "doc_id": "auth/oauth.md",
      "rank": 1,
      "relevance": "relevant",
      "confidence": 0.99,
      "notes": "Directly answers the query"
    },
    {
      "doc_id": "patterns/auth-flow.md",
      "rank": 2,
      "relevance": "partially_relevant",
      "confidence": 0.85,
      "notes": "Shows patterns but not our implementation"
    },
    {
      "doc_id": "security/tls.md",
      "rank": 5,
      "relevance": "irrelevant",
      "confidence": 0.95,
      "notes": "About TLS, not auth"
    }
  ]
}
```

---

## 9. Example: Computing Evaluation Report

### 9.1 Post-Run Report Generation

```python
def generate_evaluation_report(run_id: str, history_dir: Path) -> dict:
    run_dir = history_dir / f'Runs/{run_id}'

    # Load all metrics
    retrieval_logs = _load_json(run_dir / 'metrics' / 'retrieval_metrics.jsonl', multiline=True)
    coherence = _load_json(run_dir / 'analysis' / 'coherence_scores.json')
    decomposition = _load_json(run_dir / 'metrics' / 'decomposition_metrics.json')
    context_continuity = _load_json(run_dir / 'metrics' / 'context_continuity.json')
    failures = _load_failures(run_dir)

    # Compute derived metrics
    report = {
        'run_id': run_id,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'execution': {
            'status': 'SUCCESS',
            'duration_ms': ...,
            'tokens_used': ...
        },
        'retrieval': {
            'precision_at_10': compute_precision_at_k(retrieval_logs, 10),
            'recall_at_10': compute_recall_at_k(retrieval_logs, 10),
            'mrr': compute_mrr(retrieval_logs),
            'ndcg_at_10': compute_ndcg(retrieval_logs, 10),
            'stale_rate': compute_stale_rate(retrieval_logs),
            'latency_percentiles': compute_latency_percentiles(retrieval_logs),
            'cache_hit_rate': sum(1 for log in retrieval_logs if log['cache_hit']) / len(retrieval_logs)
        },
        'coherence': {
            'avg_semantic_similarity': coherence['session_coherence']['avg_semantic_similarity'],
            'coverage_score': coherence['session_coherence']['avg_coverage_score'],
            'contradiction_rate': coherence['session_coherence']['contradiction_rate'],
            'citation_integrity': ...,
            'overall_score': coherence['session_coherence'].get('overall_coherence_score', 0)
        },
        'decomposition': {
            'nodes_executed': decomposition['total_nodes'],
            'max_depth': decomposition['max_depth'],
            'strategy_confidence': ...,
            'parallelization_opportunity': decomposition['analysis']['parallelizable_nodes'] / decomposition['total_nodes']
        },
        'continuity': {
            'context_packets_reused': context_continuity['context_reuse']['context_packets_reused'],
            'prior_run_linked': len(context_continuity['prior_runs']) > 0,
            'manifest_stability': ...,
            'session_isolation_score': ...
        },
        'failures': {
            'critical_count': sum(1 for f in failures if f['severity'] == 'CRITICAL'),
            'high_count': sum(1 for f in failures if f['severity'] == 'HIGH'),
            'details': failures
        },
        'overall_health': 'HEALTHY'  # or DEGRADED, CRITICAL
    }

    return report
```

---

## 10. Integration Points

### 10.1 Instrument `src/` (Edwin codebase)

```typescript
// src/memory/shad-metrics.ts
export class ShadMetricsCollector {
  async logRetrieval(query: string, results: any[], latencyMs: number) {
    // Write to metrics/retrieval_metrics.jsonl
  }

  async logDecomposition(dag: DAG, strategy: string) {
    // Write to metrics/decomposition_metrics.json
  }

  async logFailure(error: Error, severity: "CRITICAL" | "HIGH" | "MEDIUM") {
    // Write to errors/failure_log.jsonl
  }
}
```

### 10.2 Shad API Integration

```python
# services/shad-api/shad/metrics/collector.py
class MetricsCollector:
    def log_retrieval_query(self, query, results, latency_ms):
        """Called by RetrievalLayer"""
        pass

    def log_decomposition(self, dag, strategy, confidence):
        """Called by RLM Engine"""
        pass

    def generate_report(self) -> EvaluationReport:
        """Aggregate all metrics into single report"""
        pass
```

---

## References

- **EVALUATION_FRAMEWORK.md**: Metric definitions and thresholds
- **SPEC.md**: History artifacts, verification layer
- **Shad API**: `/v1/run`, `/v1/status` endpoints (extend for metrics)
