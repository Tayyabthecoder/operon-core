# Subagent Architecture & Operating Fleet

This directory defines the specialized subagents operating within the AI Agent Engineering Framework, enforcing the Primary Agent Broker Pattern and least-privilege security boundaries.

---

## 1. Operating Principles & Least Privilege
To enforce defense-in-depth and avoid unauthorized mutations:
- **Strict Read-Only Posture for Auditors & Planners**: Eight of the nine subagents (`architect-planner`, `diagnostic-debugger`, `qa-reviewer`, `security-auditor`, `accessibility-auditor`, `docs-auditor`, `dependency-auditor`, `release-manager`) declare `commandExecutionPolicy: off` and possess only read tools: `[read_file, send_message, manage_task]`.
- **Single Mutation Subagent**: Only `code-implementer` possesses filesystem mutation and command execution tools: `[read_file, write_file, edit_file, run_command, send_message, manage_task]`.
- **Environment & MCP Isolation**: All subagents declare `subagent: true`, `inheritMcp: false` (to isolate ambient tool catalogs), and `inheritCustomizations: true` (to inherit project rules and skills).

---

## 2. Subagent Fleet Matrix

| Subagent | Definition File | Model | Command Policy | Permitted Tools | Core Focus |
|---|---|---|---|---|---|
| **architect-planner** | [`architect-planner.md`](architect-planner.md) | `pro` | `off` | `read_file`, `send_message`, `manage_task` | Requirements analysis, system topology, specifications, task work packages. |
| **code-implementer** | [`code-implementer.md`](code-implementer.md) | `flash` | `sandbox` | `read_file`, `write_file`, `edit_file`, `run_command`, `send_message`, `manage_task` | Surgical code implementation, bug fixes, refactoring, database migrations. |
| **diagnostic-debugger** | [`diagnostic-debugger.md`](diagnostic-debugger.md) | `flash` | `off` | `read_file`, `send_message`, `manage_task` | Reproduction specification, root-cause isolation, stack trace analysis (commands run by the Primary Agent). |
| **qa-reviewer** | [`qa-reviewer.md`](qa-reviewer.md) | `pro` | `off` | `read_file`, `send_message`, `manage_task` | Test evidence review, git diff auditing, static-analysis review, quality gate issuance. |
| **security-auditor** | [`security-auditor.md`](security-auditor.md) | `pro` | `off` | `read_file`, `send_message`, `manage_task` | Threat modeling, OWASP vulnerability audits, credential exposure detection. |
| **accessibility-auditor** | [`accessibility-auditor.md`](accessibility-auditor.md) | `pro` | `off` | `read_file`, `send_message`, `manage_task` | WCAG 2.1 AA audits, screen-reader compatibility, keyboard navigation checks. |
| **docs-auditor** | [`docs-auditor.md`](docs-auditor.md) | `flash` | `off` | `read_file`, `send_message`, `manage_task` | Documentation vs code accuracy audits, broken references, unverified claims. Reports only; corrections go to `code-implementer`. |
| **dependency-auditor** | [`dependency-auditor.md`](dependency-auditor.md) | `flash` | `off` | `read_file`, `send_message`, `manage_task` | Manifest and lockfile hygiene, version drift, redundancy, licenses, upgrade risk. Security findings are handed to `security-auditor`. |
| **release-manager** | [`release-manager.md`](release-manager.md) | `pro` | `off` | `read_file`, `send_message`, `manage_task` | Release readiness from supplied evidence, version and changelog consistency, release notes drafts, go or no-go. Never tags, publishes, or deploys. |

---

## 3. Primary Agent Broker Protocol
As codified in Section 12 of [`.agents/rules/core-workflow.md`](../rules/core-workflow.md):
1. **Primary Agent Leadership**: The Primary Agent coordinates the workflow, decomposes goals into work packages, and delegates tasks to specialized subagents.
2. **Telemetry Brokering**: The Primary Agent executes automated tests, linters, and verification commands, sanitizing command outputs before brokering them to `qa-reviewer` or `diagnostic-debugger`.
3. **Mandatory Credential Redaction**: All secrets, tokens, or keys discovered during agent execution must be redacted as `[REDACTED_SECRET: TYPE]`.
