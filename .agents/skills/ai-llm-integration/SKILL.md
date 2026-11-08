---
name: ai-llm-integration
description: Integrates large language models into applications using secure provider configuration, suitable model selection, request and response handling, streaming, structured outputs, tool calling, retries, rate-limit handling, validation, testing, monitoring, and cost management. Use when building, modifying, or troubleshooting applications that call LLM APIs or deploy AI-powered features.
---

# AI LLM Integration Skill

Integrate Large Language Models (LLMs) into applications safely, reliably, maintainably, and efficiently using secure provider configuration, suitable model selection, request and response handling, streaming, structured outputs, tool calling, fault-tolerant retries, and comprehensive observability.

## 1. Purpose, Core Principles, and LLM Engineering Mindset

The governing mandate of application LLM integration is:
**Use the right model and integration pattern for the task, protect credentials and user data, handle provider failures explicitly, validate model outputs, and measure quality, latency, and cost rather than making unsupported assumptions.**

Core operating principles:
- **Evidence Over Assumption**: Never presume a model is accurate, an API call succeeded, or an output is valid without verification.
- **Output Untrusted by Default**: Treat model-generated text, JSON, and tool arguments as untrusted user input before processing.
- **Credential & Privacy Hygiene**: Isolate API credentials server-side; minimize and sanitize data sent across provider boundaries.
- **Explicit Failure & Degradation**: Handle timeouts, rate limits, refusals, and outages with bounded retries and clean fallbacks.
- **Deterministic Separation**: Keep business rules, authorization checks, and financial math in deterministic application code.
- **Architectural Parsimony**: Build the simplest integration that satisfies requirements; avoid bloated multi-provider frameworks.

## 2. Target File, Scope, Boundaries, and Skill File Standards

This skill governs the end-to-end integration of LLMs within the repository:
- **Target File**: `.agents/skills/ai-llm-integration/SKILL.md` authored without numerical filename prefixes.
- **Integration Scope**: Provider selection, boundary design, request formatting, prompt isolation, schema validation, structured outputs, streaming, tool execution, error mapping, rate limiting, token budgeting, cost optimization, latency tuning, prompt injection defense, version lifecycles, testing, and observability.
- **Operational Boundaries**: Coordinates with [agentic-workflows](../agentic-workflows/SKILL.md) for multi-tool loops, [rag-systems](../rag-systems/SKILL.md) for document retrieval, and [api-development](../api-development/SKILL.md) for endpoints.
- **Skill Standards**: Valid YAML frontmatter with `name` and `description`; omit `trigger`.

## 3. Defining Purpose, Scope, and Probabilistic Boundaries

Surround generative models with deterministic safeguards across system layers:

| Architectural Pattern | Core Execution Model | Trust Boundary | Primary Failure Mode | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **LLM Integration** | Probabilistic token generation | Untrusted output | Hallucination, timeout, refusal | Semantic analysis, synthesis, extraction |
| **Deterministic Code** | Strict programmatic logic | Trusted domain rules | Syntax error, unhandled exception | Financial math, auth checks, schema constraints |
| **RAG System** | Retrieval + grounded generation | External corpus index | Retrieval miss, context overflow | Grounded Q&A against private document corpora |
| **Agentic Workflow** | Dynamic reasoning & tool loops | Multi-step state gates | Infinite retry, parallel collision | Complex multi-phase engineering tasks |

*Boundary Rule*: Never delegate authorization decisions, cryptographic operations, or database integrity enforcement to probabilistic models.

## 4. Selecting an Appropriate Provider and Model

Match the model tier to workload requirements rather than defaulting to expensive frontier models:

| Model Tier | Typical Context | Relative Cost | Latency Profile | Primary Target Workloads |
| :--- | :--- | :--- | :--- | :--- |
| **Frontier / Flagship** | $128\text{k} - 2\text{M}$ tokens | High (\$2.50–\$15.00/1M) | Moderate / Higher | Complex reasoning, deep analysis, code synthesis |
| **Mid-Tier / Standard** | $32\text{k} - 128\text{k}$ tokens | Medium (\$0.50–\$3.00/1M) | Fast (1–3s) | General summarization, chatbots, extraction |
| **Small / Lightweight** | $8\text{k} - 32\text{k}$ tokens | Low (\$0.05–\$0.50/1M) | Ultra-fast (<1s) | Classification, entity tagging, routing, linting |
| **Local / Edge** | $4\text{k} - 32\text{k}$ tokens | Hardware-only | Variable (GPU-bound) | Air-gapped privacy, zero egress, offline edge |

