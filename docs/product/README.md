# Product Documentation

This directory contains product-level documentation, business requirements, target user personas, and strategic vision artifacts for the project.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **What** problem the system solves and what market opportunity or user need it addresses.
- **Who** the target personas and stakeholders are, including their primary workflows and constraints.
- **Why** specific capabilities are prioritized, supported by quantitative metrics and measurable business goals.

---

## 2. Expected Artifacts & Hierarchy
- **Product Requirements Documents (PRDs)**: Comprehensive specifications of product features, user journeys, target personas, and measurable success criteria. Authored as `PRD-[feature-name].md`.
- **Product Vision & Strategy**: High-level problem statements, target market needs, and business value propositions.
- **User Personas & Research**: Defined user roles, workflows, pain points, and usability criteria.
- **Roadmap & Release Objectives**: Phased release horizons mapping business objectives to concrete delivery milestones.

---

## 3. Authoring Workflow & Life-cycle
1. **Discovery & Needs Analysis**: Leverage the [prd-writing](../../.agents/skills/prd-writing/SKILL.md) skill to gather stakeholder input and quantify problem statements.
2. **Template Adoption**: Initialize new product specifications using the canonical [PRD Template](../../.agents/templates/prd/prd-template.md).
3. **Traceability Gate**: Ensure every high-level feature references verifiable acceptance criteria that can be translated directly into downstream [Software Requirements Specifications (SRS)](../requirements/README.md).
4. **Synchronous Synchronization**: When product scope shifts or features are reprioritized, update the corresponding PRD synchronously before implementation commences.

---

## 4. Standards & Templates
- **Canonical PRD Template**: [`.agents/templates/prd/prd-template.md`](../../.agents/templates/prd/prd-template.md)
- **Document Maintenance Rule**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Core Workflow Standards**: [`.agents/rules/core-workflow.md`](../../.agents/rules/core-workflow.md)

---

## 5. Review Checklist for PRD Artifacts
- [ ] Problem statement describes actual user pain without prematurely dictating implementation details.
- [ ] User personas define clear technical backgrounds, constraints, and daily workflows.
- [ ] Functional scope is delineated into Must-Have (P0), Should-Have (P1), and Nice-to-Have (P2).
- [ ] Success metrics are measurable, verifiable, and tied to quantifiable outcomes.
- [ ] Out-of-scope boundaries are explicitly declared to prevent scope creep.
