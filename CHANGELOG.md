# Changelog

All notable changes to the AI Agent Engineering Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Bootstrap CLI: `node bin/operon.mjs init [directory] [--stack auto|a,b] [--dry-run]` installs the framework into another repository (detected or chosen language rules plus the 15 core rules, all skills, subagents, workflows, templates, the safety scripts, the `docs/` guides, and the ECC attribution notice). It creates `AGENTS.md` and `CLAUDE.md` only if missing, starts an empty decision log, records the stack and framework version in `.agents/.operon.json`, and refuses to touch a directory that already has `.agents/`. Adds a `private` root `package.json` (`bin`, `files`, `engines`); nothing is published. A test installs into a project with its own README and `AGENTS.md` and runs the validator there.
- Project decision log: `.agents/memory/decision-log.md`, loaded by the session-start hook within a size budget (`memory` in `framework.config.json`: `enabled`, `file`, `maxEntries`, `maxBytes`), with `decision-log.mjs` (`add`, `list`, `check`), entry validation (one line, 300 characters, known tags, secret-like text refused), a validator check, and a `/retro` step that proposes entries. Loaded text is labelled as notes, not instructions, and writes by an agent need the user's confirmation because the file is under `.agents/`.
- `mcpPolicy` in `framework.config.json`: per-server and per-tool `allow`, `ask`, or `deny` for MCP tools, with a `defaultDecision` (default `allow`, so behavior is unchanged until rules are added), audit logging of MCP calls (argument names only), a validator check, and `agentGrants` that give a subagent an exact MCP tool (read-only agents only for tools attested under `readOnlyTools`). The example `settings.json` matcher now includes `mcp__.*`; an existing `.claude/settings.json` needs the same change by hand. The eval fixtures can override config keys, and the suite has 5 MCP scenarios.
- Six workflows written for this framework: `/incident` (triage and blameless postmortem), `/release` (evidence and gates, then a `release-manager` go or no-go), `/migrate` (reversible expand-and-contract migration plans), `/onboard-repo` (read-only orientation), `/triage-bug` (reproduction and report, no fix), and `/retro` (turns hook logs, evals, drift, and skill audit into proposals). The set is now 15 workflows. None of them tags, publishes, deploys, or applies a migration without an explicit instruction for that step.
- Three read-only subagents: `docs-auditor` (documentation vs code accuracy), `dependency-auditor` (manifests, lockfiles, licenses, upgrade risk), and `release-manager` (release readiness and go or no-go; never tags, publishes, or deploys). The fleet is now 9 subagents, 8 of them read-only, with 61 skill bindings.
- Command policy in `framework.config.json`: `commandPolicy.allowedCommands` (exact foreground command lines) and `commandPolicy.allowedBackgroundCommands` (exact commands allowed as background processes). Listed commands still go through the chaining and destructive-command checks. `git diff --staged` is allowed.
- `.agents/scripts/lib/hook-common.mjs`: one `readStdin` and one workspace-root implementation shared by the hooks and the Claude Code adapter.
- Claude Code adapter audit log: every governed tool call is recorded in `hook-event-log.jsonl` (tool, target, decision, reason with quoted values removed). Before this, only the standalone hook scripts logged decisions. `summarize-hook-logs.mjs` summarizes the logs.
- `context-cost.mjs` and `lib/rule-metadata.mjs`: measure what each rule and skill adds to context and classify when Claude Code loads it. Findings and options are in `docs/maintenance/context-cost-audit.md`.
- Validator checks that the README version badge matches `framework.config.json` and that plugin directories listed in `.agents/plugins/README.md` exist.
- `docs/design/` and `docs/maintenance/` guides, plus the framework improvement tracker and the context cost audit.
- `.github/workflows/ci.yml`: validator, tests, and policy evals on Ubuntu and Windows.
- `eval-runner.mjs` and `.agents/evals/policy-scenarios.json`: 35 black-box policy scenarios run through the Claude Code adapter (no model calls); CI runs them.
- `commandPolicy.allowedPatterns` (token patterns such as `npm run *`) and `ruleReminders` (one-line reminders to read on-demand rules) in `framework.config.json`.
- `ecc-drift.mjs` (compare ECC-adapted rules with a local upstream copy; the validator checks the version stamps) and `skill-audit.mjs` (structural report on skill bodies).
- Log summaries now list repeated confirmation prompts (allowlist candidates) and repeated denials.

### Changed
- Deletion commands (`rm`, `del`, `Remove-Item`, and similar) are detected by command token, including behind wrappers such as `cmd /c` and `bash -c`, instead of by substring, so `git log --grep=del` is no longer denied. `git rm` stays denied.
- `setup-claude-code.mjs` generates `.claude/rules/` as copies instead of linking `.agents/rules`, leaving out rules declared `trigger: model_decision` without `paths:`. Re-run it after changing rules. Those rules are listed in `AGENTS.md` under "On-Demand Rules".
- Eight domain rules gained `paths:` globs (`frontend`, `accessibility`, `backend`, `api-design`, `database`, `deployment`, `testing`, `documentation`), and `security.md` is `trigger: always_on`. Rules loaded at session start in Claude Code drop from 15 to 3 (about 51,200 to 7,800 estimated tokens).
- `claudeCode.modelMap` maps `pro` to `opus` and `flash` to `sonnet`.
- `hooks.json` key `phase6b-safety-lifecycle` renamed to `safety-lifecycle`.
- README version badge corrected to 2.0.0, and `.agents/plugins/README.md` no longer lists prototype directories that do not exist.

