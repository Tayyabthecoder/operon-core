---
trigger: model_decision
description: Apply performance engineering principles when profiling, benchmarking, optimizing, or reviewing frontend rendering, backend execution, database queries, APIs, network requests, memory use, concurrency, build output, caching, and resource consumption.
---

# Performance Optimization and Engineering Standards

This rule governs diagnosing, profiling, benchmarking, and optimizing software performance. The agent must deliver measurable improvements, maintain responsiveness, and prevent performance regressions without compromising correctness, security, or maintainability.

## 1. Understand Before Optimizing

- **Evidence Over Assumption**: Never optimize code solely because it appears complex or theoretically suboptimal. Distinguish measured bottlenecks from hypothetical concerns.
- **Inspect Established Architectures**: Review existing implementations, query patterns, caching mechanisms, framework capabilities, and past optimizations first.
- **Workload Context**: Identify the conditions under which performance degrades—data volume, concurrency, network constraints, and client capabilities.
- **Smallest Effective Change**: Prefer the smallest change that addresses a demonstrated problem over broad, speculative architectural rewrites.
- **Preserve Core Qualities**: Maintain system correctness, security, error handling, and test coverage while optimizing.
- **Substantiate Claims**: Never claim an improvement without measurement or concrete evidence appropriate to the change.

## 2. Establish a Performance Baseline

- **Pre-Optimization Baselines**: When performance is a material goal, establish a baseline before modifying code or configuration.
- **Metric Selection**: Select metrics tied to the bottleneck: execution duration, latency distributions (p50, p95, p99), throughput (RPS), memory allocation, CPU use, query time, transfer size, or rendering responsiveness.
- **Representative Conditions**: Measure in environments comparable to production with realistic datasets and concurrency.
- **Account for Variance**: Account for warm-up effects (JIT, connection pools, cache warming), cold starts, and environmental noise; avoid drawing conclusions from single runs.
- **Document Assumptions**: Record measurement conditions and benchmark results for reproducibility.
- **Measurement Limitations**: If profiling is unavailable, state the limitation clearly and follow cautious, evidence-informed practices rather than inventing numbers.

## 3. Prioritize High-Impact Bottlenecks

- **Impact Prioritization**: Rank bottlenecks by latency contribution, execution frequency, user impact, and remediation cost.
- **Full Path Analysis**: Analyze the complete execution path across rendering, network, serialization, logic, database queries, and external APIs.
- **Address Root Causes**: Fix fundamental inefficiencies at the source rather than masking slow operations with fragile workarounds.
- **Avoid Micro-Optimizing Rare Paths**: Do not optimize rarely executed code unless it directly threatens system stability or critical SLAs.
- **Prevent Bottleneck Shifting**: Ensure optimizing one component does not transfer contention to another tier (e.g., shifting CPU load to database connection exhaustion).
- **Target Tail Latency**: Focus on high-percentile latency (p95, p99) and worst-case execution paths rather than relying solely on averages.

## 4. Algorithm and Data Structure Efficiency

- **Workload-Matched Structures**: Choose algorithms and data structures whose time and space complexity fit expected input volumes and access patterns.
- **Eliminate Redundant Work**: Eliminate nested iterations ($O(N^2)$ loops), repeated sorting, duplicate collection traversals, and redundant calculations.
- **Optimal Lookups**: Replace linear scans with indexed lookups, hash maps, or sets when collections grow beyond trivial sizes.
- **Reuse Expensive Results**: Reuse pre-calculated values within a request or function scope instead of recalculating identical outputs.
- **Memory vs. Speed Trade-offs**: Account for memory overhead when adding lookup tables, index maps, or memoized values.
- **Simplicity First**: Do not introduce intricate algorithmic optimizations for small, bounded collections where standard idioms are fast and clear.

## 5. Frontend Rendering and Responsiveness

- **Framework Idioms**: Adhere to the established frontend framework's rendering conventions (React, Vue, Svelte, Angular).
- **Prevent Unnecessary Rerenders**: Audit component updates, isolate frequent state changes, and stabilize dependencies to prevent render cascades.
- **Localize State**: Keep state close to consuming components; avoid unnecessary updates to global state stores or root contexts.
- **Justified Memoization**: Use memoization (`useMemo`, `useCallback`, `memo`) only where profiling demonstrates expensive computations or render prevention; avoid indiscriminate memoization that adds memory overhead without benefit.
- **Virtualize Large Collections**: Paginate or virtualize long lists, tables, and infinite feeds rather than rendering thousands of DOM nodes.
- **Main-Thread Responsiveness**: Keep synchronous JavaScript tasks under 50ms; delegate heavy processing to Web Workers or defer across animation frames.
- **Preserve Accessibility & UX**: Never remove focus indicators, keyboard navigation, transition states, or user feedback to artificially speed up rendering.

