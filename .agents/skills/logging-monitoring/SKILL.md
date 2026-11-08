---
name: logging-monitoring
description: Designs and maintains application logging, error tracking, health checks, metrics, tracing, alerts, and operational observability. Use when instrumenting application behavior, diagnosing production failures, improving error reporting, monitoring APIs and background jobs, implementing health endpoints, or investigating performance, availability, and reliability issues. Focuses on instrumenting a single application; for cross-service tracing, SLOs, and observability strategy, use observability instead.
---

# Logging and Monitoring Skill

This skill guides the AI coding agent to design, implement, evaluate, and troubleshoot application observability across local development, testing, staging, production, APIs, background jobs, databases, and distributed services. It ensures structured telemetry, protects sensitive data, prevents high-cardinality performance overhead, and provides actionable operational diagnostics.

## 1. Purpose and Core Principles

Observability allows developers and operators to understand an application's internal state through external telemetry (logs, metrics, traces, health checks, and alerts). Poor instrumentation creates alert fatigue, cost explosions, and security vulnerabilities. Adhere to four core principles:

### Observability Answers Meaningful Questions
- **Actionable Diagnostic Purpose**: Every log, metric, trace, and alert must answer a concrete question (e.g., "Are error rates rising?", "Is the database connection pool saturated?", "Which downstream API is degrading latency?").
- **Eliminate Vanity Telemetry**: Avoid emitting high-volume diagnostic logs that create operational noise without aiding problem resolution.

### Prefer Structured, Contextual Data
- **Structured Formats**: Prefer machine-readable JSON logs with consistent key-value fields over arbitrary, free-form text strings.
- **Contextual Correlation**: Correlate logs, traces, and metrics using consistent identifiers (`requestId`, `traceId`, `spanId`, `userId` hash).
- **Separate Diagnostics from User Errors**: Distinguish handled user input mistakes (4xx HTTP status) from unexpected system defects (5xx HTTP status).

### Protect Sensitive Information
- **Zero Secrets in Telemetry**: Never emit passwords, API tokens, session cookies, private keys, database credentials, or PII into logs, traces, metric labels, or alerts.
- **Redaction at Source**: Sanitize sensitive fields before serializing or transmitting logs to external aggregation providers.
- **Restricted Access**: Treat observability data as sensitive production records requiring strict access controls and retention policies.

### Verify Actual Operational Behavior
- **Differentiate Implemented from Verified**: Confirm that instrumentation actually emits events, endpoints respond correctly, and alerts trigger under simulated conditions.
- **Truthful Telemetry Reporting**: Never claim a dashboard, alert rule, or monitoring integration is functional without verified execution evidence.

*Scope Boundary*: Focuses on logs, metrics, tracing, health checks, and alerting. For application bug resolution, use [debugging](../debugging/SKILL.md); for performance profiling, use [performance-optimization.md](../../rules/performance-optimization.md); for configuration settings, use [environment-configuration](../environment-configuration/SKILL.md); for deployments, refer to [deployment.md](../../rules/deployment.md).

## 2. When to Use This Skill

### Trigger Scenarios
Activate this skill whenever:
- **Adding or Standardizing Logs**: Implementing structured application loggers, context middleware, or log formatters.
- **Instrumenting APIs & Requests**: Tracking incoming HTTP requests, duration, route templates, status codes, and correlation headers.
- **Error Tracking & Diagnostics**: Setting up global exception handlers, capturing unhandled rejections, and integrating error trackers.
- **Health & Readiness Endpoints**: Creating liveness (`/healthz`) and readiness (`/ready`) probes for container orchestrators.
- **Operational Metrics**: Instrumenting request rates, error rates, latencies (p95, p99), and resource saturation.
- **Distributed Tracing**: Propagating W3C Trace Context and instrumenting spans across microservices or queues.
- **Background Jobs & Queues**: Monitoring worker latency, queue backlog depth, execution retries, and terminal job failures.
- **Alert Design & Incident Detection**: Designing actionable alerting rules with explicit thresholds and runbooks.

