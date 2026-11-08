# Requirements Documentation

This directory contains formal software requirements specifications, technical criteria, requirements analysis records, and requirement traceability matrices.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Precise Functional Requirements**: Testable "shall" statements specifying exact system behaviors across standard, edge, and error flows.
- **Non-Functional Requirements (NFRs)**: Quantifiable constraints on performance, throughput, latency percentiles, security boundaries, and availability.
- **External Interface Specifications**: Data exchange contracts, hardware interfaces, and protocol standards.
- **Traceability**: Bidirectional links connecting upstream business goals in [Product Documentation](../product/README.md) to downstream architectural modules, database schemas, and verification test suites.

---

## 2. Expected Artifacts & Hierarchy
- **Software Requirements Specifications (SRS)**: Formal system specifications documenting testable functional criteria, preconditions, postconditions, and exception flows. Authored as `SRS-[module-name].md`.
- **Requirements Analysis Documents**: Structured breakdowns of domain problems, actors, business rules, and constraints discovered during analysis. Authored as `REQ-[feature-name].md`.
- **Requirements Traceability Matrices (RTM)**: Matrices mapping requirements to test case IDs and implementation PRs.

---

## 3. Authoring Workflow & Life-cycle
1. **Requirements Discovery**: Utilize [requirements-analysis](../../.agents/skills/requirements-analysis/SKILL.md) and [srs-writing](../../.agents/skills/srs-writing/SKILL.md) skills.
2. **Template Adoption**: Use [SRS Template](../../.agents/templates/srs/srs-template.md) for formal specifications or [Requirements Spec Template](../../.agents/templates/requirements-analysis/requirements-spec-template.md) for exploratory feature analysis.
3. **Formal Verification Criteria**: Every requirement statement must be verifiable via automated testing, inspection, or measurable telemetry.
4. **Change Management**: Any requirement modification requires impact analysis on dependent architecture, schemas, and test plans before code edits.

---

## 4. Standards & Canonical Templates
- **SRS Template**: [`.agents/templates/srs/srs-template.md`](../../.agents/templates/srs/srs-template.md)
- **Requirements Analysis Template**: [`.agents/templates/requirements-analysis/requirements-spec-template.md`](../../.agents/templates/requirements-analysis/requirements-spec-template.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Core Workflow Protocol**: [`.agents/rules/core-workflow.md`](../../.agents/rules/core-workflow.md)

---

## 5. Requirements Quality Checklist
- [ ] Requirements use active "shall" statements without ambiguous terms ("fast", "user-friendly", "flexible").
- [ ] Every requirement is assigned a unique, immutable identifier (e.g., `REQ-AUTH-001`).
- [ ] Preconditions, triggers, nominal flows, and error conditions are fully specified.
- [ ] Dependencies between requirements are explicitly declared.
- [ ] Non-functional constraints define numeric thresholds (e.g., $p95 \le 200\text{ms}$).