*Discipline*: Verify current documentation for model IDs, token limits, and pricing; never invent model parameters or endpoints.

## 5. Understanding Existing Integration Architecture

Inspect repository structure before introducing AI integration code:
- **Architecture Discovery**: Audit existing routes, service layers, and config schemas.
- **Service Isolation**: Encapsulate provider API calls in backend services.
- **No Client Calls**: Never invoke LLM APIs from browsers or leak keys to bundles.

## 6. Managing Credentials and Secrets Securely

Treat LLM provider API keys as high-privilege credentials:
- **Server Storage**: Load credentials strictly from server environment variables.
- **Repository Cleanliness**: Never commit API keys, tokens, or credentials to git.
- **Output Sanitization**: Prevent secrets from appearing in logs or summaries.

## 7. Designing the Integration Boundary and Component Architecture

Establish a modular boundary between application logic and AI providers:
- **Component Decoupling**: Separate prompt authoring, provider formatting, and parsing.
- **Typed Contracts**: Use explicit request and response DTOs to insulate domain code.
- **Minimal Abstraction**: Avoid heavy frameworks when targeting a single provider.

## 8. Building Requests Correctly and Parameter Management

Construct provider API requests using documented parameters and schemas:
- **Role Assignment**: Differentiate system, developer, user, and assistant roles.
- **Generation Controls**: Set limits on `temperature`, `max_tokens`, and stop sequences.
- **Payload Validation**: Validate request payloads prior to transmission.

## 9. Prompt Construction and Instruction Boundaries

Isolate system instructions from untrusted user inputs to prevent injection:
- **Rigid Delimiters**: Enclose user text and external data in distinct delimiters.
- **Instruction Hierarchy**: Instruct the model to analyze enclosed data strictly as text.
- **Application Authority**: Enforce permissions in server code, never in prompts alone.

## 10. Validating Inputs and Model Outputs

Validate data thoroughly at both boundaries of the model interaction:
- **Input Sanitization**: Validate required fields, lengths, and permissions.
- **Output Verification**: Validate that model responses exist and match target schemas.
- **Untrusted Downstream**: Treat all generated text, SQL, or parameters as untrusted.

## 11. Handling Structured Outputs Reliably

Enforce predictable data structures when consuming model outputs:
- **Constrained Decoding**: Use provider structured output for strict JSON parsing.
- **Schema Validation**: Parse and validate generated JSON using schema validators.
- **Malformed Handling**: Handle incomplete streams, truncated payloads, and bad enums.

## 12. Streaming Responses and Event Lifecycle

Implement streaming Server-Sent Events (SSE) safely for interactive features:
- **Lifecycle Management**: Handle connecting, streaming chunks, completion, and errors.
- **Buffer Integrity**: Reassemble fragmented event chunks reliably without partial parsing.
- **Interruption Cleanup**: Distinguish completed streams from client disconnects.

## 13. Handling Tool Calling and Function Execution Safely

Establish rigorous guardrails when models request tool or function execution:
- **Strict Allowlisting**: Expose only approved tools with rigid argument schemas.
- **Application Authorization**: Enforce user identity and permission checks in code.
- **Consequential Actions**: Require user approval for destructive changes or payments.

## 14. LLM Error Handling and Failure Categorization

Map raw provider errors into actionable application domain exceptions:
- **Error Taxonomy**: Classify failures into client errors, auth, rate limits, and 5xx.
- **User-Facing Safety**: Return clean, safe messages without disclosing keys or traces.
- **No Silent Swallowing**: Never convert failed requests into empty strings in logs.

## 15. Bounded Retries, Timeouts, and Rate-Limit Handling

Implement resilient request dispatching with bounded retry policies:
- **Transient Retries**: Retry network timeouts and 429/503 errors with backoff.
- **Deterministic Halts**: Never retry deterministic 400, 401, or validation failures.
- **Rate-Limit Compliance**: Respect `Retry-After` headers; cap maximum retry attempts.

## 16. Conversation and Context Management

