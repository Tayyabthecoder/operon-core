---
trigger: model_decision
description: Apply consistent coding standards for readability, maintainability, naming, error handling, abstraction, and code quality when writing, reviewing, or refactoring application code.
---

# Coding Standards and Code Quality

This rule defines core standards for writing clean, consistent, maintainable, readable, and reliable code across all languages and frameworks. When authoring new code, modifying existing modules, or refactoring, adhere to these principles.

## 1. Project Conventions & Consistency

- **Align with Existing Style**: Match established patterns, naming conventions, directory organization, and architectural paradigms already present in the codebase.
- **Honor Project Tooling**: Respect configured linters, code formatters (e.g., Prettier, ESLint, Black, Rustfmt), compiler flags, and editor configs. Never bypass or override them with personal preferences.
- **Idiomatic Stack Defaults**: When working in a new language or area with no established codebase pattern, follow standard idiomatic community conventions for that runtime.
- **Primacy of Local Patterns**: Local consistency within a component or service takes precedence over generic exterior guidelines.

## 2. Naming & Readability

- **Express Intent Clearly**: Choose descriptive, unambiguous identifiers for variables, functions, types, and files that convey their role and domain context without requiring mental translation.
- **Language-Native Casing**: Adopt standard language casing conventions (e.g., `camelCase`, `PascalCase`, `snake_case`, or `SCREAMING_SNAKE_CASE`) consistently.
- **Avoid Cryptic Identifiers**: Eliminate arbitrary abbreviations and uninformative single-letter names, except for widely recognized conventions (such as loop indices `i`, `j` or standard coordinate pairs `x`, `y`).
- **Clarity Over Cleverness**: Write straightforward, predictable logic. Avoid dense, esoteric one-liners or complex ternary chains when clear control flow is more readable.
- **Guard Clauses & Flat Logic**: Prefer early returns and guard clauses over deeply nested conditional trees to minimize cognitive load.

## 3. Functions & Responsibilities

- **Single Responsibility**: Ensure functions, methods, classes, and modules have focused, coherent responsibilities.
- **Cohesive & Understandable**: Keep functions focused enough to be easily understood and tested. Refactor when complexity justifies it rather than pursuing arbitrary line-count limits.
- **Explicit Inputs & Outputs**: Use clear parameters and predictable return types. Minimize mutable arguments, hidden side effects, and surprising global state mutations.
- **Balanced Granularity**: Avoid decomposing trivial operations into endless micro-functions that obscure the high-level execution flow.

## 4. Code Reuse & Abstraction

