# Architecture Documentation

This directory contains system architecture specifications, high-level design documents, and Architecture Decision Records (ADRs).

## Purpose & Scope
The artifacts stored in this directory define *how* the system is structured, its component boundaries, subsystem integrations, data flows, and the rationale behind key technical choices.

## Expected Artifacts
- **Architecture Design Specifications**: Comprehensive system design documents covering component decomposition, runtime technology stack, boundaries, data flows, and non-functional requirements (NFRs).
- **Architecture Decision Records (ADRs)**: Consequential engineering decision records stored in [`architecture-decisions/`](architecture-decisions/) documenting context, chosen options, evaluated alternatives, and trade-offs.
- **System Topography & Component Diagrams**: Visual representations of module dependencies, network boundaries, and execution sequences (authored using Mermaid).

## Standards & Templates
- System architecture design documents should follow the template at [`.agents/templates/architecture/architecture-spec-template.md`](../../.agents/templates/architecture/architecture-spec-template.md).
- Architecture Decision Records should follow [`.agents/templates/architecture/adr-template.md`](../../.agents/templates/architecture/adr-template.md).
- All architectural designs and ADRs must adhere to the engineering standards in [`.agents/rules/architecture.md`](../../.agents/rules/architecture.md) and [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md).

---

## Agent System Architecture & Subagent Broker Pattern

The AI Agent Engineering Framework implements a strict hierarchical broker architecture centered on the Primary Agent as the trusted coordinator and sole executor of verification workflows. Specialized subagents operate in isolated contexts with least-privilege tool sets.

### Least-Privilege Subagent Tool Matrix

| Subagent Name | Permitted Tools | Mutation Tools | Command Execution | MCP Access | Customizations |
|---|---|---|---|---|---|
| `architect-planner` | `read_file`, `send_message`, `manage_task` | None | `off` | `inheritMcp: false` | `inheritCustomizations: true` |
| `code-implementer` | `read_file`, `write_file`, `edit_file`, `run_command`, `send_message`, `manage_task` | `write_file`, `edit_file` | `sandbox` | `inheritMcp: false` | `inheritCustomizations: true` |
| `diagnostic-debugger` | `read_file`, `send_message`, `manage_task` | None | `off` | `inheritMcp: false` | `inheritCustomizations: true` |
| `qa-reviewer` | `read_file`, `send_message`, `manage_task` | None | `off` | `inheritMcp: false` | `inheritCustomizations: true` |
| `security-auditor` | `read_file`, `send_message`, `manage_task` | None | `off` | `inheritMcp: false` | `inheritCustomizations: true` |
| `accessibility-auditor` | `read_file`, `send_message`, `manage_task` | None | `off` | `inheritMcp: false` | `inheritCustomizations: true` |

All six subagents declare `subagent: true`, `inheritMcp: false`, and `inheritCustomizations: true`. Five subagents have no mutation or command tools; only `code-implementer` possesses sandboxed source modification and command execution capabilities.

### Primary Agent Broker Workflow

1. **Task Delegation**: The Primary Agent dispatches discrete, structured tasks to specialized subagents using `invoke_subagent` and `send_message`.
2. **Execution Brokerage**: Subagents requiring command execution or external MCP resource queries do not execute them directly. Instead, they request execution through structured messages to the Primary Agent.
3. **Secret Redaction & Verification**: The Primary Agent executes approved validation commands, verifies exit codes and synchronous completion, sanitizes outputs by redacting credentials matching `[REDACTED_SECRET: TYPE]`, and relays verified data back to the requesting subagent.

---

## Control Plane Security & Safety Hook Architecture

The framework enforces automated lifecycle hooks defined in [`.agents/hooks.json`](../../.agents/hooks.json) to secure file operations, command execution, and task termination:

### 1. Command Execution Safety (`pre-tool-safety.mjs`)
- **Strict Allowlist Gate**: Enforces exact string matching for approved automated profiles (`validate-framework.mjs`, `verify-runner.mjs --profile framework-validator`, `phase6b-tests.mjs`, `git status`, `git diff`, `git diff --cached`, `git log -n 5`, `workspace-fingerprint.mjs`). Bare script names, alternate directory prefixes, and unapproved profiles trigger interactive confirmation (`force_ask`).
- **Parameter Validation**: Enforces native `run_command` parameters:
  - `BypassSandbox`: Must be `false` or omitted; `true` is denied.
  - `IsDaemon`: Must be `false` or omitted; `true` is denied.
  - `WaitMsBeforeAsync`: Must be an integer between 1,000 and 60,000 ms.
  - `toolSummary`: Must be a non-empty string.
- **CWD Containment**: Rejects relative, missing, or outside-workspace working directory overrides.
- **Shell Metacharacter Rejection**: Blocks command chaining (`;`, `&&`, `||`, `|`), redirection (`>`, `>>`, `<`), command substitution, and PowerShell execution cmdlets.

### 2. Filesystem & Sensitive Read Safety (`pre-file-safety.mjs`)
- **Canonical Workspace Containment**: Validates canonical workspace root strictly from the hook payload. Rejects relative roots, remote URI authorities, non-directories, and ambiguous multiple roots.
- **Containment Precedence**: Lexical and canonical boundary checks execute strictly **before** sensitive file evaluation. Paths escaping the workspace boundary always return `deny`.
- **Sensitive File Protection**: Protects environment files (`.env`, `.env.local`), certificates (`*.pem`, `*.crt`, `*.key`), SSH keys (`id_rsa`, `id_ed25519`), credential stores (`credentials.json`), and sensitive directories (`.aws`, `.ssh`, `.gnupg`, `secrets`) at any nesting depth via segment-aware regex matching (`/(^|\/)...($|\/)`).
- **Fail-Closed Tool Dispatch**: Maps verified native content readers (`read_file`, `read_resource`). Unmapped tools (`view_file`, `grep_search`, `list_dir`) fail closed with `UNKNOWN_TARGET` -> `deny`.

### 3. Stop Gate Lifecycle Safety (`stop-gate.mjs`)
- **Baseline Verification**: Compares working tree state against `session-baseline.json`.
- **Synchronous Verification Requirement**: Blocks task termination if uncommitted modifications exist without corresponding verified test evidence from `verify-runner.mjs`.
- **Circuit Breaker**: Prevents infinite loops by escalating after 2 repeated verification failures.

---

## Known Operational Boundaries & Disclosures

1. **Time-of-Check to Time-of-Use (TOCTOU)**: Pre-tool and pre-file hooks inspect arguments synchronously prior to process spawn or API invocation. This mitigates unauthorized agent actions within the execution lifecycle, but cannot prevent external OS-level processes from altering target files during concurrent execution.
2. **Windows Symlink Privileges**: In non-elevated Windows environments lacking `SeCreateSymbolicLinkPrivilege`, symlink creation tests are marked as inconclusive / skipped (`t.skip`). Realpath canonicalization uses native Node.js APIs (`fs.realpathSync.native`) to resolve junctions and paths accurately.
3. **Global Hook Policy Scope**: Active hooks operate globally across the conversation session. To maintain least-privilege guarantees, subagent markdown definitions enforce isolated tool declarations (`tools: [...]`), while the Primary Agent Broker Pattern controls all privileged tool execution.
