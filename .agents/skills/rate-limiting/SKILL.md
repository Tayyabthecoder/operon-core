---
name: rate-limiting
description: Designs, implements, and verifies rate-limiting controls for APIs and applications, including per-user, per-IP, per-tenant, and per-endpoint limits, authentication abuse prevention, algorithm selection, distributed enforcement, response headers, monitoring, and testing. Use when protecting endpoints against brute-force attempts, excessive requests, automated abuse, resource exhaustion, or unfair consumption while maintaining legitimate access.
---

# Rate Limiting Skill

This skill teaches the AI coding agent to assess, design, implement, test, and maintain rate-limiting controls across diverse architectures while preserving legitimate access, system availability, application correctness, and user privacy.

## 1. Purpose, Core Principles, and Rate Limiting Mindset

The central mandate of rate limiting is:
**Apply rate limits according to the actual risk and resource being protected, enforce them at the appropriate trusted boundary, and preserve legitimate access, application correctness, privacy, and availability.**

Adhere to seven foundational principles:
- **Proportionality**: Calibrate limits to demonstrated resource costs and real usage peaks.
- **Trusted Boundaries**: Enforce checks at layers that reliably verify client identities.
- **Identity Accuracy**: Choose identifiers that resist spoofing without punishing shared NATs.
- **Fair Resource Sharing**: Prevent single tenants from degrading overall system performance.
- **Fail-Safe Design**: Define explicit fail-open or fail-closed behaviors for outages.
- **Client Empathy**: Deliver standard 429 semantics, retry headers, and backoff guidance.
- **Observability**: Measure baseline traffic, monitor throttles, and verify with data.

*Scope Boundary*: Focuses on rate limiting and throttling. For data caching, use [caching-strategy](../caching-strategy/SKILL.md); for security audits, use [security-review](../security-review/SKILL.md); for APIs, follow [backend-development](../backend-development/SKILL.md) and [api-development](../api-development/SKILL.md); for repo rules, follow [security.md](../../rules/security.md) and [api-design.md](../../rules/api-design.md).

## 2. Scope and Trigger Scenarios

### Trigger Scenarios
Activate this skill when:
- **Auth & Sensitive Routes**: Securing login, password reset, MFA, or signup from brute-force.
- **Resource-Heavy Endpoints**: Protecting expensive search, report exports, AI, or batch runs.
- **Multi-Tenant Fair Use**: Preventing aggressive API consumers from exhausting shared pools.
- **Abuse Mitigation**: Curtailing automated content scrapers or inventory hoarders.
- **Third-Party Quotas**: Regulating outbound calls to external APIs with strict vendor limits.

### When NOT to Use This Skill
Do not use this skill for:
- Primary authentication or access control (use [security-review](../security-review/SKILL.md)).
- Slow queries lacking indexes (use [database-query-optimization](../database-query-optimization/SKILL.md)).
- Masking unoptimized database reads (use [caching-strategy](../caching-strategy/SKILL.md)).
- Volumetric network DDoS defense (defer to network infrastructure, cloud WAFs, or CDN edge).

| Activity | Primary Skill | Supporting Skills |
| :--- | :--- | :--- |
| **Assess & design rate limiting** | `rate-limiting` | `security-review` |
| **Protect auth & login routes** | `rate-limiting` | `backend-development` |
| **Implement caching & offload** | `caching-strategy` | `database-query-optimization` |
| **Configure gateway headers** | `rate-limiting` | `cross-cutting-concerns` |
| **Monitor throttles & alerts** | `rate-limiting` | `logging-monitoring` |

## 3. Distinguishing Rate Limiting from Complementary Controls

Rate limiting operates alongside other defense-in-depth mechanisms:
- **Caching**: Eliminates repeated computation; rate limiting restricts execution frequency.
- **Concurrency Limiting**: Caps simultaneous active requests; rate limiting caps calls per window.
- **Input Validation & Timeouts**: Rejects malformed or slow runs; rate limiting rejects excessive volume.
- **Authentication & RBAC**: Verifies identity; rate limiting controls request execution speed.
- **WAF / Edge Protection**: Shields network infra; app rate limiting protects business logic.

## 4. Threat Modeling and Business Workload Requirements

Model threats and quantify legitimate workload characteristics:
- **Threat Identification**: Map risks: credential stuffing, enumeration, scraping, and DoS.
- **Traffic Profiling**: Measure typical volume, peak bursts, and normal usage for real users.
- **Cost Variance**: Differentiate cheap lookups (sub-ms) from heavy reports (multi-second).
- **Asymmetric Impact**: Flag cheap requests that incur severe server resource load.