- **Leverage Existing Utilities**: Search the codebase for existing helper functions, shared models, and utility libraries before implementing custom solutions.
- **Judicious DRY**: Apply the Don't Repeat Yourself (DRY) principle when duplication represents genuinely shared domain logic, not merely coincidental structural similarity.
- **YAGNI (You Aren't Gonna Need It)**: Implement only what is currently required. Never build speculative abstractions, plugin hooks, or generic frameworks for hypothetical future needs.
- **Proportional Abstraction**: Avoid deep inheritance trees, excessive design pattern indirection, and unnecessary wrapper layers. Keep abstractions simple and grounded in current reality.

## 5. Types, Contracts & Data Integrity

- **Leverage Type Systems**: Use strong, static typing effectively where supported by the language. Avoid escape hatches (e.g., `any`, `unknown` casts, `@ts-ignore`, or unchecked raw pointers) unless strictly necessary and documented.
- **Explicit Interfaces & Schemas**: Define precise data contracts and validation schemas at system boundaries (e.g., API ingress, database queries, file parsing).
- **Explicit Nullability**: Model and handle optional, missing, or nullable values deliberately; avoid unhandled null references.
- **Boundary Validation**: Validate and sanitize untrusted inputs at external boundaries. Never rely on client-side validation as a substitute for backend integrity and security enforcement.

## 6. Robust Error Handling

- **Explicit Failures**: Handle errors intentionally at the appropriate architectural layer. Never swallow exceptions silently or leave catch blocks empty.
- **Narrow Exception Scopes**: Catch specific exception types rather than using broad, catch-all handlers that mask programming bugs.
- **Contextual Diagnostics**: Provide meaningful error messages and structured logs that capture context without leaking secrets, tokens, or personal data.
- **Semantic Differentiation**: Clearly differentiate recoverable validation issues from fatal system failures.
- **Honest Status Codes**: Never return synthetic success codes or empty fallback objects when a request or operation has failed.

## 7. Comments & Documentation

- **Explain the "Why", Not the "What"**: Reserve comments for explaining non-obvious design decisions, business constraints, performance trade-offs, and critical workarounds. Let clean code explain what is happening.
- **Keep Comments Synchronized**: Update or remove comments and docstrings immediately when modifying the surrounding behavior. Misleading comments are worse than no comments.
- **Document Public Interfaces**: Document public APIs, shared libraries, and complex algorithms with clear parameters, return types, and potential exceptions.
- **Avoid Comment Bloat**: Do not generate boilerplate comment headers or restate obvious self-explanatory code.

## 8. Configuration & Constants

- **No Magic Values**: Replace unexplained numeric literals and repeated string constants with named, meaningful constants.
- **Balanced Extraction**: Do not extract every single literal into a constant when its local inline context is clear and self-evident.
- **Environment Isolation**: Separate environment-specific configuration (e.g., database URLs, port numbers, log levels) from core application code.
- **Zero Secrets in Code**: Never commit credentials, private tokens, encryption keys, or passwords. Access sensitive parameters strictly via environment variables or secret managers.

## 9. Dependency Discipline

- **Prefer Built-ins & Existing Tools**: Leverage the language standard library and established dependencies before introducing third-party packages.
- **Evaluate New Libraries**: When a new library is genuinely justified, assess its maintenance health, bundle size, dependency tree, security record, and license compatibility.
- **Avoid Trivial Wrappers**: Do not install packages for trivial tasks that can be reliably implemented in a few lines of clean code.
- **Preserve Package Integrity**: Do not arbitrarily bump, downgrade, or prune dependency versions outside the scope of the assigned task.

## 10. File & Module Organization

- **Logical Cohesion**: Group related files, types, and logic logically according to the framework's recommended architecture.
- **Standard Project Structure**: Adhere to the established repository hierarchy (e.g., `src/`, `tests/`, `scripts/`, `docs/`) and framework-specific layout.
- **Avoid File Extremes**: Avoid both monolithic multi-thousand-line files and over-fragmented folder trees where every trivial function has its own file.
- **Prevent Duplication**: Never create duplicate files, parallel helper folders, or redundant configuration files.

## 11. Testability & Reliability

- **Deterministic Behavior**: Design business logic to be deterministic and free from hidden side effects, making it straightforward to test.
- **Decouple External Dependencies**: Separate pure business computations from I/O, network calls, and database operations to enable clean unit and integration testing.
- **Test Observable Behavior**: Write tests that verify externally observable contracts and requirements rather than brittle internal implementation details.
- **Preserve Test Integrity**: Never comment out, delete, or weaken test assertions merely to achieve a passing suite.

## 12. Performance Awareness

- **Sensible Complexity**: Select appropriate data structures and algorithms suited to expected data scales (e.g., avoiding \(O(n^2)\) lookups when a hash map enables \(O(1)\)).
- **Avoid Premature Optimization**: Do not sacrifice clarity for micro-optimizations without empirical profiling evidence demonstrating a real bottleneck.
- **Resource Management**: Properly release file handles, database connections, and event listeners to prevent resource exhaustion and memory leaks.

## 13. Refactoring & Review

- **Preserve Behavior**: Refactoring must improve readability, structure, or maintainability without altering existing functionality or public contracts unless requested.
- **Isolated Refactoring**: Avoid mixing major refactoring with unrelated feature development or bug fixes.
- **Diff Hygiene**: Before completing changes, review the full diff to verify that style, formatting, and naming remain clean, consistent, and strictly relevant.

## 14. Priorities & Precedence

When applying these coding standards:
1. **Correctness, Safety & Security**: Accurate behavior and security protections always take precedence over style preferences.
2. **Project Precedent**: Existing repository conventions and established patterns take precedence over generic external guidelines.
3. **Simplicity & Pragmatism**: Prefer clean, simple implementations over dogmatic adherence to rules.

## 15. Complexity Signals

These thresholds are review signals, not hard limits (see Section 3): crossing one calls for a second look and, where it hurts readability, a refactor.

| Signal | Prefer |
| :--- | :--- |
| Function longer than ~50 lines | Split into focused pieces with clear responsibilities |
| Source file beyond ~800 lines (200-400 is typical) | Extract cohesive modules; tests, generated, and vendored files may exceed this when justified |
| Nesting deeper than 4 levels | Early returns and guard clauses |
| Unnamed thresholds, delays, or limits | Named constants or configuration |
| In-place mutation of shared data | Return new values; mutate only where the language or performance profile requires it |
| Folders organized only by file type | Organization by feature or domain when the project structure allows |

*Adapted from ECC `common/coding-style` (MIT); see THIRD_PARTY_NOTICES.md.*
