# Continuous Context Architecture Diagrams

## 1. Data Flow: What Persists Across Sessions

```
Session N-1                              Session N
┌──────────────────┐                ┌──────────────────┐
│  Run Results     │                │   New Task       │
│  ┌────────────┐  │                │                  │
│  │ Outputs    │  │                └────────┬─────────┘
│  │ Traces     │  │                         │
│  │ Metadata   │  │                         │ Query
│  └────────────┘  │                         │
└────────┬─────────┘                         ▼
         │                            ┌────────────────────┐
         │                            │ Context Retrieval  │
         │                            │                    │
         │ Export                     │ • Semantic search  │
         │ & Index                    │ • Scoring          │
         │                            │ • Filtering        │
         ▼                            └────────┬───────────┘
┌────────────────────────┐                    │
│  Persistent Storage    │                    │ Retrieved
│  ┌──────────────────┐  │                    │ Context
│  │ Run History      │  │                    │
│  │ ~/.shad/         │  │                    ▼
│  │ history/         │  │            ┌─────────────────────┐
│  │ ┌──────────────┐ │  │            │  Strategy Refinement│
│  │ │ Summaries    │ │  │            │  & Execution       │
│  │ │ Traces       │ │  │            │                    │
│  │ │ Manifests    │ │  │            │  • Decomposition   │
│  │ │ Metadata     │ │  │            │  • Boost confidence│
│  │ └──────────────┘ │  │            │  • Reuse subtasks │
│  │                  │  │            └─────────────────────┘
│  │ QMD Index        │  │                    │
│  │ (hybrid search)  │  │                    │ Execution
│  └──────────────────┘  │                    │ with context
└────────────────────────┘                    │
                                              ▼
                                     ┌──────────────────┐
                                     │ New Run Results  │
                                     │                  │
                                     │ (Loop continues) │
                                     └──────────────────┘
```

## 2. The 5 Things That Persist

```
What Gets Saved Across Sessions
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. EXECUTION ARTIFACTS                                     │
│     ├─ Generated code / outputs                             │
│     ├─ File manifests (exports, symbols, types)            │
│     └─ Success/failure status                               │
│                                                             │
│  2. REASONING TRACES                                        │
│     ├─ Decomposition trees (why tasks were split)          │
│     ├─ Strategy rationale (why this strategy was chosen)   │
│     ├─ Alternative paths (what was considered, rejected)   │
│     └─ Confidence scores (how sure were we?)               │
│                                                             │
│  3. DOMAIN KNOWLEDGE                                        │
│     ├─ Successful retrieval patterns ("what queries work") │
│     ├─ Vault structure insights                            │
│     ├─ Search latency baselines                            │
│     └─ Collection effectiveness                            │
│                                                             │
│  4. TYPE CONTRACTS & IMPORT GRAPHS                          │
│     ├─ Symbol → Type mappings                              │
│     ├─ Export manifests (what's in which file)            │
│     ├─ Import dependency graph                             │
│     └─ Type consistency rules                              │
│                                                             │
│  5. VERIFICATION & TEST OUTCOMES                            │
│     ├─ Per-subtask: pass/fail rates                        │
│     ├─ Error trends (what errors recur?)                   │
│     ├─ Verification categories (syntax, types, imports)    │
│     └─ Time spent on verification (where's the bottleneck?)│
│                                                             │
└─────────────────────────────────────────────────────────────┘

Storage:  ~/.shad/history/<run_id>/ (JSONL + JSON)
Indexing: QMD (hybrid BM25 + vector) + SQLite FTS
Exports:  Markdown summaries for vault integration
```

## 3. The 4 Integration Points

