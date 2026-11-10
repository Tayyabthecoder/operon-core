# Framework Improvement Tracker

Tracks improvements to operon-core identified in the framework analysis of 2026-11-10. Statuses reflect verified work only; an item is `Done` only after the verification listed for it has been run.

**Status values:** `Todo`, `In progress`, `Done`, `Blocked`.

## P1: Quick Fixes (accuracy and policy usability)

| ID | Task | Primary files | Status | Verification |
|---|---|---|---|---|
| P1-1 | Fix stale README version badge (`1.4.0` vs `2.0.0`) and add a validator check that the badge matches `framework.config.json` | `README.md`, `.agents/scripts/validate-framework.mjs` | Done | Validator passes (183 checks); test confirms a mismatched badge is reported |
| P1-2 | Make `.agents/plugins/README.md` match reality (no prototype directories exist) and add a validator check that directories named in it exist | `.agents/plugins/README.md`, `.agents/scripts/validate-framework.mjs` | Done | Validator passes; test confirms a missing listed directory is reported |
| P1-3 | Let projects extend the command allowlist through `framework.config.json` (`commandPolicy.allowedCommands`) and allow `git diff --staged` | `.agents/scripts/hooks/pre-tool-safety.mjs`, `.agents/framework.config.json`, `.agents/scripts/tests/phase6b-tests.mjs`, `README.md` | Done | 3 new tests pass: extra commands allowed, still denied if destructive, malformed config falls back. Matching is exact, not pattern-based |
| P1-4 | Make the destructive-command check match command tokens instead of any substring (for example `git log --grep=del` must not be denied) | `.agents/scripts/hooks/pre-tool-safety.mjs`, `.agents/scripts/tests/phase6b-tests.mjs` | Done | 2 new tests pass: argument words only ask, command position and wrappers (`cmd /c`, `bash -c`, `sudo`, `xargs`) and `git rm` still denied |

## P2: Design Improvements

| ID | Task | Primary files | Status | Verification |
|---|---|---|---|---|
| P2-1 | Move duplicated helpers (`extractCanonicalWorkspaceRoot`, `readStdin`) into a shared module under `.agents/scripts/lib/` | `.agents/scripts/lib/hook-common.mjs`, `.agents/scripts/hooks/*.mjs`, `.agents/scripts/adapters/claude-code.mjs` | Done | Full suite passes with no existing test changed. Both hooks still re-export `extractCanonicalWorkspaceRoot`; a test asserts they share one implementation. `readStdin` copies removed from 5 scripts |
| P2-2 | Rename the internal `phase6b-safety-lifecycle` key in `hooks.json` and align hook matcher naming | `.agents/hooks.json`, `.agents/scripts/validate-framework.mjs` | Done | Key is now `safety-lifecycle`; validator hook check passes. Matchers (`run_command`, `*`) were left as is: they use the framework's host-neutral tool names, which the Claude Code adapter translates |
| P2-3 | Define a policy for background commands (dev servers, watch mode) instead of denying every `run_in_background` call | `.agents/scripts/hooks/pre-tool-safety.mjs`, `.agents/framework.config.json`, `README.md` | Done | New `commandPolicy.allowedBackgroundCommands` (exact commands, empty by default). Test confirms listed daemon allowed; unlisted, foreground-only, chained, and destructive entries still denied |
| P2-4 | Give `modelMap` real values, or remove the `model` tier fields if no mapping is intended | `.agents/framework.config.json`, `.agents/agents/*.md` | Done | Decided by the user: `pro` → `opus`, `flash` → `sonnet` via `claudeCode.modelMap`. Source agent files keep the tier names. The library default in `setup-claude-code.mjs` stays `inherit` as a fallback when the config has no map. `.claude/agents/` regenerated |
| P2-5 | Run the two symlink tests (currently skipped on Windows without privilege) on Linux and Windows CI | `.github/workflows/ci.yml` (depends on P3-4) | Blocked | Both tests execute and pass on at least one runner. Blocked until the workflow has run on GitHub |
| P2-6 | Align `docs/` with `documentation.md`: add the `docs/design/` and `docs/maintenance/` guides it names and register them in `framework.config.json` | `docs/design/README.md`, `docs/maintenance/README.md`, `docs/README.md`, `.agents/framework.config.json`, `README.md` | Done | Validator docs section now checks 10 guides; link check passes |

## P3: Coverage and Process

