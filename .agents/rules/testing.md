---
trigger: model_decision
description: Apply testing and quality assurance standards when implementing, modifying, debugging, refactoring, or reviewing software, including unit, integration, end-to-end, regression, contract, and relevant security tests.
---

# Testing and Quality Assurance Standards

This rule establishes engineering standards for designing, implementing, executing, debugging, and maintaining automated tests. Adhere to these principles to ensure high test reliability, comprehensive regression prevention, deterministic execution, and honest reporting of verification outcomes across any language or testing framework.

## 1. Understand the Existing Testing Setup

- **Inspect Established Frameworks**: Review existing test runners (e.g., Jest, Vitest, Pytest, JUnit, Go test, xUnit, RSpec), configuration files, package scripts, fixtures, and CI workflows before authoring tests.
- **Follow Project Conventions**: Adhere to established test file naming patterns (e.g., `*.test.ts`, `*_test.go`, `test_*.py`), directory structures (colocated vs. `tests/`), and assertion styles.
- **Reuse Testing Utilities**: Leverage existing test factories, custom assertions, mock providers, and database setup helpers rather than building redundant testing tools.
- **No Unwarranted Frameworks**: Do not install additional test runners or assertion libraries when existing project tools satisfy testing requirements.
- **Proportional Greenfield Setup**: When a project lacks automated tests, establish a minimal, idiomatic test setup appropriate to the language runtime and project architecture.

## 2. Select Appropriate Test Types

Select the minimal set of testing strategies that provides high confidence for the change:
- **Unit Tests**: Verify isolated functions, domain entities, calculations, validation logic, and components in isolation from external systems.
- **Integration Tests**: Verify interactions across application boundaries, including database queries, repository methods, API controllers, middleware, and authentication flows.
- **End-to-End (E2E) Tests**: Verify complete customer journeys through the application UI or external API gateways under realistic runtime conditions.
- **Contract Tests**: Validate schema agreements and payload compatibility between API providers and consumers.
- **Regression Tests**: Target and reproduce reported defects to verify fixes and prevent recurrent regressions.
- **Security Tests**: Validate authorization barriers, tenant isolation, input rejection, token expiration, and permission boundaries.
- **Performance Tests**: Measure throughput, query latency, and resource limits under simulated load when performance requirements are explicit.

## 3. Test Requirements and Observable Behavior

- **Requirement-Driven Scenarios**: Derive test cases directly from functional requirements, user acceptance criteria, and domain rules.
- **Comprehensive Spectrum**: Cover the full behavioral spectrum: happy paths, input boundary conditions, missing attributes, invalid formats, and edge-case failure modes.
- **Test Observable Behavior**: Assert against external outputs, state changes, and public contracts rather than private implementation details.
- **No Imaginary Requirements**: Never invent artificial business rules or weaken assertions merely to make a failing test pass.
- **Clarify Ambiguity**: When expected behavior is ambiguous and materially impacts correctness, stop and request clarification rather than encoding arbitrary assumptions.

## 4. Meaningful Unit Tests

- **Fast & Deterministic**: Keep unit tests fast, repeatable, and completely independent of external networks, system clocks, random values, and shared global state.
- **Clear Scenario Names**: Use descriptive test names that communicate the context, input condition, and expected outcome (e.g., `it('should calculate 20% discount when order total exceeds 100')`).
- **Structured Test Layout**: Follow the Arrange-Act-Assert (AAA) or Given-When-Then pattern to clearly distinguish test setup, execution, and verification.
- **Targeted Scope**: Test one distinct concept per test case. Avoid combining unrelated assertions that make failure root-cause analysis difficult.
- **Avoid Trivial Tests**: Avoid writing dozens of superficial tests that assert trivial properties (e.g., testing that a getter returns what a setter stored) without testing real business logic.

## 5. Integration Testing

- **Real Component Interactions**: Exercise realistic interactions between application services and infrastructure adapters (databases, caches, internal APIs).
- **Isolated Integration Environments**: Run integration tests against dedicated, isolated test resources (e.g., containerized databases, SQLite in-memory, or ephemeral queues).
- **Verify Persistence & Transactions**: Test database migrations, constraints, foreign key cascades, and transaction rollback behavior under real execution paths.
- **Resource Cleanup**: Ensure all database records, temporary files, and open sockets created during integration tests are cleaned up between test suites.
- **Avoid Over-Mocking in Integration Tests**: Do not mock internal repositories or database layers in integration tests; test the real integration boundary.

## 6. End-to-End and User Workflow Testing

