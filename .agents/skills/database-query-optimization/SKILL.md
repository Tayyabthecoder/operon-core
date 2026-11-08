---
name: database-query-optimization
description: Analyzes and optimizes database query performance by examining SQL, execution plans, indexes, joins, filtering, sorting, pagination, ORM behavior, data access patterns, and query measurements. Use when diagnosing slow database operations, improving reporting queries, reducing excessive database calls, or verifying database performance improvements while preserving correctness and data integrity.
---

# Database Query Optimization Skill

This skill guides the AI coding agent to diagnose, optimize, and verify database query performance across diverse engines, ORMs, and data access layers while strictly preserving correctness, data integrity, security boundaries, and operational stability.

## 1. Purpose, Core Principles, and Query Optimization Mindset

The central mandate of database query optimization is:
**Measure first, understand the query and data model, optimize the demonstrated bottleneck, and verify that the improved query returns correct results without creating unnecessary operational risk.**

Adhere to seven foundational principles:
- **Measure Before Modifying**: Never optimize a query solely because it appears complex or spans multiple tables; distinguish verified bottlenecks from hypothetical concerns.
- **Trace Complete Paths**: Trace execution across call sites, ORM builders, parameter bindings, network round trips, database plans, and result hydration.
- **Smallest Effective Change**: Prefer targeted modifications (adjusting a predicate, adding an index, or eager loading) over broad structural rewrites.
- **Correctness Over Speed**: Faster queries returning incorrect rows, ignoring nulls, truncating reports, or bypassing authorization are regressions.
- **Engine-Aware Optimization**: Tailor techniques to the project's actual database engine and version; never apply vendor syntax without compatibility checks.
- **Zero Production Risk**: Plan commands may execute mutations or lock tables; never run unvetted benchmarks or blocking DDL against live systems.
- **Evidence-Based Claims**: Never invent execution times or percentage gains; state limitations honestly when live metrics cannot be safely collected.

*Scope Boundary*: Focuses on query performance and immediate data access patterns. For schema modeling, use [database-design](../database-design/SKILL.md); for migrations, use [database-migration](../database-migration/SKILL.md); for system profiling, use [performance-profiling](../performance-profiling/SKILL.md); for database standards, follow [database.md](../../rules/database.md).

## 2. Scope and Trigger Scenarios

### Trigger Scenarios
Activate this skill when:
- **Slow Query Alerts**: Logs, APM traces, or monitoring flag queries exceeding latency budgets.
- **Resource Saturation**: Elevated database CPU, disk I/O, or buffer churn from intensive query execution.
- **API & Endpoint Latency**: Services degrading due to slow database queries or excessive round trips.
- **N+1 Patterns & Bloat**: ORMs executing queries in loops; offset pagination degrading on deep pages.
- **Reporting Timeouts**: Aggregate summaries, dashboard queries, or export jobs timing out or causing locks.

### When NOT to Use This Skill
Do not invoke this skill for greenfield schema modeling (use [database-design](../database-design/SKILL.md)), authoring production migrations (use [database-migration](../database-migration/SKILL.md)), application-wide profiling (use [performance-profiling](../performance-profiling/SKILL.md)), or general defect debugging (use [debugging](../debugging/SKILL.md)).

| Activity | Primary Skill | Supporting Skills |
| :--- | :--- | :--- |
| **Slow query tuning** | `database-query-optimization` | `performance-profiling` |
| **Predicate indexing** | `database-query-optimization` | `database-design` |
| **N+1 ORM loops** | `database-query-optimization` | `backend-development` |
| **Schema & relations** | `database-design` | `database.md` |
| **DDL migrations** | `database-migration` | `deployment-readiness` |

## 3. Establishing the Actual Performance Problem & Workload Context

Define the problem and operational context before attempting code changes:
- **Identify Operation & Call Site**: Note exact SQL, ORM invocation, repository method, and caller endpoint/job.
- **Quantify Latency & Frequency**: Note observed latency (mean, p95, p99), execution frequency, and user impact.
- **Inspect Data Context**: Determine table row counts, filtering cardinality, and returned result-set size.
- **Isolate Bottleneck Layer**: Confirm whether delay occurs inside the engine, over network round trips, or during object hydration.
- **Evaluate Workload Context**: Check if query runs under high write concurrency or on read replicas; distinguish facts from hypotheses.

## 4. Inspecting the Database Environment & Engine Specifics