## 6. Frontend Assets and Bundle Size

- **Inspect Build Outputs**: Analyze bundle composition, vendor weights, and chunk outputs before restructuring asset delivery.
- **Dependency Discipline**: Avoid importing large libraries for small utilities; use tree-shakeable imports or native platform APIs.
- **Code Splitting**: Implement route-level and component-level dynamic imports for heavy, infrequently viewed components.
- **Media Optimization**: Use modern formats (WebP, AVIF, SVG), explicit image dimensions to avoid layout shift (CLS), and appropriate compression.
- **Asset Priorities**: Use `loading="lazy"` for below-the-fold media; reserve preloading for genuine critical path resources.
- **Fonts & CSS**: Optimize web fonts via subsetting and font-display swapping; eliminate unused styles and redundant stylesheet links.

## 7. Backend Execution and Response Times

- **Profile Hot Paths**: Profile slow request paths before refactoring server logic.
- **Streamline Execution**: Eliminate redundant input parsing, repeated serialization, duplicate DB roundtrips, and unneeded middleware.
- **Streaming & Pagination**: Stream large file downloads and exports; enforce pagination on all collection endpoints to prevent unbounded payloads.
- **Non-Blocking I/O**: Use non-blocking, asynchronous operations for disk, network, and database access according to the runtime.
- **Timeouts & Deadlines**: Set explicit connection, read, and write timeouts on external calls to prevent slow downstream services from exhausting threads.
- **Resource Pooling**: Use connection pools for databases, HTTP clients, and background workers rather than establishing new connections per request.
- **Cross-Reference**: Follow [backend.md](./backend.md) for service boundaries and error handling.

## 8. Database Query Performance

- **Inspect Query Plans**: Use query diagnostics (`EXPLAIN ANALYZE`) to inspect index usage, sequential scans, and join costs before altering queries.
- **Eliminate N+1 Queries**: Resolve N+1 patterns with eager loading, batch joins, or joined queries supported by the ORM/query builder.
- **Project Specific Columns**: Select only needed columns (`SELECT col1, col2`) rather than unbounded entity retrieval (`SELECT *`) across wide tables.
- **Targeted Indexes**: Add indexes matching observed `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` patterns. Balance read speed with index maintenance overhead on writes.
- **Composite Index Ordering**: Order composite index columns with equality predicates first and range conditions last.
- **Keyset Pagination**: Prefer keyset (cursor) pagination over large `OFFSET` values for large datasets.
- **Transaction Scope**: Minimize transaction duration; keep external network calls and heavy computation outside of active transactions.
- **Prevent Speculative Denormalization**: Never compromise schema normalization or data integrity for speculative gains.
- **Cross-Reference**: Follow [database.md](./database.md) for schema constraints and migration safety.

## 9. API and Network Performance

- **Reduce Network Chatter**: Batch related operations or provide composite endpoints to eliminate chatty roundtrips.
- **Payload Compression**: Enable HTTP compression (Gzip/Brotli) and trim unnecessary, null, or redundant fields from JSON responses.
- **Conditional Requests**: Support HTTP caching headers (`ETag`, `Last-Modified`, `Cache-Control`) to enable 304 responses for unchanged data.
- **Safe Concurrency**: Parallelize independent upstream requests when safe; avoid parallelizing dependent operations.
- **Resilient Retries**: Implement exponential backoff with jitter on transient network failures; avoid tight retry loops that amplify traffic during outages.
- **Cross-Reference**: Follow [api-design.md](./api-design.md) for contract stability and versioning.

## 10. Caching and Data Reuse

- **Justified Caching**: Introduce caches only when repeated computation or data retrieval represents a verified bottleneck.
- **Clear Invalidation Strategy**: Define explicit TTL expiration and event-driven invalidation rules (cache-aside, write-through) before adding a cache.
- **Scoped Cache Keys**: Incorporate parameters, tenant IDs, and authorization boundaries into cache keys to prevent cache poisoning or cross-user leaks.
- **Protect Sensitive Data**: Never store raw credentials, tokens, or private PII in shared or unencrypted caches.
- **Graceful Fallbacks**: Ensure cache failures degrade safely to primary storage without crashing application flows.
- **Mitigate Stampedes**: Use mutex locks, early probabilistic expiration, or stale-while-revalidate to prevent thundering herds on cache misses.

