---
trigger: model_decision
description: Apply architectural guidelines when designing, implementing, refactoring, or reviewing software modules, dependencies, system boundaries, integrations, and structural changes.
---

# Architecture Principles and System Design

This rule establishes guidelines for understanding, preserving, evolving, and reviewing software system architecture. Adhere to these principles to ensure high cohesion, low coupling, maintainable boundaries, and sustainable structural growth without introducing speculative complexity.

## 1. Understand Existing Architecture

- **Baseline Inspection**: Inspect system entry points, core layers, data flows, external integrations, and component dependencies before proposing structural modifications.
- **Consult Existing Records**: Review project documentation in `docs/architecture/` and Architecture Decision Records (ADRs) in `docs/architecture/architecture-decisions/` when available.
- **Evidence-Based Alignment**: Follow the project's actual architectural conventions and technology choices. Never assume an architectural pattern without concrete evidence in code or configuration.
- **Proportional Greenfield Architecture**: For new initiatives, design an architecture strictly proportional to current requirements, expected scale, deployment constraints, and team maintainability.

## 2. Respect Architectural Boundaries

- **Separation of Concerns**: Preserve clean boundaries between presentation (UI/controllers), domain business logic, data access (persistence), and external infrastructure.
- **No Leaky Domain Logic**: Prevent core business rules from leaking into controllers, UI rendering components, raw SQL queries, or messaging workers.
- **Explicit Inter-Module Interfaces**: Define clear, understandable interfaces between modules. Restrict access to internal module implementations.
- **Acyclic Dependency Structure**: Keep module dependencies explicit, loose, and strictly acyclic. Never introduce circular dependencies between packages, modules, or layers.
- **Framework Alignment**: Work with the architectural idioms of the chosen framework rather than imposing conflicting external abstractions.

## 3. Maintain Dependency Direction

- **Inward Dependency Flow**: Direct dependencies inward toward core business rules and domain models. Core logic must not depend on external infrastructure, UI details, or specific database drivers.
- **Pragmatic Dependency Inversion**: Use interfaces and dependency injection where decoupling provides tangible testability or modularity benefits.
- **Avoid Abstraction Bloat**: Do not introduce redundant factories, wrappers, service locators, or nested abstraction layers for simple, direct operations.
- **Assess Ownership Shifts**: Never invert dependency direction or shift module ownership without evaluating the impact across all consuming systems.

## 4. Choose Appropriate Architectural Patterns

- **Simplicity Over Novelty**: Select the simplest architectural pattern that satisfies functional and non-functional requirements (e.g., modular monolith before distributed microservices).
- **Justify Distributed Infrastructure**: Do not introduce microservices, message queues, distributed caches, or event-sourcing without measurable technical requirements.
- **Pattern Compatibility**: Avoid arbitrarily mixing conflicting design patterns (e.g., combining active record with strict hexagonal architecture within the same module).
- **Operational Reality**: Evaluate operational complexity, deployment overhead, debugging difficulty, and testing costs when evaluating structural patterns.

## 5. Design Modules and Components

- **High Cohesion, Low Coupling**: Ensure each module or package has a well-defined purpose and single conceptual boundary.
- **Prevent Logic Duplication**: Share common domain logic through cohesive domain services rather than duplicating rules across disparate components.
- **Balanced Granularity**: Avoid monolithic multi-thousand-line modules, but avoid over-fragmenting features into dozens of trivial files, layers, or packages that obscure the primary flow.
- **No Dumping Grounds**: Avoid generic `common`, `util`, or `shared` modules that accumulate unrelated functionalities.

## 6. Decouple Business Logic from Infrastructure

- **Isolate Domain Rules**: Keep domain entities and business rules agnostic of specific databases, third-party libraries, and transport protocols.
- **Encapsulate External Services**: Place external APIs, persistent storage, email dispatchers, and messaging behind well-defined boundary adapters.
- **Consistent Execution**: Ensure business operations produce identical, deterministic results regardless of the invocation trigger (HTTP request, CLI command, scheduled job, or event consumer).

## 7. Database and Data Architecture