## 5. Inspecting Architecture and the Request Path

Evaluate the request path to identify optimal enforcement points:
- **Edge / CDN Layer**: Filters broad attacks, absorbs global IP floods before origin.
- **Reverse Proxy / Gateway**: Enforces per-client quotas and IP limits across services.
- **Application Middleware**: Enforces tenant-aware, user-aware, and route-specific logic.
- **Upstream Topology**: Map trusted load balancers, proxies, and store latencies (e.g., Redis).

## 6. Choosing the Correct Limiting Identity & Key Formulation

Select rate-limiting keys that target abuse while protecting shared networks:
- **Authenticated User**: Use internal user IDs (`usr:{id}`) for authenticated sessions.
- **Tenant / Organization**: Use tenant keys (`org:{id}`) for multi-tenant fair-share quotas.
- **Client API Key**: Use authenticated API keys (`key:{id}`) for external integrations.
- **Client IP Address**: Use normalized IPs (`ip:{hash}`) strictly for unauthenticated routes.
- **Composite Keys**: Combine dimensions (`auth:{route}:{ip}:{user_hash}`) on sensitive targets.

## 7. Rate-Limiting Algorithms and Architectural Trade-offs

Select algorithms aligned with system requirements and resource constraints:
- **Fixed Window**: Clock-aligned counter; minimal memory, but permits $2\times$ burst at edges.
- **Sliding Window Log**: Stores timestamped entries; precise, but memory scales with volume.
- **Sliding Window Counter**: Weighted sum of windows; low memory, smooth borders, low error.
- **Token Bucket**: Constant token refill with burst capacity; flexible and ideal for REST APIs.
- **Leaky Bucket**: Enqueues and drains at constant rate; smooths bursts, ideal for workers.

## 8. Defining Endpoint-Specific Policies

Apply calibrated policies tailored to specific endpoint risk profiles:
- **Public Read Endpoints**: High capacity token bucket for bursts (e.g., 300 req/min, burst 50).
- **Standard Mutations**: Moderate capacity sliding counter (e.g., 60 writes/min per user).
- **Expensive Computations**: Strict quotas and low burst limits (e.g., 5 report exports/min).
- **Public Search & Autocomplete**: Balanced token bucket for typing (e.g., 120 queries/min).

## 9. Protecting Authentication and Account-Recovery Endpoints

Secure identity endpoints against automated credential abuse:
- **Dual-Key Enforcement**: Track attempts by client IP and target account identifier.
- **Prevent Account Lockout DoS**: Throttle IP to block attackers without locking out owners.
- **Tiered Throttling**: Allow 5 rapid tries, add progressive delays, require CAPTCHA at 10.
- **Constant-Time Rejections**: Ensure rate-limited responses execute with uniform timing.

## 10. Preserving Legitimate Access While Mitigating Abuse

Maintain system usability for authentic human and machine clients:
- **Sufficient Headroom**: Set standard user limits at $3\times$ to $5\times$ normal peak usage.
- **Allowlists & Exemptions**: Exempt health checks, core infrastructure, and verified webhooks.
- **Corporate NAT Awareness**: Avoid tiny global IP limits that block whole offices or campuses.
- **Graceful Degradation**: Add progressive delays or partial capability drops before hard 429s.

## 11. Enforcing Limits at Trusted Architecture Boundaries

Maintain strict security boundaries when evaluating request context:
- **Trusted Upstream Origin**: Parse proxy headers only when connection comes from trusted proxy.
- **Direct Edge Rejection**: Reject direct external calls that bypass reverse proxy or CDN edge.
- **Header Stripping**: Ensure perimeter gateways strip and rewrite incoming identity headers.
- **Internal Microservices**: Use mutual TLS or internal tokens for service-to-service limits.

## 12. Resolving Client IP Addresses and Proxy Headers Safely

Extract client IP addresses safely to prevent header spoofing vulnerabilities:
- **Avoid Blind Trust**: Never trust `X-Forwarded-For` or `Client-IP` directly from public clients.
- **Right-to-Left Traversal**: Walk `X-Forwarded-For` right-to-left, picking first untrusted hop.
- **IPv6 Subnet Aggregation**: Group IPv6 addresses into `/64` subnets to prevent rotation exploits.
- **IP Anonymization**: Hash or truncate client IPs in rate-limit stores for privacy laws.

## 13. Distributed Rate Limiting and Multi-Instance State

