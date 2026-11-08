---
trigger: model_decision
description: Apply documentation standards when creating, updating, reviewing, or restructuring project requirements, PRDs, SRS documents, architecture records, database documentation, API specifications, testing guides, setup instructions, and developer documentation.
---

# Technical Documentation Standards and Lifecycle Management

This rule establishes engineering standards for authoring, updating, organizing, reviewing, and maintaining project documentation throughout the software development lifecycle. Adhere to these principles to ensure documentation is accurate, maintainable, discoverable, and faithfully synchronized with the codebase.

## 1. Documentation Accuracy & Source of Truth

- **Grounded in Verified Reality**: Base all technical documentation on actual code, active configuration files, verified test results, and approved requirements. Never document speculative or unverified behavior as fact.
- **Distinct Sources of Truth**: Recognize that source code, approved product requirements, and architecture records represent distinct sources of truth. Code reflects current implementation; requirements reflect product intent; architecture records capture engineering decisions.
- **Explicit Status Labels**: Clearly distinguish the lifecycle status of documented items: `Proposed`, `Approved`, `In-Development`, `Implemented`, `Verified`, or `Deprecated`.
- **Zero Fabrication**: Never fabricate test results, benchmark metrics, API endpoints, database schemas, deployment steps, or architectural decision histories.
- **Identify Discrepancies**: When documentation contradicts the codebase, flag the discrepancy explicitly rather than quietly inventing assumptions or writing misleading explanations.

## 2. Documentation Structure & Organization

- **Project-Specific Documentation (`docs/`)**: Store all project-specific documentation within designated subdirectories under `docs/`:
  - `docs/product/`: Product vision, problem statements, user personas, PRDs.
  - `docs/requirements/`: Software Requirements Specifications (SRS), functional/non-functional criteria.
  - `docs/architecture/`: System topology, component boundaries, and `architecture-decisions/` (ADRs).
  - `docs/database/`: Schemas, entity-relationship diagrams, data dictionary, migration notes.
  - `docs/api/`: OpenAPI specs, endpoint catalogs, contract definitions.
  - `docs/design/`: UI design tokens, component specifications, style guides.
  - `docs/testing/`: Test plans, quality strategies, environment configurations.
  - `docs/deployment/`: Build pipelines, deployment procedures, infrastructure guides.
  - `docs/maintenance/`: Runbooks, troubleshooting guides, operational procedures.
- **Reusable Agent Resources (`.agents/`)**: Keep reusable documentation templates in `.agents/templates/` and procedural workflows in `.agents/workflows/` or `.agents/skills/`. Never mix reusable agent rules with project-specific documentation.
- **Discoverable Index**: Maintain an up-to-date documentation index in `docs/README.md` linking to all major documents using verified relative Markdown links.
- **Kebab-Case Naming**: Use lowercase kebab-case filenames (e.g., `user-authentication.md`, `system-architecture.md`) without numerical prefixes.

## 3. PRD — Product Requirements Document

When creating or modifying a Product Requirements Document (PRD):
- **Problem Statement & Goals**: Define the core problem, target audience, business rationale, and desired user outcomes.
- **Scope Demarcation**: Explicitly define what is in scope and what is explicitly out of scope for the release.
- **User Personas & Journeys**: Include concrete user personas, user stories, and acceptance flows that illustrate user needs.
- **Measurable Success Metrics**: Define quantifiable key performance indicators (KPIs) or success criteria when data is available.
- **Assumptions & Risks**: Document known assumptions, third-party dependencies, operational risks, and open questions.
- **Avoid Premature Architecture**: Focus on "what" needs to be solved and "why", avoiding premature technical prescriptions or database schemas in product requirements.

## 4. SRS — Software Requirements Specification

When creating or modifying a Software Requirements Specification (SRS):
- **Structured Categorization**: Categorize requirements into functional requirements, external interface requirements, and non-functional requirements (performance, reliability, security, accessibility).
- **Stable Requirement Identifiers**: Use stable, traceable identifiers (e.g., `REQ-AUTH-001`, `REQ-DATA-042`) for each distinct requirement.
- **Unambiguous & Verifiable**: Write requirements in clear, testable language using standard RFC 2119 keywords (`MUST`, `SHOULD`, `MAY`). Avoid vague qualifiers like "fast", "user-friendly", or "scalable".
- **Detailed Scenarios**: Detail system actors, preconditions, normal trigger flows, alternative paths, and failure recovery flows.
- **Traceability Linkage**: Link functional requirements directly to user stories in the PRD, acceptance criteria, and automated test suites.

