---
trigger: model_decision
description: Apply backend engineering standards when implementing or reviewing server-side business logic, request handlers, middleware, APIs, validation, authorization, asynchronous operations, error handling, and external integrations.
---

# Backend Engineering and Server-Side Operational Standards

This rule defines standards for designing, implementing, modifying, and reviewing server-side business logic, request handling, API contracts, middleware, asynchronous processing, error handling, and external integrations. Apply these guidelines to ensure reliable, secure, maintainable, and performant backend services across any framework or runtime.

## 1. Understand the Existing Backend

- **Inspect Established Architecture**: Review existing routing tables, middleware pipelines, controllers, service layers, repositories, and domain models before authoring backend changes.
- **Trace the Request Pipeline**: Understand how incoming requests are authenticated, authorized, validated, processed by business logic, persisted, and serialized into responses.
- **Follow Framework Idioms**: Adhere to the established architectural patterns and conventions of the project's actual framework and runtime (e.g., Express, Fastify, NestJS, Spring Boot, Django, FastAPI, ASP.NET Core, Go gin/chi).
- **Reuse Existing Services**: Extend existing domain services, helper utilities, middleware, and API clients rather than duplicating functionality.
- **Avoid Over-Layering**: Do not introduce unnecessary abstraction layers (e.g., redundant proxies, extra micro-services, or complex factory patterns) for straightforward operations.

## 2. Separation of Responsibilities

- **Focused Request Handlers**: Keep controllers and route handlers thin. Limit their responsibility to HTTP/transport concerns: parameter extraction, delegating to domain services, and returning appropriate HTTP responses.
- **Centralize Business Rules**: Place reusable business rules and state machines inside dedicated domain services or entity models. Never scatter identical business checks across multiple controllers, cron jobs, and background workers.
- **Decouple Persistence**: Keep database queries and ORM mappings inside repository or data access layers; do not leak raw persistence logic into controllers or presentation layers.
- **Acyclic Dependency Structure**: Keep dependencies between backend modules explicit and acyclic. Never introduce circular module dependencies.

## 3. Request Lifecycle and Middleware Pipeline

- **Ordered Pipeline Registration**: Register middleware in strict logical sequence (e.g., security headers, CORS, body parsing, request tracing, authentication, rate limiting, validation, route handler, and centralized error handling).
- **Appropriately Scoped Middleware**: Apply specialized middleware (e.g., strict authentication or rate limits) to specific routes rather than running heavy middleware globally across every request.
- **Safe Middleware Execution**: Ensure middleware failures terminate requests cleanly with standardized error responses and never bypass subsequent security checks or unhandled exception handlers.
- **Safe Request Context**: Keep request-scoped metadata (user session, correlation ID, tenant context) strictly isolated per request to prevent cross-request state leakage under high concurrency.

## 4. Input Validation & Data Contracts

- **Zero Client Trust**: Treat all incoming data (request bodies, query parameters, route parameters, headers, and file metadata) as untrusted.
- **Schema-Driven Validation**: Validate every endpoint payload against explicit, typed schemas using the project's established validation library (e.g., Zod, Pydantic, class-validator, Joi, FluentValidation).
- **Enforce Constraints**: Validate required fields, data types, string lengths, numeric ranges, allowed enum values, and structural formats before passing data to business services.
- **Clear Error Feedback**: Reject invalid payloads with consistent 400 Bad Request responses providing clear, field-level error messages without disclosing sensitive internal details.
- **Verify Critical Identifiers**: Never trust client-supplied user IDs, role names, tenant IDs, prices, or permission flags without verifying them against trusted server-side session state.

## 5. Business Logic Integrity & Invariants

- **Explicit Domain Rules**: Implement business logic in clear, testable, and deterministic functions or domain classes.
- **State Transition Safeguards**: Validate entity state transitions (e.g., preventing transitions from `shipped` back to `pending`, or processing duplicate payments) before applying state changes.
- **Protect Constrained Invariants**: Enforce strict invariants for constrained resources (e.g., account balances, inventory deductions, booking slots, seat reservations, usage quotas).
- **No Synthetic Success**: Never report HTTP 200/201 success if an underlying operation failed or only partially succeeded.
- **Address Ambiguities**: When requirements are underspecified or ambiguous regarding critical business logic, stop and seek clarification rather than guessing a potentially hazardous implementation.