### When NOT to Use This Skill
Do not use this skill for:
- Writing feature business logic (use [backend-development](../backend-development/SKILL.md) or [frontend-development](../frontend-development/SKILL.md)).
- Debugging general application bugs unrelated to telemetry infrastructure (use [debugging](../debugging/SKILL.md)).
- Writing automated functional test suites (use [testing-qa](../testing-qa/SKILL.md)).
- Provisioning cloud monitoring infrastructure from scratch (use infrastructure-as-code tooling).

## 3. Observability Stack Discovery

Before modifying instrumentation, inspect the existing setup across 10 discovery points:
1. **Logging Library**: What framework is used (e.g., Winston, Pino, Logback, Python `logging`, Zap)?
2. **Log Destination**: Are logs written to `stdout`/`stderr`, local files, or forwarded via an agent (FluentBit, Datadog)?
3. **Format & Schema**: Are logs emitted as plain text or structured JSON?
4. **Context Propagation**: Does the application generate or forward a `requestId` or W3C `traceparent` header?
5. **Error Tracking**: Is an external error reporting service configured (e.g., Sentry, Bugsnag, Cloud Error Reporting)?
6. **Health Endpoints**: Do `/health`, `/live`, or `/ready` endpoints exist, and what dependencies do they check?
7. **Metrics Collection**: Are metrics exported (e.g., Prometheus `/metrics`, OpenTelemetry, CloudWatch, Datadog)?
8. **Distributed Tracing**: Is OpenTelemetry or APM tracing active? What is the configured sampling rate?
9. **Environment Differences**: How does logging verbosity differ across dev, test, staging, and production?
10. **Redaction Controls**: What sanitization mechanisms exist to strip secrets and PII from outgoing telemetry?

## 4. Logging Levels and Severity Classification

Select logging levels based on operational significance rather than convenience:

| Level | Operational Meaning | Example Scenario |
| :--- | :--- | :--- |
| **TRACE** | Fine-grained internal execution steps; dev only | Method entry/exit, loop variables |
| **DEBUG** | Diagnostic info for troubleshooting | Cache hits/misses, payload sizes |
| **INFO** | Normal lifecycle milestones; production standard | Service started, user logged in, job done |
| **WARN** | Unexpected condition; operation still succeeded | Deprecated API call, retry attempt, high memory |
| **ERROR** | Operation failed; requires developer investigation | DB query failure, unhandled exception, 500 error |
| **FATAL** | System unrecoverable; process terminating | DB connection lost on boot, panic, memory OOM |

### Golden Rules for Log Levels
- **Never Log User Errors at ERROR**: Invalid input (400, 422) is handled user behavior; log at `WARN` or `INFO`.
- **Single-Layer Logging**: Log an error where it is handled or at the boundary. Never re-log the same exception at every layer of the call stack.
- **Prevent Log Storms**: Throttle or deduplicate logs for recurring background failures to avoid flooding storage.

## 5. Structured Logging Architecture

Emit logs as structured key-value objects rather than concatenated text strings:

```json
{
  "timestamp": "2026-10-24T11:42:00.123Z",
  "level": "error",
  "event": "loan_renewal_failed",
  "service": "api-service",
  "env": "production",
  "requestId": "req_8f9c1b2a",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "loanId": "loan_10293",
  "durationMs": 42,
  "error": { "name": "DatabaseTimeoutError", "code": "DB_TIMEOUT" }
}
```

### Structured Schema Standards
- **Standard Field Names**: Use consistent keys across all services (`timestamp`, `level`, `service`, `env`, `event`, `durationMs`).
- **Bounded Payloads**: Log specific relevant IDs (`loanId`, `userId`), never serialized domain objects or full database entities.
- **Zero Full-Body Dumps**: Never log raw HTTP request or response bodies by default; they frequently contain credentials or large binary data.

## 6. Request Logging and Distributed Correlation

Track incoming requests to understand latency, error rates, and traffic patterns:
- **HTTP Metadata**: Method (`GET`), Route Template (`/api/v1/loans/:id` - avoid raw URLs with query secrets), Status Code (`200`), Duration (`42ms`).
- **Correlation Context**: Accept incoming `X-Request-ID` or generate a UUID if missing. Attach `requestId` to every subsequent log within that execution context.
- **Distributed Trace Context**: Respect W3C Trace Context (`traceparent`) to connect frontend calls to backend services and background workers.
- **Sanitized Headers**: Log user-agent and IP (where permitted by privacy rules); strictly exclude `Authorization`, `Cookie`, and `Set-Cookie`.