- **Focus on Critical Journeys**: Focus E2E tests on core revenue-generating or mission-critical workflows (e.g., registration -> authentication -> checkout -> order receipt).
- **Resilient Selectors**: Target elements using accessible roles, labels, or dedicated test IDs (`data-testid`); avoid brittle CSS hierarchy selectors or text that frequently changes.
- **Deterministic Synchronization**: Await explicit element states, network responses, or DOM mutations; never introduce arbitrary `sleep()` or timeout delays.
- **Isolated Test Data**: Ensure test accounts, credentials, and seed records are isolated and predictable.
- **Proportional Execution**: Avoid executing heavy, slow E2E suites for localized, non-UI changes when unit and integration tests provide sufficient verification.

## 7. Regression Testing

- **Reproduce Before Fixing**: Author a failing regression test that reproduces the reported defect before applying a bug fix.
- **Verify Resolution**: Confirm that the regression test fails against unpatched code and passes cleanly once the fix is applied.
- **Prevent Recurrence**: Keep regression tests in the primary test suite to permanently guard against future regressions.
- **Check Adjacent Dependencies**: Run tests across dependent modules, shared libraries, and related features to ensure bug fixes do not introduce secondary defects.
- **Preserve Existing Tests**: Never delete, disable, or alter existing tests simply because they fail after a targeted modification; investigate and resolve genuine regressions.

## 8. Test Quality, Assertions, and Verifiability

- **Explicit Assertions**: Write strict, meaningful assertions that verify exact values, object structures, and state transitions.
- **No Vacuous Tests**: Ensure tests fail when the code under test is deliberately broken; reject empty assertion blocks or tests that cannot fail.
- **Verify Negative Side Effects**: When asserting failure conditions, verify that no partial database changes, file creations, or external messages were produced.
- **Asynchronous Correctness**: Properly `await` all asynchronous operations (promises, observables, async callbacks) to prevent unhandled rejections and false positives.
- **Clear Diagnostic Messages**: Provide custom assertion messages for complex comparisons to make failure logs self-explanatory.

## 9. Mocks, Stubs, and Test Doubles

- **Appropriate Mocking Boundaries**: Use mocks and stubs for slow, non-deterministic, or third-party external services (e.g., Stripe, Twilio, external email gateways).
- **Never Mock the System Under Test**: Never mock the exact class, function, or component that the test is designed to verify.
- **Contract Fidelity**: Ensure mock responses strictly conform to the actual schema, data types, and status codes of the external service.
- **Reset Mocks Cleanly**: Reset and restore all mock implementations, spies, and calls between individual test runs (`beforeEach` / `afterEach`) to avoid test pollution.
- **No False Confidence**: Never claim an external third-party integration works solely because a mocked unit test passed.

## 10. Test Data and Environment Isolation

- **Dedicated Test Environments**: Run automated tests against dedicated test configurations and isolated test databases.
- **Zero Production Data & Secrets**: Never use real customer PII, production credentials, or production databases for testing.
- **Test Independence**: Design every test to be completely self-contained. Tests must not depend on execution order or state left behind by previous tests.
- **Destructive Command Guard**: Never run database resets, drops, or migrations against an unverified database connection URL.
- **Sanitized Test Artifacts**: Ensure test fixtures, logs, screenshots, and error reports are stripped of real API keys and private tokens.

## 11. Database and Persistence Testing

- **Validate Schema Constraints**: Test that unique constraints, foreign key restrictions, check constraints, and not-null validations properly reject invalid mutations.
- **Verify Rollback Guarantees**: Test that database transactions roll back completely when operations fail midway through multi-step mutations.
- **Cross-Reference Database Rules**: Refer to `database.md` for comprehensive persistence, migration, and transaction requirements.

## 12. API and Contract Testing

- **Validate Status Codes & Schemas**: Verify that API endpoints return documented HTTP status codes, response headers, and schema-compliant payloads.
- **Test Negative Paths**: Write automated tests for missing authentication, unauthorized roles, malformed request bodies, and missing resources (400, 401, 403, 404, 409).
- **Pagination & Filtering Verification**: Test boundary values, max limits, cursor pagination, and invalid filter operators.
- **Cross-Reference API Rules**: Refer to `api-design.md` and `backend.md` for complete API contract standards.

## 13. Frontend and Accessibility Testing

- **User Interaction Verification**: Test UI components through simulated user interactions (clicks, keyboard inputs, form submissions) rather than inspecting internal component state.
- **State Transition Coverage**: Verify component rendering across loading, empty, error, and disabled states.
- **Accessibility & Focus**: Test keyboard navigation, focus trapping in modals, and accessible attributes (`aria-expanded`, `aria-label`).
- **Cross-Reference Frontend Rules**: Refer to `frontend.md` for detailed UI and accessibility standards.