## 6. API Design and REST/RPC Contracts

- **Predictable Endpoints**: Follow the project's established API naming conventions, URI hierarchies, HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), and standard HTTP status codes.
- **Consistent Response Schemas**: Return uniform envelope or payload structures across success and error responses.
- **Strict Collection Pagination**: Implement cursor-based or bounded offset/limit pagination on collection endpoints to prevent unbounded data retrieval and memory exhaustion.
- **Contract Stability**: Preserve existing API contracts and payload structures. Never introduce breaking changes without explicit task authorization and documented migration paths.
- **Data Minimization in Responses**: Return only the specific attributes authorized for the caller; filter out internal flags, password hashes, and sensitive audit details.
- **Document Changes**: Document material changes to API contracts using the project's existing documentation or OpenAPI/Swagger specifications.

## 7. Authentication and Authorization Integration

- **Authenticate First**: Verify the client's identity before executing protected route logic.
- **Enforce Fine-Grained Authorization**: Authorize operations on individual resources, verifying role permissions, tenant boundaries, and resource ownership on the server.
- **Deny by Default**: Apply least-privilege access; deny requests when permissions cannot be conclusively verified.
- **Cross-Reference Security Rules**: Refer to `security.md` for comprehensive authentication, authorization, and vulnerability-prevention standards.

## 8. Database Integration & Persistence Discipline

- **Parameterized Data Access**: Execute all database operations through parameterized queries, prepared statements, or safe ORM mappings; never concatenate untrusted strings into SQL.
- **Atomic Mutations**: Wrap multi-entity mutations that must succeed or fail together inside database transactions.
- **Prevent N+1 Queries**: Eliminate N+1 query patterns using eager joins, batch fetching, or DataLoader patterns.
- **Safe Error Masking**: Mask raw database exceptions, table structures, and connection details from client responses.
- **Cross-Reference Database Rules**: Refer to `database.md` for detailed schema, migration, transaction, and query performance requirements.

## 9. Robust Error Handling

- **Centralized Error Translation**: Translate domain exceptions and unexpected failures into standardized HTTP responses using centralized error-handling middleware.
- **Never Swallow Errors**: Never leave catch blocks empty, suppress errors, or catch generic `Exception` types without logging and handling.
- **Sanitized Client Errors**: Return safe, consistent error messages and error codes to clients. Never leak stack traces, database queries, internal IP addresses, or file system paths.
- **Preserve Diagnostic Context**: Log rich, structured diagnostics (including stack traces, error codes, and correlation IDs) internally for authorized investigation.
- **Idempotent Cleanup**: Ensure errors occurring in cleanup or `finally` blocks do not mask or overwrite the original root-cause exception.

## 10. Concurrency and Asynchronous Operations

- **Non-Blocking Execution**: Avoid blocking request-processing threads or the runtime event loop with heavy synchronous computation, thread sleeps, or synchronous file I/O.
- **Bound Parallel Work**: Throttle and bound concurrent operations (using worker pools, chunking, or semaphores) to prevent overwhelming databases or external APIs.
- **Prevent Race Conditions**: Guard concurrent read-modify-write operations using atomic database operations, optimistic concurrency locks, or distributed mutexes where justified.
- **Timeout & Cancellation Handling**: Propagate cancellation tokens and enforce timeouts on asynchronous tasks to prevent abandoned, dangling processes.

## 11. External Services and Third-Party Integrations

- **Strict Outbound Timeouts**: Configure explicit connect and read timeouts on all outbound HTTP/RPC client calls.
- **Resilient Retry Strategies**: Implement bounded retries with exponential backoff and jitter only for transient network errors and idempotent operations.
- **Circuit Breakers**: Apply circuit breaker patterns to prevent cascading failures when upstream third-party services suffer prolonged outages.
- **Validate Ingress from Webhooks**: Validate signatures, timestamps, and payload schemas for incoming third-party webhooks before processing.