| ID | Task | Primary files | Status | Verification |
|---|---|---|---|---|
| P3-1 | Add a script that summarizes `hook-event-log.jsonl` and `stop-event-log.jsonl` (counts of allow, force_ask, deny) | `.agents/scripts/summarize-hook-logs.mjs`, `.agents/scripts/adapters/claude-code.mjs`, `.agents/scripts/lib/hook-common.mjs`, `README.md` | Done | 5 new tests pass; script run on this session's real logs printed decisions, stop-gate outcomes, and tool counts. Finding: the Claude Code adapter never logged pre-tool decisions (only the direct hook scripts did), so the adapter now writes redacted entries (tool, target, decision, quoted values stripped from reasons) |
| P3-2 | Evaluate whether rules and skills improve agent behavior, using the ECC `skill-comply` tooling on selected skills | `ECC-framework/skills/skill-comply/` (upstream, untracked) | Blocked | Needs approval: a full run drives `claude -p` sessions and an LLM classifier (token cost), and requires `uv`. Not run |
| P3-3 | Audit context cost of 126 rules and 81 skills and confirm language rules load only when their globs match in Claude Code | `.agents/scripts/context-cost.mjs`, `.agents/scripts/lib/rule-metadata.mjs`, `.agents/scripts/adapters/setup-claude-code.mjs`, 8 rules in `.agents/rules/`, `AGENTS.md`, `README.md`, `docs/maintenance/context-cost-audit.md` | Done | Measured with a repeatable script. Finding: 13 `model_decision` rules (~47,000 estimated tokens) loaded at session start in Claude Code. Fixed with options A and B: 8 rules got `paths:`, 4 rules are now on-demand and linked from `AGENTS.md`, `security.md` stays `always_on` by user decision, and `.claude/rules` is generated instead of linked (session-start rules: 15 to 3, ~51,200 to ~7,800 estimated tokens). Two conditional loads observed (`documentation.md`, `testing.md`); other patterns and agent behavior not verified. See [context-cost-audit.md](context-cost-audit.md) |
| P3-4 | Add a CI workflow that runs the framework validator and the test suite | `.github/workflows/ci.yml`, `README.md` | In progress | Workflow written for Ubuntu and Windows. It has not run on GitHub, so it is unverified. Some tests and validator checks use Windows paths and may fail on Ubuntu |

## Verification Log

| Date | Check | Result |
|---|---|---|
| 2026-11-10 | `node .agents/scripts/validate-framework.mjs` (baseline, before changes) | 181 checks, 0 errors |
| 2026-11-10 | `node --test .agents/scripts/tests/phase6b-tests.mjs` (baseline, before changes) | 87 tests: 85 pass, 0 fail, 2 skipped (Windows symlink privilege) |
| 2026-11-10 | `node --test .agents/scripts/tests/phase6b-tests.mjs` (after P1) | 94 tests: 92 pass, 0 fail, 2 skipped |
| 2026-11-10 | `verify-runner.mjs --profile node-test -- .agents/scripts/tests/*.mjs` (after P2) | 102 tests across both files (5 fingerprint tests run in both): 100 pass, 0 fail, 2 skipped; clean execution |
| 2026-11-10 | `node .agents/scripts/validate-framework.mjs` (after P2) | 185 checks, 0 errors (10 docs guides, 1509 links resolved) |
| 2026-11-10 | `node .agents/scripts/validate-framework.mjs` (after P3) | 185 checks, 0 errors (1512 links resolved) |
| 2026-11-10 | `verify-runner.mjs --profile node-test -- .agents/scripts/tests/*.mjs` (after P3) | 110 tests across both files: 108 pass, 0 fail, 2 skipped; clean execution |
| 2026-11-10 | `setup-claude-code.mjs` then `--check`, `context-cost.mjs`, validator, and `verify-runner.mjs --profile node-test` (after `security.md` set to `always_on`) | Setup generated 1 and regenerated 22 rule files; `--check` complete; session-start rules 3 (~7,776 estimated tokens); validator 185 checks, 0 errors; 115 tests across both files: 113 pass, 0 fail, 2 skipped; clean execution |
| 2026-11-10 | `setup-claude-code.mjs` then `--check`, `node .agents/scripts/context-cost.mjs`, validator, and `verify-runner.mjs --profile node-test` (after context-cost options A and B) | Setup replaced the `.claude/rules` link and generated 121 rule files; `--check` complete; session-start rules 2 (~3,834 estimated tokens); validator 185 checks, 0 errors; 115 tests across both files: 113 pass, 0 fail, 2 skipped; clean execution |
| 2026-11-10 | `setup-claude-code.mjs`, then `verify-runner.mjs --profile node-test` (after P2-4 model mapping) | `.claude/agents/` shows opus for 4 agents and sonnet for 2; 102 tests: 100 pass, 0 fail, 2 skipped |

## Known Limitations of Completed Work

- P1-3 allowlist entries are exact command lines. Argument-pattern matching (for example any `npm run <script>`) is not implemented.
- P2-3 background entries are exact command lines and apply to `run_in_background` calls from the Claude Code adapter. A background command is not automatically allowed in the foreground; list it in `allowedCommands` too if needed.
- P1-4 inspects only the first command token and the arguments of known wrappers. Unknown launchers (for example `find . -delete`, `rimraf`) were not covered before and are not covered now; they fall through to the confirmation prompt.

## Not Verified in the Original Analysis

- Content quality of the 81 skills (only frontmatter was validated).
- Language rule quality and drift from the ECC upstream.
- How Claude Code loads rules conditionally at runtime.