Manage conversation histories efficiently across multi-turn interactions:
- **Session Isolation**: Partition conversation threads strictly by user ID.
- **Context Budgeting**: Prune or summarize older messages to stay within token limits.
- **Ephemeral State**: Apply data minimization and retention rules to chat storage.

## 17. Context Windows and Token Limit Controls

Prevent request rejection by actively managing context window consumption:
- **Tokenizer Precision**: Calculate token usage using model-specific tokenizers.
- **Proactive Pruning**: Trim least-relevant context or prune chunks before dispatch.
- **Completion Headroom**: Reserve adequate headroom to prevent response truncation.

## 18. Token Accounting and Cost Management

Track and optimize operational expenses associated with LLM usage:
- **Cost Calculation**: Compute costs using verified prompt and completion pricing.
- **Optimization Levers**: Rightsize models, cache common prompts, and cap output tokens.
- **Quota Safeguards**: Enforce user quotas and budget alerts against cost overruns.

## 19. Latency, Throughput, and Performance Optimization

Optimize end-to-end user-perceived performance across the integration lifecycle:
- **Latency Breakdown**: Measure preprocessing, transit, TTFT, and parsing.
- **Performance Levers**: Stream interactive responses, select smaller models, and parallelize.
- **Preserve Safeguards**: Never bypass authentication or schema validation for speed.

## 20. Security, Privacy, and Prompt Injection Defense

Protect the application against prompt manipulation and data leaks:
- **Prompt Injection**: Treat external documents and user text as untrusted inputs.
- **PII & Data Redaction**: Sanitize sensitive personal data prior to provider transit.
- **Least Privilege Access**: Restrict tool permissions to the authenticated user's scope.

## 21. Handling Model Output in Web and Backend Applications

Render and process model-generated output securely across application tiers:
- **Output Sanitization**: Escape generated text before rendering to prevent XSS.
- **Execution Boundaries**: Never execute model-generated shell commands or SQL.
- **Advisory Delineation**: Label AI-generated insights and summaries as advisory.

## 22. Managing Model Refusals and Safety Responses

Handle safety refusals distinctly from network or infrastructural failures:
- **Refusal Detection**: Detect provider-specific refusal signals and block flags.
- **Graceful Feedback**: Present constructive explanations and suggest compliant prompts.
- **No Safety Bypasses**: Never attempt jailbreak patterns or loops to bypass filters.

## 23. Multimodal Model Integration

Incorporate images, audio, and documents into model workflows safely:
- **Capability Verification**: Confirm that target models natively support media formats.
- **Upload Validation**: Validate media types, dimensions, and payload sizes on server.
- **Media Privacy**: Comply with user consent regulations before transmitting media files.

## 24. Model and Provider Version Lifecycle and Deprecations

Manage model transitions and provider API version updates systematically:
- **Explicit Version Pinning**: Pin exact model snapshot IDs; avoid `latest` aliases.
- **Deprecation Monitoring**: Track provider deprecation schedules and plan migrations.
- **Regression Audits**: Execute golden evaluation test suites across candidate models.

## 25. Configuration and Environment Separation

Externalize AI integration settings safely from application source code:
- **Configuration Hygiene**: Store provider endpoints, model IDs, and limits in env configs.
- **Environment Isolation**: Maintain separate API keys and quotas per environment.
- **Startup Validation**: Validate required AI configuration keys at boot; fail fast.

## 26. Testing LLM Integrations: Deterministic vs. Probabilistic

Separate deterministic integration plumbing from probabilistic evaluations:
- **Unit Testing**: Test request formatting, schema validation, and error mapping.
- **Integration Testing**: Verify live SDK communication, auth, timeouts, and streaming.
- **Evaluation Benchmarks**: Run curated golden datasets against models to score validity.

## 27. Mocking, Test Doubles, and Reproducibility

Enable fast, repeatable testing without incurring live API costs or flakiness:
- **Narrow Provider Interfaces**: Define lightweight provider contracts for test doubles.
- **Realistic Fixtures**: Record sanitized provider fixtures representing responses and errors.
- **Zero Credential Exposure**: Ensure recorded test fixtures contain zero real API keys.

## 28. Observability, Telemetry, and Redacted Logging

Monitor model operational health while preserving customer data privacy:
- **Structured Metrics**: Emit telemetry for request counts, error types, latency, and cost.
- **Privacy Redaction**: Redact raw user prompts and model responses from application logs.
- **Audit Trails**: Maintain secure audit trails for sensitive tool invocations and refusals.