```
┌─ Flow of Context Through the System ─────────────────────────────┐
│                                                                   │
│  1. CLI INTEGRATION                                               │
│     ┌──────────────────────┐                                      │
│     │  shad run "task"     │                                      │
│     └────────┬─────────────┘                                      │
│              │  +--show-context-sources                           │
│              ▼                                                    │
│     ┌──────────────────────────────────────────┐                 │
│     │ Pre-Run Context Query                    │                 │
│     │ • Retrieve top 3 similar runs             │                 │
│     │ • Display sources + scores                │                 │
│     │ • Inject into strategy skeleton           │                 │
│     └──────────────────────────────────────────┘                 │
│              │                                                   │
│              ▼                                                   │
│  2. RLM ENGINE (AGENT) INTEGRATION                                │
│     ┌──────────────────────────────────────────┐                 │
│     │ During Decomposition                     │                 │
│     │ • Query: "Similar decompositions?"       │                 │
│     │ • Refine strategy skeleton               │                 │
│     │ • Boost confidence (1.2x for known-good) │                 │
│     │ • Deduplicate subtasks (reuse results)   │                 │
│     └──────────────────────────────────────────┘                 │
│              │                                                   │
│              ▼                                                   │
│  3. GATEWAY INTEGRATION                                           │
│     ┌──────────────────────────────────────────┐                 │
│     │ Context Caching & API                    │                 │
│     │ • Shad API: /sessions/{id}/context       │                 │
│     │ • Redis cache (24h TTL, 80%+ hit rate)   │                 │
│     │ • Pre-request augmentation                │                 │
│     │ • Status monitoring & fallback            │                 │
│     └──────────────────────────────────────────┘                 │
│              │                                                   │
│              ▼                                                   │
│  4. EDWIN MEMORY SYSTEM INTEGRATION                            │
│     ┌──────────────────────────────────────────┐                 │
│     │ Vault-Native Context                     │                 │
│     │ • Export run summaries to ~/edwin/       │                 │
│     │ • Index via memory_search tool            │                 │
│     │ • Enable agent: "What patterns tried?"   │                 │
│     │ • Bidirectional: agents ↔ Shad history  │                 │
│     └──────────────────────────────────────────┘                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Result: Context flows smoothly through entire system
┌─────────────────────────────────────────────────────────────────┐
│ Each component enhances the next:                                 │
│ CLI (discovery) → RLM (reasoning) → Gateway (caching)           │
│ → Edwin (agent synthesis)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Retrieval Quality Funnel

```
Context Retrieval: From Query to Injection
┌─────────────────────────────────────────────────┐
│  Query: "Build REST API with authentication"    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼ Query Expansion
        ┌────────────────────────┐
        │ Synonyms + domains:    │
        │ • REST API             │
        │ • HTTP endpoint        │
        │ • Authentication       │
        │ • OAuth / JWT          │
        └────────────┬───────────┘
                     │
                     ▼ Vector + BM25 Search
        ┌────────────────────────────────────┐
        │ Initial Candidate Pool (~20-30)    │
        │ • run-123: 0.91 (API, auth)        │
        │ • run-456: 0.87 (OAuth patterns)   │
        │ • run-789: 0.72 (Express setup)    │
        │ • run-101: 0.38 (payments, unrelated)
        │ • run-202: 0.35 (mobile auth)      │
        │ ...                                 │
        └────────────┬───────────────────────┘
                     │
                     ▼ Relevance Filtering
        ┌────────────────────────────────────┐
        │ Filter by minimum score (0.6)      │
        │ → Removes noise (0.35, 0.38)       │
        │ → Keeps strong matches (0.87+)     │
        └────────────┬───────────────────────┘
                     │
                     ▼ Recency Boost
        ┌────────────────────────────────────┐
        │ Apply decay function:               │
        │ • Recent (< 1 week): 2.0x boost    │
        │ • run-123: 0.91 × 2.0 = 1.82       │
        │ • run-456: 0.87 × 1.5 = 1.30       │
        │ • run-789: 0.72 × 1.0 = 0.72       │
        └────────────┬───────────────────────┘
                     │
                     ▼ Top-N Selection
        ┌────────────────────────────────────┐
        │ Final Results (top 3):              │
        │ 1. run-123 (1.82) - "REST API + OAuth" │
        │ 2. run-456 (1.30) - "JWT auth"     │
        │ 3. run-789 (0.72) - "Express"      │
        └────────────┬───────────────────────┘
                     │
                     ▼ Context Extraction
        ┌────────────────────────────────────┐
        │ From each run summary:              │
        │ • Key subtasks used                │
        │ • Verification outcomes            │
        │ • Lessons learned                  │
        │ • Trade-offs considered            │
        └────────────┬───────────────────────┘
                     │
                     ▼ Injection
        ┌────────────────────────────────────┐
        │ Into LLM system prompt:             │
        │ "Based on prior successful runs:   │
        │  [run-123 auth patterns]           │
        │  [run-456 token refresh strategies]│
        │  [run-789 Express conventions]"    │
        └────────────────────────────────────┘