- **Centralized Persistence**: Respect established repository or data access patterns. Never scatter raw database queries or direct table mutations across presentation or business layers.
- **Data Integrity & Transactions**: Ensure ACID transactions, consistency guarantees, and foreign key relationships are maintained across architectural boundaries.
- **No Speculative Data Stores**: Do not introduce additional databases, ORMs, or caching tiers without explicit architectural justification.
- **Safe Schema Evolution**: Ensure database schema changes remain backward-compatible with active application code; never alter database structures merely to simplify a temporary feature.

## 8. APIs and Integration Boundaries

- **Contract Stability**: Preserve established API contracts and payload schemas. Avoid breaking changes unless explicitly requested.
- **Resilient Integrations**: Treat external integrations as potential failure points: enforce explicit timeouts, retries, failure handling, circuit breaking, and idempotency where appropriate.
- **Consolidated Endpoints**: Avoid duplicate endpoints or overlapping routes that perform equivalent operations.
- **Document Contract Changes**: When modifying internal or public contracts, identify all upstream and downstream consumers and document compatibility trade-offs.

## 9. Configuration and Cross-Cutting Concerns

- **Standardized Infrastructure**: Use the project's established mechanisms for logging, error handling, security, telemetry, and configuration.
- **Centralize Carefully**: Centralize shared middleware and cross-cutting components only when it improves maintainability without creating tight coupling.
- **Config vs. Code Separation**: Keep environment-specific settings (database connections, ports, service URLs) strictly outside application business logic.
- **Secure Secrets Management**: Never embed credentials, API keys, or private tokens in code; inject them securely via environment variables or secret vaults.

## 10. Scalability and Performance

- **Targeted Scalability**: Address realistic throughput and workload requirements; avoid speculative scaling for hypothetical future scale.
- **Data-Driven Optimization**: Identify real performance bottlenecks using profiling and metrics before altering system structure.
- **Efficient Resource Utilization**: Optimize through proper database indexing, efficient data structures, asynchronous processing, and connection pooling when justified.
- **Substance Over Labels**: Do not claim an architecture is performant or scalable solely because it uses a specific framework or distributed pattern.

## 11. Testing and Architectural Verifiability

- **Architectural Testability**: Structure boundaries and dependencies to enable fast, reliable unit testing of domain logic in isolation from external services.
- **Verify Boundaries**: Use integration tests to validate data contracts, API boundaries, and database migrations.
- **Preserve Verifiability**: Reject structural changes that make testing significantly harder, more brittle, or reliant on complex mocks.
- **Detect Structural Drift**: Monitor for circular references, leaky abstractions, and unintended coupling during architectural reviews.

## 12. Architectural Evolution and Refactoring

- **Problem-Driven Changes**: Every significant structural refactor must address a concrete, demonstrable limitation or requirement.
- **Impact Assessment**: Assess the full blast radius across modules, schemas, APIs, deployment scripts, and automated tests before executing changes.
- **Evaluate Alternatives**: Always evaluate a minimal, non-disruptive design before proposing sweeping architectural overhauls.
- **Approval Gate**: Obtain explicit authorization before executing breaking, irreversible, or high-risk architectural alterations.
- **No Gratuitous Redesigns**: Never redesign the entire application architecture to accommodate a feature that fits cleanly within the existing design.

## 13. Architecture Documentation & Decision Records

- **Consult Records First**: Review existing ADRs in `docs/architecture/architecture-decisions/` before making structural decisions.
- **Record Significant Decisions**: When introducing a major architectural pattern, new dependency tier, or boundary change, record the decision using the project's ADR template.
- **ADR Structure**: Document the context, considered alternatives, chosen decision, and resulting consequences (both benefits and trade-offs).
- **Proportionality**: Avoid recording trivial implementation details as architectural decisions; never fabricate retrospective decisions as established facts.

## 14. Architecture Decision Principles

When evaluating architectural decisions:
1. **Requirements & Correctness First**: Functional correctness, reliability, security, and project requirements take priority over abstract architectural elegance.
2. **Precedent Over Dogma**: Respect established repository conventions unless a compelling, justified need to modernize exists.
3. **Simplicity & Cohesion**: Favor simple, cohesive, and easily testable designs over multi-tiered speculative architectures.
4. **Reversibility**: When requirements are uncertain, prefer modular, reversible decisions that preserve future agility.