Identify the database engine before applying vendor-specific optimizations:
- **PostgreSQL**: `EXPLAIN (ANALYZE, BUFFERS)`, partial/expression indexes, GiST/GIN, parallel scans, and partitioning.
- **MySQL / MariaDB**: `EXPLAIN FORMAT=JSON`, `EXPLAIN ANALYZE` (8.0.18+), InnoDB clustered keys, leftmost-prefix rules.
- **SQLite**: `EXPLAIN QUERY PLAN`, lightweight B-tree scans, covering indexes, and expression indexes; single-writer model.
- **SQL Server / Oracle**: Graphical/XML plans, clustered vs. heap tables, index hints, partition pruning, specialized optimizers.
- **Environment Invariants**: Verify schemas, foreign keys, index states, statistics freshness (`ANALYZE` / `VACUUM`), isolation, and connection pooling. Never invent plan outputs.

## 5. Inspecting the Query and Call Site

Analyze the complete data-access chain surrounding the query:
- **Query Construction**: Inspect SQL generation (raw SQL, query builder, ORM) and verify parameter bindings.
- **Call-Site Loops**: Locate callers; eliminate queries executing inside loops (`foreach`, `map`).
- **Column Projections**: Replace `SELECT *` with explicit column selections needed by the caller.
- **Hydration Overhead**: Check if excessive latency is spent hydrating complex domain entity graphs.
- **Transaction Scope**: Ensure queries do not hold open transactions while performing external I/O.

## 6. Establishing a Reproducible Baseline

Capture a rigorous baseline prior to altering any query or index:
- **Comparable Conditions**: Benchmark under equivalent data volume, parameters, and connection configurations.
- **Cold vs. Warm Cache**: Record whether metrics reflect cold disk reads or warm buffer-cache hits.
- **Sanitize Sensitive Data**: Redact PII, customer identifiers, passwords, and tokens from recorded queries and plans.
- **Statistical Discipline**: Discard initial cold-start spikes; report median or p95 latency across multiple runs.
- **Core Metrics**: Record duration (p50/p95), rows examined vs. returned, buffer hits, disk reads, and query counts.

## 7. Execution Plan Analysis

Use native plan tools (`EXPLAIN`, `EXPLAIN ANALYZE`) to inspect physical access paths rather than guessing:
- **Access Methods**: Distinguish Sequential Scans (acceptable for small tables < 1k rows or retrieval > 25%), Index Scans (B-tree traversal to heap pages), Index-Only Scans (fetches columns directly from index), and Bitmap Scans (page bitmaps reducing random I/O).
- **Join Algorithms**: Evaluate Nested Loop (small outer, indexed inner), Hash Join (unindexed equality on large relations), and Merge Join (pre-sorted inputs or large range joins).
- **Plan Red Flags**: Look for discrepancies between estimated and actual rows, sort spills to disk (`external merge Disk`), and low filter efficiency (many rows read, few returned).

## 8. Optimizing Filtering and Predicates

Ensure query predicates are *SARGable* (Search Argument Able), enabling index range scans:
- **Avoid Functions on Indexed Columns**: Use range boundaries (`WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'`) instead of wrapping columns in functions (`WHERE EXTRACT(YEAR FROM created_at) = 2026`), which suppresses indexes.
- **Eliminate Type Mismatches**: Comparing incompatible types (e.g., `VARCHAR` column to integer parameter) forces row casts, bypassing indexes. Match parameter types strictly.
- **Handle NULLs & Wildcards**: Leading wildcards (`LIKE '%term'`) bypass B-tree indexes; use trigram indexes (`pg_trgm`) or full-text search. Understand engine-specific `NULL` indexability.
- **Preserve Security Filters**: Never remove required business or authorization filters (`WHERE tenant_id = :tenant_id`) to gain query speed.

## 9. Careful Index Evaluation

Indexes accelerate reads but impose write amplification, memory footprint, and maintenance costs:
- **Composite Index Order (Equality $\to$ Range $\to$ Sort)**: Place exact equality columns first, range filters second, and `ORDER BY` columns last (`CREATE INDEX idx_orders_st_dt ON orders (store_id, status, created_at DESC);`).
- **Covering Indexes**: Include non-key payload columns via `INCLUDE` to permit index-only scans without widening the B-tree key (`CREATE INDEX idx_users_email ON users (email) INCLUDE (name);`).
- **Index Hygiene & Deletion Cautions**: Avoid redundant overlapping indexes. Never drop an index without verifying constraints, foreign keys, or batch jobs.

## 10. Optimizing Joins and Relationships