Metrics at Each Stage:
┌─────────────────────────────────────────────────────────┐
│ Precision (% relevant): ──────────────────────► ≥ 85%   │
│ Recall (find most related): ──────────────► ≥ 80%      │
│ Latency (query to results): ──────────► < 500 ms       │
└─────────────────────────────────────────────────────────┘
```

## 5. 5-Phase Implementation Timeline

```
┌─ 10 Weeks: From MVP to Full Coherence ────────────────────────┐
│                                                                 │
│  Phase 1 (Weeks 1-2): FOUNDATION                               │
│  ┌────────────────────────────────────────────────────────────┐
│  │ • Persist run history to disk                               │
│  │ • SQLite keyword indexing                                   │
│  │ • CLI: --show-context-sources flag                         │
│  │ Latency: < 5 sec | Precision: ~70% | Retention: 100 runs  │
│  └────────────────────────────────────────────────────────────┘
│               │
│               ▼
│  Phase 2 (Weeks 3-4): SEMANTIC RETRIEVAL
│  ┌────────────────────────────────────────────────────────────┐
│  │ • QMD hybrid search (BM25 + vector)                        │
│  │ • Session summaries → markdown exports                     │
│  │ • Pre-run context injection                                │
│  │ • Monitoring & latency logging                             │
│  │ Latency: < 2 sec | Precision: ≥ 85% | Recall: ≥ 80%      │
│  └────────────────────────────────────────────────────────────┘
│               │
│               ▼
│  Phase 3 (Weeks 5-6): AGENT-INTEGRATED REASONING
│  ┌────────────────────────────────────────────────────────────┐
│  │ • Mid-run context injection (decomposition refinement)     │
│  │ • Confidence boosting (1.2x for known-good)               │
│  │ • Subtask deduplication                                    │
│  │ • Verification outcome trending                            │
│  │ Latency: < 1.5 sec | Context Accuracy: ≥ 90%             │
│  └────────────────────────────────────────────────────────────┘
│               │
│               ▼
│  Phase 4 (Weeks 7-8): GATEWAY & MEMORY INTEGRATION
│  ┌────────────────────────────────────────────────────────────┐
│  │ • Shad API: /sessions/{id}/context                        │
│  │ • Redis caching (24h TTL)                                  │
│  │ • Edwin memory_search integration                      │
│  │ • Gateway pre-request augmentation                         │
│  │ Latency: < 1 sec | Cache Hit Rate: ≥ 80%                 │
│  └────────────────────────────────────────────────────────────┘
│               │
│               ▼
│  Phase 5 (Weeks 9-10): FULL CROSS-SESSION COHERENCE
│  ┌────────────────────────────────────────────────────────────┐
│  │ • Context decay function (recent > old)                    │
│  │ • Cross-domain transfer learning                           │
│  │ • Unified dashboard (runs, context, metrics)              │
│  │ • A/B validation (context improves outcomes ≥ 15%)        │
│  │ All targets met | Cross-domain Recall: ≥ 65%             │
│  └────────────────────────────────────────────────────────────┘
│
│  Key Milestone: Phase 5 = Production-ready
└────────────────────────────────────────────────────────────────┘

Success Metrics Progression:
  Phase 1    Phase 2    Phase 3    Phase 4    Phase 5
Latency:  5s      2s       1.5s       1s       <500ms
Precision: 70%    85%      85%        85%      85%
Recall:   60%     80%      80%        80%      85%+
Context:  N/A     N/A      90%        90%      90%+
Cache:    N/A     N/A      N/A        80%      80%+
```

## 6. Context Continuity in Action

```
Example: Building Two Projects with Context Continuity

TIME: 2 weeks ago
┌──────────────────────────────┐
│ Project A: User Auth System  │ ← Shad learns OAuth patterns
│ • REST API with OAuth flow   │
│ • JWT token refresh          │
│ • Session management         │
│ Result: run-123 ✓ (Pass)     │ ← Stored with lessons learned
└──────────────────────────────┘
       │
       │ Exported to vault:
       │ ~/.shad/history/summaries/run-123.md
       │ Contains: OAuth pattern, token refresh strategy, test coverage
       │
       ▼

TIME: Now
┌──────────────────────────────┐
│ Project B: Mobile App Auth   │ ← Shad retrieves run-123 context
│ "Implement secure auth"      │
│                              │
│ [Pre-run context lookup]     │
│ → Found: run-123 (0.89)      │
│ → "OAuth patterns from Project A"
│ → "Token refresh strategy learned"
│ → Decomposition refined with prior insights
│                              │
│ [RLM executes]               │
│ • Reuses OAuth strategy from run-123 (confidence: 1.2x)
│ • Skips exploring JWT vs. session debate (already done)
│ • Applies token refresh pattern (deduplicated, saves time)
│ • Verification: 20% faster due to known-good patterns
│                              │
│ Result: run-789 ✓ (Pass)     │ ← Also stored, adds to knowledge base
└──────────────────────────────┘
       │
       │ Now when Project C needs auth:
       │ Shad retrieves both run-123 AND run-789
       │ Cross-domain patterns surface (OAuth works across all)
       │ Confidence scores reflect 2 successful runs (1.44x boost)
       │
       ▼