Synchronize rate-limit state across horizontally scaled application instances:
- **Centralized In-Memory Store**: Use clustered in-memory stores (e.g., Redis) for shared state.
- **Atomic State Updates**: Execute checks and increments atomically via Lua scripts or `EVALSHA`.
- **Cluster Hash Tagging**: Enclose key prefixes in curly braces (`{tenant:123}:rl`) for Redis.
- **Local L1 Optimization**: Use short-lived local memory caches to filter floods before Redis.

## 14. Constructing Standard Rate-Limit HTTP Responses

Return standard, structured HTTP responses when requests exceed configured limits:
- **HTTP Status Code**: Always return `429 Too Many Requests` on throttled calls.
- **Structured Error Body**: Provide standard JSON detailing code, message, and retry window.
- **Consistent Error Contract**: Match existing API error contracts (e.g., RFC 7807).
- **Sanitized Payloads**: Never expose internal rate-limiter keys or server topologies.

```json
{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please slow down.","retry_after_seconds":30}}
```

## 15. Standard Rate-Limit Headers and Client Retry Semantics

Inform clients of quota consumption and retry parameters via standardized HTTP headers:
- **Standard Header Suite**: Return IETF `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.
- **Retry-After Header**: Provide `Retry-After` header in 429 responses indicating seconds to reset.
- **Legacy Compatibility**: Include legacy headers (`X-RateLimit-*`) when backward support is needed.
- **Client Backoff Guidance**: Advise API consumers to use exponential backoff with full jitter.

## 16. Operation Cost Weighting and Fair Usage Controls

Allocate rate quotas based on computational cost rather than simple request counts:
- **Weighted Consumption**: Deduct tokens by backend effort (1 token for GET, 10 for PDF export).
- **Payload-Based Costing**: Scale deduction by batch payload size or query complexity.
- **Tiered Subscriptions**: Allocate expanded quotas and burst buffers to higher customer tiers.
- **Prevent Quota Hoarding**: Ensure heavy operations cannot starve basic health or ping endpoints.

## 17. Background Jobs, Asynchronous Queues, and External Services

Govern throughput across asynchronous and outbound system components:
- **Outbound API Throttling**: Enforce token buckets on clients calling third-party APIs.
- **Queue Consumer Throttling**: Throttle worker consumption when downstream databases show load.
- **Dynamic Worker Concurrency**: Adjust background worker pool size based on target latency.
- **Dead-Letter Handling**: Route repeatedly throttled jobs to dead-letter queues with backoff.

## 18. Rate-Limiter Storage and State Lifecycle Management

Manage state persistence, memory footprints, and key lifecycle hygiene:
- **Strict TTL Enforcement**: Ensure every counter key has an explicit TTL matching window duration.
- **Memory Expiration Policies**: Configure Redis with `volatile-ttl` or `volatile-lru` eviction.
- **Key Namespace Isolation**: Prefix keys cleanly (e.g., `rl:v1:{scope}:{target}`) to avoid collisions.
- **TTL Expiration Jitter**: Add random jitter to TTLs on high-frequency keys to avoid mass expirations.

## 19. Defining Failure Behavior and Fallback Strategies

Establish resilient behavior when the rate-limiter infrastructure experiences degradation:
- **Fail-Open Strategy**: Permit requests if state store times out, protecting general uptime.
- **Fail-Closed Strategy**: Reject requests on storage failure for high-risk targets (auth, billing).
- **Circuit Breaker Integration**: Trip circuit breaker to bypass limiter if store latency $> 20$ms.
- **Local Fallback**: Fall back to in-memory local limits within process if shared cache drops.

## 20. Configuration, Environment Scoping, and Policy Management

Maintain flexible, environment-aware rate-limiting configurations:
- **Centralized Declarations**: Define limits in structured config files, env variables, or flags.
- **Environment Parity**: Retain rate limiting in test environments using elevated limits.
- **Dynamic Reconfiguration**: Support updating thresholds at runtime without redeployment.
- **Route Annotations**: Use declarative middleware or decorators to attach policies cleanly.

## 21. Observability, Telemetry, and Abuse Detection

Monitor rate-limiting operations to detect attacks and calibrate system thresholds:
- **Key Telemetry Metrics**: Track total checks, allowed requests, throttled 429s, and latency.
- **Structured Audit Logging**: Emit structured log on 429 events with route, key, and masked IP.
- **Abuse Alerting**: Trigger real-time alerts when 429 rates spike beyond statistical baselines.
- **Diagnostic Dashboards**: Build charts showing quota use, top throttled routes, and store latency.

## 22. Testing Rate-Limiting Controls and Resilience

Verify rate-limiting behavior thoroughly with automated testing suites:
- **Boundary Verification**: Test request sequences at limit ($N$) and over limit ($N+1$) for rejection.
- **Deterministic Time Mocking**: Use mock clocks to verify window resets without real sleeps.
- **Header Assertions**: Verify `429` status code, `Retry-After`, and `RateLimit-*` headers in tests.
- **Concurrency & Failure**: Run concurrent tests for atomic updates and mock store disconnects.

## 23. Client-Side Experience and End-to-End Resilience

Design frontend and client consumers to handle rate limits gracefully:
- **Interception & Parsing**: Intercept 429 responses in HTTP clients and read `Retry-After` seconds.
- **User-Friendly UI Feedback**: Display respectful countdown timers instead of generic error toasts.
- **Button Throttling**: Disable submission buttons temporarily after clicks to avoid double-posts.
- **Automated Client Retry**: Implement exponential backoff with full jitter for idempotent requests.

## 24. Security and Privacy Invariants

Uphold strict security and data protection standards in rate-limiting logic:
- **Privacy Compliance**: Hash or truncate client IPs in persistent stores to satisfy privacy laws.
- **Prevent Information Leaks**: Do not reveal internal IDs, cluster IPs, or capacities in errors.
- **URL Canonicalization**: Normalize paths (lowercase, strip trailing slashes) to prevent route bypass.
- **Memory Exhaustion Defense**: Reject oversized headers or query parameters before building keys.

## 25. Performance Optimization and Overhead Mitigation

Ensure rate-limiting checks add minimal overhead to the request path:
- **Low Latency Target**: Rate checks should complete in under 3ms of total request execution time.
- **Pipeline Execution**: Combine counter check, increment, and TTL in a single network round-trip.
- **Connection Pooling**: Reuse persistent, non-blocking connection pools to shared state stores.
- **Selective Evaluation**: Apply rate limiting after static file routing and health probes.

## 26. Coordinating Multi-Layer Enforcement

Harmonize rate-limiting controls across multiple architecture tiers:
- **Perimeter Edge**: CDN/WAF absorbs broad IP floods, geographical blocks, and volumetric DDoS.
- **Reverse Proxy / Ingress**: Nginx/Envoy enforces coarse per-IP connection and unauthenticated limits.
- **Application Middleware**: Backend enforces user, tenant, and cost-weighted business logic quotas.
- **Clear Responsibility**: Document specific threat models and quotas assigned to each layer.

## 27. Recommended 11-Phase Rate-Limiting Workflow

```mermaid
flowchart LR
    P1["1: Threat Model"] --> P2["2: Inspect Path"] --> P3["3: Select Identity"] --> P4["4: Pick Algorithm"] --> P5["5: Define Policies"] --> P6["6: Configure Store"] --> P7["7: Implement Logic"] --> P8["8: Add Headers"] --> P9["9: Fail-Safe Mode"] --> P10["10: Automated Tests"] --> P11["11: Monitor & Report"]
