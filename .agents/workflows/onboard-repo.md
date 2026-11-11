---
description: "Get oriented in an unfamiliar repository without changing it: detect the stack, commands, tests, and structure, find what is documented and what is not, and write a short onboarding summary plus suggested framework settings. Read-only until the user approves the written files."
argument-hint: "[path to repository root, blank for the current project]"
---

# Onboard to a Repository

> **Framework gate**: Orientation is read-only. Do not install dependencies, run unknown scripts, start servers, or edit existing files. Writing the new summary document needs the user's explicit go-ahead after you show what it will contain. Do not read or print the contents of `.env` files, key files, or credentials; note only that they exist.

**Input**: `$ARGUMENTS` — optional path. Default to the current project root.

Use the `project-context-analysis` skill. If the user also wants documentation gaps checked, delegate to the read-only `docs-auditor`; if dependencies look unusual, to `dependency-auditor`.

---

## Phase 1 — LAYOUT

List the top-level files and folders and open the usual entry points:
- `README`, `CONTRIBUTING`, `AGENTS.md`, `CLAUDE.md`, `docs/`.
- Manifests: `package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle*`, `*.csproj`, `composer.json`, `Gemfile`.
- Config: CI files, Dockerfiles, Compose files, lint and formatter configs, `.gitignore`.

Report what exists, not what you expect to exist.

## Phase 2 — STACK AND COMMANDS

From the manifests and docs, identify:

| Item | Where it came from |
|---|---|
| Languages and frameworks | Manifests, file extensions |
| How to install, build, test, lint, run | `scripts` in manifests, README, CI files |
| Test framework and where tests live | Config and folder names |
| Runtime versions required | `engines`, `.nvmrc`, `.tool-versions`, CI |

Do not run these commands. List them exactly as written in their source and mark any you could not find `NOT FOUND`.

## Phase 3 — ARCHITECTURE SKETCH

Read the main entry points and one representative module per layer. Describe, in a few lines each: the main modules and what they own, how data flows between them, external services and databases, and where configuration comes from. Mark guesses `UNVERIFIED`.

## Phase 4 — HEALTH CHECK (read-only)

Note, with file evidence:
- Missing or stale documentation (README commands that do not match manifests).
- No tests, no CI, or no lockfile.
- Secrets or credential-like files in the tree (names only, never contents).
- Large or generated files that should be ignored.
- Anything surprising, such as two build systems or conflicting configs.

## Phase 5 — FRAMEWORK FIT

Suggest, as proposals only:
- Which language rules from `.agents/rules/` apply.
- Which subagents and skills are most relevant.
- Candidate entries for `commandPolicy.allowedCommands` or `allowedPatterns` (for example the project's test and lint commands), each with its source.
- Whether `docs/` has the guides the framework expects.

Changes to `.agents/framework.config.json` are control-plane edits; list them for the user and do not apply them.

## Phase 6 — SUMMARY DOCUMENT

Show the user the proposed contents, then, on approval, write `docs/maintenance/onboarding.md`:

```markdown
# Onboarding Summary

**Last reviewed**: <date>   **Source**: read-only review, nothing executed

## What This Project Is
## Stack
## How to Install, Build, Test, Run
| Task | Command | Source |
|---|---|---|
## Structure
## Known Gaps and Risks
## Suggested Framework Settings (not applied)
## Open Questions
```

## Output

```
Repository: <name>   Stack: <summary>
Commands found: <list or NOT FOUND items>
Risks: <count> (<highest>)
Summary file: docs/maintenance/onboarding.md (written | proposed)
Suggested settings: <count>, none applied
```

---

## Edge Cases

- **Monorepo**: Treat each package separately and say which you covered.
- **No documentation**: Say so and base everything on files; mark inferences `UNVERIFIED`.
- **Very large repository**: State which areas you sampled and which you did not.
