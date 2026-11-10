# Maintenance & Operations Documentation

This directory contains runbooks, troubleshooting guides, operational procedures, and the tracker for planned improvements to this repository.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Runbooks**: Step-by-step operational procedures, with destructive steps flagged prominently.
- **Troubleshooting Guides**: Symptoms, verified diagnostic steps, and resolutions for recurring problems.
- **Incident & Recovery Notes**: Post-incident summaries and recovery procedures, with backup and restore steps that have actually been tested.
- **Improvement Tracking**: Prioritized backlog of framework and codebase improvements with verified status.

---

## 2. Current Documents
- [Framework Improvement Tracker](framework-improvement-tracker.md): P1 to P3 improvements to this framework, with status and verification notes.
- [Context Cost Audit](context-cost-audit.md): measured size and load timing of the rules and skills, with options for reducing always-loaded context.

---

## 3. Authoring Workflow & Life-cycle
1. **Use the Operations Skills**: Leverage [incident-response](../../.agents/skills/incident-response/SKILL.md), [backup-recovery](../../.agents/skills/backup-recovery/SKILL.md), [observability](../../.agents/skills/observability/SKILL.md), and [technical-debt-management](../../.agents/skills/technical-debt-management/SKILL.md).
2. **Verify Before Documenting**: Record only procedures and commands that have been run or can be checked against the source. Never fabricate results.
3. **Flag Destructive Steps**: Mark commands that risk data loss or service disruption with a prominent warning.
4. **Synchronous Documentation**: Update a runbook in the same change that alters the procedure it describes.

---

## 4. Standards & Canonical References
- **Deployment Runbook Template**: [`.agents/templates/deployment/deployment-runbook-template.md`](../../.agents/templates/deployment/deployment-runbook-template.md)
- **Deployment Rule**: [`.agents/rules/deployment.md`](../../.agents/rules/deployment.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Change Safety Rule**: [`.agents/rules/change-safety.md`](../../.agents/rules/change-safety.md)

---

## 5. Review Checklist
- [ ] Every command in the document was verified against the repository or a real run.
- [ ] Destructive or irreversible steps are flagged with a warning.
- [ ] Status values (`Todo`, `In progress`, `Done`, `Blocked`) reflect verified work only.
- [ ] Known limitations and unverified areas are stated.