## 29. Provider Outages and Graceful Fallback Strategies

Design application resiliency for external provider downtime:
- **Fallback Hierarchy**: Apply retries $\rightarrow$ cached responses $\rightarrow$ secondary model $\rightarrow$ degradation.
- **Approved Routing**: Never route sensitive user data to an unapproved secondary vendor.
- **Transparent Degradation**: Inform users clearly when AI features are unavailable.

## 30. Avoiding Overengineering and Common LLM Anti-Patterns

Eliminate critical design flaws that undermine LLM integration reliability:
- **LLM-for-Everything**: Using probabilistic models for tasks best solved with SQL, regex, or code.
- **Client Key Exposure**: Bundling provider credentials into frontend code or browser bundles.
- **Blind JSON Trust**: Inserting generated JSON into databases without schema validation.
- **Prompt-Only Access Control**: Relying on prompts rather than server code for user permissions.
- **Universal Adapter Overkill**: Building multi-provider frameworks when needing one model.
- **Unbounded Retry Storms**: Retrying failed requests indefinitely without backoff limits.
- **Uncontrolled History Bloat**: Appending endless conversation turns until context limits are hit.
- **Silent Error Masking**: Catching provider exceptions and returning empty strings in logs.
- **Hallucinated Tool Calls**: Invoking tools without validating names and parameter bounds.
- **Unsanitized HTML Rendering**: Injecting generated Markdown or HTML into DOM without sanitizing.
- **Unfenced Injection Vulnerability**: Interpolating raw user text without structural delimiters.
- **Ignored Rate-Limit Headers**: Disregarding HTTP 429 and `Retry-After` headers until blocked.
- **Unmeasured Cost Bleed**: Deploying to production without tracking token usage, costs, or limits.

## 31. Coordinating with Other Skills and Repository Rules

Coordinate LLM integration seamlessly with related repository capabilities and guidelines:
- **Core Repository Rules**:
  - [core-workflow.md](../../rules/core-workflow.md): Workflow flow and safety.
  - [change-safety.md](../../rules/change-safety.md): Non-destructive changes.
  - [architecture.md](../../rules/architecture.md): Modular system design.
  - [coding-standards.md](../../rules/coding-standards.md): Code cleanliness and typing.
  - [testing.md](../../rules/testing.md): Automated regression testing.
  - [security.md](../../rules/security.md): Least privilege and credentials.
  - [frontend.md](../../rules/frontend.md): Client component architecture.
  - [backend.md](../../rules/backend.md): Controller-service boundaries.
  - [api-design.md](../../rules/api-design.md): REST contracts and schemas.
  - [database.md](../../rules/database.md): Schema migration safety.
- **Specialized Engineering Skills**:
  - [agentic-workflows](../agentic-workflows/SKILL.md): Multi-step tool orchestration.
  - [rag-systems](../rag-systems/SKILL.md): Grounded knowledge retrieval.
  - [authentication-authorization](../authentication-authorization/SKILL.md): Identity and access permissions.
  - [threat-modeling](../threat-modeling/SKILL.md): AI-specific attack vectors.
  - [security-review](../security-review/SKILL.md): Vulnerability review.
  - [api-development](../api-development/SKILL.md): Server endpoint design.
  - [environment-configuration](../environment-configuration/SKILL.md): Environment settings.
  - [logging-monitoring](../logging-monitoring/SKILL.md): Operational logging.
  - [observability](../observability/SKILL.md): Distributed telemetry.
  - [testing-qa](../testing-qa/SKILL.md): Test suite authoring.
  - [dependency-management](../dependency-management/SKILL.md): SDK package versions.
  - [performance-optimization](../performance-optimization/SKILL.md): Latency profiling.
  - [load-testing](../load-testing/SKILL.md): Concurrency and rate limits.
  - [documentation](../documentation/SKILL.md): Technical runbooks.

## 32. Recommended 10-Phase LLM Integration Workflow