TIME: Next month
Multiple projects benefit from accumulated learning
• OAuth pattern is "battle-tested" across 5 runs
• Token refresh edge cases documented
• Session management anti-patterns identified
• Type contracts stable across projects

Shad's effectiveness compounds with each run.
```

## 7. Monitoring Dashboard

```
SHAD CONTEXT CONTINUITY DASHBOARD
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Timeline of Last 50 Runs                                    │
│  ┌─────────────────────────────────────────────────────────┐
│  │ ████ run-999 (Build mobile app)        [✓ Pass] [0.2 hrs]│
│  │ ████ run-998 (Add auth endpoint)       [✓ Pass] [0.5 hrs]│
│  │ ███  run-997 (Payments integration)    [⚠ Verify] [1.2 hrs│
│  │ ██   run-996 (Setup database)          [✓ Pass] [0.1 hrs]│
│  │ ...                                                       │
│  └─────────────────────────────────────────────────────────┘
│
│  Context Retrieval Metrics                                  │
│  ┌─────────────────────────────────────────────────────────┐
│  │ Precision:  [████████████████████] 87% (target: ≥ 85%)  │
│  │ Recall:     [███████████████████░] 82% (target: ≥ 80%)  │
│  │ Latency:    [████████░░░░░░░░░░░░] 340ms (target: <500ms│
│  │ Cache Hit:  [██████████████████░░] 82% (target: ≥ 80%)  │
│  └─────────────────────────────────────────────────────────┘
│
│  Verification Trending (Subtask Types)                      │
│  ┌─────────────────────────────────────────────────────────┐
│  │ OAuth Implementation:     ████████ 88% (↑ +5% last week)│
│  │ Database Schema:          ██████░░ 75% (→ stable)       │
│  │ Type Checking:            ███████░ 79% (↓ -3%)          │
│  │ Integration Tests:        ████████████ 92% (↑ +8%)      │
│  └─────────────────────────────────────────────────────────┘
│
│  Context Injection Effectiveness                           │
│  ┌─────────────────────────────────────────────────────────┐
│  │ "Context was helpful"  ████████████████████ 91% (25 users)
│  │ "Context was neutral"  ███░░░░░░░░░░░░░░░░  8% (2 users)
│  │ "Context was noisy"    ░░░░░░░░░░░░░░░░░░░  1% (0 users)
│  └─────────────────────────────────────────────────────────┘
│
│  Cross-Domain Pattern Transfer                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │ OAuth (web → mobile):      3 projects, 100% successful  │
│  │ Database patterns (SQL → NoSQL): 2 projects, 80%        │
│  │ Error handling (API → CLI):      1 project, 100%        │
│  └─────────────────────────────────────────────────────────┘
│
│  Disk & Cache Management                                   │
│  ┌─────────────────────────────────────────────────────────┐
│  │ Run History:   [████░░░░] 1.2 GB / 2 GB quota           │
│  │ Indexed Runs:  [██████░░] 87 / 100 max active          │
│  │ Summaries:     [███░░░░░] 340 MB (archive: 2.1 GB)     │
│  │ QMD Index:     [████░░░░] 560 MB (embeddings cached)   │
│  │ Redis Cache:   [█████░░░] 220 MB (TTL: 24h)            │
│  └─────────────────────────────────────────────────────────┘
│
└──────────────────────────────────────────────────────────────┘
URL: http://localhost:8000/dashboard/context-continuity
Auto-refreshes every 10 seconds | Last updated: 2025-02-05 14:32:18 UTC
```

---

## Key Takeaways

1. **Persistence Layer**: Run history saved → indexed → retrievable across sessions
2. **Retrieval Quality**: Hybrid search (BM25 + vector) → scoring → filtering
3. **Integration Points**: CLI → RLM → Gateway → Edwin memory (cascade of value)
4. **5-Phase Rollout**: Foundation → Semantic → Agent-Integrated → Gateway → Full Coherence
5. **Monitoring**: Continuous metrics ensure quality, latency, cache health

Each phase builds on the prior, with clear success criteria and validation tests.