## 14. Security-Relevant Testing

- **Enforce Access Barriers**: Write negative automated tests verifying that unauthenticated or unauthorized users are strictly blocked from protected operations.
- **Tenant Isolation Verification**: Verify that users in Tenant A cannot query, modify, or delete resources belonging to Tenant B.
- **Injection & Payload Hardening**: Verify that inputs containing SQL syntax, XSS scripts, or path traversal sequences (`../`) are safely rejected or escaped.
- **Cross-Reference Security Rules**: Refer to `security.md` for comprehensive security testing guidelines.

## 15. Test Coverage and Prioritization

- **Value Over Volume**: Prioritize thorough, meaningful coverage of critical business logic, security barriers, financial calculations, and public API contracts over raw line coverage metrics.
- **Coverage as a Diagnostic Tool**: Use test coverage reports to discover untested edge cases, not as an arbitrary target to satisfy with superficial assertions.
- **Acknowledge Gaps**: Honestly identify and disclose untested behaviors or residual risks when full test automation is blocked.

## 16. Test Execution and Failure Diagnosis

- **Targeted Execution First**: Run targeted, relevant test suites during development for rapid feedback; run broader regression suites before completing tasks.
- **Analyze Root Causes**: Read compiler errors, test failure logs, and stack traces carefully before altering code or tests.
- **Distinguish Existing Failures**: Differentiate pre-existing test failures from regressions introduced by the current change.
- **Zero Fabrication**: Never fabricate test output, fake passing exit codes, or claim tests succeeded without executing them.

## 17. Flaky Test Mitigation

- **Eliminate Nondeterminism**: Remove race conditions, unhandled asynchronous promises, shared mutable state, and reliance on system timers.
- **Event-Driven Waiting**: Use explicit polling, mutation observers, or promise resolution instead of hardcoded `sleep` delays.
- **No Infinite Reruns**: Never disguise flaky tests by rerunning them in loops until they pass; investigate and fix the underlying race condition.

## 18. Performance and Load Testing

- **Controlled Environments**: Execute performance and benchmark tests in dedicated, controlled environments with realistic data volumes.
- **Define Explicit Metrics**: Establish concrete latency thresholds (e.g., p95 < 200ms) and throughput targets.
- **Separate from Unit Suites**: Keep slow performance and load test suites isolated from fast, routine test pipelines.

## 19. CI Pipelines and Quality Gates

- **CI Alignment**: Ensure local test execution commands align exactly with CI pipeline definitions.
- **Preserve Pipeline Gates**: Never bypass, comment out, or disable linting, type-checking, or test steps in CI configurations to force a build to pass.
- **Propagate Failure Codes**: Ensure test runners exit with non-zero status codes on failure to properly trigger quality gates.

## 20. Test Reporting and Transparency

- **Transparent Summaries**: Provide clear summaries detailing which test suites passed, which failed, and which were skipped or could not be executed.
- **Disclose Blockers**: Clearly document blockers (e.g., missing API credentials, unconfigured test databases, network isolation) that prevent running specific tests.

## 21. Testing Decision Principles

When designing and executing tests:
1. **Confidence Over Metrics**: Write tests that provide genuine confidence in software correctness rather than chasing arbitrary coverage percentages.
2. **Preserve Assertion Rigor**: Never weaken assertions, delete tests, or compromise security checks merely to make a test suite pass.
3. **Verify, Never Assume**: Distinguish code that has been verified through executed tests from code that has only been visually reviewed.
4. **Deterministic & Isolated**: Prioritize fast, reliable, and isolated test suites that fail only when real software defects exist.

## 22. Test-First Workflow and Defaults

- **Red-Green-Refactor**: When the project practices TDD, or for new business logic with clear inputs and outputs, write the failing test first (red), confirm it fails for the expected reason, implement the minimum to pass (green), then refactor with the suite green.
- **Fix the Code, Not the Test**: When a test fails, check isolation and mocks first; change the test only when the test itself is wrong.
- **Behavior-Describing Names**: Name tests after the behavior under test (e.g., `returns empty array when no markets match query`, `throws when API key is missing`).
- **Default Coverage Target**: Follow the project's configured threshold. When the user asks for a default, use 80% line coverage across unit and integration tests, with end-to-end tests for critical user flows, still read as a diagnostic (Section 15), not a goal in itself.

*Adapted from ECC `common/testing` (MIT); see THIRD_PARTY_NOTICES.md.*