### Fixed
- Hooks lowercased every canonical path, which made mixed-case directories unreachable on case-sensitive file systems (Linux). Paths are now lowercased only on Windows and macOS.

---

## [2.0.0] - 2026-11-09

Merges selected parts of ECC (`ecc-universal` v2.2.3, MIT) into this framework. The framework's control plane, least-privilege subagents, and validator stay the base; ECC material is adapted to them.

### Added
- 111 language-specific rules (21 language groups) adapted from ECC in `.agents/rules/`. Each carries dual frontmatter: `trigger: glob` + `globs:` for Antigravity and `paths:` for Claude Code, plus `source: ecc-universal@2.2.3`. Links to ECC `common/*` rules now point to this framework's rules.
- 27 skills converted from ECC agents instead of adding new agents: 16 language review skills (`cpp-review` … `vue-review`) bound to the read-only `qa-reviewer`, and 11 language build-fix skills (`cpp-build-fix` … `harmonyos-app-build-fix`) bound to `code-implementer`. Their duplicated Prompt Defense sections were dropped and references to ECC agents re-pointed to framework skills. Skill bindings: 26 → 53.
- `.agents/workflows/` with 9 workflows adapted from ECC (`plan`, `plan-prd`, `feature-dev`, `code-review`, `pr`, `build-fix`, `test-coverage`, `refactor-clean`, `update-docs`). Artifacts go to `docs/` instead of `.claude/`, ECC agents map to framework subagents, and each outward or destructive workflow carries a "Framework gate" note (approval for pushes, PR reviews, and deletions).
- User skills `short-commit` and `production-quality-builder`.
- Validator checks: skill name matches its directory, no skill declares tool grants, and the workflow inventory matches `framework.config.json`. Tests cover the same, plus language skill bindings (review → `qa-reviewer` only, build-fix → `code-implementer` only).
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) with the ECC MIT license and a list of adapted material.
- [`setup-claude-code.mjs`](.agents/scripts/adapters/setup-claude-code.mjs): wires Claude Code discovery, which does not read `.agents/` itself. It links `.claude/skills`, `.claude/commands`, and `.claude/rules`; generates `.claude/agents/` from `.agents/agents/` with Claude Code tool names (`Read, Grep, Glob`, plus `Write, Edit, Bash` for `code-implementer` only) and `model` from `claudeCode.modelMap` (default `inherit`); creates `.claude/settings.json` and `CLAUDE.md` only when absent; `--check` reports gaps. Live-tested in a disposable copy with Claude Code 2.1.250: SessionStart hook, 6/6 subagents, 81/81 skills, 9/9 workflows discovered. `.gitignore` lists the links and generated agents. Two tests cover tool mapping and idempotent, non-destructive setup.

### Changed
- All six subagents gained ECC's "Prompt Defense Baseline" section.
- `git-workflow` skill merged with ECC's: branching strategy guide, PR description template, reviewer checklist, rebase limits, conflict prevention, hook proposals, and an anti-pattern table. ECC's separate `git-workflow` skill is not imported.
- Rules gained ECC guidance that was not already covered: `coding-standards.md` Section 15 (complexity signals), `testing.md` Section 22 (test-first workflow and default coverage), `security.md` Section 19 (security issue response), `git-workflow.md` Section 7 (whole-branch PR summaries).
- Skills gained ECC material they lacked: `architecture-design` (ADR index, lifecycle, detection signals), `end-to-end-testing` (flakiness detection, quarantine, Playwright conventions), `testing-qa` Section 11 (TDD evidence report, pre-PR verification loop wired to `verify-runner.mjs`).
- `framework.config.json`: version 2.0.0, 126 rules, 81 skills, 53 skill bindings, 9 workflows, and `validation.linkCheckExclusions` (`ECC-framework`), so the validator skips the staged upstream source whose own links are broken.

### Not imported
- ECC `common-agents`, `common-hooks`, `common-performance`, `common-development-workflow`, `common-patterns`, and `common-code-review` rules: they describe ECC's own agents, Claude Code hooks, or model selection, or are already covered by this framework's rules and `code-review` skill.
- The other 41 ECC agents (general, domain, and orchestration agents such as `planner`, `code-reviewer`, `security-reviewer`, `gan-*`, `chief-of-staff`): their roles are covered by the six framework subagents or fall outside the framework's scope.
- The other 85 ECC workflows: they depend on ECC-only scripts, hooks, or agents (`quality-gate`, `security-scan`, `review-pr`, `orch-*`, `multi-*`, `epic-*`), on ECC session tooling, or on specific languages already served by the language skills.
- ECC skills other than the four merged above, including the script-based `continuous-learning`, `continuous-learning-v2`, and `ck` (bash/Python/Node scripts that record session data locally). Add them later only when needed.
- `ecc-install-state.json`: it points to another project's paths and its hashes no longer match the adapted files.

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
