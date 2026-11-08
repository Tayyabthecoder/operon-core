# Project Documentation Index

Welcome to the project documentation repository. This directory serves as the centralized, structured documentation store for the software system, capturing product intent, software requirements, technical architecture, database designs, API contracts, quality assurance plans, and deployment runbooks.

---

## Documentation Hierarchy & Subdirectories

| Directory | Scope & Purpose | Orientation Guide | Canonical Templates |
|---|---|---|---|
| [`product/`](product/) | Product vision, market opportunities, personas, and Product Requirements Documents (PRDs). | [Product Guide](product/README.md) | [PRD Template](../.agents/templates/prd/prd-template.md) |
| [`requirements/`](requirements/) | Formal Software Requirements Specifications (SRS), acceptance criteria, and requirements analyses. | [Requirements Guide](requirements/README.md) | [SRS Template](../.agents/templates/srs/srs-template.md), [Reqs Spec Template](../.agents/templates/requirements-analysis/requirements-spec-template.md) |
| [`architecture/`](architecture/) | System topography, component decomposition, data flows, and Architecture Decision Records (ADRs). | [Architecture Guide](architecture/README.md) | [Architecture Spec Template](../.agents/templates/architecture/architecture-spec-template.md), [ADR Template](../.agents/templates/architecture/adr-template.md) |
| [`database/`](database/) | Relational/document schemas, entity-relationship models, data dictionaries, and migration notes. | [Database Guide](database/README.md) | [Schema Template](../.agents/templates/database/schema-template.md), [Data Dictionary Template](../.agents/templates/database/data-dictionary-template.md) |
| [`api/`](api/) | API endpoint contracts, OpenAPI specifications, request/response schemas, and integration guides. | [API Guide](api/README.md) | [API Spec Template](../.agents/templates/api/api-spec-template.md) |
| [`testing/`](testing/) | Test plans, quality assurance strategies, verification matrices, and test environment setups. | [Testing Guide](testing/README.md) | [Test Plan Template](../.agents/templates/testing/test-plan-template.md) |
| [`deployment/`](deployment/) | Deployment runbooks, environment variable requirements, release checklists, and rollback plans. | [Deployment Guide](deployment/README.md) | [Deployment Runbook Template](../.agents/templates/deployment/deployment-runbook-template.md) |

---

## Engineering Rules & Standards
All documents authored in this directory must comply with the foundational and domain rules:
- [Technical Documentation Lifecycle (`.agents/rules/documentation.md`)](../.agents/rules/documentation.md)
- [Core Development Workflow (`.agents/rules/core-workflow.md`)](../.agents/rules/core-workflow.md)
- [Change Safety & Risk Prevention (`.agents/rules/change-safety.md`)](../.agents/rules/change-safety.md)

## Documentation Authoring Guidelines
1. **Grounded in Verified Reality**: Base all documentation on verified code, test outputs, or approved requirements. Never fabricate metrics, endpoints, or unverified claims.
2. **Use Official Templates**: Before authoring a new document, inspect its corresponding template in [`.agents/templates/`](../.agents/templates/).
3. **Keep Links Relative & Portable**: Use relative Markdown links for all internal references. Never use machine-specific absolute paths.
4. **Synchronize with Code**: Whenever code or interfaces change materially, update the corresponding documentation synchronously.