## 5. Architecture Documentation & Decision Records (ADRs)

When creating or modifying architecture documentation:
- **System Topography**: Document system modules, component boundaries, data flow directions, and external service integrations.
- **Synchronized Visual Diagrams**: Use Mermaid diagrams for architecture flows and ER diagrams; ensure diagrams reflect actual code structure.
- **Architecture Decision Records (ADRs)**: Capture significant, consequential architectural decisions in `docs/architecture/architecture-decisions/` using a standard format:
  - *Context*: Problem statement, business drivers, and technical constraints.
  - *Decision*: Chosen architectural pattern, tool, or boundary structure.
  - *Alternatives Considered*: Options evaluated and reasons for rejection.
  - *Consequences*: Positive outcomes, trade-offs, operational burdens, and residual risks.
- **Distinguish Current from Proposed**: Clearly differentiate current landed architecture from prospective architectural proposals.

## 6. Database Documentation

When creating or modifying database documentation:
- **Schema & Data Dictionary**: Document database engines, tables, column types, precision, nullability, primary keys, and foreign keys based on actual migrations.
- **Integrity Rules**: Document unique constraints, check constraints, default values, and referential actions (`CASCADE`, `RESTRICT`).
- **Entity-Relationship Models**: Provide accurate ER diagrams reflecting real foreign key associations.
- **Migration & Rollback Notes**: Detail zero-downtime expand-and-contract migration steps and data retention rules.
- **Cross-Reference Database Rules**: Link to canonical migration files and refer to `database.md`.

## 7. API Documentation

When creating or modifying API documentation:
- **Comprehensive Endpoint Catalog**: Document endpoint URIs, HTTP methods, authentication schemes, query parameters, request bodies, response payloads, and HTTP status codes.
- **OpenAPI / Schema Synchronization**: Maintain authoritatively accurate OpenAPI specifications or schema definitions reflecting actual route implementations.
- **Safe Example Payloads**: Provide realistic, valid example requests and responses using sanitized placeholder data. Never include real API tokens, passwords, or customer PII.
- **Document Errors & Edge Cases**: Explicitly document standard error responses (RFC 9457 Problem Details), validation failures, and rate limit behaviors.
- **Cross-Reference API Rules**: Refer to `api-design.md` for interface contract standards.

## 8. UI/UX and Design Documentation

When creating or modifying design documentation:
- **Design Tokens**: Document canonical design tokens (colors, typography scales, spacing units, border radii, elevation shadows) matching the frontend code.
- **Component Guidelines**: Document reusable UI component usage, configurable props, interactive states, and responsive behavior.
- **Accessibility Standards**: Document required accessibility properties, keyboard shortcuts, focus behaviors, and contrast requirements.
- **Cross-Reference Frontend Rules**: Refer to `frontend.md`.

## 9. Testing Documentation

When creating or modifying testing documentation:
- **Test Frameworks & Execution**: Document test runners, test directory layouts, package execution commands (`npm test`, `pytest`), and CLI options.
- **Environment Setup**: Document prerequisites for running integration tests (test databases, container setup, seed data loading).
- **Quality Gates**: Document coverage expectations, linting requirements, and CI pipeline checks.
- **Cross-Reference Testing Rules**: Refer to `testing.md`.

## 10. Setup, Installation, and Deployment Documentation

When creating or modifying setup and deployment guides:
- **Prerequisites & Toolchains**: Detail supported runtime versions (Node.js, Python, Java, Go, etc.), package managers, and external dependencies.
- **Environment Configuration**: Document all required environment variables in a sanitized `.env.example` file with descriptive comments for each variable.
- **Step-by-Step Initialization**: Provide sequential, verified setup instructions (cloning, dependency installation, database migration, seeding, and server startup).
- **Destructive Command Warnings**: Explicitly flag destructive commands (database resets, drops, or data purges) with prominent warning alerts.
- **Production Hardening**: Separate local development setup from production deployment instructions, detailing reverse proxies, TLS setup, and process management.