## 7. Exception Handling and Error Observability

Distinguish user-facing error responses from internal diagnostic observability:
1. **User-Facing Layer (Application)**: Return clean, predictable error envelopes with non-sensitive error codes and safe messages. Never leak stack traces, database schema details, or server paths to clients.
2. **Observability Layer (Telemetry)**: Capture the complete error context at the global boundary:
   - Full stack trace and error causal chain (`error.cause`).
   - Attached `requestId`, `userId` (sanitized), and route template.
   - Forward to error-tracking services (e.g., Sentry) with appropriate tag metadata.
   - Avoid swallowing errors silently with empty `catch` blocks.

## 8. Metrics, Operational Indicators & Cardinality Control

Metrics provide continuous aggregate visibility into application health over time:
- **Availability (Traffic & Errors)**: Request rate (RPS), HTTP error rate (5xx vs 4xx count), background job failure rate.
- **Latency (Duration)**: Percentile distributions (p50, p95, p99) for HTTP endpoints, database queries, and external APIs.
- **Saturation (Resource Limits)**: Database connection pool utilization, CPU/memory usage, worker thread utilization, queue backlog depth.

### The Cardinality Golden Rule
**Never use high-cardinality values as metric dimensions or labels.**
- *Forbidden Metric Labels*: `user_id`, `request_id`, `email`, `session_token`, raw URL path containing IDs (`/users/12345`), raw error messages.
- *Permitted Metric Labels*: `route` (`/users/:id`), `method` (`GET`), `status_code` (`200`), `env` (`production`), `error_type` (`ValidationError`).
- *Consequence*: High-cardinality labels create explosive metric series counts, crashing monitoring backends and incurring massive cloud costs.

## 9. Distributed Tracing & OpenTelemetry

Distributed tracing follows a request as it traverses microservices, databases, caches, and message queues:
- **Trace & Span Concepts**: A *Trace* represents the end-to-end journey; a *Span* represents a single operation within that journey (e.g., an HTTP handler, a SQL query).
- **Context Propagation**: Inject trace context into outgoing HTTP/gRPC headers and message queue metadata using standard W3C `traceparent`.
- **Sampling Strategy**: Trace collection adds network and storage overhead. Use head-based probabilistic sampling (sample 5-10% of successful requests) and 100% of error requests.
- **Span Sanitization**: Never attach sensitive parameters or database query variables as span attributes.

## 10. Service Health and Readiness Probing

Container orchestrators (Kubernetes, ECS, Cloud Run) depend on accurate health probes to manage process lifecycles:
- **Liveness Probe (`/healthz` or `/live`)**: Checks if process is responsive and not deadlocked. Orchestrator restarts container on failure. Never check downstream dependencies (DB, cache); a temporary DB outage must not trigger restart loops.
- **Readiness Probe (`/ready`)**: Checks if instance is initialized and able to process traffic. Orchestrator stops routing traffic on failure. Validate critical database connectivity and initialization state; return `503 Service Unavailable` if unready.
- **Startup Probe (`/startup`)**: For slow-starting applications (e.g., loading large caches or running safe migrations). Prevents premature liveness termination.

### Probe Safety Rules
- Keep probes lightweight; run fast, non-locking queries (e.g., `SELECT 1`).
- Never return sensitive infrastructure details or passwords in health probe responses.

## 11. Alerting and Incident Detection

Design alerts that indicate actionable customer or system impact rather than transient errors:
1. **User or Business Impact**: Alert on symptoms that affect users (e.g., error rate > 2% for 5m, p95 latency > 2s) rather than raw server counters.
2. **Actionability**: The alert must require human intervention. If no action is needed, it should be a dashboard metric, not an alert.
3. **Threshold Evaluation Window**: Evaluate conditions over time windows (e.g., 5-10 minutes) to eliminate noise from temporary network spikes.
4. **Documented Runbook**: Every alert must link to an actionable runbook detailing diagnostic commands and recovery steps.
5. **Deduplication**: Group alerts to prevent pager floods during widespread outages.