## 11. Memory and Resource Management

- **Prevent Resource Leaks**: Always release database connections, close file handles, dispose streams, and remove event listeners in structured scopes or `finally` blocks.
- **Stream Large Payloads**: Process large files, CSV exports, and bulk imports via streams or chunks rather than buffering entire payloads in memory.
- **Object Lifetimes**: Avoid retaining references to large collections or closures in global or long-lived scopes.
- **Bounded Buffers**: Apply maximum capacity limits and eviction policies (e.g., LRU) on in-memory collections to prevent OOM errors.
- **Profile Allocations**: Inspect memory usage and allocation hotspots when diagnosing garbage collection pauses or process growth.

## 12. Concurrency and Parallel Processing

- **Verify Concurrency Safety**: Ensure operations are independent and thread-safe before introducing parallel execution.
- **Eliminate Mutable State**: Prevent race conditions by using immutable structures, atomic operations, or message queues.
- **Bounded Concurrency**: Constrain concurrent tasks using worker pools, semaphores, or queues to avoid exhausting CPU, memory, or connection pools.
- **Respect Downstream Limits**: Keep concurrent requests within downstream API quotas, database pool sizes, and OS descriptor caps.
- **Error Handling**: Use structured concurrency or error aggregation (`Promise.allSettled`) so failed subtasks do not leave orphan operations running.

## 13. Background Jobs and Expensive Operations

- **Decouple Heavy Work**: Move heavy computations, bulk notifications, exports, and third-party syncs to background workers.
- **Use Existing Infrastructure**: Leverage the project's established queue system (e.g., BullMQ, Celery, Sidekiq) rather than custom queue implementations.
- **Idempotency**: Ensure jobs are idempotent so automated retries do not duplicate side-effects (payments, notifications).
- **Concurrency & Rate Limits**: Tune worker concurrency and rate limits to prevent background tasks from starving real-time request handling.
- **Job Observability**: Track job status (pending, active, completed, failed) and log failure causes.

## 14. Build and Development Tooling

- **Analyze Build Times**: Profile compilation, bundling, and test execution before restructuring build pipelines.
- **Build Caching**: Utilize compiler caches, package manager caches, and CI artifact caches to avoid rebuilding unchanged assets.
- **Incremental Builds**: Configure incremental builds and selective test running to speed up development cycles.
- **Streamline Non-Prod Builds**: Avoid unnecessary minification or source-map generation during local development.
- **Preserve Quality Gates**: Never disable tests, linters, type checks, or security scans merely to speed up build pipelines.

## 15. Scaling and Capacity Planning

- **Diagnose True Scaling Limits**: Identify whether bottlenecks under load stem from CPU, memory, database I/O, or network constraints.
- **Optimize Before Scaling**: Do not add servers to mask unindexed queries, memory leaks, or inefficient algorithms that should be resolved in code.
- **Stateless Architecture**: Maintain stateless application tiers to enable horizontal auto-scaling without sticky session dependencies.
- **Backpressure & Limits**: Implement rate limiting and request queue limits to protect critical services from cascading failures during surges.
- **Graceful Degradation**: Design services to degrade gracefully (e.g., serving stale data, disabling heavy secondary widgets) during extreme load.

## 16. Monitoring and Performance Observability

- **Leverage Existing Tools**: Use the project's established logging, APM, and metrics systems (e.g., OpenTelemetry, Prometheus, Datadog).
- **Capture Latency Distributions**: Track percentiles (p50, p90, p99) and distributions rather than relying on misleading average response times.
- **Distributed Tracing**: Propagate trace IDs across services and database calls to isolate multi-tier latency bottlenecks.
- **Low Overhead**: Ensure telemetry instrumentation does not introduce measurable execution latency or memory bloat.
- **Sanitize Metrics & Logs**: Never include tokens, passwords, or PII in performance trace attributes or log payloads (cross-reference [security.md](./security.md)).

## 17. Benchmarking and Regression Prevention

- **Repeatable Benchmarks**: Write repeatable benchmarks for critical computational paths and serialization routines.
- **Consistent Conditions**: Run benchmark comparisons under stable, controlled environments; isolate tests from shared host interference.
- **Enforce Performance Budgets**: Respect established project budgets (e.g., bundle size caps, API response thresholds, Core Web Vitals).
- **Automated Regression Checks**: Include performance tests in CI only when they are deterministic, non-flaky, and resistant to runner noise.
- **Document Baselines**: Store benchmark scripts and baseline records in documentation to maintain a traceable historical record.