Inefficient joins multiply rows, trigger disk spillovers, and lock resources:
- **Verify Join Cardinality**: Ensure join conditions match indexed keys; missing conditions cause Cartesian products ($N \times M$ rows).
- **Filter Pushdown**: Apply selective filters before joining tables or ensure optimizer pushes predicates into subqueries/CTEs.
- **Correlated Subqueries vs. Joins**: Rewrite correlated subqueries in `SELECT` lists into `LEFT JOIN` with pre-aggregated subqueries or window functions.
- **Preserve NULL Semantics**: Never switch a `LEFT JOIN` to an `INNER JOIN` merely for speed unless business rules confirm unmatched records must be excluded.
- **Avoid Over-Joining**: Prune tables from the query if none of their columns are selected or filtered.

## 11. Eliminating N+1 Queries and Excessive Round Trips

N+1 queries occur when an application executes 1 initial query for parent records, followed by $N$ separate queries for related child records in loops:
- **Eager Loading / Join Fetching**: Configure ORM to load parent and child entities in a single query via `JOIN` or batched subqueries.
- **Batched In-Memory Loading**: Fetch parent IDs, then fetch children using `WHERE parent_id IN (...)`, assembling the graph in application memory.
- **Set-Based Aggregation**: Compute totals using `GROUP BY` rather than querying count or sum individually per entity.
- **Discipline Rule**: Avoid over-eager loading. Fetching multi-level object graphs into memory creates memory pressure and network saturation.

## 12. Optimizing Pagination and Large Result Sets

- **Offset Pagination Pitfall**: `LIMIT 20 OFFSET 100000` scans 100,020 rows and discards 100,000. Performance degrades linearly as page depth increases.
- **Keyset / Cursor Pagination**: Use cursor pagination based on indexed deterministic columns (`WHERE (created_at, id) < (:last_dt, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20`).
- **Count Query Optimization**: Avoid running `COUNT(*)` over millions of rows on every paginated request. Cache counts, use approximate counts (e.g., PostgreSQL `reltuples`), or provide cursor navigation.

## 13. Optimizing Aggregation and Reporting Queries

- **Aggregate Semantics**: Distinguish `COUNT(*)` (all rows), `COUNT(column)` (non-null values), and `COUNT(DISTINCT column)` (requires sorting/hashing unique values).
- **Prevent Join Duplication**: Joining a parent to multiple 1:N child tables before aggregating causes Cartesian row multiplication, distorting totals.
- **Filter Early**: Apply strict date/time filters before computing aggregations. Ensure timezone boundaries are handled consistently.
- **Materialized Summaries & Views**: When real-time calculation over large tables degrades performance, evaluate pre-aggregated summary tables or materialized views; account for refresh costs and staleness tolerance.

## 14. ORM and Query Builder Optimization

- **Inspect Generated SQL**: Enable query logging in development to inspect the exact SQL generated by the ORM.
- **Select Specific Columns**: Use projections (`select(['id', 'title', 'price'])`) instead of loading full entity models with unneeded columns.
- **Control Relationship Loading**: Audit model definitions for default `lazy` or `eager` flags; avoid default eager loading cascading on every query.
- **Bulk Operations & Raw SQL**: Use bulk methods (`insertMany`, `bulk_create`) for batch writes. Use parameterized raw SQL when an ORM cannot generate performant window functions or complex CTEs.

## 15. Optimizing Sorting and Grouping

- **Index-Supported Ordering**: If a query filters on `store_id = ?` and orders by `created_at DESC`, an index on `(store_id, created_at DESC)` allows the engine to read pre-sorted rows, eliminating in-memory sorting.
- **Deterministic Sorts**: Ensure sort criteria have a deterministic tie-breaker (`ORDER BY created_at DESC, id DESC`); non-deterministic sorting produces inconsistent pagination.
- **Avoid Sorting Unfiltered Sets**: Filter rows before applying `ORDER BY`.

## 16. Caching Strategies & Constraints

- **Diagnose First**: Never use caching to mask an unindexed full table scan or N+1 query loop.
- **Cache Invalidation Costs**: Consider how data updates, deletions, and TTLs will keep cache entries coherent.
- **Tenant & User Boundaries**: Ensure cache keys include tenant and user identifiers (`tenant:42:user:105:dashboard`) to prevent cross-tenant data leaks.
- **Data Sensitivity**: Never store plaintext passwords, tokens, or PII in unencrypted shared caches.

## 17. Transactions, Locking, and Concurrency