## 11. README and Project Overview

When creating or updating the root `README.md`:
- **High-Level Purpose**: Clearly explain what the project does, target problem space, and intended audience.
- **Technology Summary**: List the verified core tech stack (language, framework, database, styling).
- **Quickstart Guide**: Provide concise, tested instructions to get the application running locally in under five minutes.
- **Documentation Roadmap**: Link directly to relevant directories in `docs/` for deep architectural, API, and database specifications.
- **Pragmatic & Fact-Based**: Avoid marketing fluff, unverified performance claims, or outdated roadmaps.

## 12. Code Comments and Inline Documentation

- **Focus on the "Why"**: Use comments to explain non-obvious business rules, algorithmic complexity, workarounds, and critical constraints. Do not paraphrase self-explanatory code.
- **Docstrings & Public Contracts**: Document public API methods, exported libraries, and shared utilities with clear parameter descriptions, return types, and possible thrown exceptions.
- **Synchronization**: Update or remove inline comments immediately when changing the surrounding code logic. Misleading comments are worse than no comments.
- **Cross-Reference Coding Standards**: Refer to `coding-standards.md`.

## 13. Documentation Synchronization During Development

- **Synchronous Upkeep**: When modifying code, schemas, or APIs, synchronously update the corresponding documentation files within the same pull request or task.
- **Proportional Scope**: Confine documentation updates strictly to the areas affected by the code modification; avoid unsolicited broad rewrites of unrelated documents.
- **Broken Reference Check**: Audit and update modified file paths, renamed endpoints, altered configuration variables, and outdated command examples.

## 14. Requirements Traceability and Acceptance Criteria

- **Traceable Identifiers**: Maintain traceability from PRD user stories -> SRS requirements -> automated test assertions.
- **Given-When-Then Criteria**: Express acceptance criteria in clear, testable formats (e.g., Given [context], When [action], Then [observable outcome]).
- **Track Requirement Coverage**: Clearly identify requirements that lack automated test coverage or require manual verification.

## 15. Documentation Quality and Writing Style

- **Clarity & Precision**: Write in active, direct, professional language. Keep sentences concise and unambiguous.
- **Effective Formatting**: Use Markdown headings, structured tables, bulleted lists, and syntax-highlighted code blocks to improve readability.
- **Consistent Terminology**: Use standardized domain terms across all documents; define specialized acronyms upon first usage.

## 16. Documentation Maintenance and Version Control

- **Preserve Human Knowledge**: Respect existing human-authored documentation; never overwrite, erase, or discard historical documentation without explicit review.
- **Track Alongside Code**: Version-control documentation in the same repository as source code to maintain atomic historical alignment.
- **Prune Obsolete Content Carefully**: Remove deprecated guides or superseded notes only after confirming they are obsolete, replacing them with pointers to active documentation.

## 17. Documentation Review and Verification

Before completing any documentation task:
- **Verify Technical Claims**: Cross-check documented commands, parameters, schemas, and configurations against real source files and test runs.
- **Validate Links & Paths**: Verify that all relative Markdown file links, image paths, and code references resolve correctly.
- **Shield Secrets**: Confirm that no private keys, passwords, database credentials, or real customer data appear in code samples, configs, or diagrams.
- **Transparent Delivery**: Provide a concise summary of all documentation created or updated, detailing any remaining assumptions or unresolved questions.

## 18. Documentation Decision Principles

When authoring or modifying documentation:
1. **Accuracy Over Exhaustiveness**: A concise, 100% accurate document is infinitely more valuable than an exhaustive document full of obsolete or unverified assumptions.
2. **Update Over Duplication**: Extend and refine existing canonical documents in `docs/` rather than spawning fragmented duplicate files.
3. **Evidence-Based Documentation**: Document what has been implemented and verified; clearly label planned or proposed features as such.
4. **Targeted Proportionality**: Scale documentation effort to feature complexity—avoid excessive paperwork for trivial changes while maintaining rigorous specifications for core architecture and data contracts.