## 18. Refactoring for Performance

- **Isolate Performance Changes**: Keep performance refactorings in dedicated commits separate from functional feature changes or styling edits.
- **Preserve Contracts**: Maintain existing function signatures, API schemas, and component interfaces to avoid breaking consumers.
- **Simpler Before Complex**: Evaluate whether a simpler data structure or query eliminates the issue before introducing concurrency or caches.
- **Verify Parity**: Run the complete automated test suite immediately following refactoring to verify functional parity.
- **Document Intent**: Add clear code comments explaining non-intuitive optimizations to prevent accidental reversion during maintenance.

## 19. Security and Correctness During Optimization

- **Zero Security Compromises**: Never weaken authentication, authorization, input validation, encryption, or auditing to gain speed.
- **Enforce Scoped Caches**: Strictly scope cached data to tenants and user access levels; prevent cross-tenant data leakage.
- **Transactional Integrity**: Ensure concurrent or deferred execution does not violate transactional consistency or duplicate financial/booking actions.
- **Maintain Error Handling**: Never remove validation logic or defensive error checks to shave microseconds off hot paths.
- **Cross-Reference**: Refer to [security.md](./security.md) for data protection and secure coding rules.

## 20. Final Verification and Reporting

- **Execute Test Suites**: Run all relevant unit, integration, and regression tests to confirm application behavior, ordering, and outputs remain intact.
- **Re-Measure Baseline**: Measure post-optimization metrics under the exact conditions used during baseline capture to prove real quantitative gain.
- **Verify Secondary Metrics**: Check that reduced latency did not cause memory spikes, CPU throttling, connection exhaustion, or elevated network traffic.
- **Check for Regressions**: Confirm that resolving the targeted bottleneck has not introduced a secondary bottleneck elsewhere.
- **Evidence-Based Reporting**: Report the outcome with clear, verified facts:
  - The diagnosed root cause and targeted bottleneck.
  - Baseline vs. post-optimization metrics with units, sample counts, and test conditions.
  - Test suite verification results.
  - Any operational trade-offs, configuration changes, or known limitations.
  - Distinction between measured improvements and theoretical expectations.
- **No False Victory**: Never declare a performance issue resolved unless post-implementation measurements verify the bottleneck is eliminated or reduced.

## 21. Performance Decision Principles

1. **Correctness & Security First**: Correctness, data integrity, and security boundaries strictly override speculative performance gains.
2. **Measure Before and After**: Optimizations must be justified by baseline profiling and validated by post-change measurements.
3. **Simplicity Over Cleverness**: Choose the simplest algorithmic or architectural solution that meets the requirement; avoid over-engineering.
4. **Target Root Bottlenecks**: Focus effort where profiling shows the greatest concentration of latency or resource consumption.
5. **Preserve Maintainability**: Do not sacrifice code readability, abstractions, or velocity for negligible micro-optimizations.
6. **Protect System Stability**: Prevent optimizations from introducing memory leaks, thread starvation, or connection exhaustion.
7. **Adhere to Stack Conventions**: Extend existing framework idioms and tooling rather than adding redundant performance dependencies.
8. **Explicit Trade-offs**: Make performance assumptions, cache lifetimes, and concurrency limits explicit and auditable.

## 22. Avoid Rule Duplication

This performance optimization rule functions in concert with other specialized project rules. Consult them directly:

- [core-workflow.md](./core-workflow.md): Governs task analysis, planning, and verification workflows.
- [change-safety.md](./change-safety.md): Governs preserving existing functionality and scope discipline.
- [coding-standards.md](./coding-standards.md): Governs code quality, naming conventions, and file organization.
- [architecture.md](./architecture.md): Governs module boundaries, design patterns, and structural cohesion.
- [security.md](./security.md): Governs authentication, authorization, secret handling, and telemetry sanitization.
- [database.md](./database.md): Governs schema design, migration safety, and transactional integrity.
- [frontend.md](./frontend.md): Governs component architecture, state management, and accessibility.
- [backend.md](./backend.md): Governs server-side architecture, controller/service layers, and middleware.
- [api-design.md](./api-design.md): Governs API contracts, payload schemas, and versioning.
- [testing.md](./testing.md): Governs testing methodologies, regression testing, and quality gates.
- [documentation.md](./documentation.md): Governs technical documentation and architecture records.
- [git-workflow.md](./git-workflow.md): Governs commit practices and atomic version control.
- [deployment.md](./deployment.md): Governs release engineering, build artifact verification, and environment configuration.
