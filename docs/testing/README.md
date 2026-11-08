# Testing & Quality Assurance Documentation

This directory contains test strategies, verification plans, quality gate specifications, automated test fixture guides, and test environment documentation.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Test Strategy & Pyramid Allocation**: Balanced distribution across unit tests (fast, isolated), integration tests (service boundaries, database interactions), and end-to-end user journey tests.
- **Empirical Quality Gates**: Automated pass/fail thresholds, coverage requirements, determinism invariants, and static analysis requirements.
- **Requirements-to-Test Traceability**: Bidirectional mapping between functional criteria in [Software Requirements Specifications](../requirements/README.md) and automated test suites.
- **Deterministic Test Fixtures**: Guidelines for establishing isolated test databases, mocking external network boundaries, and eliminating test flakiness.

---

## 2. Expected Artifacts & Hierarchy
- **Quality & Verification Test Plans**: Structured plans detailing target modules, test pyramid allocation, pass/fail gates, and test environments. Authored as `test-plan-[module-name].md`.
- **Test Matrices & Case Catalogs**: Tables linking requirement IDs (`REQ-XXX`) to specific unit, integration, and contract tests.
- **Performance & Load Test Reports**: Benchmarks, concurrency ramp-up curves, latency percentiles ($p50$, $p95$, $p99$), and resource saturation points.

---

## 3. Authoring Workflow & Life-cycle
1. **Planning & Strategy**: Leverage [testing-qa](../../.agents/skills/testing-qa/SKILL.md), [end-to-end-testing](../../.agents/skills/end-to-end-testing/SKILL.md), and [load-testing](../../.agents/skills/load-testing/SKILL.md) skills.
2. **Template Adoption**: Structure test plans using the canonical [Test Plan Template](../../.agents/templates/testing/test-plan-template.md).
3. **Execution Verification**: Execute tests using the cross-platform runner: `node .agents/scripts/verify-runner.mjs --profile node-test`.
4. **Synchronous Documentation**: When bug fixes, refactors, or new features are introduced, update test plans and test case matrices synchronously.

---

## 4. Standards & Canonical Templates
- **Test Plan Template**: [`.agents/templates/testing/test-plan-template.md`](../../.agents/templates/testing/test-plan-template.md)
- **Testing & Quality Assurance Rule**: [`.agents/rules/testing.md`](../../.agents/rules/testing.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Core Workflow Protocol**: [`.agents/rules/core-workflow.md`](../../.agents/rules/core-workflow.md)

---

## 5. Quality Gate Review Checklist
- [ ] Unit tests isolate business logic with zero external network or database dependencies.
- [ ] Integration tests exercise real persistence and API boundaries with isolated test transactions.
- [ ] Tests run deterministically and can be executed repeatedly without side effects or test ordering dependencies.
- [ ] Every functional requirement in the module SRS has at least one corresponding automated verification test.
- [ ] Test suites complete synchronously with exit code 0 and leave no lingering background processes.