Follow a disciplined lifecycle when implementing or modifying LLM capabilities:
- **Phase 1: Define Use Case**: Specify requirements and evaluate deterministic alternatives.
- **Phase 2: Inspect Architecture**: Audit existing service layers, client patterns, and test suites.
- **Phase 3: Choose Model & Provider**: Select model tier matching context and cost.
- **Phase 4: Define I/O Contracts**: Establish typed request schemas, structured outputs, and validation.
- **Phase 5: Secure Configuration**: Externalize API keys, set timeouts, and validate env vars.
- **Phase 6: Implement Request & Response**: Author provider clients, prompts, and error mapping.
- **Phase 7: Add Reliability Controls**: Implement exponential backoff retries, rate limits, and streaming.
- **Phase 8: Execute Test Suite**: Run deterministic unit tests with mocks and golden eval benchmarks.
- **Phase 9: Measure Operations**: Audit latency, token consumption, error frequencies, and costs.
- **Phase 10: Review & Document**: Conduct security review; document runbooks and operational limits.

## 33. Definition of Done (DoD) for LLM Integrations

Verify all criteria before declaring an LLM integration task complete:
- [ ] 1. **Problem Suitability**: Verified probabilistic LLM fits task requirements.
- [ ] 2. **Model Rightsized**: Model tier matches complexity without excess cost.
- [ ] 3. **Credentials Isolated**: API secrets stored server-side; zero keys leaked.
- [ ] 4. **Prompt Fenced**: Delimiters isolate untrusted input from instructions.
- [ ] 5. **I/O Validated**: Requests and responses validated against strict schemas.
- [ ] 6. **Errors Categorized**: HTTP errors mapped to domain errors; no silent failures.
- [ ] 7. **Retries Bounded**: Backoff applied to transient errors; rate limits respected.
- [ ] 8. **Tooling Sandboxed**: Tool calls verified against allowlists with auth checks.
- [ ] 9. **Testing Executed**: Unit tests with mocks and eval benchmarks passing.
- [ ] 10. **Telemetry Active**: Tokens, latency, error rates, and costs tracked with redaction.
- [ ] 11. **Graceful Fallback**: Failure modes and outages produce clean user guidance.
- [ ] 12. **Limitations Disclosed**: Unverified behaviors and remaining work documented.

## 34. Standardized LLM Integration Completion Report Template

Document LLM integration outcomes using this standardized 8-part reporting structure:

```markdown
# LLM Integration Completion Report: [Feature / Service Name]
### 1. Use Case & Problem: [AI capability and business justification]
### 2. Provider & Model: [Provider, Model ID, context window, parameters]
### 3. Architecture & Code: [Service layer, adapter, and files modified]
### 4. Security & Secrets: [Secret storage, prompt fencing, auth checks]
### 5. Reliability & Validation: [Schema validation, retries, tool guardrails]
### 6. Verification Results:
| Test Suite | Scope | Target | Observed | Status |
| :--- | :--- | :--- | :--- | :---: |
| Deterministic Unit Tests | Request/Response parsing | 100% Pass | All passing | PASS |
| Schema Conformance Suite | Output validity | 100% Pass | Conforms | PASS |
| Golden Evaluation Set | Accuracy & safety refusal | $\ge 90\%$ | 94.2% pass | PASS |
### 7. Performance & Cost: [Observed latency, TTFT, tokens, cost per 1k]
### 8. Limitations & Next Steps: [Edge cases, rate limits, remaining items]
```

## 35. 10-Point Pre-Flight LLM Integration Validation Checklist

Verify all 10 criteria before finalizing any LLM integration implementation or modification:
- [ ] 1. **Use Case Justified**: Confirmed need for probabilistic LLM over deterministic code.
- [ ] 2. **Model Matched**: Model tier selected based on quality, latency, and cost.
- [ ] 3. **Credentials Shielded**: Secrets loaded server-side; zero API keys committed.
- [ ] 4. **Prompts Delimited**: Untrusted input enclosed in rigid delimiters against prompt injection.
- [ ] 5. **Outputs Validated**: Generated text, JSON, and tool arguments verified.
- [ ] 6. **Retries Bounded**: Exponential backoff configured for transient errors.
- [ ] 7. **Tool Calls Authorized**: Tools checked against allowlists and permissions.
- [ ] 8. **Deterministic Tests**: Unit tests with recorded mocks verify parsing.
- [ ] 9. **Telemetry Redacted**: Tokens, latency, and costs monitored without logging PII.
- [ ] 10. **Report Delivered**: Standardized completion report produced with limits stated.