## 12. Background Jobs and Asynchronous Telemetry

Asynchronous tasks (queues, schedulers, cron jobs) require specialized telemetry:
- **Execution Milestones**: Log job enqueue, job start, job completion, and job failure.
- **Key Fields**: `jobName`, `jobId`, `queueName`, `durationMs`, `retryCount`, `maxRetries`.
- **Terminal Failures**: Explicitly flag when a job has exhausted its retries and moved to a Dead Letter Queue (DLQ).
- **Idempotency & Semantics**: Never let monitoring wrappers modify job retry logic or execute tasks twice.

## 13. Database and External Dependency Telemetry

Track interactions with databases, caches, and third-party APIs:
- **Database Metrics**: Track query latency, connection acquisition time, active pool connections, and transaction failures.
- **SQL Sanitization**: Mask all query parameter values in SQL logs (`SELECT * FROM users WHERE email = ?`). Never log plaintext parameter values.
- **Circuit Breakers**: Monitor circuit breaker states (`CLOSED`, `OPEN`, `HALF_OPEN`) and rate-limit headers (`Retry-After`) when communicating with third-party APIs.

## 14. Frontend and Client-Side Observability

Client-side monitoring captures real-world user performance and browser exceptions:
- **Error Tracking**: Capture unhandled JavaScript exceptions, unhandled Promise rejections, and failed API requests.
- **Performance**: Track Core Web Vitals (LCP, FID/INP, CLS) and page load timings.
- **Privacy Enforcement**: Strictly sanitize user input; never capture passwords, credit cards, or form field contents.
- **Source Maps**: Protect production source maps; do not publish unauthenticated source maps that reveal internal proprietary logic.

## 15. Privacy, Security, and Sensitive Data Redaction

Ensure strict compliance with data privacy standards (GDPR, HIPAA, PCI-DSS):
- **Redaction Catalog**: Strip or mask (`[REDACTED]`) passwords, tokens, API keys, JWTs, `Authorization` and `Cookie` headers, credit cards (PAN/CVV), and personal identity numbers.
- **Allowlist over Blocklist**: Explicitly define safe fields to log rather than attempting to filter infinite dynamic object keys.
- **Incident Protocol**: If a secret is logged, stop further exposure, deploy a redaction fix, revoke and rotate the credential, and coordinate log storage sanitization.

## 16. Performance Overhead, Buffering & Reliability

Observability must not degrade application performance or cause outages:
- **Asynchronous Logging**: Use asynchronous, non-blocking log output (worker threads or buffered streams).
- **Bounded Buffering**: Limit memory buffers for log transport. If the logging destination is unreachable, drop debug logs gracefully rather than exhausting process memory.
- **Fail-Open Strategy**: Application business logic must never fail solely because a log forwarder or metrics collector is offline (unless required for strict regulatory audit trails).

## 17. Environment-Specific Observability Configuration

Tailor telemetry behavior to the target deployment environment:
- **Development**: Pretty-printed console logs, `DEBUG` verbosity, local request timing.
- **Testing**: Silent or minimal logging to keep test suite output readable; in-memory metric registries; zero external alerts.
- **Staging**: Parity with production structured JSON logs and metric exporters; non-production alert channels.
- **Production**: Structured JSON logs to `stdout`, `INFO` default verbosity (`WARN`/`ERROR` for verbose subsystems), sampled distributed tracing, secure secret-store credentials, and production incident alerting.

## 18. Troubleshooting Telemetry Pipelines

When logs, metrics, or alerts fail to appear, follow this 5-step diagnostic flow:
1. **Define Symptom**: Identify exact issue (missing events, high latency, dropped traces).
2. **Trace Telemetry Path**: Check where data drops: application logger &rarr; transport buffer &rarr; network exporter &rarr; aggregation backend.
3. **Investigate Safely**: Check log level thresholds, exporter connectivity, and ingestion rate limits without exposing credentials.
4. **Apply Minimal Fix**: Adjust configuration, fix log level, or repair network permissions.
5. **Verify & Report**: Generate a test event, verify receipt in monitoring dashboard, and confirm redaction.