```

- **Phases 1-3 (Identify, Inspect & Identity)**: Map threats, trace request path, and pick trusted keys.
- **Phases 4-6 (Algorithm, Policies & Store)**: Select algorithm, define thresholds, configure store TTL.
- **Phases 7-9 (Implement, Headers & Resilience)**: Write middleware, output IETF headers, set fail-safe.
- **Phases 10-11 (Test, Monitor & Report)**: Validate boundaries, configure alerts, and write report.

## 28. Definition of Done

A rate-limiting implementation is complete only when all criteria are satisfied:
- [ ] 1. **Threat Model Defined**: Identified target risks, sensitive endpoints, and baseline traffic.
- [ ] 2. **Trusted Boundary Verified**: Keys use validated user IDs, tenant IDs, or safe client IPs.
- [ ] 3. **Algorithm & Capacity Calibrated**: Selected algorithm supports real bursts without abuse.
- [ ] 4. **Atomic Counter Updates**: Distributed state updates execute atomically without race conditions.
- [ ] 5. **Standard Headers & Response**: Returns `429`, standard error JSON, and `Retry-After` header.
- [ ] 6. **Resilience & Fallback Proven**: Fail-open or fail-closed behavior operates reliably on outages.
- [ ] 7. **Automated Tests Passing**: Unit, integration, concurrency, and time-mocked tests verify logic.

## 29. Standardized Completion Report Template

```markdown
# Rate Limiting Report: [Feature / Endpoint]
## 1. Context & Architecture
- **Target Endpoints**: [List of protected routes and methods]
- **Threat Vector**: [Brute-force, resource exhaustion, scraping, noisy neighbor]
- **Enforcement Layer & Key**: [e.g., Express middleware; Redis sliding window; `auth:login:{ip_hash}:{user_hash}`]
- **Capacity Policy**: [e.g., 5 requests / 60 seconds; Token bucket 100 capacity, 10 tokens/sec refill]
## 2. Resilience, Response & Storage
- **Headers & Response**: [429 Too Many Requests; `RateLimit-*`, `Retry-After`]
- **Failure Mode**: [Fail-open for general API; Fail-closed for auth routes; 15ms Redis timeout]
- **Storage & TTL**: [Redis cluster with atomic Lua scripts; TTL = window + 10s buffer]
## 3. Verification & Metrics
| Scenario | Rate | Expected | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | 3/min | 200 OK | 200 OK | PASS |
| **Limit** | 5/min | 200 OK | 200 OK | PASS |
| **Exceeded** | 6/min | 429 Too Many | 429 (Retry-After: 55) | PASS |
| **Store Down** | Down | Fail-closed | Fail-closed executed | PASS |
```

## 30. Avoiding Overengineering and Rate-Limiting Anti-Patterns

Avoid these common rate-limiting anti-patterns:
- Applying blanket rate limits across all endpoints regardless of operational cost.
- Trusting raw client-supplied `X-Forwarded-For` headers without verifying proxy hop trust.
- Using unbounded in-memory maps in multi-instance deployments causing memory leaks.
- Locking user accounts across all IPs when an attacker brute-forces an account from one IP.
- Setting rate limits so strictly that normal users experience false-positive 429s at peak.
- Failing closed on non-critical endpoints, causing full site outages during cache blips.

## 31. Cross-Skill Coordination and Alignment

Coordinate rate limiting seamlessly with other engineering competencies:
- **Backend & APIs**: Use [backend-development](../backend-development/SKILL.md) and [api-development](../api-development/SKILL.md) for router middleware.
- **Security & Authorization**: Consult [security-review](../security-review/SKILL.md) for auth protection and audits.
- **Caching**: Pair with [caching-strategy](../caching-strategy/SKILL.md) to decouple cache offload from throttling.
- **Observability**: Use [logging-monitoring](../logging-monitoring/SKILL.md) for 429 telemetry and alerts.
- **QA & Testing**: Follow [testing-qa](../testing-qa/SKILL.md) for boundary and failure tests.
- **Incident Response**: Execute playbooks under attack via [incident-response](../incident-response/SKILL.md).

## 32. Repository Rules Alignment and 10-Point Validation Checklist

Ensure all implementations conform to repository standards:
- **Rules**: [security.md](../../rules/security.md), [api-design.md](../../rules/api-design.md), [backend.md](../../rules/backend.md), [change-safety.md](../../rules/change-safety.md), [core-workflow.md](../../rules/core-workflow.md).
- **Supporting Skills**: [backend-development](../backend-development/SKILL.md), [security-review](../security-review/SKILL.md), [caching-strategy](../caching-strategy/SKILL.md), [cross-cutting-concerns](../cross-cutting-concerns/SKILL.md).

### 10-Point Rate Limiting Validation Checklist

- [ ] 1. **Verified Threat Model**: Documented specific abuse vector and confirmed need for rate controls.
- [ ] 2. **Accurate Limiting Key**: Keys correctly isolate authenticated users, tenants, or validated client IPs.
- [ ] 3. **Trusted Proxy Resolution**: IP resolution verifies proxy chain trust without trusting raw client headers.
- [ ] 4. **Calibrated Algorithm**: Selected algorithm (Token Bucket, Sliding Window) accommodates normal traffic bursts.
- [ ] 5. **Atomic State Storage**: Multi-instance counters update atomically in fast in-memory stores via Lua scripts.
- [ ] 6. **Strict Key TTLs**: All counter keys expire automatically matching window durations with safety buffers.
- [ ] 7. **Standard HTTP 429**: Returns `429 Too Many Requests` with standard error JSON and `Retry-After` header.
- [ ] 8. **Resilient Fallback Mode**: Fail-open or fail-closed behavior functions predictably during store disconnects.
- [ ] 9. **Privacy Preserved**: Client IP addresses are hashed or anonymized before persistent storage and logging.
- [ ] 10. **Automated Verification**: Boundary tests, race condition tests, and mock clock tests pass reliably.