## 12. Transactions, Consistency, and Side Effects

- **Tight Transaction Scopes**: Keep database transactions as short as possible. Never invoke external HTTP APIs, send emails, or perform slow I/O operations while holding open database transactions.
- **Post-Commit Side Effects**: Ensure external side effects (notifications, emails, message publishing) fire only after database transactions have successfully committed.
- **Reliable Messaging**: Use transactional outbox or reliable queue patterns when strong consistency between database state and published messages is required.

## 13. Logging, Observability, and Telemetry

- **Structured Logging**: Emit structured JSON logs containing timestamp, log level, event name, message, and contextual identifiers (correlation ID, request ID, user/tenant ID).
- **Redact Sensitive Information**: Ensure passwords, credit cards, authentication tokens, and PII are redacted prior to logging.
- **Appropriate Log Levels**: Use `DEBUG` for verbose diagnostic traces, `INFO` for significant lifecycle events, `WARN` for recoverable issues, and `ERROR` for unexpected failures.
- **Correlation ID Propagation**: Generate and propagate a unique correlation ID across all downstream services and logs for every incoming request.

## 14. Configuration and Environment Management

- **Externalized Configuration**: Store all environment-specific settings (database URLs, API keys, port numbers, log levels) in environment variables or secret vaults.
- **Startup Validation**: Validate all required configuration parameters at service boot; fail fast with clear errors if mandatory configurations are missing or invalid.
- **Zero Secrets in Code**: Never commit credentials, private tokens, or production URLs in code or default sample configs.

## 15. File Processing and Resource Management

- **Stream Large Payloads**: Stream file uploads and large data exports to disk or object storage; avoid buffering large files completely into memory.
- **Resource Lifecycle Management**: Ensure database connections, file handles, streams, and child processes are reliably closed in `finally` blocks or context managers.
- **Limit Request Sizes**: Enforce strict request body size limits at the gateway or middleware level to protect against memory exhaustion.

## 16. Background Jobs and Scheduled Execution

- **Offload Heavy Tasks**: Move operations exceeding standard HTTP latency expectations (e.g., report generation, batch email dispatch, video encoding) to background workers.
- **Idempotent Job Processing**: Ensure background jobs are idempotent and safe to retry automatically upon transient failure.
- **Dead-Letter Handling**: Direct repeatedly failing background jobs to dead-letter queues with actionable alerting rather than retrying indefinitely.

## 17. Performance and Resource Discipline

- **Eliminate Unnecessary Work**: Avoid redundant database queries, expensive object serialization, and excessive memory allocations.
- **Evidence-Based Caching**: Introduce caching (e.g., Redis, in-memory) only when justified by concrete read bottlenecks, and implement explicit cache-invalidation strategies.
- **Rate Limiting**: Apply rate limiting and resource throttling to protect expensive endpoints from abuse and accidental denial of service.

## 18. Testing and Backend Verification

- **Comprehensive Test Suite**: Maintain unit tests for domain business logic and integration tests for API routes, database transactions, and middleware pipelines.
- **Negative & Edge Path Verification**: Thoroughly test validation rejections, unauthorized requests, expired tokens, missing entities, and concurrent mutation conflicts.
- **Isolated Test Environments**: Run automated integration tests against isolated test databases or disposable containers; never run tests against production data.
- **Transparent Reporting**: Accurately report all executed backend verification checks, disclosing any unverified routes or external integrations.

## 19. Backend Decision Principles

When implementing server-side features:
1. **Correctness, Data Integrity & Security First**: Ensuring reliable business rules, authorization, and data integrity takes precedence over speed or aesthetic code minimalism.
2. **Framework Alignment**: Follow the idioms, lifecycle, and patterns of the established backend framework rather than introducing competing paradigms.
3. **Simplicity Over Distributed Complexity**: Prefer clean, maintainable modular service code over premature microservice decomposition or unprompted queue infrastructure.
4. **Resilience by Design**: Assume networks fail, external APIs experience outages, and client input is untrusted; design defensive, fault-tolerant backend workflows.
