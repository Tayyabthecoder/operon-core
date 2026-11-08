# Deployment & Release Documentation

This directory contains deployment runbooks, release readiness evaluations, environment configurations, rollback procedures, and infrastructure release guides.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Build & Packaging Specifications**: Deterministic artifact generation, container images, asset compilation, and environment-specific bundles.
- **Step-by-Step Release Procedures**: Pre-flight verification, schema migration sequencing, service deployment ordering, and health probe validations.
- **Rollback & Incident Recovery Plans**: Immediate rollback triggers, automated traffic shifting, database restore points, and recovery checklists.
- **Environment & Configuration Isolation**: Specification of required environment variables, configuration schemas, and service dependency maps (with zero hardcoded secrets).

---

## 2. Expected Artifacts & Hierarchy
- **Deployment Runbooks**: Step-by-step release procedures detailing pre-deployment checks, database migrations, rollouts, smoke tests, and rollbacks. Authored as `runbook-[service]-[version].md`.
- **Deployment Readiness Reports**: Formal pre-release assessments evaluating test coverage, security audits, migration safety, and operational risks. Authored as `readiness-[release-tag].md`.
- **Configuration & Environment Guides**: Documented lists of configuration variables, runtime settings, and service connection profiles across stages.

---

## 3. Authoring Workflow & Life-cycle
1. **Preparation**: Leverage [deployment](../../.agents/skills/deployment/SKILL.md), [deployment-readiness](../../.agents/skills/deployment-readiness/SKILL.md), and [ci-cd](../../.agents/skills/ci-cd/SKILL.md) skills.
2. **Template Adoption**: Structure deployment instructions using the canonical [Deployment Runbook Template](../../.agents/templates/deployment/deployment-runbook-template.md).
3. **Dry-Run Validation**: Validate all deployment steps, database migrations, and health check commands in staging before production execution.
4. **Post-Deployment Telemetry**: Document actual rollout metrics, duration, and health probe verifications in the runbook artifact.

---

## 4. Standards & Canonical Templates
- **Deployment Runbook Template**: [`.agents/templates/deployment/deployment-runbook-template.md`](../../.agents/templates/deployment/deployment-runbook-template.md)
- **Deployment Engineering Rule**: [`.agents/rules/deployment.md`](../../.agents/rules/deployment.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Core Workflow Protocol**: [`.agents/rules/core-workflow.md`](../../.agents/rules/core-workflow.md)

---

## 5. Deployment Readiness Checklist
- [ ] Automated test suite and static analysis pass with zero regressions.
- [ ] Database migrations are backwards-compatible and have been tested against a rollback.
- [ ] All required environment variables and secrets are provisioned in the target environment.
- [ ] Synthetic health probe endpoints (`/health/live`, `/health/ready`) are defined and responsive.
- [ ] Rollback steps are documented with designated decision makers and maximum allowable downtime thresholds.