## 19. Practical Observability Decision Guide

| Scenario | Recommended Action | Safety Precaution |
| :--- | :--- | :--- |
| **API request failure** | Log error at boundary with `requestId`, status code, route template, and error stack. | Never log raw passwords or credentials from request body. |
| **Service latency spike** | Inspect p95 latency metrics, database query durations, and distributed trace spans. | Do not increase logging to DEBUG across production cluster. |
| **Container restarts in K8s** | Check liveness probe; ensure liveness does not query external databases. | Keep liveness lightweight and non-locking. |
| **Alerts flooding channel** | Increase evaluation window (5m); raise threshold; deduplicate alerts. | Ensure critical outages still page on-call engineers. |
| **Credential leaked in log** | Revoke credential; update code to redact field; deploy fix; sanitize log server. | Deleting local file does not clean remote log aggregators. |
| **Prometheus OOM crash** | Remove high-cardinality labels (`userId`, `url` with IDs) from metric series. | Use bounded enums for labels. |
| **Background job failing** | Log terminal failure with job type, duration, retry count, and DLQ reason. | Do not log full sensitive job payloads. |
| **Third-party API errors** | Track external call latency, error codes, and circuit breaker state. | Redact API keys and bearer tokens from request logs. |

## 20. Expected Completion Report Format

When completing an authorized observability task, provide a structured completion report:
- **Summary**: Description of observability improvement or issue addressed (e.g., "Added structured JSON request logging with W3C trace correlation").
- **Instrumentation Changes**: Specific loggers, middleware, health endpoints, or metric counters added or updated.
- **Data & Security Considerations**: Sensitive fields redacted, allowlisted metadata, and compliance safeguards.
- **Verification Results**: Status of tested log outputs, health probe responses, metric exports, and linters.
- **Operational Impact**: Estimated overhead, log volume considerations, and required process restart or container redeployment.
- **Remaining Gaps**: Any unconfigured downstream aggregation services, missing dashboard panels, or unverified alert integrations.

## 21. Alignment with Existing Rules and Skills

This skill operates in direct alignment with project rules and complementary skills:
- [security.md](../../rules/security.md): Governs logging sanitization, audit trails, and zero-secret policies.
- [change-safety.md](../../rules/change-safety.md): Mandates minimal blast radius and prevents breaking changes.
- [environment-configuration](../environment-configuration/SKILL.md): Manages observability log levels and exporter credentials via environment variables.
- [debugging](../debugging/SKILL.md): Leverages structured logs and error traces to isolate functional defects.
- [testing-qa](../testing-qa/SKILL.md): Validates health check endpoints and test-suite logging isolation.
- [backend-development](../backend-development/SKILL.md): Integrates request loggers, middleware, and database probes.
- [frontend-development](../frontend-development/SKILL.md): Manages client-side error boundaries and performance metrics.
- [deployment.md](../../rules/deployment.md): Directs container health probes and production log collection.
- [performance-optimization.md](../../rules/performance-optimization.md): Governs low-overhead telemetry and metric collection.

## 22. Final Validation Checklist

Before concluding any logging or monitoring task, verify each item:
- [ ] **Structured Format**: Logs emitted in clean, structured JSON with consistent field naming.
- [ ] **Appropriate Levels**: Log levels mapped accurately without user errors logged as system failures.
- [ ] **Zero Secrets Logged**: Passwords, tokens, session cookies, and sensitive PII completely redacted.
- [ ] **Cardinality Controlled**: High-cardinality values excluded from metric dimensions and labels.
- [ ] **Context Correlated**: Logs and traces carry consistent correlation IDs (`requestId`, `traceId`).
- [ ] **Probes Isolated**: Liveness probes lightweight and decoupled from downstream dependencies.
- [ ] **Actionable Alerts**: Alert thresholds based on sustained customer impact with runbooks attached.
- [ ] **Non-Blocking Execution**: Telemetry logging asynchronous without degrading hot execution paths.
- [ ] **User Work Preserved**: All uncommitted user modifications and existing configurations intact.
- [ ] **Truthful Reporting**: Completion report reflects verified telemetry without exposing secrets.