- **Lock Scope & Duration**: Keep transactions short; never perform HTTP requests or heavy computation while holding database transactions or locks.
- **Avoid Table-Level Locks**: Use fine-grained row-level locking (`SELECT ... FOR UPDATE`) only where strictly necessary for concurrency invariants.
- **Deadlock Mitigation**: Acquire locks in a consistent global order across transactions; implement exponential backoff retries for transient deadlock errors.
- **Preserve Isolation Levels**: Do not change transaction isolation levels merely to avoid lock waits without evaluating race conditions and dirty reads.

## 18. Maintaining Correctness and Data Integrity

Every query optimization must be verified for semantic equivalence:
- **Verify Columns & Names**: Ensure column names, aliases, and types match consumer expectations.
- **Compare Result Rows & Totals**: Compare original and optimized outputs using test data; verify row counts and aggregate totals match exactly.
- **Test Null & Edge Cases**: Validate queries against empty tables, null foreign keys, and edge boundary dates.
- **Preserve Business Logic**: Verify that refactored joins and filters continue enforcing business rules (e.g., active status, soft deletes).

## 19. Protecting Security and Privacy

- **Mandatory Parameterization**: Always bind variables; never concatenate untrusted user input into raw SQL queries.
- **Enforce Scoping Predicates**: Preserve mandatory tenant, organization, or user filters (`WHERE tenant_id = :tenant_id`).
- **Sanitize Diagnostic Logs**: Redact PII, customer secrets, and auth tokens from query logs, `EXPLAIN` outputs, and performance reports.
- **Principle of Least Privilege**: Verify that application queries run under appropriate database user roles without excessive DDL privileges.

## 20. Benchmarking Before and After

Evaluate query optimizations under controlled, reproducible conditions:
1. Warm up the database cache with 3 representative runs.
2. Execute 10 measured runs of original query; record median and p95 latency.
3. Apply targeted index or query refactoring.
4. Execute 10 measured runs of optimized query under identical parameters and dataset.
5. Verify identical result rows and record metrics.

*Honesty Invariant*: If local environments lack production-scale data, disclose that benchmark numbers represent test conditions and cannot guarantee identical production speedups.

## 21. Working Safely with Production Databases

Operating on production databases carries high operational risk:
- **Beware of `EXPLAIN ANALYZE`**: In many engines, `EXPLAIN ANALYZE` *executes* the statement; running it on `DELETE` or `UPDATE` modifies live data. Use rollbacks or read transactions.
- **Avoid Unbounded Reads**: Avoid running full-table scans or ad-hoc exports on large production tables during peak traffic hours.
- **Kill Runaway Queries**: Ensure queries have statement timeouts (`statement_timeout` in PostgreSQL, `max_execution_time` in MySQL) to prevent pool exhaustion.
- **No Direct Production Schema Edits**: Never manually run `CREATE INDEX` or `ALTER TABLE` on production without migration reviews and approvals.

## 22. Evaluating Schema Changes Separately

When query optimization requires schema modifications (new indexes, column alterations, partitioning):
1. **Assess Write Overhead**: Quantify the impact of additional indexes on `INSERT`, `UPDATE`, and `DELETE` workloads.
2. **Online Index Creation**: Use non-blocking index creation commands (`CREATE INDEX CONCURRENTLY` in PostgreSQL, `ALGORITHM=INPLACE, LOCK=NONE` in MySQL) to prevent table locks.
3. **Migration Version Control**: Author schema changes through the project's official migration tool. Refer to [database-migration](../database-migration/SKILL.md) and [database-design](../database-design/SKILL.md).

## 23. Avoiding Premature & Unnecessary Optimization

Avoid these recurring optimization traps:
- Rewriting clean, readable queries that execute in under 5ms with negligible load.
- Adding composite indexes for every combination of columns without checking query patterns.
- Replacing all ORM queries with unmaintainable raw SQL strings.
- Introducing Redis or Memcached before adding an obvious missing single-column index.
- Denormalizing tables without evaluating update anomalies and consistency maintenance.

## 24. Recommended 11-Phase Query Optimization Workflow

```mermaid
flowchart LR
    P1["1: Define"] --> P2["2: Inspect"] --> P3["3: Baseline"] --> P4["4: Plan"] --> P5["5: Hypothesis"] --> P6["6: Change"] --> P7["7: Correctness"] --> P8["8: Re-measure"] --> P9["9: Regressions"] --> P10["10: Review"] --> P11["11: Report"]
```

