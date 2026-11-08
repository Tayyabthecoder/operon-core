# Changelog

All notable changes to the AI Agent Engineering Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-11-08

### Added
- Claude Code adapter in [`.agents/scripts/adapters/claude-code.mjs`](.agents/scripts/adapters/claude-code.mjs) with an example hook registration ([`claude-code.settings.example.json`](.agents/scripts/adapters/claude-code.settings.example.json)). The core policy is unchanged; `allow` defers to Claude Code permissions, `force_ask` maps to `ask`, `deny` to `deny`.
- `lib/artifact-dir.mjs`: default per-workspace artifact directory under the OS temp folder, used by `verify-runner.mjs` when no artifact directory is given.
- `fingerprint.additionalExclusions` in `framework.config.json`.
- 7 regression tests (search tools, git variants, circuit breaker re-arm, fingerprint exclusions, adapter).

### Changed
- `pre-file-safety.mjs`: `view_file`, `grep_search`, `find_by_name`, `list_dir` are mapped to declared path arguments instead of blanket-denied. Content searches over a scope that contains sensitive files require confirmation; calls without a usable path still fail closed.
- `stop-gate.mjs`: a tripped circuit breaker re-arms when the workspace changes again instead of staying open for the rest of the session.
- `pre-tool-safety.mjs`: destructive git detection now covers every forced `git clean` flag combination, `git reset ... --hard`, whole-tree `git checkout .` / `git restore .`, and force pushes. Added glob test-suite commands to the allowlist.
- `validate-framework.mjs`: hook checks now exercise hook behavior against a disposable workspace instead of grepping source text; subagent and skill-binding counts come from `framework.config.json`; a missing subagent file is reported as a failure instead of crashing.
- `workspace-fingerprint.mjs`: default exclusions add `__pycache__`, `.pytest_cache`, `.venv`, `.next`, `.turbo`, so test runners no longer mark verification runs dirty.
- `qa-reviewer` and `diagnostic-debugger` descriptions now match their read-only, broker-fed role; removed the "cryptographically state-bound" claim.
- 14 overlapping skills (7 pairs) now state in their descriptions when to use the other skill of the pair.

---

## [1.3.1] - 2026-11-08

### Security
- `pre-file-safety.mjs`: new-file writes are now canonically resolved through the nearest existing ancestor, so a symlink or directory junction can no longer be used to create files outside the workspace.
- `pre-file-safety.mjs`: control-plane protection now covers the root `AGENTS.md` and everything under `.agents/` (rules, agents, skills, templates, config, scripts, tests), except `.agents/scratch/`.
- `pre-file-safety.mjs`: sensitive-file checks on writes now also apply to the canonical (link-resolved) path.
- `stop-gate.mjs`: verification evidence must name its profile, and framework-only profiles (`framework-validator`) no longer satisfy the gate when project files outside `.agents/`, `docs/` and root Markdown changed. Policy is configurable via `stopGate` in `framework.config.json`.
- `pre-file-safety.mjs` and `stop-gate.mjs`: audit logs no longer store raw hook payloads; they record only tool name, target path, argument key names and termination metadata.

### Added
- 9 regression tests in `phase6b-tests.mjs` covering the fixes above.

---

## [1.3.0] - 2026-11-08

### Added
- Centralized framework configuration manifest in [`.agents/framework.config.json`](.agents/framework.config.json) eliminating hardcoded counts in validators.
- PostToolUse telemetry and mutation auditing hook in [`.agents/scripts/hooks/post-tool-safety.mjs`](.agents/scripts/hooks/post-tool-safety.mjs) registered in `hooks.json`.
- Skill reference guides:
  - [OWASP Top 10 Reference](.agents/skills/security-review/references/owasp-top10.md) in `security-review`.
  - [HTTP Status Codes & REST Contracts](.agents/skills/api-development/references/http-status-codes.md) in `api-development`.
  - [Database Normalization Guide](.agents/skills/database-design/references/normalization-guide.md) in `database-design`.
  - [WCAG 2.1 AA Checklist](.agents/skills/accessibility/references/wcag-quickref.md) in `accessibility`.
- Focused test runner suites in [`.agents/scripts/tests/`](.agents/scripts/tests/) complementing the unified test suite.
- Subagents guide in [`.agents/agents/README.md`](.agents/agents/README.md) detailing the Primary Agent Broker Pattern and tool isolation.
- Plugin architecture documentation in [`.agents/plugins/README.md`](.agents/plugins/README.md).
- Detailed documentation guides across all `docs/` subdirectories (`product`, `requirements`, `api`, `database`, `deployment`, `testing`).

### Changed
- Expanded pre-approved command execution profiles in `pre-tool-safety.mjs` to include common read-only git and node inspection commands.
- Updated `workspace-fingerprint.mjs` default exclusions to cover `.agents/scratch` root directory.
- Enriched root `README.md` with system architecture diagrams, core pillars, and quick-start instructions.
- Synchronized `AGENTS.md` directory overview to include subagents, lifecycle hooks, and scripts.
- Enhanced `stop-gate.mjs` circuit breaker with explicit stderr warnings and state recording.

---

## [1.2.0] - 2026-11-06

### Added
- Phase 6B safety lifecycle control plane:
  - `SessionStart` hook capturing baseline workspace digest (`session-start.mjs`).
  - `PreToolUse` command execution safety gate rejecting shell chaining and validating parameters (`pre-tool-safety.mjs`).
  - `PreToolUse` filesystem mutation and read boundary protection (`pre-file-safety.mjs`).
  - `Stop` gate enforcing verification evidence before session termination (`stop-gate.mjs`).
- Cross-platform verification runner (`verify-runner.mjs`) supporting multiple execution profiles (`framework-validator`, `node-test`, `npm-test`, `pytest`).
- Comprehensive Phase 6B test suite with 66 tests (`phase6b-tests.mjs`).

---

## [1.1.0] - 2026-11-04

### Added
- Subagent Architecture with 6 specialized subagents:
  - `architect-planner` (pro model, read-only)
  - `code-implementer` (flash model, sandbox mutation tools)
  - `diagnostic-debugger` (flash model, read-only)
  - `qa-reviewer` (pro model, read-only)
  - `security-auditor` (pro model, read-only)
  - `accessibility-auditor` (pro model, read-only)
- Primary Agent Broker Protocol codification in `core-workflow.md` (Section 12).
- Strict tool isolation flags (`subagent: true`, `inheritMcp: false`, `inheritCustomizations: true`).

---

## [1.0.0] - 2026-10-30

### Added
- Initial framework architecture:
  - 15 domain and operational rules in `.agents/rules/`.
  - 52 specialized engineering skills in `.agents/skills/`.
  - 11 engineering specification templates in `.agents/templates/`.
  - Documentation hierarchy in `docs/` (`api`, `architecture`, `database`, `deployment`, `product`, `requirements`, `testing`).
  - Automated framework validator in `.agents/scripts/validate-framework.mjs`.
  - Master guidelines in `AGENTS.md` and repository map in `REPO_STRUCTURE.md`.