- **Phases 1-3**: Define problem $\to$ Inspect engine, schema, ORM $\to$ Establish baseline.
- **Phases 4-6**: Analyze plan (`EXPLAIN`) $\to$ Formulate hypothesis $\to$ Apply smallest change.
- **Phases 7-9**: Verify correctness $\to$ Re-measure identically $\to$ Audit regressions & locks.
- **Phases 10-11**: Review diff, bindings & security $\to$ Document report.

## 25. Definition of Done & Standardized Completion Report

A query optimization task is complete only when all applicable criteria are satisfied:
- [ ] 1. **Bottleneck Verified**: Confirmed with execution plans or metrics, not speculative assumptions.
- [ ] 2. **Correctness Preserved**: Result rows, calculations, and null handling match original behavior.
- [ ] 3. **Security Intact**: Parameters are bound safely; tenant scoping and auth filters are preserved.
- [ ] 4. **No Destructive Actions**: Live data was protected; mutating diagnostics were avoided.
- [ ] 5. **Measurable Verification**: Before-and-after metrics were collected under comparable conditions.
- [ ] 6. **Operational Risks Evaluated**: Index write amplification, locking, and maintenance assessed.
- [ ] 7. **Clean Code**: Follows project repository/ORM conventions with zero SQL injection risk.

### Standardized Completion Report Template

```markdown
# Database Query Optimization Report: [Operation]
## 1. Problem & Root Cause
- **Endpoint & Symptom**: [e.g., `GET /api/v1/orders/summary`, p95 latency 1,450ms, 60 calls/min, 85% DB CPU]
- **Root Cause**: [e.g., Full scan on `orders` (350k rows) due to non-SARGable date function in `OrderRepository.ts`]
## 2. Optimization Applied
- **Changes**: [e.g., SARGable date range filter; composite index `(store_id, created_at)` via migration `20261025_idx`]
## 3. Correctness & Security Verification
- **Equivalence & Security**: [Row counts match; null edge cases tested; tenant scoping preserved]
## 4. Performance Measurements
| Metric | Baseline | Optimized | Delta |
| :--- | :--- | :--- | :--- |
| **Duration (p95)** | 1,450ms | 18ms | -98.7% |
| **Rows Examined** | 350,000 | 45 | -99.9% |
| **Queries / Request** | 1 | 1 | 0 |
## 5. Operational Impact & Limitations
- **Operational & Limitations**: [Non-blocking concurrent index; minimal write overhead; disclose pending archival]
```

## 26. Alignment with Project Rules, Skills, and Validation Checklist

Ensure all query optimization activities conform to repository standards:
- Rules: [database.md](../../rules/database.md) (DB engineering), [performance-optimization.md](../../rules/performance-optimization.md) (performance), [security.md](../../rules/security.md) (security), [change-safety.md](../../rules/change-safety.md) (safety invariants), [core-workflow.md](../../rules/core-workflow.md) (workflow).
- Skills: [database-design](../database-design/SKILL.md), [database-migration](../database-migration/SKILL.md), [performance-profiling](../performance-profiling/SKILL.md), [backend-development](../backend-development/SKILL.md), [debugging](../debugging/SKILL.md), [testing-qa](../testing-qa/SKILL.md), [security-review](../security-review/SKILL.md), [cross-cutting-concerns](../cross-cutting-concerns/SKILL.md).

### 10-Point Query Optimization Validation Checklist

- [ ] 1. **Verified Problem**: Optimization addresses a measured bottleneck rather than speculative concerns.
- [ ] 2. **SARGable Predicates**: Predicates allow index range scans; no functions applied to indexed columns.
- [ ] 3. **Parameterized Queries**: All parameters are bound safely; zero string concatenation.
- [ ] 4. **No N+1 Queries**: Eliminated iterative queries inside application loops via eager loading or batching.
- [ ] 5. **Safe Pagination**: Uses cursor or indexed keyset pagination for deep result sets.
- [ ] 6. **Correct Join Semantics**: Preserves outer join NULL semantics; prevents Cartesian row multiplication.
- [ ] 7. **Targeted Indexing**: Index column order adheres to Equality $\to$ Range $\to$ Sort principles.
- [ ] 8. **Preserved Authorization**: Tenant and user scoping predicates remain fully intact.
- [ ] 9. **Comparable Evidence**: Benchmarks use identical data conditions and report honest metrics.
- [ ] 10. **Application Files Intact**: No production queries executed recklessly; application code modified only within authorized scope.
